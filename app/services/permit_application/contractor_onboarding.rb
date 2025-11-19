class PermitApplication::ContractorOnboarding
  def initialize(program:, contractor:, user_context:)
    @program = program
    @contractor = contractor
    @user_context = user_context
  end

  # Main entry point for the service.
  # Returns the newly created Contractor Onboarding object.
  def call
    requirement = find_requirement!
    authorize_requirement!(requirement) # Pundit check: can the user access this requirement?

    template = find_published_template!(requirement)

    onboarding_application = create_onboarding_application!(template)
    authorize_application!(onboarding_application) # Pundit check: can the user create this application?
  end

  private

  attr_reader :parent_app, :program, :user, :note

  def user_group_type_code
    :contractor
  end

  def audience_type_code
    :external
  end

  def submission_type_code
    :onboarding
  end

  def nickname
    "Contractor Onboarding Form"
  end

  # Default auth hooks for Pundit authorization.
  def authorize_requirement!(requirement)
    Pundit.authorize(@user_context, requirement, :contractor_onboarding?)
  end

  def authorize_application!(permit_application)
    Pundit.authorize(@user_context, permit_application, :contractor_onboarding?)
  end

  # Lookup the RequirementTemplate that matches the combination of program and type codes.
  def find_requirement!
    RequirementTemplate.find_by!(
      program_id: program.id,
      user_group_type_id: UserGroupType.find_by!(code: user_group_type_code).id,
      audience_type_id: AudienceType.find_by!(code: audience_type_code).id,
      submission_type_id: SubmissionType.find_by!(code: submission_type_code).id
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
  def create_onboarding_application!(template)
    PermitApplication.create!(
      submitter: @contractor,
      user_group_type: UserGroupType.find_by!(code: user_group_type_code),
      audience_type: AudienceType.find_by!(code: audience_type_code),
      submission_type: SubmissionType.find_by!(code: submission_type_code),
      program: program,
      status: :new_draft,
      nickname: nickname,
      template_version: template
    )
  end
end
