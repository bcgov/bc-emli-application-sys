class ContractorBlueprint < Blueprinter::Base
  identifier :id

  fields :business_name,
         :website,
         :phone_number,
         :onboarded,
         :created_at,
         :updated_at

  association :contact, blueprint: UserBlueprint
  association :employees, blueprint: UserBlueprint
end
