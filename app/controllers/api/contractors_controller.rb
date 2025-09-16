class Api::ContractorsController < Api::ApplicationController
  before_action :set_contractor, only: %i[show update destroy]

  def index
    contractors = Contractor.all
    render json: ContractorBlueprint.render(contractors)
  end

  def show
    render json: ContractorBlueprint.render(@contractor)
  end

  def create
    contractor = Contractor.new(contractor_params)
    if contractor.save
      render json: ContractorBlueprint.render(contractor), status: :created
    else
      render json: contractor.errors, status: :unprocessable_entity
    end
  end

  def update
    if @contractor.update(contractor_params)
      render json: ContractorBlueprint.render(@contractor)
    else
      render json: @contractor.errors, status: :unprocessable_entity
    end
  end

  def destroy
    @contractor.destroy
    head :no_content
  end

  def shim
    contractor =
      Contractor.create!(
        # contact: current_user,
        business_name: "TBD",
        onboarded: false
      )
    render json: ContractorBlueprint.render(contractor), status: :created
  end

  private

  def set_contractor
    @contractor = Contractor.find(params[:id])
  end

  def contractor_params
    params.require(:contractor).permit(
      :contact_id,
      :business_name,
      :website,
      :phone_number,
      :onboarded
    )
  end
end
