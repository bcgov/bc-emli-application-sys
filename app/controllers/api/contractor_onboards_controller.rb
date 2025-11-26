class Api::ContractorOnboardsController < Api::ApplicationController
  before_action :set_onboard, only: %i[show update destroy]

  skip_after_action :verify_authorized, only: %i[create show]

  def index
    onboards = ContractorOnboard.all
    render json: ContractorOnboardBlueprint.render(onboards)
  end

  def show
    render json: ContractorOnboardBlueprint.render(@onboard)
  end

  def create
    program = Program.find_by!(slug: "energy-savings-program")

    contractor =
      Contractor.create!(
        contact: current_user,
        business_name: "TBD",
        onboarded: false
      )
    contractor.reindex

    # Create the Permit Aplication (Contractor Onboarding type)
    onboarding_form =
      PermitApplication::ContractorOnboarding.new(
        program: program,
        contractor: contractor,
        user_context: pundit_user
      ).call

    # Build contractor onboard record, linking the contractor and application
    onboard =
      ContractorOnboard.new(
        contractor_id: contractor.id,
        onboard_application_id: onboarding_form.id
      )

    if onboard.save
      render json: ContractorOnboardBlueprint.render(onboard), status: :created
    else
      render json: onboard.errors, status: :unprocessable_entity
    end
  end

  def show
    Rails.logger.info("ContractorOnboards#show params: #{params[:id]}")
    contractor = Contractor.find(params[:id])

    unless contractor
      render json: {
               error: "Contractor not found for contact_id #{params[:id]}"
             },
             status: :not_found
      return
    end

    onboard =
      contractor
        .contractor_onboards
        .includes(:onboard_application)
        .order(created_at: :desc)
        .first

    if onboard
      render json: {
               data: {
                 id: onboard.id,
                 contractor_id: contractor.id,
                 onboard_application_id: onboard.onboard_application.id,
                 status: onboard.onboard_application.status
               }
             }
    else
      render json: { data: nil }
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
    @onboard = Contractor.find(params[:id])
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
