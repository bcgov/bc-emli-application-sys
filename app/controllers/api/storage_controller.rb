class Api::StorageController < Api::ApplicationController
  skip_after_action :verify_authorized
  skip_after_action :verify_policy_scoped

  def upload
    #https://shrinerb.com/docs/plugins/presign_endpoint#calling-from-a-controller
    set_rack_response Shrine.presign_response(:cache, request.env)
  end

  def virus_scan
    # Pre-upload virus scanning endpoint
    unless ClamAvService.enabled?
      render json: {
               clean: true,
               message: "Virus scanning disabled"
             },
             status: :ok
      return
    end

    unless params[:file].present?
      render json: { error: "File required for scanning" }, status: :bad_request
      return
    end

    uploaded_file = params[:file]
    temp_file = nil

    begin
      # Create temporary file from uploaded content
      temp_file =
        Tempfile.new(
          [
            "virus_scan",
            File.extname(uploaded_file.original_filename || ".tmp")
          ]
        )
      temp_file.binmode

      # Copy file content to temp file
      uploaded_file.rewind
      IO.copy_stream(uploaded_file, temp_file)
      temp_file.close

      # Perform virus scan
      scan_result = ClamAvService.scan_file(temp_file.path)

      if scan_result[:status] == :infected
        virus_name = scan_result[:virus_name] || "Unknown virus"
        Rails.logger.warn "Pre-upload virus detected: #{virus_name} in file #{uploaded_file.original_filename}"

        render json: {
                 clean: false,
                 virus_detected: true,
                 virus_name: virus_name,
                 message: "Virus detected: #{virus_name}. File upload blocked."
               },
               status: :unprocessable_entity
      elsif scan_result[:status] == :error
        Rails.logger.error "Virus scan error: #{scan_result[:message]}"

        if Rails.env.production?
          render json: {
                   clean: false,
                   scan_error: true,
                   message:
                     "File security scan failed. Please try again or contact support."
                 },
                 status: :unprocessable_entity
        else
          Rails.logger.warn "Allowing upload in development despite scan error"
          render json: {
                   clean: true,
                   message:
                     "File passed virus scan (development mode with scan error)"
                 },
                 status: :ok
        end
      else
        Rails.logger.info "File passed pre-upload virus scan: #{uploaded_file.original_filename}"
        render json: { clean: true, message: "File is clean" }, status: :ok
      end
    rescue => e
      Rails.logger.error "Virus scan endpoint error: #{e.message}"
      render json: {
               clean: false,
               scan_error: true,
               message: "Scan failed: #{e.message}"
             },
             status: :internal_server_error
    ensure
      temp_file&.close
      temp_file&.unlink
    end
  end

  AUTHORIZED_S3_MODELS = {
    "SupportingDocument" => SupportingDocument,
    "StepCode" => StepCode
  }.freeze

  def download
    if params[:id].start_with?("cache/")
      url =
        Shrine.storages[:cache].url(
          params[:id].slice(6..-1),
          public: false,
          expires_in: 3600
        )
      render json: { url: }, status: :ok
    elsif params[:model_id] && AUTHORIZED_S3_MODELS[params[:model]]
      record_class = AUTHORIZED_S3_MODELS[params[:model]]
      record = record_class.find(params[:model_id])
      authorize record
      render json: { url: record.file_url }, status: :ok
    else
      render_error("misc.not_found_error", status: :not_found)
    end
  rescue ActiveRecord::RecordNotFound => e
    render_error("misc.not_found_error", { status: :not_found }, e)
  end

  def delete
    if params[:id].start_with?("cache/")
      # if we use files instead of simple files, we'd need to send back a presigned url directly
      Shrine.storages[:cache].delete(params[:id])
      render json: { id: params[:id] }, status: :ok
    elsif params[:model_id] && AUTHORIZED_S3_MODELS.include?(params[:model])
      # if the object is already persisted to storage, we don't delete it.  The deletion happens during cleanup jobs.  See history if we need to bring this back.
      render json: { id: params[:id] }, status: :ok
    else
      render_error("misc.not_found_error", { status: :not_found }, e)
    end
  rescue ActiveRecord::RecordNotFound => e
    render_error("misc.not_found_error", { status: :not_found }, e)
  end

  private

  def set_rack_response((status, headers, body))
    self.status = status
    self.headers.merge!(headers)
    self.response_body = body
  end
end
