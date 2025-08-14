class AwsCredentialHealthCheckJob < ApplicationJob
  queue_as :default

  # Don't retry health checks - they should run on schedule
  discard_on StandardError

  def perform
    Rails.logger.info "Starting AWS credential health check"

    service = AwsCredentialRefreshService.new
    current_creds = AwsCredential.current_s3_credentials

    # Health check metrics
    health_status = {
      has_credentials: !current_creds.nil?,
      credentials_valid: false,
      time_until_expiry: nil,
      needs_refresh: false,
      parameter_store_accessible: false,
      environment_fallback_available: false,
      using_pending_key: false
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

      # Check if using pending deletion key
      begin
        health_status[:using_pending_key] = service.send(
          :using_pending_deletion_key?,
          current_creds
        )
        if health_status[:using_pending_key]
          Rails.cache.delete("aws_credentials/s3")
          Rails.logger.warn "Cache invalidated due to pending deletion key"
          health_status[:needs_refresh] = true
        end
      rescue => e
        Rails.logger.debug "Could not check pending key status: #{e.message}"
      end
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
      Rails.logger.warn "Health check detected credential issues, performing immediate refresh"

      begin
        # Perform immediate synchronous refresh instead of queuing job
        if service.refresh_credentials!
          Rails.logger.info "✅ Emergency credential refresh completed successfully"

          # Update health status after refresh
          health_status[:credentials_valid] = service.test_credentials
          health_status[:needs_refresh] = false

          # Refresh Shrine clients
          refresh_shrine_clients
        else
          Rails.logger.error "❌ Emergency credential refresh failed"

          # Queue the job as fallback
          AwsCredentialRefreshJob.perform_later
        end
      rescue => e
        Rails.logger.error "Emergency refresh failed with exception: #{e.message}"

        # Queue the job as fallback
        AwsCredentialRefreshJob.perform_later
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
    Rails.logger.info "AWS Credential Health Check Results:"
    Rails.logger.info "  Has credentials: #{status[:has_credentials]}"
    Rails.logger.info "  Credentials valid: #{status[:credentials_valid]}"

    if status[:time_until_expiry]
      hours_until_expiry = (status[:time_until_expiry] / 1.hour).round(2)
      Rails.logger.info "  Time until expiry: #{hours_until_expiry} hours"
    end

    Rails.logger.info "  Needs refresh: #{status[:needs_refresh]}"
    Rails.logger.info "  Using pending key: #{status[:using_pending_key]}"
    Rails.logger.info "  Parameter Store accessible: #{status[:parameter_store_accessible]}"
    Rails.logger.info "  Environment fallback available: #{status[:environment_fallback_available]}"

    # Color-coded status summary
    if status[:credentials_valid] && !status[:needs_refresh]
      Rails.logger.info "✅ AWS credentials health: GOOD"
    elsif status[:credentials_valid] && status[:needs_refresh]
      Rails.logger.warn "⚠️  AWS credentials health: NEEDS_REFRESH"
    else
      Rails.logger.error "❌ AWS credentials health: CRITICAL"
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
