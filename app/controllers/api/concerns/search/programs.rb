module Api::Concerns::Search::Programs
  extend ActiveSupport::Concern

  def perform_search_programs
    search_params = {
      order: program_order,
      match: :word_start,
      page: program_search_params[:page],
      per_page:
        (
          if program_search_params[:page]
            (
              program_search_params[:per_page] ||
                Kaminari.config.default_per_page
            )
          else
            nil
          end
        )
    }

    # Conditionally add the `where` clause
    search_params[
      :where
    ] = program_where_clause if program_where_clause.present?

    @search =
      Program.search(
        program_query,
        **search_params,
        includes: Program::BASE_INCLUDES
      )
  end

  private

  def program_search_params
    params.permit(
      :query,
      :page,
      :per_page,
      filters: [:submission_inbox_set_up],
      sort: %i[field direction]
    )
  end

  def program_query
    program_search_params[:query].present? ? program_search_params[:query] : "*"
  end

  def program_order
    if (sort = program_search_params[:sort])
      field = sort[:field].to_sym if sort[:field].present?
      direction = sort[:direction].to_sym if sort[:direction].present?
      # Only use unmapped_type if the field is truly numeric
      { field => { order: direction || :asc, unmapped_type: "long" } }
    else
      { program_name: { order: :asc } }
    end
  end

  def program_where_clause
    program_search_params[:filters]
  end
end
