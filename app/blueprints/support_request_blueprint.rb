class SupportRequestBlueprint < Blueprinter::Base
  view :base do
    identifier :id

    fields :additional_text, :created_at, :updated_at

    association :parent_application, blueprint: PermitApplicationBlueprint
    association :requested_by, blueprint: UserBlueprint
    association :linked_application,
                blueprint: PermitApplicationBlueprint,
                view: :minimal_with_documents
  end

  view :minimal do
    identifier :id
    association :parent_application,
                blueprint: PermitApplicationBlueprint,
                view: :bare_minimum
  end
end
