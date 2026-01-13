# app/blueprints/contractor_blueprint.rb
class ContractorBlueprint < Blueprinter::Base
  identifier :id

  view :accepted_license_agreements do
    association :license_agreements, blueprint: UserLicenseAgreementBlueprint
  end

  # base view with the full set of fields
  view :base do
    fields :business_name,
           :website,
           :phone_number,
           :onboarded,
           :created_at,
           :updated_at,
           :number,
           :suspended_at,
           :suspended_reason,
           :deactivated_at,
           :deactivated_reason

    association :contact, blueprint: UserBlueprint, view: :minimal
    association :employees, blueprint: UserBlueprint, view: :minimal
  end

  # minimal view - excludes employees to avoid validation issues with undefined roles
  view :minimal do
    fields :business_name,
           :website,
           :phone_number,
           :onboarded,
           :created_at,
           :updated_at,
           :number

    field :contact_id do |contractor|
      contractor.contact_id
    end
  end

  # extended_api is also same as base for now, used in API
  view :extended_api do
    include_view :base
  end
end
