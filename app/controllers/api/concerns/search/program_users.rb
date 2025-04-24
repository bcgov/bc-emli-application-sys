# app/controllers/concerns/api/search/program_users.rb
module Api::Concerns::Search::ProgramUsers
  extend ActiveSupport::Concern

  def perform_user_search(filters = {})
    query = params[:query].presence || "*"

    memberships_scope =
      @program.program_classification_memberships.includes(
        :user,
        :user_group_type,
        :submission_type
      )

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
    end

    # create a fully filtered list
    memberships_array = memberships_scope.to_a
    @memberships_by_user_id = memberships_array.index_by(&:user_id)
    user_ids = @memberships_by_user_id.keys

    @user_search =
      User.search(
        query,
        fields: %i[name email],
        where: {
          id: user_ids
        },
        page: params[:page] || 1,
        per_page: params[:per_page] || 25
      )
  end
end
