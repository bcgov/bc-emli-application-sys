class OmniauthUserResolver
  attr_reader :auth, :invitation_token, :existing_user
  attr_accessor :user, :invited_user, :error_key

  def initialize(auth:, invitation_token:)
    @auth = auth
    @invitation_token = invitation_token
    @invited_user ||= User.find_by_invitation_token(invitation_token, true)
    @existing_user ||= User.find_by(omniauth_provider:, omniauth_uid:)
  end

  def call
    resolve_user
    return self
  end

  private

  OMNIAUTH_PROVIDERS = {
    idir: "idir",
    bcsc: "bcsc",
    bceid: "bceidboth",
    bceid_business: "bceidbusiness",
    bceid_basic: "bceidbasic"
  }

  def resolve_user
    if should_promote_user?
      result = PromoteUser.new(existing_user:, invited_user:).call
      self.invited_user = result.existing_user
    end

    accept_invitation_with_omniauth if invited_user.present?

    self.user = invited_user || existing_user || create_user

    self.error_key = error_message_key unless user&.valid? && user&.persisted?
  end

  def should_promote_user?
    return unless promotable_user?
    existing_user.id != invited_user.id
  end

  def promotable_user?
    return unless existing_user.present? && invited_user.present?
    existing_user.submitter? || invited_user.regional_review_manager?
  end

  def create_user
    return if omniauth_provider == OMNIAUTH_PROVIDERS[:idir]
    user =
      User.new(
        password: Devise.friendly_token[0, 20],
        omniauth_provider:,
        omniauth_uid:,
        omniauth_email:,
        omniauth_username:,
        first_name: omniauth_givenname,
        last_name: omniauth_familyname,
        email: omniauth_email
      )

    # skip confirmation until user has a chance to add/verify their notification email
    user.skip_confirmation_notification!
    
    # Skip validation initially, so we can add addresses first
    if user.save(validate: false)
      user.save_user_address(omniauth_address)

      # Now run full validations
      if user.valid?
        user.save
        return user
      else
        Rails.logger.error "User validation failed: #{user.errors.full_messages}"
      end
    end

    nil
  end

  def accept_invitation_with_omniauth
    return unless invited_user.present?

    invited_user.update(
      password: Devise.friendly_token[0, 20],
      omniauth_provider:,
      omniauth_uid:,
      omniauth_email:,
      omniauth_username:
    )
    invited_user.accept_invitation! if invited_user.valid?
  end

  def error_message_key
    return "omniauth.unavailable" if user.blank?
    return "omniauth.idir_failure_with_message" if user.super_admin?
    "omniauth.bceid_failure_with_message"
  end

  def raw_info
    @raw_info ||= auth.extra.raw_info
  end

  def omniauth_provider
    @provider ||=
      case raw_info.identity_provider
      when OMNIAUTH_PROVIDERS[:bceid]
        if raw_info.bceid_business_guid
          OMNIAUTH_PROVIDERS[:bceid_business]
        else
          OMNIAUTH_PROVIDERS[:bceid_basic]
        end
      when ENV["KEYCLOAK_CLIENT"]
        # if the provider matches the kc client value then it's bcsc
        "bcsc"
      else
        raw_info.identity_provider
      end
  end

  def omniauth_uid
    @uid ||= 
      if raw_info.identity_provider == ENV["KEYCLOAK_CLIENT"]
        raw_info.sub.split("@").first
      else
        raw_info.bceid_user_guid || raw_info.idir_user_guid
      end
  end

  def omniauth_email
    @email ||= auth.info.email 
  end

  def omniauth_username
    @username ||= 
      if raw_info.identity_provider == ENV["KEYCLOAK_CLIENT"]
        raw_info.sub.split("@").first
      else
        raw_info.bceid_username || raw_info.idir_username
      end
  end

  def omniauth_givenname
    @first_name ||= raw_info.given_name
  end

  def omniauth_familyname
    @last_name ||= raw_info.family_name
  end

  def omniauth_address
    return unless raw_info.identity_provider == ENV["KEYCLOAK_CLIENT"]

    address_info = raw_info.address
    {
      street_address: address_info.street_address,
      locality: address_info.locality,
      region: address_info.region,
      postal_code: address_info.postal_code,
      country: address_info.country
    }
  end
end