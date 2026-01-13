module Api::Concerns::Search::Contractors
  extend ActiveSupport::Concern

  def perform_contractor_search
    params = search_params
    query = params[:query].presence || "*"

    # First try exact ID match, then fall back to search including ID field
    if query != "*" && Contractor.exists?(id: query)
      # Direct database lookup for exact ID match
      contractor = Contractor.find(query)
      @contractor_search =
        OpenStruct.new(
          results:
            policy_scope(Contractor).where(id: contractor.id).includes(
              :contact
            ),
          total_count: 1,
          total_pages: 1,
          current_page: 1
        )
    else
      # Check if query looks like partial UUID (hex chars with optional hyphens, 2+ chars)
      if query != "*" && query.match?(/\A[0-9a-f-]{2,}\z/i) &&
           !query.include?(" ")
        # Use prefix search for UUID matching only
        @contractor_search =
          Contractor.search("*") do |body|
            body[:query] = { prefix: { id: query } }
            body[:size] = params[:per_page] || 25
            body[:from] = ((params[:page]&.to_i || 1) - 1) *
              (params[:per_page]&.to_i || 25)
          end
      else
        # Use standard searchkick for text searches
        @contractor_search =
          Contractor.search(
            query,
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
    end
  end

  private

  def search_params
    @search_params ||= contractor_search_params
  end

  def contractor_search_params
    params.delete(:sort) if params[:sort].nil?
    permitted_params =
      params.permit(
        :id,
        :query,
        :page,
        :per_page,
        :status,
        sort: %i[field direction]
      )

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
    where_clause = {}

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
