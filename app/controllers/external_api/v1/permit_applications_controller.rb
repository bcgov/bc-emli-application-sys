class ExternalApi::V1::PermitApplicationsController < ExternalApi::ApplicationController
  include ExternalApi::Concerns::Search::PermitApplications

  before_action :set_permit_application, only: :show
  before_action :set_template_version, only: :show_integration_mapping

  def index
    perform_permit_application_search
    return if performed?

    authorized_results =
      apply_search_authorization(@permit_application_search.results)

    render_success authorized_results,
                   nil,
                   {
                     meta: page_meta(@permit_application_search),
                     #  meta: {
                     #    total_pages:
                     #      (
                     #        authorized_results.count.to_f /
                     #          @permit_application_search.per_page
                     #      ).ceil,
                     #    total_count: authorized_results.count,
                     #    current_page: @permit_application_search.current_page
                     #  },
                     blueprint: PermitApplicationBlueprint,
                     blueprint_opts: {
                       view: :external_api
                     }
                   }
  end

  def summary
    perform_permit_application_summary
    return if performed? # Stop if date validation failed

    authorized_results =
      apply_search_authorization(@permit_application_search.results)

    render_success authorized_results,
                   nil,
                   {
                     meta: page_meta(@permit_application_search),
                     blueprint: PermitApplicationBlueprint,
                     blueprint_opts: {
                       view: :submission_summary
                     }
                   }
  end

  def show
    authorize [:external_api, @permit_application]

    render_success @permit_application,
                   nil,
                   {
                     blueprint: PermitApplicationBlueprint,
                     blueprint_opts: {
                       view: :external_api
                     }
                   }
  end

  def show_integration_mapping
    @integration_mapping =
      @template_version.integration_mappings.find_by(
        jurisdiction: current_external_api_key.jurisdiction
      )

    authorize @integration_mapping,
              policy_class: ExternalApi::PermitApplicationPolicy

    if @integration_mapping.present?
      render_success @integration_mapping,
                     nil,
                     {
                       blueprint: IntegrationMappingBlueprint,
                       blueprint_opts: {
                         view: :external_api
                       }
                     }
    else
      render_error "integration_mapping.not_found_error", status: 404
    end
  end

  private

  def perform_permit_application_summary
    ensure_external_api_key_authorized!

    # Transform simple date parameters to constraints format
    permitted = params.permit(:submitted_from, :submitted_to, :page, :per_page)

    from = validate_date_param(permitted[:submitted_from], :submitted_from)
    to = validate_date_param(permitted[:submitted_to], :submitted_to)
    return if performed?

    constraints = nil
    if from.present? || to.present?
      submitted_at = {}
      submitted_at[:gte] = from if from.present?
      submitted_at[:lte] = to.end_of_day if to.present?
      constraints = { submitted_at: submitted_at }
    end

    # Build where clause with summary-specific filtering
    where = { program_id: current_external_api_key.program_id }

    # Exclude drafts (different from search which filters to in_review)
    where[:status] = { not: :new_draft }

    # Only return participant applications (not contractor onboarding, invoices, etc.)
    participant_type = UserGroupType.find_by!(code: "participant")
    application_type = SubmissionType.find_by!(code: "application")
    where[:user_group_type_id] = participant_type.id
    where[:submission_type_id] = application_type.id

    # Merge date constraints if present
    where.merge!(constraints.to_h.deep_symbolize_keys) if constraints

    # Execute search
    @permit_application_search =
      PermitApplication.search(
        "*",
        order: {
          submitted_at: {
            order: :desc,
            unmapped_type: "long"
          }
        },
        match: :word_start,
        where: where,
        page: permitted[:page],
        per_page:
          (
            if permitted[:page]
              permitted[:per_page] || Kaminari.config.default_per_page
            else
              nil
            end
          ),
        includes: PermitApplication::API_SEARCH_INCLUDES
      )
  end

  def set_permit_application
    @permit_application =
      PermitApplication.for_sandbox(current_sandbox).find(params[:id])
  end

  def set_template_version
    @template_version =
      TemplateVersion.for_sandbox(current_sandbox).find(
        params[:template_version_id]
      )
  end
end
