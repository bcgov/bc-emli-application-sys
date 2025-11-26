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
           :number

    association :contact, blueprint: UserBlueprint, view: :minimal
    association :employees, blueprint: UserBlueprint, view: :minimal
  end

  # minimal is same as base for now, can be adjusted if needed.
  view :minimal do
    include_view :base
  end

  # extended_api is also same as base for now, used in API
  view :extended_api do
    include_view :base
  end
end
