module Api::Concerns::Search::Contractors
  extend ActiveSupport::Concern

  def perform_contractor_search
    params = search_params
    query = params[:query].presence || "*"

    @contractor_search =
      Contractor.search(
        query,
        fields: %i[
          business_name
          contact_name
          contact_email
          number
          suspended_by_name
          deactivated_by_name
        ],
        match: :word_middle,
        misspellings: false,
        where: contractor_where_clause,
        order: contractor_order,
        page: params[:page],
        per_page: params[:per_page],
        includes: [
          :contact,
          { contractor_onboards: %i[suspended_by deactivated_by] }
        ]
      )
  end

  private

  def search_params
    @search_params ||= contractor_search_params
  end

  def contractor_search_params
    params.delete(:sort) if params[:sort].nil?
    params.permit(:query, :page, :per_page, :status, sort: %i[field direction])
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
    where_clause = {}

    # Authorization: non-admins can only view contractors where they are the contact
    unless current_user.system_admin? || current_user.admin? ||
             current_user.admin_manager?
      where_clause[:contact_id] = current_user.id
    end

    # Apply status filtering
    status = search_params[:status]
    case status
    when "active"
      # Active: neither suspended nor deactivated
      where_clause[:suspended_at] = nil
      where_clause[:deactivated_at] = nil
    when "suspended"
      # Suspended: has suspended_at but not deactivated_at
      where_clause[:deactivated_at] = nil
      where_clause[:suspended_at] = { not: nil }
    when "removed"
      # Removed: has deactivated_at
      where_clause[:deactivated_at] = { not: nil }
    end

    where_clause
  end
end
