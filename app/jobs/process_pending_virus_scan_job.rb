# Job to process virus scans for records that are still in pending state
class ProcessPendingVirusScanJob < ApplicationJob
  queue_as :default

  def perform
    Rails.logger.info "Starting ProcessPendingVirusScanJob"

    # Find all SupportingDocuments with pending virus scans
    pending_scans =
      SupportingDocument
        .where(virus_scan_status: [:pending, nil])
        .where.not(file_data: [nil, {}])
        .where(
          "virus_scan_started_at IS NULL OR virus_scan_started_at < ?",
          1.hour.ago
        )

    total_found = pending_scans.count
    Rails.logger.info "Found #{total_found} records with pending virus scans"

    if total_found == 0
      Rails.logger.info "No pending virus scans to process"
      return
    end

    processed_count = 0
    error_count = 0

    pending_scans.find_each do |supporting_doc|
      begin
        # Check if file is actually present
        unless supporting_doc.file_attachment_present?
          Rails.logger.warn "SupportingDocument #{supporting_doc.id} has no file attachment - skipping"
          supporting_doc.update!(
            virus_scan_status: :scan_error,
            virus_scan_message: "No file attached",
            virus_scan_completed_at: Time.current
          )
          next
        end

        Rails.logger.info "Processing pending virus scan for SupportingDocument #{supporting_doc.id}"

        # Schedule virus scan job
        supporting_doc.schedule_virus_scan
        processed_count += 1
      rescue => e
        error_count += 1
        Rails.logger.error "Error processing virus scan for SupportingDocument #{supporting_doc.id}: #{e.message}"
        Rails.logger.error e.backtrace.join("\n")

        begin
          supporting_doc.update!(
            virus_scan_status: :scan_error,
            virus_scan_message: "Error scheduling scan: #{e.message}",
            virus_scan_completed_at: Time.current
          )
        rescue => update_error
          Rails.logger.error "Failed to update error status for SupportingDocument #{supporting_doc.id}: #{update_error.message}"
        end
      end
    end

    Rails.logger.info "ProcessPendingVirusScanJob completed: #{processed_count} processed, #{error_count} errors"
  end
end
