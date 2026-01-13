class UserBlueprint < Blueprinter::Base
  identifier :id

  view :minimal do
    fields :email,
           :role,
           :first_name,
           :last_name,
           :organization,
           :certified,
           :confirmed_at,
           :discarded_at,
           :reviewed
  end

  view :accepted_license_agreements do
    association :license_agreements, blueprint: UserLicenseAgreementBlueprint
  end

  view :base do
    include_view :minimal
    fields :unconfirmed_email,
           :omniauth_username,
           :omniauth_email,
           :omniauth_provider,
           :created_at,
           :updated_at,
           :confirmation_sent_at,
           :discarded_at,
           :last_sign_in_at,
           :invitation_sent_at,
           :invitation_accepted_at

    field :has_pending_invitation do |user|
      user.invitation_token.present?
    end

    association :physical_address, blueprint: UserAddressBlueprint
    association :mailing_address, blueprint: UserAddressBlueprint
    association :preference, blueprint: PreferenceBlueprint
  end

  view :external_api do
    fields :email, :first_name, :last_name
  end

  view :current_user do
    include_view :base
    field :eula_accepted do |user, _options|
      user.eula_variant.present? &&
        user.license_agreements.active_agreement(user.eula_variant).present?
    end
  end

  view :extended do
    include_view :base
    include_view :current_user
    association :jurisdictions, blueprint: JurisdictionBlueprint, view: :base

    # Include contractor information for contractor users
    field :contractor do |user, _options|
      if user.contractor?
        # Check if user is a contractor contact (primary contact)
        contractor_as_contact = Contractor.find_by(contact: user)
        if contractor_as_contact
          ContractorBlueprint.render_as_hash(contractor_as_contact, view: :base)
        else
          # Check if user is an employee
          contractor_employee = user.contractor_employees.first
          if contractor_employee
            ContractorBlueprint.render_as_hash(
              contractor_employee.contractor,
              view: :base
            )
          end
        end
      end
    end

    # Flag to indicate if user's contractor is suspended (for contractors AND employees)
    field :contractor_suspended do |user|
      user.contractor_suspended?
    end

    # Flag to indicate if user's contractor is deactivated (for contractors AND employees)
    field :contractor_access_blocked do |user|
      user.contractor_access_blocked?
    end
  end

  view :invited_user do
    fields :email, :role

    field :invited_by_email do |user, _options|
      user.invited_by&.email
    end

    association :invited_to_program,
                blueprint: ProgramBlueprint,
                view: :minimal do |user, _options|
      _options[:program]
    end
  end

  view :with_membership do
    include_view :base

    field :program_memberships do |user, options|
      (options[:memberships_by_user_id][user.id] || []).map do |membership|
        {
          id: membership.id,
          deactivated_at: membership.deactivated_at,
          program_id: membership.program_id,
          classifications:
            membership.program_classification_memberships.map do |pcm|
              {
                user_group_type: pcm.user_group_type&.name,
                submission_type: pcm.submission_type&.name
              }
            end
        }
      end
    end
  end
end
