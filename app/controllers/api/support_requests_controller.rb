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
