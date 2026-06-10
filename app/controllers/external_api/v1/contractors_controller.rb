class ExternalApi::V1::ContractorsController < ExternalApi::ApplicationController
  before_action :ensure_external_api_key_authorized!
  before_action :set_contractor, only: :show

  def index
    permitted =
      params.permit(
        :approved_or_updated_from,
        :approved_or_updated_to,
        :page,
        :per_page
      )
    from =
      validate_date_param(
        permitted[:approved_or_updated_from],
        :approved_or_updated_from
      )
    to =
      validate_date_param(
        permitted[:approved_or_updated_to],
        :approved_or_updated_to
      )
    return if performed?

    scope =
      policy_scope([:external_api, Contractor]).joins(
        :contractor_info
      ).includes(:contractor_info, :employees)
    scope =
      scope.where(
        "contractor_infos.updated_at >= ?",
        from.in_time_zone.beginning_of_day
      ) if from.present?
    scope =
      scope.where(
        "contractor_infos.updated_at <= ?",
        to.in_time_zone.end_of_day
      ) if to.present?

    page = normalized_page(permitted[:page])
    per_page = normalized_per_page(permitted[:per_page])
    results = scope.page(page).per(per_page)
    meta = page_meta(results)

    render_success results,
                   nil,
                   {
                     meta: meta,
                     blueprint: ContractorBlueprint,
                     blueprint_opts: {
                       view: :external_api_profile
                     }
                   }
  end

  def show
    authorize [:external_api, @contractor]

    render_success @contractor,
                   nil,
                   {
                     blueprint: ContractorBlueprint,
                     blueprint_opts: {
                       view: :external_api_profile
                     }
                   }
  end

  private

  def set_contractor
    @contractor =
      Contractor.includes(:contractor_info, :employees).find(params[:id])
  end
end
