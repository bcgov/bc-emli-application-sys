class AwsCredentialHealthCheckJob
  include Sidekiq::Job
  sidekiq_options queue: :default, retry: false, log_level: :warn

  def perform
    service = AwsCredentialRefreshService.new
    current_creds = AwsCredential.current_s3_credentials

    # Health check metrics
    health_status = {
      has_credentials: !current_creds.nil?,
      credentials_valid: false,
      time_until_expiry: nil,
      needs_refresh: false,
      parameter_store_accessible: false,
      environment_fallback_available: false
    }

    if current_creds
      health_status[:time_until_expiry] = current_creds[:expires_at] -
        Time.current
      health_status[:credentials_valid] = service.test_credentials(
        current_creds
      )

      # Check if credentials expire within 8 hours (same as service buffer)
      health_status[:needs_refresh] = current_creds[:expires_at] <
        (Time.current + 8.hours)

      # Let refresh_credentials! handle pending_deletion detection internally
      # (calling using_pending_deletion_key? here would double the WARN logs)
      health_status[:needs_refresh] ||= !health_status[:credentials_valid]
    else
      health_status[:needs_refresh] = true
    end

    # Test Parameter Store accessibility
    begin
      service.send(:fetch_rotated_credentials_from_parameter_store)
      health_status[:parameter_store_accessible] = true
    rescue => e
      Rails.logger.warn "Parameter Store health check failed: #{e.message}"
    end

    # Test environment fallback availability
    health_status[:environment_fallback_available] = (
      ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"].present? &&
        ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"].present?
    )

    # Log health status
    log_health_status(health_status)

    # Take immediate corrective action if needed
    if health_status[:needs_refresh] || !health_status[:credentials_valid]
      Rails.logger.info "Health check detected credential issues, performing immediate refresh"

      begin
        # Perform immediate synchronous refresh instead of queuing job
        if service.refresh_credentials!
          Rails.logger.info "✅ Emergency credential refresh completed successfully"

          # Update health status after refresh
          health_status[
            :has_credentials
          ] = !AwsCredential.current_s3_credentials.nil?
          health_status[:credentials_valid] = service.test_credentials
          health_status[:needs_refresh] = false

          # Refresh Shrine clients
          refresh_shrine_clients
        else
          Rails.logger.error "❌ Emergency credential refresh failed"

          # Queue the job as fallback
          AwsCredentialRefreshJob.perform_async
        end
      rescue => e
        Rails.logger.error "Emergency refresh failed with exception: #{e.message}"

        # Queue the job as fallback
        AwsCredentialRefreshJob.perform_async
      end
    end

    # Log critical alerts
    if !health_status[:has_credentials]
      Rails.logger.error "🚨 CRITICAL: No AWS credentials found in database"
    elsif !health_status[:credentials_valid]
      Rails.logger.error "🚨 CRITICAL: Current AWS credentials are invalid"
    elsif health_status[:time_until_expiry] &&
          health_status[:time_until_expiry] < 1.hour
      Rails.logger.error "🚨 CRITICAL: AWS credentials expire in less than 1 hour"
    end

    health_status
  end

  private

  def log_health_status(status)
    if status[:credentials_valid] && !status[:needs_refresh]
      Rails.logger.info "AWS credential health check: OK"
    elsif status[:credentials_valid] && status[:needs_refresh]
      hours =
        (
          if status[:time_until_expiry]
            "#{(status[:time_until_expiry] / 1.hour).round(2)}h"
          else
            "unknown"
          end
        )
      Rails.logger.warn "AWS credential health check: NEEDS_REFRESH — expiry in #{hours}"
    else
      Rails.logger.error "AWS credential health check: CRITICAL — " \
                           "has_credentials=#{status[:has_credentials]} " \
                           "credentials_valid=#{status[:credentials_valid]} " \
                           "parameter_store_accessible=#{status[:parameter_store_accessible]} " \
                           "environment_fallback_available=#{status[:environment_fallback_available]}"
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
