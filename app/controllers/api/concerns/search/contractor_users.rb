# app/controllers/api/concerns/search/contractor_users.rb
module Api::Concerns::Search::ContractorUsers
  extend ActiveSupport::Concern

  def perform_contractor_user_search
    query = params[:query].presence || "*"

    # Start with contractor employees scoped to the current contractor
    contractor_employees_scope =
      @contractor.contractor_employees.includes(:employee)

    # Filter by status - contractor employees follow invitation model like program users
    case (params[:status].presence || "active")
    when "active"
      contractor_employees_scope =
        contractor_employees_scope.joins(:employee).where(
          users: {
            discarded_at: nil,
            reviewed: true
          }
        )
    when "pending"
      contractor_employees_scope =
        contractor_employees_scope
          .joins(:employee)
          .where.not(users: { invitation_sent_at: nil })
          .where.not(users: { invitation_token: nil })
          .where(users: { invitation_accepted_at: nil })
          .where(users: { discarded_at: nil })
    when "deactivated"
      contractor_employees_scope =
        contractor_employees_scope
          .joins(:employee)
          .where.not(users: { discarded_at: nil })
    end

    # Extract user_ids for search
    user_ids = contractor_employees_scope.pluck(:employee_id)

    # Run the search
    @user_search =
      User.search(
        query,
        fields: %i[first_name last_name email],
        match: :text_middle,
        where: {
          id: user_ids
        },
        order: user_order,
        includes: [],
        page: params[:page] || 1,
        per_page: params[:per_page] || 25
      )
  end

  private

  def user_order
    if (sort = params[:sort])
      # When sorting by first_name, also sort by last_name as tiebreaker
      if sort[:field] == "first_name"
        [
          {
            "first_name" => {
              order: sort[:direction],
              unmapped_type: "text"
            }
          },
          { "last_name" => { order: sort[:direction], unmapped_type: "text" } }
        ]
      else
        { sort[:field] => { order: sort[:direction], unmapped_type: "long" } }
      end
    else
      { created_at: { order: :desc, unmapped_type: "long" } }
    end
  end
end
