class FileUploader < Shrine
  plugin :validation_helpers
  plugin :determine_mime_type
  # plugin :store_dimensions # Disabled - requires fastimage
  plugin :delete_raw # delete raw files after processing

  Attacher.validate do
    validate_max_size Constants::Sizes::FILE_UPLOAD_MAX_SIZE * 1024 * 1024 # 100 MB to start
    # Could be images, excel files, bims, we do not have an exhaustive list right now.

    # Immediate virus scanning validation - blocks infected files
    next unless file # Skip if no file attached
    next unless ClamAvService.enabled? # Skip if virus scanning disabled

    Rails.logger.info "Performing immediate virus scan during upload validation"

    begin
      # Create temporary file for scanning
      temp_file =
        Tempfile.new(["upload_scan", File.extname(file.original_filename)])
      temp_file.binmode
      temp_file.write(file.read)
      temp_file.close

      # Perform quick virus scan
      scan_result = ClamAvService.scan_file(temp_file.path)

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

        # Add validation error that will be shown to user
        errors << error_message
      elsif scan_result[:status] == :error
        # Handle scan errors
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
        Rails.logger.info "File passed virus scan validation: #{file.original_filename}"
      end
    rescue => e
      Rails.logger.error "Virus scan validation failed: #{e.message}"

      # Decide whether to block or allow on scan error
      if Rails.env.production?
        # In production, block upload if scan fails for security
        error_message = I18n.t("file_upload.virus_scan.scan_error_production")
        errors << error_message
      else
        # In development, allow upload but log warning
        Rails.logger.warn I18n.t(
                            "file_upload.virus_scan.scan_error_development"
                          )
      end
    ensure
      # Clean up temporary file
      temp_file&.close
      temp_file&.unlink
    end
  end

  # Add virus scanning hook
  Attacher.promote_block do |attacher|
    # Trigger virus scan after file promotion
    if attacher.record.respond_to?(:schedule_virus_scan)
      attacher.record.schedule_virus_scan
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
