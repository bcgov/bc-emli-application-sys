class ContractorInfosController < ApplicationController
  before_action :set_contractor

  def show
    render json: @contractor.contractor_info
  end

  def create
    info = @contractor.build_contractor_info(contractor_info_params)
    info.save!
    render json: info, status: :created
  end

  def update
    info = @contractor.contractor_info
    info.update!(contractor_info_params)
    render json: info
  end

  private

  def set_contractor
    @contractor = Contractor.find(params[:contractor_id])
  end

  def contractor_info_params
    params.require(:contractor_info).permit(
      :doing_business_as,
      :license_issuer,
      :license_number,
      :incorporated_year,
      :number_of_employees,
      :gst_number,
      :worksafebc_number,
      :service_languages,
      type_of_business: [],
      primary_program_measure: [],
      retrofit_enabling_measures: []
    )
  end
end
