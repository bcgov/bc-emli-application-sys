class AwsCredentialRefreshJob < ApplicationJob
  queue_as :default

  def perform
    Rails.logger.info "Starting scheduled AWS credential refresh job"

    service = AwsCredentialRefreshService.new

    begin
      if service.refresh_credentials!
        Rails.logger.info "✅ Scheduled AWS credential refresh completed successfully"

        # Refresh S3 storage clients to use new credentials
        refresh_shrine_clients

        # Test new credentials
        if service.test_credentials
          Rails.logger.info "✅ New credentials tested and working"
        else
          Rails.logger.error "⚠️ Warning: New credentials may not be working properly"
          # You might want to send alerts here
        end
      else
        Rails.logger.error "❌ Scheduled AWS credential refresh failed"
        # You might want to send alerts here
      end
    rescue => e
      Rails.logger.error "AWS credential refresh job failed with exception: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      raise e # Re-raise to mark job as failed
    end
  end

  private

  def refresh_shrine_clients
    if Shrine.storages[:cache].is_a?(DynamicS3Storage)
      Shrine.storages[:cache].refresh_client!
    end

    if Shrine.storages[:store].is_a?(DynamicS3Storage)
      Shrine.storages[:store].refresh_client!
    end
  end
end
