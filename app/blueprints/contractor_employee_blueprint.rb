class ContractorEmployeeBlueprint < Blueprinter::Base
  identifier :id

  fields :created_at, :updated_at

  association :contractor, blueprint: ContractorBlueprint
  association :employee, blueprint: UserBlueprint
end
