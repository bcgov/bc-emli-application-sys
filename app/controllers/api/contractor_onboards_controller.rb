class Api::ContractorOnboardsController < Api::ApplicationController
  before_action :set_onboard, only: %i[show update destroy]

  def index
    onboards = ContractorOnboard.all
    render json: ContractorOnboardBlueprint.render(onboards)
  end

  def show
    render json: ContractorOnboardBlueprint.render(@onboard)
  end

  def create
    onboard = ContractorOnboard.new(onboard_params)
    if onboard.save
      render json: ContractorOnboardBlueprint.render(onboard), status: :created
    else
      render json: onboard.errors, status: :unprocessable_entity
    end
  end

  def update
    if @onboard.update(onboard_params)
      render json: ContractorOnboardBlueprint.render(@onboard)
    else
      render json: @onboard.errors, status: :unprocessable_entity
    end
  end

  def destroy
    @onboard.destroy
    head :no_content
  end

  private

  def set_onboard
    @onboard = ContractorOnboard.find(params[:id])
  end

  def onboard_params
    params.require(:contractor_onboard).permit(
      :contractor_id,
      :onboard_application_id,
      :deactivated_at,
      :suspended_reason,
      :suspended_at
    )
  end
end
