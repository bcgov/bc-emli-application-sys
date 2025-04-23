# app/controllers/concerns/api/search/program_users.rb
module Api::Concerns::Search::ProgramUsers
  extend ActiveSupport::Concern

  def perform_user_search(filters = {})
    query = params[:query].presence || "*"

    user_ids = @program.program_classification_memberships.pluck(:user_id)

    where_conditions = { id: user_ids }

    case (params[:status].presence || "active")
    when "active"
      where_conditions[:reviewed] = true
      where_conditions[:discarded_at] = nil
    when "deactivated"
      where_conditions[:discarded_at] = { not: nil }
    when "pending"
      where_conditions[:invitation_sent_at] = { not: nil }
      where_conditions[:invitation_accepted_at] = nil
    end
    #Rails.logger.info "Search WHERE conditions: #{where_conditions.inspect}"
    @user_search =
      User.search(
        query,
        fields: %i[name email],
        where: where_conditions,
        includes: %i[mailing_address physical_address preference],
        page: params[:page] || 1,
        per_page: params[:per_page] || 25
      )

    #Rails.logger.info "User Search results: #{@user_search.inspect}"
  end
end
