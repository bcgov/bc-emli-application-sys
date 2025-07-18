class FileUploader < Shrine
  plugin :validation_helpers
  plugin :determine_mime_type
  # plugin :store_dimensions # Disabled - requires fastimage
  plugin :delete_raw # delete raw files after processing

  Attacher.validate do
    validate_max_size Constants::Sizes::FILE_UPLOAD_MAX_SIZE * 1024 * 1024 # 100 MB to start
    # Could be images, excel files, bims, we do not have an exhaustive list right now.

    # Immediate virus scanning validation with database storage
    next unless file # Skip if no file attached
    next unless ClamAvService.enabled? # Skip if virus scanning disabled

    Rails.logger.info "Performing immediate virus scan with database storage for: #{file.original_filename}"

    begin
      # Create temporary file for scanning
      temp_file =
        Tempfile.new(["upload_scan", File.extname(file.original_filename)])
      temp_file.binmode
      temp_file.write(file.read)
      temp_file.close

      # Perform virus scan with timeout handling
      scan_result = nil
      upload_timeout = ENV.fetch("UPLOAD_VIRUS_SCAN_TIMEOUT", "45").to_i

      Timeout.timeout(upload_timeout) do
        scan_result = ClamAvService.scan_file(temp_file.path)
      end

      # Store results globally for access during promotion
      Thread.current[:virus_scan_result] = {
        status: scan_result[:status],
        message: scan_result[:message],
        virus_name: scan_result[:virus_name],
        scanned_at: Time.current,
        file_size: file.size,
        original_filename: file.original_filename
      }

      if scan_result[:status] == :infected
        virus_name =
          scan_result[:virus_name] ||
            I18n.t("file_upload.virus_scan.unknown_virus")
        error_message =
          I18n.t(
            "file_upload.virus_scan.virus_detected",
            virus_name: virus_name
          )

        Rails.logger.warn "Upload blocked - virus detected: #{virus_name} in file #{file.original_filename}"
        errors << error_message
      elsif scan_result[:status] == :error
        Rails.logger.error "Virus scan error: #{scan_result[:message]}"

        if Rails.env.production?
          error_message = I18n.t("file_upload.virus_scan.scan_error_production")
          errors << error_message
        else
          Rails.logger.warn I18n.t(
                              "file_upload.virus_scan.scan_error_development"
                            )
        end
      else
        Rails.logger.info "File passed immediate virus scan: #{file.original_filename} (#{scan_result[:message]})"
      end
    rescue Timeout::Error => e
      Rails.logger.error "Virus scan timeout during upload: #{e.message}"

      Thread.current[:virus_scan_result] = {
        status: :error,
        message: "Scan timeout - will retry in background",
        scanned_at: Time.current,
        file_size: file.size,
        original_filename: file.original_filename
      }

      if Rails.env.production?
        error_message = I18n.t("file_upload.virus_scan.scan_timeout_production")
        errors << error_message
      else
        Rails.logger.warn I18n.t(
                            "file_upload.virus_scan.scan_timeout_development"
                          )
      end
    rescue => e
      Rails.logger.error "Virus scan validation failed: #{e.message}"

      Thread.current[:virus_scan_result] = {
        status: :error,
        message: "Scan failed: #{e.message}",
        scanned_at: Time.current,
        file_size: file.size,
        original_filename: file.original_filename
      }

      if Rails.env.production?
        error_message = I18n.t("file_upload.virus_scan.scan_error_production")
        errors << error_message
      else
        Rails.logger.warn I18n.t(
                            "file_upload.virus_scan.scan_error_development"
                          )
      end
    ensure
      temp_file&.close
      temp_file&.unlink
    end
  end

  # Store immediate virus scan results in database after promotion
  Attacher.promote_block do |attacher|
    # Store virus scan results immediately in database
    if attacher.record.respond_to?(:virus_scan_status) &&
         Thread.current[:virus_scan_result]
      scan_result = Thread.current[:virus_scan_result]

      Rails.logger.info "Storing immediate virus scan results for #{attacher.record.class.name}##{attacher.record.id}"

      begin
        # Use update_columns to avoid callbacks and potential infinite loops
        attacher.record.update_columns(
          virus_scan_status:
            (
              if scan_result[:status] == :clean
                2
              else
                (scan_result[:status] == :infected ? 3 : 4)
              end
            ),
          virus_scan_message: scan_result[:message],
          virus_name: scan_result[:virus_name],
          virus_scan_started_at: scan_result[:scanned_at],
          virus_scan_completed_at: scan_result[:scanned_at],
          updated_at: Time.current
        )

        Rails.logger.info "Successfully stored virus scan results: #{scan_result[:status]} for #{attacher.record.class.name}##{attacher.record.id}"
      rescue => e
        Rails.logger.error "Failed to store virus scan results: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")
      ensure
        # Clean up thread local variable
        Thread.current[:virus_scan_result] = nil
      end
    end
  end

  def generate_location(io, derivative: nil, **options)
    record = options[:record]
    if record
      # The default is (supporting document) model, but we want to ignore it: model = record.class.name.underscore
      parent_model = record.permit_application.class.name.underscore # permit application nesting
      parent_id = record.permit_application.id
      identifier = record.id || "temp" # Use 'temp' if record ID is nil
      # Construct the path with support for derivatives
      path = [parent_model, parent_id, identifier]
      path << derivative.to_s if derivative # Append derivative name if present
      if record.file_data && record.file_data["storage"] == "cache"
        path << record[:file_data]["id"] # get the same name as it did in the cache
      else
        path << super # Call the original generate_location method for the filename
      end

      # Join the path components
      File.join(path)
    else
      super # Fallback to the default behavior if no record is available
    end
  end
end
