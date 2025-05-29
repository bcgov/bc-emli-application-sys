class PermitClassificationBlueprint < Blueprinter::Base
  view :base do
    identifier :id
    fields :name, :code, :description, :enabled, :type, :description, :image_url
  end

  view :name do
    # identifier :id
    fields :name, :code
  end
end
