class Api::EligibilityCodesController < Api::ApplicationController
  def show
    authorize :eligibility_code, :check?
    result = Wrappers::EligibilityCodeChecker.new.check(params[:id])
    render json: result
  rescue Errors::WrapperClientError,
         Errors::WrapperServerError,
         Faraday::Error => e
    render json: { error: e.message }, status: :bad_gateway
  end
end
