module Api::Concerns::Search::PermitApplications
  extend ActiveSupport::Concern

  def perform_permit_application_search
    search_conditions = {
      order: permit_application_order,
      match: :word_start,
      fields: [
        { number: :word_middle },
        { nickname: :word_middle },
        { full_address: :word_middle },
        { permit_classifications: :word_middle },
        { submitter: :word_middle },
        { status: :word_middle },
        { user_group_type_id: :word_middle },
        { submission_type_id: :word_middle },
        { audience_type_id: :word_middle },
        { review_delegatee_name: :word_middle }
      ],
      where: permit_application_where_clause,
      page: permit_application_search_params[:page],
      per_page:
        (
          if permit_application_search_params[:page]
            (
              permit_application_search_params[:per_page] ||
                Kaminari.config.default_per_page
            )
          else
            nil
          end
        ),
      includes: PermitApplication::SEARCH_INCLUDES
    }
    @permit_application_search =
      PermitApplication.search(permit_application_query, **search_conditions)
  end

  private

  def permit_application_search_params
    params.delete(:sort) if params[:sort].nil?
    params.permit(
      :query,
      :page,
      :per_page,
      program: {
      },
      permit_application: {
      },
      filters: [
        :requirement_template_id,
        :template_version_id,
        :user_group_type_id,
        { submission_type_id: [] },
        :audience_type_id,
        { status: [] }
      ],
      sort: %i[field direction]
    )
  end

  def permit_application_query
    if permit_application_search_params[:query].present?
      permit_application_search_params[:query]
    else
      "*"
    end
  end

  def permit_application_order
    if (sort = permit_application_search_params[:sort])
      { sort[:field] => { order: sort[:direction], unmapped_type: "long" } }
    elsif current_user.participant?
      { created_at: { order: :desc, unmapped_type: "long" } }
    else
      { number: { order: :desc, unmapped_type: "long" } }
    end
  end

  def permit_application_where_clause
    filters = permit_application_search_params[:filters]
    where =
      if @program
        { program_id: @program.id }
      else
        { user_ids_with_submission_edit_permissions: current_user.id }
      end
    where[:sandbox_id] = current_sandbox&.id unless current_user.system_admin?

    filters.to_h.deep_symbolize_keys.compact.merge!(where)
  end
end
