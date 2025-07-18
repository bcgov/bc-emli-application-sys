class CleanupStuckScansJob < ApplicationJob
  queue_as :default

  def perform
    Rails.logger.info "Starting cleanup of stuck virus scans"

    cleanup_count = 0
    error_count = 0

    # Find files that might be stuck in scanning status or have old scan attempts
    stuck_records = find_potentially_stuck_records

    stuck_records.each do |record|
      begin
        process_stuck_record(record)
        cleanup_count += 1
      rescue => e
        Rails.logger.error "Failed to cleanup stuck scan for #{record.class.name}##{record.id}: #{e.message}"
        error_count += 1
      end
    end

    Rails.logger.info "Cleanup completed: #{cleanup_count} processed, #{error_count} errors"

    # Also cleanup old temporary scan files
    cleanup_temp_files
  end

  private

  def find_potentially_stuck_records
    # Find records that:
    # 1. Have been scanning for more than 1 hour
    # 2. Have no scan status but have an attached file (missed during upload)
    # 3. Have scan_error status older than 24 hours (retry eligible)

    models_with_virus_scanning = [SupportingDocument] # Add other models as needed

    stuck_records = []

    models_with_virus_scanning.each do |model|
      next unless model.respond_to?(:virus_scan_status)

      # Records stuck in scanning status for over 1 hour
      stuck_scanning =
        model.where(virus_scan_status: :scanning).where(
          "virus_scan_started_at < ?",
          1.hour.ago
        )

      # Records with files but no scan status (missed during upload)
      unscanned_with_files =
        model
          .where(virus_scan_status: [nil, :pending])
          .where.not(file_data: [nil, ""])
          .where("created_at < ?", 30.minutes.ago) # Give some time for normal processing

      # Records with old scan errors (eligible for retry)
      old_errors =
        model.where(virus_scan_status: :scan_error).where(
          "virus_scan_completed_at < ?",
          24.hours.ago
        )

      stuck_records.concat(stuck_scanning.to_a)
      stuck_records.concat(unscanned_with_files.to_a)
      stuck_records.concat(old_errors.to_a)
    end

    stuck_records.uniq
  end

  def process_stuck_record(record)
    Rails.logger.info "Processing potentially stuck record: #{record.class.name}##{record.id} (status: #{record.virus_scan_status})"

    case record.virus_scan_status&.to_s
    when "scanning"
      handle_stuck_scanning(record)
    when "scan_error"
      handle_old_error(record)
    when nil, "pending"
      handle_unscanned_file(record)
    end
  end

  def handle_stuck_scanning(record)
    Rails.logger.warn "Resetting stuck scanning record: #{record.class.name}##{record.id}"

    # Reset to pending and let it be picked up for retry
    record.update_columns(
      virus_scan_status: 0, # pending
      virus_scan_started_at: nil,
      virus_scan_message: "Reset from stuck scanning status",
      updated_at: Time.current
    )

    # Attempt immediate scan if file is still accessible
    attempt_immediate_scan(record)
  end

  def handle_old_error(record)
    Rails.logger.info "Retrying old scan error: #{record.class.name}##{record.id}"

    # Reset error status and retry
    record.update_columns(
      virus_scan_status: 0, # pending
      virus_scan_started_at: nil,
      virus_scan_message: "Retrying after error",
      updated_at: Time.current
    )

    attempt_immediate_scan(record)
  end

  def handle_unscanned_file(record)
    return unless record.respond_to?(:file) && record.file.present?

    Rails.logger.info "Scanning previously unscanned file: #{record.class.name}##{record.id}"

    # Set to pending first
    record.update_columns(
      virus_scan_status: 0, # pending
      virus_scan_message: "Fallback scan initiated",
      updated_at: Time.current
    )

    attempt_immediate_scan(record)
  end

  def attempt_immediate_scan(record)
    return unless record.respond_to?(:file) && record.file.present?
    return unless ClamAvService.enabled?

    begin
      # Use the immediate scan method if available
      if record.respond_to?(:perform_immediate_virus_scan!)
        result = record.perform_immediate_virus_scan!
        Rails.logger.info "Fallback scan completed for #{record.class.name}##{record.id}: #{result[:status]}"
      else
        # Fallback to basic scan
        perform_basic_scan(record)
      end
    rescue => e
      Rails.logger.error "Fallback scan failed for #{record.class.name}##{record.id}: #{e.message}"

      # Mark as error if scan fails
      record.update_columns(
        virus_scan_status: 4, # scan_error
        virus_scan_message: "Fallback scan failed: #{e.message}",
        virus_scan_completed_at: Time.current,
        updated_at: Time.current
      )
    end
  end

  def perform_basic_scan(record)
    Rails.logger.info "Performing basic virus scan for #{record.class.name}##{record.id}"

    # Set scanning status
    record.update_columns(
      virus_scan_status: 1, # scanning
      virus_scan_started_at: Time.current,
      updated_at: Time.current
    )

    # Create temp file for scanning
    temp_file = create_temp_file_for_scan(record)

    begin
      # Perform scan
      scan_result = ClamAvService.scan_file(temp_file)

      # Update based on results
      case scan_result[:status]
      when :clean
        record.update_columns(
          virus_scan_status: 2, # clean
          virus_scan_message: scan_result[:message],
          virus_scan_completed_at: Time.current,
          updated_at: Time.current
        )
      when :infected
        record.update_columns(
          virus_scan_status: 3, # infected
          virus_scan_message: scan_result[:message],
          virus_name: scan_result[:virus_name],
          virus_scan_completed_at: Time.current,
          updated_at: Time.current
        )
      else
        record.update_columns(
          virus_scan_status: 4, # scan_error
          virus_scan_message: scan_result[:message],
          virus_scan_completed_at: Time.current,
          updated_at: Time.current
        )
      end
    ensure
      # Clean up temp file
      File.delete(temp_file) if temp_file && File.exist?(temp_file)
    end
  end

  def create_temp_file_for_scan(record)
    temp_dir = ENV.fetch("VIRUS_SCAN_TEMP_DIR", "/tmp/virus_scan")
    FileUtils.mkdir_p(temp_dir) unless Dir.exist?(temp_dir)

    temp_file_name =
      "#{SecureRandom.uuid}_fallback_#{record.file.original_filename}"
    temp_file_path = File.join(temp_dir, temp_file_name)

    File.open(temp_file_path, "wb") do |f|
      record.file.download do |chunk|
        f.write(chunk.is_a?(String) ? chunk : chunk.to_s)
      end
    end

    temp_file_path
  end

  def cleanup_temp_files
    temp_dir = ENV.fetch("VIRUS_SCAN_TEMP_DIR", "/tmp/virus_scan")
    return unless Dir.exist?(temp_dir)

    cleaned_count = 0

    # Remove temp files older than 2 hours
    Dir
      .glob(File.join(temp_dir, "*"))
      .each do |file_path|
        next unless File.file?(file_path)
        next unless File.mtime(file_path) < 2.hours.ago

        begin
          File.delete(file_path)
          cleaned_count += 1
        rescue => e
          Rails.logger.warn "Failed to delete temp file #{file_path}: #{e.message}"
        end
      end

    if cleaned_count > 0
      Rails.logger.info "Cleaned up #{cleaned_count} old temporary scan files"
    end
  end
end
