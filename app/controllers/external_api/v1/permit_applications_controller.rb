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
    return if performed?

    render_success @permit_application_summary,
                   nil,
                   {
                     meta: page_meta(@permit_application_summary),
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

    permitted =
      params.permit(
        :submitted_from,
        :submitted_to,
        :screened_in_from,
        :screened_in_to,
        :updated_from,
        :updated_to,
        :status,
        :page,
        :per_page
      )

    from = validate_date_param(permitted[:submitted_from], :submitted_from)
    to = validate_date_param(permitted[:submitted_to], :submitted_to)
    screened_in_from =
      validate_date_param(permitted[:screened_in_from], :screened_in_from)
    screened_in_to =
      validate_date_param(permitted[:screened_in_to], :screened_in_to)
    updated_from = validate_date_param(permitted[:updated_from], :updated_from)
    updated_to = validate_date_param(permitted[:updated_to], :updated_to)
    return if performed?

    # Accept a single status code or a comma-separated list
    # (?status=in_review or ?status=in_review,resubmitted), matching the
    # codebase's comma-separated multi-value query convention (see visibility).
    statuses = permitted[:status].to_s.split(",").map(&:strip).reject(&:blank?)
    invalid_statuses = statuses - PermitApplication.statuses.keys
    if invalid_statuses.any?
      render_error(
        nil,
        {
          status: 400,
          meta: {
            message: "Invalid status: #{invalid_statuses.join(", ")}"
          }
        }
      )
      return
    end

    scope =
      PermitApplication
        .includes(PermitApplication::SUMMARY_API_SEARCH_INCLUDES)
        .where(
          program_id: current_external_api_key.program_id,
          user_group_type_id: UserGroupType.find_by!(code: "participant").id,
          submission_type_id: SubmissionType.find_by!(code: "application").id
        )
        .order(submitted_at: :desc)

    scope =
      if statuses.any?
        scope.where(status: statuses)
      else
        scope.where.not(status: :new_draft)
      end

    scope =
      scope.where(
        "submitted_at >= ?",
        from.in_time_zone.beginning_of_day
      ) if from.present?
    scope =
      scope.where(
        "submitted_at <= ?",
        to.in_time_zone.end_of_day
      ) if to.present?
    scope =
      scope.where(
        "screened_in_at >= ?",
        screened_in_from.in_time_zone.beginning_of_day
      ) if screened_in_from.present?
    scope =
      scope.where(
        "screened_in_at <= ?",
        screened_in_to.in_time_zone.end_of_day
      ) if screened_in_to.present?
    scope =
      scope.where(
        "updated_at >= ?",
        updated_from.in_time_zone.beginning_of_day
      ) if updated_from.present?
    scope =
      scope.where(
        "updated_at <= ?",
        updated_to.in_time_zone.end_of_day
      ) if updated_to.present?

    page = normalized_page(permitted[:page])
    per_page = normalized_per_page(permitted[:per_page])

    @permit_application_summary = scope.page(page).per(per_page)
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
