# Concern for models that need virus scanning functionality
module VirusScannable
  extend ActiveSupport::Concern

  included do
    # Virus scan status enum
    enum virus_scan_status: {
           pending: 0,
           scanning: 1,
           clean: 2,
           infected: 3,
           scan_error: 4
         }

    scope :virus_scan_pending, -> { where(virus_scan_status: :pending) }
    scope :virus_scan_clean, -> { where(virus_scan_status: :clean) }
    scope :virus_scan_infected, -> { where(virus_scan_status: :infected) }
    scope :virus_scan_failed, -> { where(virus_scan_status: :scan_error) }
  end

  # Immediate synchronous virus scan (called by FileUploader)
  def perform_immediate_virus_scan!
    unless file_attachment_present?
      return { status: :skipped, message: "No file attached" }
    end
    if virus_scan_status.present? && !virus_scan_status.in?(["scan_error"])
      return { status: :skipped, message: "Already scanned" }
    end

    Rails.logger.info "Performing immediate virus scan for #{self.class.name}##{id}"

    begin
      # Download file for scanning
      temp_file_path = download_file_for_immediate_scan

      # Perform virus scan
      scan_result = ClamAvService.scan_file(temp_file_path)

      # Update database immediately
      update_immediate_scan_results(scan_result)

      Rails.logger.info "Immediate virus scan completed for #{self.class.name}##{id}: #{scan_result[:message]}"
      scan_result
    rescue => e
      Rails.logger.error "Immediate virus scan failed for #{self.class.name}##{id}: #{e.message}"

      error_result = { status: :error, message: "Scan failed: #{e.message}" }
      update_immediate_scan_results(error_result)
      error_result
    ensure
      # Clean up temp file
      if temp_file_path && File.exist?(temp_file_path)
        File.delete(temp_file_path)
      end
    end
  end

  private

  def download_file_for_immediate_scan
    temp_dir = ENV.fetch("VIRUS_SCAN_TEMP_DIR", "/tmp/virus_scan")
    FileUtils.mkdir_p(temp_dir) unless Dir.exist?(temp_dir)

    temp_file_name = "#{SecureRandom.uuid}_immediate_#{file.original_filename}"
    temp_file_path = File.join(temp_dir, temp_file_name)

    File.open(temp_file_path, "wb") do |f|
      file.download do |chunk|
        f.write(chunk.is_a?(String) ? chunk : chunk.to_s)
      end
    end

    temp_file_path
  end

  def update_immediate_scan_results(scan_result)
    case scan_result[:status]
    when :clean
      update!(
        virus_scan_status: :clean,
        virus_scan_message: scan_result[:message],
        virus_scan_started_at: Time.current,
        virus_scan_completed_at: Time.current
      )
    when :infected
      update!(
        virus_scan_status: :infected,
        virus_scan_message: scan_result[:message],
        virus_name: scan_result[:virus_name],
        virus_scan_started_at: Time.current,
        virus_scan_completed_at: Time.current
      )
    when :error
      update!(
        virus_scan_status: :scan_error,
        virus_scan_message: scan_result[:message],
        virus_scan_started_at: Time.current,
        virus_scan_completed_at: Time.current
      )
    end
  end

  # Check if file attachment is present and accessible
  def file_attachment_present?
    respond_to?(:file) && file.present?
  end

  # Get virus scan status as human readable string
  def virus_scan_status_text
    case virus_scan_status
    when "pending"
      "Pending scan"
    when "scanning"
      "Scanning in progress"
    when "clean"
      "File is clean"
    when "infected"
      "Virus detected: #{virus_scan_message}"
    when "scan_error"
      "Scan failed: #{virus_scan_message}"
    else
      "Unknown status"
    end
  end

  # Check if file is safe to use
  def safe_to_use?
    clean?
  end

  # Check if scan is in progress
  def scan_in_progress?
    pending? || scanning?
  end

  private
end
