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
    support_request =
      SupportRequests::SupportingFilesService.new(
        parent_app: parent_app,
        user_context: pundit_user,
        note: params[:note]
      ).call

    # check it actually got created
    if support_request.persisted?
      parent_app.reload

      missing_files =
        params[:note].to_s.split(/\r?\n/).map(&:strip).reject(&:blank?)

      NotificationService.publish_supporting_files_requested_event(
        parent_app,
        missing_files: missing_files
      )

      render json:
               PermitApplicationBlueprint.render(parent_app, view: :extended),
             status: :created
    else
      render_error(
        "application_controller.support_request_not_created",
        status: :unprocessable_entity
      )
    end
  rescue ActiveRecord::RecordNotFound => e
    render_error(
      "application_controller.no_published_template_version",
      status: :bad_request,
      detail: e.message
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
