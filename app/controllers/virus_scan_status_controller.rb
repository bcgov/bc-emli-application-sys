# API controller for checking virus scan status
class VirusScanStatusController < ApplicationController
  before_action :authenticate_user! # Adjust authentication as needed

  # Whitelist of allowed models that support virus scanning
  ALLOWED_MODELS = {
    "supporting_document" => SupportingDocument,
    "step_code" => StepCode
  }.freeze

  # GET /api/virus_scan_status/:model/:id
  def show
    model_class = get_allowed_model_class(params[:model])
    return unless model_class

    record = model_class.find(params[:id])

    unless record.respond_to?(:virus_scan_status)
      render json: {
               error: "Model does not support virus scanning"
             },
             status: :unprocessable_entity
      return
    end

    render json: {
             id: record.id,
             model: params[:model],
             virus_scan_status: record.virus_scan_status,
             virus_scan_status_text: record.virus_scan_status_text,
             virus_scan_message: record.virus_scan_message,
             virus_scan_started_at: record.virus_scan_started_at,
             virus_scan_completed_at: record.virus_scan_completed_at,
             safe_to_use: record.safe_to_use?,
             scan_in_progress: record.scan_in_progress?
           }
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Record not found" }, status: :not_found
  end

  # POST /api/virus_scan_status/:model/:id/rescan
  def rescan
    model_class = get_allowed_model_class(params[:model])
    return unless model_class

    record = model_class.find(params[:id])

    unless record.respond_to?(:schedule_virus_scan)
      render json: {
               error: "Model does not support virus scanning"
             },
             status: :unprocessable_entity
      return
    end

    # Reset scan status and schedule new scan
    record.update!(
      virus_scan_status: :pending,
      virus_scan_message: nil,
      virus_scan_started_at: Time.current,
      virus_scan_completed_at: nil
    )

    record.schedule_virus_scan

    render json: {
             message: "Virus scan scheduled",
             virus_scan_status: record.virus_scan_status
           }
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Record not found" }, status: :not_found
  end

  # GET /api/virus_scan_status/bulk?model=supporting_document&ids[]=1&ids[]=2
  def bulk
    model_class = get_allowed_model_class(params[:model])
    return unless model_class

    ids = params[:ids] || []

    records = model_class.where(id: ids)

    results =
      records.map do |record|
        if record.respond_to?(:virus_scan_status)
          {
            id: record.id,
            virus_scan_status: record.virus_scan_status,
            virus_scan_status_text: record.virus_scan_status_text,
            safe_to_use: record.safe_to_use?,
            scan_in_progress: record.scan_in_progress?
          }
        else
          { id: record.id, error: "Model does not support virus scanning" }
        end
      end

    render json: { results: results }
  end

  private

  def get_allowed_model_class(model_param)
    model_class = ALLOWED_MODELS[model_param&.downcase]

    unless model_class
      render json: {
               error: "Invalid or unsupported model type"
             },
             status: :unprocessable_entity
      return nil
    end

    model_class
  end
end
