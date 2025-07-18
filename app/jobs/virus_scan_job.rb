class VirusScanJob < ApplicationJob
  queue_as :default

  def perform(model_class_name, model_id, attachment_name = "file")
    Rails.logger.info "Starting virus scan for #{model_class_name}##{model_id}"

    # Find the model instance
    model_class = model_class_name.constantize
    record = model_class.find_by(id: model_id)

    unless record
      Rails.logger.error "Cannot find #{model_class_name} with id #{model_id}"
      return
    end

    unless record.respond_to?(:virus_scan_status)
      Rails.logger.error "Model #{model_class_name} does not include VirusScannable concern"
      return
    end

    unless record.file_attachment_present?
      Rails.logger.warn "No file attached to #{model_class_name}##{model_id}"
      record.update!(
        virus_scan_status: :scan_error,
        virus_scan_message: "No file attached",
        virus_scan_completed_at: Time.current
      )
      return
    end

    # Update status to scanning
    record.update!(
      virus_scan_status: :scanning,
      virus_scan_started_at: Time.current
    )

    begin
      # Download file to temporary location for scanning
      temp_file_path = download_file_for_scan(record)

      # Perform virus scan
      scan_result = ClamAvService.scan_file(temp_file_path)

      # Update record with scan results
      update_scan_results(record, scan_result)

      Rails.logger.info "Virus scan completed for #{model_class_name}##{model_id}: #{scan_result[:message]}"
    rescue => e
      Rails.logger.error "Virus scan failed for #{model_class_name}##{model_id}: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")

      record.update!(
        virus_scan_status: :scan_error,
        virus_scan_message: "Scan failed: #{e.message}",
        virus_scan_completed_at: Time.current
      )
    ensure
      # Clean up temporary file
      if temp_file_path && File.exist?(temp_file_path)
        File.delete(temp_file_path)
        Rails.logger.debug "Cleaned up temporary scan file: #{temp_file_path}"
      end
    end
  end

  private

  def download_file_for_scan(record)
    # Create temp directory if it doesn't exist
    temp_dir = ENV.fetch("VIRUS_SCAN_TEMP_DIR", "/tmp/virus_scan")
    FileUtils.mkdir_p(temp_dir) unless Dir.exist?(temp_dir)

    # Generate unique temp file name
    temp_file_name = "#{SecureRandom.uuid}_#{record.file.original_filename}"
    temp_file_path = File.join(temp_dir, temp_file_name)

    Rails.logger.debug "Downloading file for scan to: #{temp_file_path}"

    # Download file from storage
    record.file.download do |chunk|
      File.open(temp_file_path, "ab") do |f|
        if chunk.is_a?(String)
          f.write(chunk)
        elsif chunk.respond_to?(:read)
          f.write(chunk.read)
        else
          f.write(chunk.to_s)
        end
      end
    end

    # Verify file was downloaded
    unless File.exist?(temp_file_path)
      raise "Failed to download file to #{temp_file_path}"
    end

    file_size = File.size(temp_file_path)
    Rails.logger.debug "Downloaded file size: #{file_size} bytes"

    temp_file_path
  end

  def update_scan_results(record, scan_result)
    Rails.logger.debug "Updating scan results: #{scan_result.inspect}"

    # Handle different result formats for backwards compatibility
    if scan_result.key?(:status)
      # Legacy format from old service
      case scan_result[:status]
      when :clean
        record.update!(
          virus_scan_status: :clean,
          virus_scan_message: scan_result[:message],
          virus_scan_completed_at: Time.current
        )
      when :infected
        record.update!(
          virus_scan_status: :infected,
          virus_scan_message: scan_result[:message],
          virus_name: scan_result[:virus_name],
          virus_scan_completed_at: Time.current
        )
      when :error
        record.update!(
          virus_scan_status: :scan_error,
          virus_scan_message: scan_result[:message],
          virus_scan_completed_at: Time.current
        )
      end
    elsif scan_result.key?(:clean)
      # New format from consolidated service
      if scan_result[:clean]
        record.update!(
          virus_scan_status: :clean,
          virus_scan_message: scan_result[:message],
          virus_scan_completed_at: Time.current
        )
      else
        if scan_result[:virus]
          record.update!(
            virus_scan_status: :infected,
            virus_scan_message: scan_result[:message],
            virus_name: scan_result[:virus],
            virus_scan_completed_at: Time.current
          )
        else
          record.update!(
            virus_scan_status: :scan_error,
            virus_scan_message: scan_result[:message],
            virus_scan_completed_at: Time.current
          )
        end
      end
    else
      # Unknown format
      Rails.logger.error "Unknown scan result format: #{scan_result.inspect}"
      record.update!(
        virus_scan_status: :scan_error,
        virus_scan_message: "Unknown scan result format",
        virus_scan_completed_at: Time.current
      )
    end
  end
end
