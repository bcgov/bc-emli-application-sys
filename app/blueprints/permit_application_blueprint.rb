class PermitApplicationBlueprint < Blueprinter::Base
  view :minimal do
    identifier :id
    fields :nickname, :status, :number, :created_at, :updated_at
    association :program, blueprint: ProgramBlueprint, view: :minimal
    field :submitter do |pa, options|
      SubmitterBlueprint.render(pa.submitter, view: :minimal)
    end
    association :submission_type,
                blueprint: PermitClassificationBlueprint,
                view: :name
    association :user_group_type,
                blueprint: PermitClassificationBlueprint,
                view: :name
    association :audience_type,
                blueprint: PermitClassificationBlueprint,
                view: :name
    association :submission_variant,
                blueprint: PermitClassificationBlueprint,
                view: :name
  end

  view :minimal_with_documents do
    include_view :minimal
    association :supporting_documents, blueprint: SupportingDocumentBlueprint
  end

  view :bare_minimum do
    identifier :id
    fields :nickname, :status, :number
  end

  view :base do
    identifier :id
    fields :nickname,
           :status,
           :number,
           :created_at,
           :updated_at,
           :viewed_at,
           :full_address,
           :pid,
           :pin,
           :zipfile_size,
           :zipfile_name,
           :zipfile_url,
           :reference_number,
           :submitted_at,
           :submitted_for,
           :resubmitted_at,
           :revisions_requested_at,
           :missing_pdfs
    association :submission_type,
                blueprint: PermitClassificationBlueprint,
                view: :base
    association :submission_variant,
                blueprint: PermitClassificationBlueprint,
                view: :base
    association :user_group_type,
                blueprint: PermitClassificationBlueprint,
                view: :base
    association :program, blueprint: ProgramBlueprint, view: :summary
    association :sandbox, blueprint: SandboxBlueprint
    association :submission_versions,
                blueprint: SubmissionVersionBlueprint,
                view: :base
    field :submitter do |pa, options|
      SubmitterBlueprint.render(pa.submitter, view: :minimal)
    end

    association :assigned_users,
                blueprint: UserBlueprint,
                view: :minimal,
                name: :assignedUsers

    field :indexed_using_current_template_version do |pa, options|
      # Indexed data is used to prevent N extra queries on every search
      pa.indexed_using_current_template_version
    end

    association :audience_type,
                blueprint: PermitClassificationBlueprint,
                view: :base do |pa, options|
      pa.template_version&.requirement_template&.audience_type
    end
    association :support_requests,
                blueprint: SupportRequestBlueprint,
                view: :base do |pa, options|
      current_user = options[:current_user]

      # Filter out internal draft support requests from participants
      # Only show them to staff or after they're submitted
      if current_user && current_user.participant?
        filtered = pa.support_requests.reject do |sr|
          sr.linked_application&.audience_type&.code == 'internal' &&
          sr.linked_application&.new_draft?
        end
        filtered
      else
        pa.support_requests
      end
    end
  end

  view :jurisdiction_review_inbox do
    include_view :base

    association :supporting_documents, blueprint: SupportingDocumentBlueprint
    # only the delegatee is needed for the inbox screen
    association :permit_collaborations,
                blueprint: PermitCollaborationBlueprint,
                view: :base do |pa, _options|
      pa.permit_collaborations.where(
        collaboration_type: :review,
        collaborator_type: :delegatee
      )
    end

    field :submitter do |pa, options|
      SubmitterBlueprint.render(pa.submitter, view: :minimal)
    end
  end

  view :extended do
    include_view :base
    fields :formatted_compliance_data, :front_end_form_update
    #:form_customizations
    association :assigned_users,
                blueprint: UserBlueprint,
                view: :minimal,
                name: :assignedUsers

    field :submitter do |pa, options|
      SubmitterBlueprint.render(pa.submitter, view: :minimal)
    end

    field :is_fully_loaded do |pa, options|
      true
    end

    field :form_json do |pa, options|
      pa.form_json(current_user: options[:current_user])
    end

    field :submission_data do |pa, options|
      pa.formatted_submission_data(current_user: options[:current_user])
    end

    association :template_version, blueprint: TemplateVersionBlueprint
    association :published_template_version, blueprint: TemplateVersionBlueprint

    association :supporting_documents,
                blueprint: SupportingDocumentBlueprint do |pa, options|
      pa.supporting_documents_for_submitter_based_on_user_permissions(
        pa.supporting_documents,
        user: options[:current_user]
      )
    end
    association :all_submission_version_completed_supporting_documents,
                blueprint: SupportingDocumentBlueprint do |pa, options|
      pa.supporting_documents_for_submitter_based_on_user_permissions(
        pa.all_submission_version_completed_supporting_documents,
        user: options[:current_user]
      )
    end
    association :jurisdiction, blueprint: JurisdictionBlueprint, view: :base
    association :step_code, blueprint: StepCodeBlueprint
    association :permit_collaborations,
                blueprint: PermitCollaborationBlueprint,
                view: :base
    association :permit_block_statuses, blueprint: PermitBlockStatusBlueprint
    association :submission_versions,
                blueprint: SubmissionVersionBlueprint,
                view: :extended
    association :incoming_support_requests,
                blueprint: SupportRequestBlueprint,
                view: :minimal
  end

  view :pdf_generation do
    include_view :extended

    field :form_json do |pa, options|
      options[:form_json].present? ? options[:form_json] : pa.form_json
    end

    field :form_customizations do |pa, options|
      pa.form_customizations || {}
    end

    field :submitted_at do |pa, options|
      options[:submitted_at].present? ? options[:submitted_at] : pa.submitted_at
    end

    field :submission_data do |pa, options|
      if options[:submission_data].present?
        options[:submission_data]
      else
        pa.formatted_submission_data
      end
    end
  end

  view :jurisdiction_review_extended do
    include_view :extended
    # reinclude fields to show all data for reviewers, which were filtered out in the extended view due to collaboration
    field :form_json
    field :submission_data do |pa, options|
      pa.formatted_submission_data
    end
    association :all_submission_version_completed_supporting_documents,
                blueprint: SupportingDocumentBlueprint
    association :submission_versions,
                blueprint: SubmissionVersionBlueprint,
                view: :review_extended
  end

  view :program_review_extended do
    include_view :extended
    # reinclude fields to show all data for reviewers, which were filtered out in the extended view due to collaboration
    field :form_json
    field :submission_data do |pa, options|
      pa.formatted_submission_data
    end
    association :all_submission_version_completed_supporting_documents,
                blueprint: SupportingDocumentBlueprint
    association :submission_versions,
                blueprint: SubmissionVersionBlueprint,
                view: :review_extended
  end

  view :compliance_update do
    identifier :id
    fields :formatted_compliance_data, :front_end_form_update
  end

  view :external_api do
    identifier :id
    fields :status, :number, :full_address, :submitted_at, :resubmitted_at

    field :submission_data do |pa, _options|
      pa.formatted_submission_data_for_external_use
    end

    association :template_version,
                blueprint: TemplateVersionBlueprint,
                view: :external_api,
                name: :application_version

    field :submitter do |pa, options|
      SubmitterBlueprint.render(pa.submitter, view: :external_api)
    end

    field :user_group_type, name: :user_group_type do |obj|
      obj.user_group_type&.code
    end

    field :submission_type, name: :submission_type do |obj|
      obj.submission_type&.code
    end
  end

  view :supporting_docs_update do
    identifier :id

    fields :missing_pdfs, :zipfile_size, :zipfile_name, :zipfile_url

    association :supporting_documents, blueprint: SupportingDocumentBlueprint
    association :all_submission_version_completed_supporting_documents,
                blueprint: SupportingDocumentBlueprint do |pa, options|
      pa.supporting_documents_for_submitter_based_on_user_permissions(
        pa.all_submission_version_completed_supporting_documents,
        user: options[:current_user]
      )
    end
  end
end
