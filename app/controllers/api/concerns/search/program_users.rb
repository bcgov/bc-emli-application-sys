# app/controllers/concerns/api/search/program_users.rb
module Api::Concerns::Search::ProgramUsers
  extend ActiveSupport::Concern

  def perform_user_search
    query = params[:query].presence || "*"
    Rails.logger.info("#{@program.program_classification_memberships.inspect}")

    user_ids = @program.program_classification_memberships.pluck(:user_id)

    @user_search =
      User.search(
        query,
        fields: %i[name email], # adjust as needed
        where: {
          id: user_ids
          # Optionally add: role: params[:role], classification: params[:classification], etc.
        },
        page: params[:page] || 1,
        per_page: params[:per_page] || 25
      )
  end
end
