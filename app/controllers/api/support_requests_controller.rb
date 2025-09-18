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

  # This action creates a new PermitApplication specifically for a
  # "Supporting Files" request and links it back to the original parent application.
  def request_supporting_files
    # Find the parent permit application the support request will be linked to
    parent_app = PermitApplication.find(params[:parent_application_id])

    # Pull out the program from the parent application
    program = Program.find(parent_app.program_id)

    # Identify the types used to locate the correct requirement template
    user_group_type = UserGroupType.find_by(code: :participant)
    audience_type = AudienceType.find_by(code: :internal)
    submission_type = SubmissionType.find_by(code: :support_request)

    begin
      # Find the RequirementTemplate that matches the criteria
      requirement =
        RequirementTemplate.find_by!(
          program_id: program.id,
          user_group_type_id: user_group_type.id,
          audience_type_id: audience_type.id,
          submission_type_id: submission_type.id
        )

      # Ensure the current user is authorized to use this requirement
      authorize requirement

      # Grab the latest published template version for that requirement
      template = requirement.template_versions.published.first!

      # At this point, we have the published TemplateVersion that belongs
      # to the RequirementTemplate meeting our criteria.
    rescue ActiveRecord::RecordNotFound
      # If no matching RequirementTemplate or published TemplateVersion exists,
      # return a 400 error with a clear message
      render_error(
        "application_controller.no_published_template_version",
        status: :bad_request
      ) and return
    end

    # Current user making the request
    user = current_user

    # Create the new PermitApplication that will serve as the "supporting files" request
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

    # Double-check authorization on the newly created PermitApplication
    authorize permit_application

    # Persist the record (create! already saves, so this line may be redundant)
    permit_application.save!

    # Link the parent application to the newly created one via SupportRequest
    support_request =
      SupportRequest.create!(
        parent_application: parent_app,
        requested_by: user,
        linked_application: permit_application,
        additional_text: params[:note]
      )

    # Return the support_request object to the client, rendered via Blueprint
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
