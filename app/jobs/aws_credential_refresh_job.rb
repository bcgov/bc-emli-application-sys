class AwsCredentialRefreshJob < ApplicationJob
  queue_as :default

  # Retry configuration for critical credential refresh
  retry_on StandardError, wait: :exponentially_longer, attempts: 3

  def perform
    Rails.logger.info "Starting scheduled AWS credential refresh job"

    service = AwsCredentialRefreshService.new

    # First check if we have any valid credentials at all
    ensure_credentials_exist!(service)

    begin
      if service.refresh_credentials!
        Rails.logger.info "✅ Scheduled AWS credential refresh completed successfully"

        # Refresh S3 storage clients to use new credentials
        refresh_shrine_clients

        # Test new credentials with retry logic
        test_credentials_with_retry!(service)
      else
        Rails.logger.error "❌ Scheduled AWS credential refresh failed"
        handle_refresh_failure!(service)
      end
    rescue => e
      Rails.logger.error "AWS credential refresh job failed with exception: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      handle_job_failure!(service, e)
      raise e # Re-raise to mark job as failed for Sidekiq retry
    end
  end

  private

  def ensure_credentials_exist!(service)
    current_creds = AwsCredential.current_s3_credentials

    if current_creds.nil?
      Rails.logger.warn "No AWS credentials found in database, attempting emergency refresh"

      # Try environment fallback if no credentials exist
      unless service.respond_to?(:refresh_with_environment_fallback!)
        Rails.logger.error "No fallback method available, cannot bootstrap credentials"
        raise "No AWS credentials available and no fallback method"
      end

      if service.refresh_with_environment_fallback!
        Rails.logger.info "Successfully bootstrapped credentials from environment"
      else
        raise "Failed to bootstrap AWS credentials from environment"
      end
    end
  end

  def test_credentials_with_retry!(service, max_attempts = 3)
    attempts = 0

    while attempts < max_attempts
      attempts += 1

      if service.test_credentials
        Rails.logger.info "✅ New credentials tested and working (attempt #{attempts})"
        return true
      end

      Rails.logger.warn "⚠️ Credential test failed (attempt #{attempts}/#{max_attempts})"

      if attempts < max_attempts
        Rails.logger.info "Retrying credential test in 30 seconds..."
        sleep(30)
      end
    end

    Rails.logger.error "❌ All credential test attempts failed"
    false
  end

  def handle_refresh_failure!(service)
    Rails.logger.error "Credential refresh failed, checking current credential status"

    current_creds = AwsCredential.current_s3_credentials
    if current_creds && service.test_credentials(current_creds)
      Rails.logger.info "Current credentials still work, refresh failure may be temporary"
    else
      Rails.logger.error "Current credentials are also invalid, attempting emergency fallback"

      if service.respond_to?(:refresh_with_environment_fallback!)
        if service.refresh_with_environment_fallback!
          Rails.logger.info "Emergency fallback successful"
        else
          Rails.logger.error "Emergency fallback also failed"
          raise "All credential sources exhausted"
        end
      end
    end
  end

  def handle_job_failure!(service, error)
    Rails.logger.error "Job failure handler activated due to: #{error.class}: #{error.message}"

    # Log current system state for debugging
    current_creds = AwsCredential.current_s3_credentials
    if current_creds
      Rails.logger.error "Current credentials expire at: #{current_creds[:expires_at]}"
      Rails.logger.error "Time until expiry: #{((current_creds[:expires_at] - Time.current) / 1.hour).round(2)} hours"
    else
      Rails.logger.error "No current credentials found in database"
    end

    # Attempt emergency fallback if possible
    if service.respond_to?(:refresh_with_environment_fallback!)
      Rails.logger.error "Attempting emergency environment fallback due to job failure"
      service.refresh_with_environment_fallback!
    end
  end

  def refresh_shrine_clients
    if Shrine.storages[:cache].is_a?(DynamicS3Storage)
      Shrine.storages[:cache].refresh_client!
    end

    if Shrine.storages[:store].is_a?(DynamicS3Storage)
      Shrine.storages[:store].refresh_client!
    end
  end
end
