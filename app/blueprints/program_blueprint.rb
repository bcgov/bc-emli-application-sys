class ProgramBlueprint < Blueprinter::Base
  identifier :id

  view :base do
    fields :program_name,
           :funded_by,
           :description_html,
           :external_api_state,
           :created_at,
           :updated_at
  end

  view :minimal do
    fields :program_name, :funded_by, :external_api_state
  end
end
