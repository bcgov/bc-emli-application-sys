class ContractorOnboardBlueprint < Blueprinter::Base
  identifier :id

  fields :deactivated_at,
         :suspended_reason,
         :suspended_at,
         :created_at,
         :updated_at

  association :contractor, blueprint: ContractorBlueprint
  association :onboard_application, blueprint: PermitApplicationBlueprint
end
