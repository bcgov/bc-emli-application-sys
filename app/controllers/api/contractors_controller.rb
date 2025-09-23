class Api::ContractorsController < Api::ApplicationController
  include Api::Concerns::Search::Contractors
  before_action :set_contractor, only: %i[show update destroy]
  skip_before_action :authenticate_user!, only: %i[shim]
  skip_after_action :verify_authorized, only: %i[shim]
  skip_after_action :verify_policy_scoped, only: [:index]

  def index
    perform_contractor_search
    contractors = @contractor_search.results

    render_success contractors,
                   nil,
                   {
                     blueprint: ContractorBlueprint,
                     blueprint_opts: {
                       view: :base
                     },
                     meta: {
                       total_pages: @contractor_search.total_pages,
                       total_count: @contractor_search.total_count,
                       current_page: @contractor_search.current_page
                     }
                   }
  end

  def show
    authorize @contractor
    render json: ContractorBlueprint.render(@contractor)
  end

  def create
    contractor = Contractor.new(contractor_params)
    authorize contractor
    if contractor.save
      render json: ContractorBlueprint.render(contractor), status: :created
    else
      render json: contractor.errors, status: :unprocessable_entity
    end
  end

  def update
    authorize @contractor
    if @contractor.update(contractor_params)
      render json: ContractorBlueprint.render(@contractor)
    else
      render json: @contractor.errors, status: :unprocessable_entity
    end
  end

  def destroy
    authorize @contractor
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
    render_success contractor, nil, { blueprint: ContractorBlueprint }
  end

  def license_agreements
    # Find contractor where current user is the contact (owner)
    @contractor = Contractor.find_by!(contact: current_user)
    authorize @contractor

    render_success @contractor,
                   nil,
                   {
                     blueprint: ContractorBlueprint,
                     blueprint_opts: {
                       view: :accepted_license_agreements
                     }
                   }
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
