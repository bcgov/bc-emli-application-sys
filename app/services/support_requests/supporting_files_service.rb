module SupportRequests
  class SupportingFilesService < BaseService
    private

    def user_group_type_code
      :participant
    end
    def audience_type_code
      :external
    end
    def submission_type_code
      :support_request
    end
    def nickname
      "Supporting files upload form"
    end

    # Authorize using Pundit for the given requirement template.
    def authorize_requirement!(requirement)
      Pundit.authorize(@user_context, requirement, :request_supporting_files?)
    end

    # Authorize using Pundit for the given permit application.
    def authorize_application!(permit_application)
      Pundit.authorize(
        @user_context,
        permit_application,
        :request_supporting_files?
      )
    end
  end
end
