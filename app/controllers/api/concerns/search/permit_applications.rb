module Api::Concerns::Search::PermitApplications
  extend ActiveSupport::Concern

  # Simple status priority for business sorting
  STATUS_PRIORITY = {
    "newly_submitted" => 1,
    "revisions_requested" => 2,
    "resubmitted" => 3,
    "in_review" => 4,
    "ineligible" => 5,
    "approved" => 6
  }.freeze

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
          :is_supported_applications_page,
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
      SubmissionType
        .where(code: permitted_params[:filters][:submission_type_id])

    permitted_params
  end

  def permit_application_order
    if (sort = search_params[:sort])
      # User clicked a column - use simple field sorting
      field_name =
        case sort[:field]
        when "assigned"
          "review_delegatee_name"
        when "status"
          "status_display"
        else
          sort[:field]
        end
      direction =
        %w[asc desc].include?(sort[:direction]) ? sort[:direction] : "asc"
      { field_name => { order: direction, unmapped_type: "long" } }
    elsif current_user.participant?
      { created_at: { order: :desc, unmapped_type: "long" } }
    else
      # Default sort - Business priority order (simple script)
      {
        _script: {
          type: "number",
          script: {
            source:
              "
              if (doc.containsKey('status') && doc['status'].size() > 0) {
                def statusPriority = [#{status_priority_map}];
                return statusPriority.getOrDefault(doc['status'].value, 999);
              }
              return 999;
            "
          },
          order: "asc"
        }
      }
    end
  end

  def permit_application_where_clause
    filters = search_params[:filters]
    where =
      if @program
        { program_id: @program.id }
      elsif current_user.participant?
        # Participants can only see applications they have edit permissions for
        { user_ids_with_submission_edit_permissions: current_user.id }
      else
        # Admin users can see all applications (no user permission filter)
        {}
      end
    where.merge!(
      sandbox_id: (current_sandbox&.id unless current_user.system_admin?),
      user_group_type_id: @user_group_type&.id,
      audience_type_id: @audience_types.pluck(:id),
      submission_type_id: @submission_types.pluck(:id)
    ).compact!

    # Add boolean query for supported applications page
    if filters[:is_supported_applications_page] == true
      where[:_or] = [
        # Applications created by admin/admin_manager/system_admin
        { submitter_role: ['admin', 'admin_manager', 'system_admin'] },
        # OR submitted participant applications with draft support requests
        {
          _and: [
            { user_group_type_code: 'participant' },
            { is_submitted: true },
            { has_draft_support_requests: true }
          ]
        },
        # OR draft internal support requests (admin uploads on behalf of participant)
        {
          _and: [
            { status: 'new_draft' },
            { submission_type_code: 'support_request' },
            { audience_type_code: 'internal' }
          ]
        }
      ]

      # Exclude draft external support requests (participant handles these)
      # Exclude draft support requests requested by participants
      where[:_not] = {
        _or: [
          {
            _and: [
              { status: 'new_draft' },
              { submission_type_code: 'support_request' },
              { audience_type_code: 'external' }
            ]
          },
          {
            _and: [
              { status: 'new_draft' },
              { submission_type_code: 'support_request' },
              { is_support_request_by_participant: true }
            ]
          }
        ]
      }
    end

    filters.to_h.deep_symbolize_keys.compact.except(:is_supported_applications_page).merge!(where)
  end

  def status_priority_map
    @status_priority_map ||=
      STATUS_PRIORITY.map { |k, v| "'#{k}': #{v}" }.join(", ")
  end
end
