class PermitClassificationBlueprint < Blueprinter::Base
  view :base do
    # identifier :id
    fields :id, :name, :code, :description, :enabled, :type, :parent_id
  end

  view :name do
    # identifier :id
    fields :name, :code
  end
end
