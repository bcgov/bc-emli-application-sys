class SupportRequestBlueprint < Blueprinter::Base
  identifier :id

  fields :additional_text, :created_at, :updated_at

  association :parent_application, blueprint: PermitApplicationBlueprint
  association :requested_by, blueprint: UserBlueprint
  association :linked_application, blueprint: PermitApplicationBlueprint
end
