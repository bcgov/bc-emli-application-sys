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

  # Perform immediate virus scan (synchronous)
  def scan_for_virus_now!
    return false unless file_attachment_present?

    update!(virus_scan_status: :scanning, virus_scan_started_at: Time.current)

    file_path = download_file_for_scan
    scan_result = ClamAvService.scan_file(file_path)

    update_scan_results(scan_result)

    # Clean up temporary file
    File.delete(file_path) if File.exist?(file_path)

    clean?
  rescue => e
    Rails.logger.error "Immediate virus scan failed: #{e.message}"
    update!(
      virus_scan_status: :scan_error,
      virus_scan_message: "Scan failed: #{e.message}",
      virus_scan_completed_at: Time.current
    )
    false
  end

  # Schedule background virus scan
  def schedule_virus_scan
    return unless file_attachment_present?

    update!(virus_scan_status: :pending, virus_scan_started_at: Time.current)
    VirusScanJob.perform_later(self.class.name, id)
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

  def download_file_for_scan
    # Create a temporary file for scanning
    temp_dir = ENV.fetch("VIRUS_SCAN_TEMP_DIR", "/tmp/virus_scan")
    FileUtils.mkdir_p(temp_dir) unless Dir.exist?(temp_dir)

    temp_file =
      File.join(temp_dir, "#{SecureRandom.uuid}_#{file.original_filename}")

    # Download file from storage to temporary location
    file.download { |chunk| File.open(temp_file, "ab") { |f| f.write(chunk) } }

    temp_file
  end

  def update_scan_results(scan_result)
    case scan_result[:status]
    when :clean
      update!(
        virus_scan_status: :clean,
        virus_scan_message: scan_result[:message],
        virus_scan_completed_at: Time.current
      )
    when :infected
      update!(
        virus_scan_status: :infected,
        virus_scan_message: scan_result[:message],
        virus_scan_completed_at: Time.current
      )
    when :error
      update!(
        virus_scan_status: :scan_error,
        virus_scan_message: scan_result[:message],
        virus_scan_completed_at: Time.current
      )
    end
  end
end
