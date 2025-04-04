class ProgramBlueprint < Blueprinter::Base
  identifier :id

  view :base do
    fields :slug,
           :program_name,
           :funded_by,
           :external_api_state,
           # :user_group_type,
           #  :qualifier,
           #  :qualified_name,
           #  :reverse_qualified_name,
           :description_html,
           #  :review_managers_size,
           #  :reviewers_size,
           #  :permit_applications_size,
           #  :regional_district_name,
           :created_at,
           #  :submission_inbox_set_up,
           :updated_at,
           :external_api_state

    field :external_api_enabled do |program, options|
      program.external_api_enabled?
    end
    association :contacts, blueprint: ContactBlueprint
    # association :permit_type_submission_contacts,
    #             blueprint: PermitTypeSubmissionContactBlueprint
    # association :sandboxes, blueprint: SandboxBlueprint
    # association :permit_type_required_steps,
    #             blueprint: PermitTypeRequiredStepBlueprint

    # association :permit_type_required_steps,
    #             blueprint:
    #               PermitTypeRequiredStepBlueprint do |program, _options|
    #   program.enabled_permit_type_required_steps
    # end
  end

  view :minimal do
    fields :program_name,
           :funded_by,
           :submission_inbox_set_up,
           :external_api_state

    field :external_api_enabled do |program, options|
      program.external_api_enabled?
    end
  end
end
