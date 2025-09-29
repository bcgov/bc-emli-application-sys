# app/controllers/concerns/api/search/contractor_users.rb
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
          .where(users: { invitation_accepted_at: nil })
          .where(users: { discarded_at: nil })
    when "removed"
      contractor_employees_scope =
        contractor_employees_scope
          .joins(:employee)
          .where.not(users: { discarded_at: nil })
    end

    contractor_employees = contractor_employees_scope.to_a

    # Index contractor employees by user_id for rendering contractor-specific data
    @contractor_employees_by_user_id =
      contractor_employees.group_by(&:employee_id)

    # Extract user_ids for search
    user_ids = contractor_employees.map(&:employee_id)

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
      { sort[:field] => { order: sort[:direction], unmapped_type: "long" } }
    else
      { created_at: { order: :desc, unmapped_type: "long" } }
    end
  end
end
