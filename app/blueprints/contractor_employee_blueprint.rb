class ContractorEmployeeBlueprint < Blueprinter::Base
  identifier :id

  fields :created_at, :updated_at

  association :contractor, blueprint: ContractorBlueprint, view: :minimal
  association :employee, blueprint: UserBlueprint, view: :minimal
end
