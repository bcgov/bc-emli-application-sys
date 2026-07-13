class Api::AhriLookupsController < Api::ApplicationController
  def create
    authorize :ahri_lookup, :create?

    permitted_params = ahri_lookup_params
    reference_id =
      permitted_params[:reference_id].presence ||
        permitted_params[:ReferenceId].presence ||
        permitted_params.dig(:ahri_lookup, :reference_id).presence ||
        permitted_params.dig(:ahri_lookup, :ReferenceId).presence
    reference_id = reference_id.to_s.strip
    if reference_id.blank?
      render json: { error: "reference_id is required" }, status: :bad_request
      return
    end

    wrapper = Wrappers::AhriSearch.new
    quick_search = wrapper.quick_search_by_reference_id(reference_id)
    program_id =
      quick_search&.first&.dig("ProgramId") ||
        quick_search&.first&.dig(:ProgramId)

    if program_id.blank?
      render json: {
               error: "No AHRI program found for reference_id"
             },
             status: :not_found
      return
    end

    detail_results = wrapper.search_detail_results(program_id, reference_id)

    render json: {
             reference_id:,
             program_id: program_id.to_i,
             make: column_value_for(detail_results, "OutdoorUnitBrandName"),
             model: column_value_for(detail_results, "ModelNumber"),
             outdoor_unit_brand_name:
               column_value_for(detail_results, "OutdoorUnitBrandName"),
             model_number: column_value_for(detail_results, "ModelNumber")
           },
           status: :ok
  rescue Errors::WrapperClientError,
         Errors::WrapperServerError,
         JSON::ParserError,
         Faraday::Error => e
    render json: { error: e.message }, status: :bad_gateway
  end

  private

  def ahri_lookup_params
    params.permit(
      :reference_id,
      :ReferenceId,
      ahri_lookup: %i[reference_id ReferenceId]
    )
  end

  def column_value_for(fields, unique_name)
    field =
      Array(fields).find do |row|
        row["UniqueName"] == unique_name || row[:UniqueName] == unique_name
      end

    field&.dig("COLUMN_VALUE") || field&.dig(:COLUMN_VALUE)
  end
end
