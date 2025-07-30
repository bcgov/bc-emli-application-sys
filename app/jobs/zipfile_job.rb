class ZipfileJob
  include Sidekiq::Worker
  sidekiq_options queue: :file_processing, retry: 2

  def perform(permit_application_id)
    permit_application = PermitApplication.find(permit_application_id)
    return if permit_application.blank?

    Rails.logger.info "ZipfileJob starting for permit application: #{permit_application_id}"

    # Simple deduplication - skip if recent zip exists (last 5 minutes)
    if permit_application.zipfile_data.present? &&
         permit_application.updated_at > 5.minutes.ago
      Rails.logger.info "Recent zip exists (created #{permit_application.updated_at}), skipping generation"
      return
    end

    # Try to generate PDFs, but don't fail the entire job if PDF generation fails
    begin
      Rails.logger.info "Attempting PDF generation..."
      PdfGenerationJob.new.perform(permit_application_id)
      Rails.logger.info "PDF generation completed successfully"
    rescue => pdf_error
      Rails.logger.warn "PDF generation failed: #{pdf_error.message}"
      Rails.logger.warn "Continuing with zip creation using existing documents only"

      # Continue anyway - we can still create a zip with existing documents
      # The user can download individual PDFs via the direct download endpoints
    end

    # Always try to create the zip file with whatever documents are available
    begin
      Rails.logger.info "Creating zip file..."
      SupportingDocumentsZipper.new(permit_application_id).perform
      Rails.logger.info "Zip file created successfully"

      # Broadcast update to users
      WebsocketBroadcaster.push_update_to_relevant_users(
        permit_application.notifiable_users.pluck(:id),
        Constants::Websockets::Events::PermitApplication::DOMAIN,
        Constants::Websockets::Events::PermitApplication::TYPES[
          :update_supporting_documents
        ],
        PermitApplicationBlueprint.render_as_hash(
          permit_application.reload,
          { view: :supporting_docs_update }
        )
      )
    rescue => zip_error
      Rails.logger.error "Zip creation also failed: #{zip_error.message}"

      # Even if zip creation fails, unlock the job so users can try again
      # or use individual PDF downloads
      raise zip_error
    end
  end
end
