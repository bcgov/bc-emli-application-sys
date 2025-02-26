class User < ApplicationRecord
  PASSWORD_REGEX = /\A(?=.*[A-Za-z])(?=.*\d)(?=.*[\W_]).{8,64}\z/
  searchkick searchable: %i[first_name last_name email],
             word_start: %i[first_name last_name email]

  include Devise::JWT::RevocationStrategies::Allowlist
  include Discard::Model
  include Auditable

  devise :invitable,
         :database_authenticatable,
         :confirmable,
         :rememberable,
         :timeoutable,
         :jwt_cookie_authenticatable,
         :jwt_authenticatable,
         :omniauthable,
         :trackable,
         omniauth_providers: %i[keycloak],
         jwt_revocation_strategy: self

  enum role: {
         participant: 0,
         admin_manager: 1,
         admin: 2,
         system_admin: 3,
         #regional_review_manager: 4
         participant_support_rep: 5,
         contractor: 6,
         unassigned: 7,
       },
       _default: :participant

  # https://github.com/waiting-for-dev/devise-jwt
  self.skip_session_storage = %i[http_auth params_auth]

  # Associations
  has_one :physical_address, -> { where(address_type: 'physical') }, class_name: 'UserAddress', dependent: :destroy
  has_one :mailing_address, -> { where(address_type: 'mailing') }, class_name: 'UserAddress', dependent: :destroy

  has_many :jurisdiction_memberships, dependent: :destroy
  has_many :jurisdictions, through: :jurisdiction_memberships
  has_many :integration_mapping_notifications,
           as: :notifiable,
           dependent: :destroy

  has_many :permit_applications,
           foreign_key: "submitter_id",
           dependent: :destroy
  has_many :applied_jurisdictions,
           through: :permit_applications,
           source: :jurisdiction
  has_many :license_agreements,
           class_name: "UserLicenseAgreement",
           dependent: :destroy
  has_many :contacts, as: :contactable, dependent: :destroy
  has_many :collaborators, as: :collaboratorable, dependent: :destroy
  has_many :collaborations,
           foreign_key: "user_id",
           class_name: "Collaborator",
           dependent: :destroy

  has_many :early_access_previews,
           dependent: :destroy,
           foreign_key: :previewer_id
  has_many :early_access_requirement_templates, through: :early_access_previews

  has_one :preference, dependent: :destroy
  accepts_nested_attributes_for :preference
  accepts_nested_attributes_for :physical_address, :mailing_address
  
  # Validations
  validate :valid_role_change, if: :role_changed?, on: :update
  validate :jurisdiction_must_belong_to_correct_roles
  validate :confirmed_user_has_fields
  validate :unique_omniauth_uid
  #validate :single_jurisdiction, unless: :regional_review_manager?

  after_commit :refresh_search_index, if: :saved_change_to_discarded_at
  after_commit :reindex_jurisdiction_user_size
  before_save :create_default_preference

  # Stub this for now since we do not want to use IP Tracking at the moment - Jan 30, 2024
  attr_accessor :current_sign_in_ip, :last_sign_in_ip
  attr_accessor :collaboration_invitation # this is needed to signal that a registration invitation is for collaboration when sending the email

  after_discard { destroy_jurisdiction_collaborator }
  after_save :create_jurisdiction_collaborator,
             if: :saved_change_to_discarded_at

  delegate :sandboxes, to: :jurisdiction

  def confirmation_required?
    false
  end

  def eula_variant
    {
      participant: "terms",
      admin: "terms",
      admin_manager: "terms",
      participant_support_rep: "terms",
      contractor: "terms",
      unassigned: "terms",
      system_admin: nil
    }[
      role.to_sym
    ]
  end

  def name
    "#{first_name} #{last_name}"
  end

  def search_data
    {
      updated_at: updated_at,
      created_at: created_at,
      role: role,
      name: name,
      first_name: first_name,
      last_name: last_name,
      email: email,
      jurisdiction_ids: jurisdictions.pluck(:id),
      discarded: discarded_at.present?,
      last_sign_in_at: last_sign_in_at
    }
  end

  def invitable_roles
    case role
    when "system_admin"
      %w[admin admin_manager participant_support_rep]
    when "admin_manager"
      %w[admin participant_support_rep]
    else
      []
    end
  end

  def staff?
    review_staff? || system_admin?
  end

  def manager?
    admin_manager?
  end

  def review_staff?
    admin? || admin_manager?
  end

  def role_name
    role.gsub("_", " ")
  end

  def blueprint
    UserBlueprint
  end

  def set_collaboration_invitation(permit_collaboration)
    self.collaboration_invitation = {
      permit_collaboration: permit_collaboration
    }
  end

  def create_jurisdiction_collaborator
    return unless review_staff? && kept?

    jurisdictions.each do |jurisdiction|
      existing_collaborator = jurisdiction.collaborators.find_by(user_id: id)

      next if existing_collaborator.present?

      jurisdiction.collaborators.create(user: self)
    end
  end

  def update_user_physical_address(address_data)
    return unless address_data.present?

    physical_address = self.physical_address || build_physical_address
    physical_address.assign_attributes(address_data)
    
    # trigger an update only if changes are detected
    if physical_address.changed?
      physical_address.save!
    end
  end

  def user_has_mailing_address
    mailing_address.present?
  end
  
  def save_user_address(address_data)
    #Rails.logger.info "Address Data: #{address_data.inspect}"  # Debugging log

    return unless address_data.present?

    update_user_physical_address(address_data)

    # Find or initialize the mailing address
    mailing_address = self.mailing_address || build_mailing_address
    mailing_address.assign_attributes(
      user_id: self.id,  # Ensure it's linked to the user
      street_address: address_data[:street_address],
      locality: address_data[:locality],
      region: address_data[:region],
      postal_code: address_data[:postal_code],
      country: address_data[:country],
      address_type: :mailing
    )
    mailing_address.save!
  end

  private

  def destroy_jurisdiction_collaborator
    return unless discarded?

    jurisdictions.each do |jurisdiction|
      existing_collaborator = jurisdiction.collaborators.find_by(user_id: id)

      next unless existing_collaborator.present?

      existing_collaborator.destroy
    end
  end

  def create_default_preference
    return unless preference.blank?

    build_preference(
      enable_in_app_new_template_version_publish_notification: true,
      enable_email_new_template_version_publish_notification: true,
      enable_in_app_customization_update_notification: true,
      enable_email_customization_update_notification: true
    ).save
  end

  def reindex_jurisdiction_user_size
    return unless jurisdictions.any?

    # TODO: if jurisdictions changed?
    jurisdictions.reindex if saved_change_to_role? || destroyed? || new_record?
  end

  def refresh_search_index
    User.search_index.refresh
  end

  def confirmed_user_has_fields
    unless !confirmed? || first_name.present?
      errors.add(:user, "Confirmed user must have first_name")
    end
    #unless !confirmed? || last_name.present?
    #  errors.add(:user, "Confirmed user must have last_name")
    #end
    unless !confirmed? || email.present?
      errors.add(:user, "Confirmed user must have email")
    end
  end

  def jurisdiction_must_belong_to_correct_roles
    if jurisdictions.any? && !review_staff?
      errors.add(:jurisdictions, :reviewers_only)
    end
  end

  def unique_omniauth_uid
    return unless omniauth_uid.present?
    existing_user =
      User
        .where.not(omniauth_uid: nil)
        .find_by(omniauth_uid:, omniauth_provider:)
    return unless existing_user && existing_user != self
    if !system_admin?
      errors.add(
        :base,
        :bceid_taken,
        jurisdiction: existing_user.jurisdictions.first&.name
      )
    elsif system_admin?
      errors.add(:base, :idir_taken)
    end
  end

  def single_jurisdiction
    return if jurisdictions.count <= 1
    errors.add(:base, :single_jurisdiction)
  end

  def valid_role_change
    errors.add(:base, :admin_role_change) if role_was.to_sym == :system_admin
  end
end
