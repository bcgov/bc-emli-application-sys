class Api::SupportRequestsController < Api::ApplicationController
  before_action :set_request, only: %i[show update destroy]
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
    Rails.logger.info(
      "SupportRequestsController#request_supporting_files called by user"
    )
    parent_app = PermitApplication.find(params[:parent_application_id])
    Rails.logger.info(
      "Requesting supporting files for application #{parent_app.id} by user #{pundit_user.user.id}"
    )
    support_request =
      SupportRequests::SupportingFilesService.new(
        parent_app: parent_app,
        user_context: pundit_user,
        note: params[:note]
      ).call
    Rails.logger.info(
      "Created support request #{support_request.id} for application #{parent_app.id} by user #{pundit_user.user.id}"
    )

    render json: SupportRequestBlueprint.render(support_request),
           status: :created
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
