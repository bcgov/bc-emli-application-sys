module Api::Concerns::Search::Contractors
  extend ActiveSupport::Concern

  def perform_contractor_search
    params = search_params

    @contractor_search =
      Contractor.search(
        params[:query].presence || "*",
        fields: %i[business_name contact_name contact_email],
        match: :word_middle,
        misspellings: false,
        where: contractor_where_clause,
        order: contractor_order,
        page: params[:page],
        per_page: params[:per_page],
        includes: [:contact]
      )
  end

  private

  def search_params
    @search_params ||= contractor_search_params
  end

  def contractor_search_params
    params.delete(:sort) if params[:sort].nil?
    permitted_params =
      params.permit(:id, :query, :page, :per_page, sort: %i[field direction])

    permitted_params
  end

  def contractor_order
    if (sort = search_params[:sort])
      field_name = sort[:field]
      direction =
        %w[asc desc].include?(sort[:direction]) ? sort[:direction] : "asc"
      { field_name => { order: direction, unmapped_type: "long" } }
    else
      { updated_at: { order: :desc, unmapped_type: "long" } }
    end
  end

  def contractor_where_clause
    if current_user.system_admin? || current_user.admin? ||
         current_user.manager?
      return {}
    end

    { contact_id: current_user.id }
  end
end
