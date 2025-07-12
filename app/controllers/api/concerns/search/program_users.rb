# app/controllers/concerns/api/search/program_users.rb
module Api::Concerns::Search::ProgramUsers
  extend ActiveSupport::Concern

  def perform_user_search
    query = params[:query].presence || "*"

    # Start with memberships scoped to the current program
    memberships_scope =
      @program.program_memberships.includes(
        program_classification_memberships: %i[user_group_type submission_type]
      )

    # Filter by status
    case (params[:status].presence || "active")
    when "active"
      memberships_scope =
        memberships_scope
          .where(deactivated_at: nil)
          .joins(:user)
          .where(users: { reviewed: true })
    when "deactivated"
      memberships_scope = memberships_scope.where.not(deactivated_at: nil)
    when "pending"
      memberships_scope =
        memberships_scope
          .joins(:user)
          .where.not(users: { invitation_sent_at: nil })
          .where(users: { invitation_accepted_at: nil })
          .where(users: { discarded_at: nil })
    end

    memberships = memberships_scope.to_a

    # Index all memberships by user_id for rendering
    @memberships_by_user_id = memberships.group_by(&:user_id)

    # Extract user_ids for search
    user_ids = memberships.map(&:user_id)

    # Filter out system_admin users if current user is an admin_manager
    if Current.user.admin_manager?
      system_admin_ids =
        User.where(id: user_ids, role: "system_admin").pluck(:id)
      user_ids -= system_admin_ids
    end

    # Filter users based on assignment permissions
    user_ids =
      ApplicationAssignmentPolicy.assignable_user_ids(Current.user, user_ids)

    # Run the search
    @user_search =
      User.search(
        query,
        fields: %i[
          first_name
          last_name
          email
          role_text
          classification_labels_text
        ],
        match: :text_middle,
        where: {
          id: user_ids
        },
        includes: %i[physical_address mailing_address preference],
        page: params[:page] || 1,
        per_page: params[:per_page] || 25
      )
  end
end
