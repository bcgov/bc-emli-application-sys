class Api::SupportRequestsController < Api::ApplicationController
  before_action :set_request, only: %i[show update destroy]

  # Skip default Pundit check — service handles create/view authorizations internally
  skip_after_action :verify_authorized, only: :request_supporting_files

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
    parent_app = PermitApplication.find(params[:parent_application_id])

    # Authorize before the validation below. All authorization for this action normally happens
    # inside SupportingFilesService (hence the skip_after_action above), so returning early would
    # otherwise answer an unauthorized caller with 422 for an application that exists and 404 for
    # one that does not - an existence oracle. Same policy the service applies.
    Pundit.authorize(pundit_user, parent_app, :request_supporting_files?)

    # Only the external pathway emails the participant a file list; on the internal one the admin
    # uploads the files themselves, so there is nothing to list.
    is_internal = params[:audience_type_code]&.to_sym == :internal
    missing_files =
      params[:note].to_s.split(/\r?\n/).map(&:strip).reject(&:blank?)

    # Refuse before anything is created. SupportingFilesService persists both the SupportRequest and
    # a linked PermitApplication, so failing after it would leave the participant with a phantom
    # upload form in their list and no email explaining it (BCHEP-496).
    if !is_internal && missing_files.blank?
      return(
        render_error(
          "application_controller.support_request_no_files_listed",
          status: :unprocessable_entity
        )
      )
    end

    support_request =
      SupportRequests::SupportingFilesService.new(
        parent_app: parent_app,
        user_context: pundit_user,
        note: params[:note],
        audience_type_code: params[:audience_type_code]&.to_sym
      ).call

    # check it actually got created
    if support_request.persisted?
      parent_app.reload

      # Only send notification for external (participant) pathway
      # For internal (admin) pathway, admin will upload files themselves
      unless is_internal
        NotificationService.publish_supporting_files_requested_event(
          parent_app,
          missing_files: missing_files,
          linked_application_id: support_request.linked_application_id
        )
      end

      render json:
               PermitApplicationBlueprint.render(parent_app, view: :extended),
             status: :created
    else
      render_error(
        "application_controller.support_request_not_created",
        status: :unprocessable_entity
      )
    end
  rescue SupportRequestTemplateMissingError => e
    render_error(
      "application_controller.support_request_template_missing",
      { status: :not_found },
      e
    )
  rescue SupportRequestTemplateError => e
    render_error(
      "application_controller.no_published_template_version",
      { status: :not_found },
      e
    )
  rescue ActiveRecord::RecordNotFound => e
    render_error(
      "application_controller.support_request_record_not_found",
      { status: :not_found },
      e
    )
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
