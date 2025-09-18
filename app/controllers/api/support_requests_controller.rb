class Api::SupportRequestsController < Api::ApplicationController
  before_action :set_request, only: %i[show update destroy]

  def index
    requests = SupportRequest.all
    render json: SupportRequestBlueprint.render(requests)
  end

  def show
    render json: SupportRequestBlueprint.render(@request)
  end

  def create
    request = SupportRequest.new(request_params)
    if request.save
      render json: SupportRequestBlueprint.render(request), status: :created
    else
      render json: request.errors, status: :unprocessable_entity
    end
  end

  def update
    if @request.update(request_params)
      render json: SupportRequestBlueprint.render(@request)
    else
      render json: @request.errors, status: :unprocessable_entity
    end
  end

  def destroy
    @request.destroy
    head :no_content
  end

  def request_supporting_files
    # This action creates a new PermitApplication as a supporting files request
    parent_app = PermitApplication.find(params[:parent_application_id])
    program = Program.find(parent_app.program_id)
    user_group_type = UserGroupType.find_by(code: :participant)
    audience_type = AudienceType.find_by(code: :internal)
    submission_type = SubmissionType.find_by(code: :support_request)

    Rails.logger.info(
      "Parent Application ID: #{parent_app.id}, Program: #{program.program_name}"
    )

    begin
      requirement =
        RequirementTemplate.find_by!(
          program_id: program.id,
          user_group_type_id: user_group_type.id,
          audience_type_id: audience_type.id,
          submission_type_id: submission_type.id
        )
      Rails.logger.info("Found Requirement ID: #{requirement.inspect}")
      authorize requirement
      template = requirement.template_versions.published.first!

      Rails.logger.info(
        "Found published TemplateVersion ID: #{template.id} for Requirement ID: #{requirement.id}"
      )
      # @template is now the published TemplateVersion that belongs to the requirement
    rescue ActiveRecord::RecordNotFound
      render_error(
        "application_controller.template_version_mismatch",
        status: :bad_request
      ) and return
    end

    user = current_user
    Rails.logger.info("Current User ID: #{user.id}, Email: #{user.email}")

    permit_application =
      PermitApplication.create!(
        submitter: user,
        user_group_type: user_group_type,
        audience_type: audience_type,
        submission_type: submission_type,
        program: program,
        status: :new_draft,
        nickname: "Supporting files upload form",
        template_version: template
      )

    Rails.logger.info(
      "Initialized new PermitApplication for supporting files request"
    )
    authorize permit_application # Ensure Pundit authorization
    #permit_application.save(validate: false)
    permit_application.save!

    Rails.logger.info(
      "Created new PermitApplication with ID: #{permit_application}"
    )

    support_request =
      SupportRequest.create!(
        parent_application: parent_app,
        requested_by: user,
        linked_application: permit_application,
        additional_text: params[:note]
      )
    render json: SupportRequestBlueprint.render(support_request),
           status: :created
  end

  private

  def set_request
    @request = SupportRequest.find(params[:id])
  end

  def request_params
    params.require(:support_request).permit(
      :parent_application_id,
      :requested_by_id,
      :linked_application_id,
      :additional_text
    )
  end
end
