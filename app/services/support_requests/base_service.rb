module SupportRequests
  # BaseService encapsulates the common flow for creating a new support request:
  #   1. Find the correct RequirementTemplate based on type codes
  #   2. Find the published TemplateVersion for that requirement
  #   3. Create a new PermitApplication using that template
  #   4. Link it back to the parent application via a SupportRequest
  #
  # Subclasses must provide the type codes and nickname that define
  # their particular support request variant.
  class BaseService
    def initialize(parent_app:, user_context:, note:)
      @parent_app = parent_app # The application this support request is linked to
      @program = parent_app.program
      @user_context = user_context # Current user_context making the request
      @note = note # Optional text entered in the request form
    end

    # Main entry point for the service.
    # Returns the newly created SupportRequest object.
    def call
      requirement = find_requirement!
      authorize_requirement!(requirement) # Pundit check: can the user access this requirement? defined in the subclassed service

      template = find_published_template!(requirement)

      permit_application = create_permit_application!(template)
      authorize_application!(permit_application) # Pundit check: can the user create this application? defined in the subclassed service

      create_support_request!(permit_application)
    end

    private

    attr_reader :parent_app, :program, :user, :note

    # --- Abstract methods for subclasses ---
    # Subclasses must override these with the codes/nickname relevant to their request type.
    def user_group_type_code
      raise NotImplementedError
    end
    def audience_type_code
      raise NotImplementedError
    end
    def submission_type_code
      raise NotImplementedError
    end
    def nickname
      raise NotImplementedError
    end

    # Default auth hooks: subclasses can override if they need different checks
    def authorize_requirement!(requirement)
      Pundit.authorize(@user_context, requirement, :support_requests?)
    end

    def authorize_application!(permit_application)
      Pundit.authorize(@user_context, permit_application, :support_requests?)
    end

    # Lookup the RequirementTemplate that matches the combination of program and type codes.
    def find_requirement!
      RequirementTemplate.find_by!(
        program_id: program.id,
        user_group_type_id:
          UserGroupType.find_by!(code: user_group_type_code).id,
        audience_type_id: AudienceType.find_by!(code: audience_type_code).id,
        submission_type_id:
          SubmissionType.find_by!(code: submission_type_code).id
      )
    end

    # Find the most recent published TemplateVersion for the requirement.
    # Raises if no published version exists.
    def find_published_template!(requirement)
      requirement.template_versions.published.first!
    rescue ActiveRecord::RecordNotFound
      raise ActiveRecord::RecordNotFound,
            "No published template version found for submission_type=#{submission_type_code}"
    end

    # Create the new PermitApplication using the resolved template and type codes.
    def create_permit_application!(template)
      PermitApplication.create!(
        submitter: @user_context.user,
        user_group_type: UserGroupType.find_by!(code: user_group_type_code),
        audience_type: AudienceType.find_by!(code: audience_type_code),
        submission_type: SubmissionType.find_by!(code: submission_type_code),
        program: program,
        status: :new_draft,
        nickname: nickname,
        template_version: template
      )
    end

    # Create the SupportRequest that links the parent application to the new one.
    def create_support_request!(permit_application)
      SupportRequest.create!(
        parent_application: parent_app,
        requested_by: @user_context.user,
        linked_application: permit_application,
        additional_text: note
      )
    end
  end
end
