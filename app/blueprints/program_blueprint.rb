class ProgramBlueprint < Blueprinter::Base
  identifier :id

  view :base do
    fields :slug,
           :program_name,
           :funded_by,
           :external_api_state,
           :description_html,
           :admin_managers_size,
           :admin_size,
           :permit_applications_size,
           :created_at,
           :updated_at,
           :external_api_state

    field :external_api_enabled do |program, options|
      program.external_api_enabled?
    end
  end

  view :minimal do
    fields :program_name, :funded_by, :external_api_state

    field :external_api_enabled do |program, options|
      program.external_api_enabled?
    end
  end

  view :summary do
    fields :program_name
  end
end
