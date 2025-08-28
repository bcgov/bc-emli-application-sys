module Api::Concerns::Search::PermitApplications
  extend ActiveSupport::Concern

  def perform_permit_application_search
    params = search_params

    @permit_application_search =
      PermitApplication.search(
        params[:query].presence || "*",
        fields: %i[
          number
          permit_classifications
          submitter_name
          review_delegatee_name
        ],
        match: :word_middle,
        misspellings: false,
        where: permit_application_where_clause,
        order: permit_application_order,
        page: params[:page],
        per_page: params[:per_page] || Kaminari.config.default_per_page,
        includes: PermitApplication::SEARCH_INCLUDES
      )
  end

  private

  def search_params
    @search_params ||= permit_application_search_params
  end

  def permit_application_search_params
    params.delete(:sort) if params[:sort].nil?
    permitted_params =
      params.permit(
        :id,
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
          { audience_type_id: [] },
          { submission_type_id: [] },
          { status: [] }
        ],
        sort: %i[field direction]
      )

    @user_group_type =
      UserGroupType.find_by(
        code: permitted_params[:filters][:user_group_type_id]
      )
    @audience_types =
      AudienceType.where(code: permitted_params[:filters][:audience_type_id])
    @submission_types =
      SubmissionType.where(
        code: permitted_params[:filters][:submission_type_id]
      )

    permitted_params
  end

  def permit_application_order
    if (sort = search_params[:sort])
      field_name =
        sort[:field] == "assigned" ? "review_delegatee_name" : sort[:field]
      direction =
        %w[asc desc].include?(sort[:direction]) ? sort[:direction] : "asc"
      { field_name => { order: direction, unmapped_type: "long" } }
    elsif current_user.participant?
      { created_at: { order: :desc, unmapped_type: "long" } }
    else
      { number: { order: :desc, unmapped_type: "long" } }
    end
  end

  def permit_application_where_clause
    filters = search_params[:filters]
    where =
      if @program
        { program_id: @program.id }
      else
        { user_ids_with_submission_edit_permissions: current_user.id }
      end
    where.merge!(
      sandbox_id: (current_sandbox&.id unless current_user.system_admin?),
      user_group_type_id: @user_group_type&.id,
      audience_type_id: @audience_types.pluck(:id),
      submission_type_id: @submission_types.pluck(:id)
    ).compact!
    filters.to_h.deep_symbolize_keys.compact.merge!(where)
  end
end
