class ExternalApi::V1::InvoicesController < ExternalApi::ApplicationController
  before_action :set_invoice, only: :show

  def index
    perform_invoice_search
    return if performed? # Stop if date validation failed

    authorized_results = apply_search_authorization(@invoice_search.results)

    render_success authorized_results,
                   nil,
                   {
                     meta: page_meta(@invoice_search),
                     blueprint: PermitApplicationBlueprint,
                     blueprint_opts: {
                       view: :external_api
                     }
                   }
  end

  def summary
    perform_invoice_search
    return if performed? # Stop if date validation failed

    authorized_results = apply_search_authorization(@invoice_search.results)

    render_success authorized_results,
                   nil,
                   {
                     meta: page_meta(@invoice_search),
                     blueprint: PermitApplicationBlueprint,
                     blueprint_opts: {
                       view: :invoice_summary
                     }
                   }
  end

  def show
    authorize [:external_api, @invoice]

    render_success @invoice,
                   nil,
                   {
                     blueprint: PermitApplicationBlueprint,
                     blueprint_opts: {
                       view: :external_api
                     }
                   }
  end

  private

  def ensure_external_api_key_authorized!
    # This search should always be scoped to a program via the api key.
    # The following condition should never be true, but is an added redundancy
    # for security purposes.
    if current_external_api_key.blank? ||
         current_external_api_key.program_id.blank?
      raise Pundit::NotAuthorizedError
    end
  end

  def perform_invoice_search
    ensure_external_api_key_authorized!

    permitted = params.permit(:submitted_from, :submitted_to, :page, :per_page)
    constraints = build_date_constraints(permitted)
    return if performed? # Stop if date validation failed
    where = build_invoice_where_clause(constraints)

    @invoice_search =
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
              (permitted[:per_page] || Kaminari.config.default_per_page)
            else
              nil
            end
          ),
        includes: PermitApplication::API_SEARCH_INCLUDES
      )
  end

  def build_date_constraints(permitted)
    from = validate_date_param(permitted[:submitted_from], :submitted_from)
    to = validate_date_param(permitted[:submitted_to], :submitted_to)
    return nil if performed?
    return nil unless from.present? || to.present?

    submitted_at = {}
    submitted_at[:gte] = from if from.present?
    submitted_at[:lte] = to if to.present?

    { submitted_at: submitted_at }
  end

  def build_invoice_where_clause(constraints = nil)
    where = { program_id: current_external_api_key.program_id }

    # Always exclude drafts - invoices API only returns submitted invoices
    where[:status] = { not: :new_draft }

    # Only return contractor invoices (not participant applications, contractor onboarding, etc.)
    contractor_type = UserGroupType.find_by!(code: "contractor")
    invoice_type = SubmissionType.find_by!(code: "invoice")
    where[:user_group_type_id] = contractor_type.id
    where[:submission_type_id] = invoice_type.id

    # Merge date constraints if present
    where.merge!(constraints.to_h.deep_symbolize_keys) if constraints

    where
  end

  def set_invoice
    @invoice =
      PermitApplication
        .for_sandbox(current_sandbox)
        .where(
          submission_type: SubmissionType.find_by(code: "invoice"),
          user_group_type: UserGroupType.find_by(code: "contractor")
        )
        .find(params[:id])
  end
end
