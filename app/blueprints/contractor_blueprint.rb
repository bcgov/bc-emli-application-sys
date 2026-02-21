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
           :cellphone_number,
           :street_address,
           :city,
           :postal_code,
           :email,
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
    association :suspended_by, blueprint: UserBlueprint, view: :minimal
    association :deactivated_by, blueprint: UserBlueprint, view: :minimal
  end

  # minimal view - excludes employees to avoid validation issues with undefined roles
  view :minimal do
    fields :business_name, :onboarded, :created_at, :updated_at, :number

    field :contact_id do |contractor|
      contractor.contact_id
    end
  end

  view :contact_details do
    fields :business_name,
           :phone_number,
           :cellphone_number,
           :street_address,
           :city,
           :postal_code,
           :email

    field :contact_id do |contractor|
      contractor.contact_id
    end
  end

  view :external_api do
    fields :business_name, :email
  end

  view :external_api_profile do
    fields :business_name,
           :number,
           :email,
           :phone_number,
           :cellphone_number,
           :street_address,
           :city,
           :postal_code,
           :website,
           :created_at,
           :onboarded
    association :contractor_info, blueprint: ContractorInfoBlueprint
    association :employees, blueprint: UserBlueprint, view: :external_api
  end

  # extended_api is also same as base for now, used in API
  view :extended_api do
    include_view :base
  end

  view :with_info do
    include_view :minimal
    association :contractor_info, blueprint: ContractorInfoBlueprint
  end
end
