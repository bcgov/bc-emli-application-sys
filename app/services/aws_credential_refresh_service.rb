class AwsCredentialRefreshService
  include ActiveModel::Model

  def refresh_credentials!
    Rails.logger.info "Starting AWS credential refresh process"

    # Check if current credentials are still valid and not expiring soon
    if credentials_still_valid?
      Rails.logger.info "Current credentials are still valid, skipping refresh"
      return true
    end

    # First, deactivate any expired credentials
    AwsCredential.deactivate_expired!

    # Use rotated credentials from environment (updated by Lambda rotation)
    refresh_with_rotated_credentials!
  end

  # Fetch rotated credentials from AWS Secrets Manager (where Lambda stores them)
  def refresh_with_rotated_credentials!
    Rails.logger.info "Fetching rotated credentials from AWS Secrets Manager"

    begin
      # First try to get current credentials from Parameter Store
      rotated_creds = fetch_rotated_credentials_from_parameter_store

      if rotated_creds
        # Lambda rotation creates new keys every 2 days and deletes old ones after 4 days
        # We expire database credentials every 3 days to ensure frequent refreshes
        expires_at = Time.current + 3.days

        AwsCredential.update_s3_credentials!(
          access_key_id: rotated_creds[:access_key_id],
          secret_access_key: rotated_creds[:secret_access_key],
          session_token: nil,
          expires_at: expires_at
        )

        Rails.logger.info "Rotated AWS credentials fetched and stored, expires at #{expires_at}"
        return true
      else
        # Fallback to environment if Parameter Store fails
        Rails.logger.warn "Failed to fetch from Parameter Store, using environment fallback"
        return refresh_with_environment_fallback!
      end
    rescue => e
      Rails.logger.error "Failed to fetch rotated credentials: #{e.message}"
      # Fallback to environment credentials
      refresh_with_environment_fallback!
    end
  end

  # Fallback to environment credentials
  def refresh_with_environment_fallback!
    Rails.logger.info "Using environment credentials as fallback"

    begin
      expires_at = Time.current + 24.hours # Shorter expiration for fallback

      AwsCredential.update_s3_credentials!(
        access_key_id: ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"],
        secret_access_key: ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"],
        session_token: nil,
        expires_at: expires_at
      )

      Rails.logger.info "Environment credentials stored as fallback, expires at #{expires_at}"
      true
    rescue => e
      Rails.logger.error "Failed to store environment credentials: #{e.message}"
      false
    end
  end

  # Fetch current (non-pending_deletion) credentials from Parameter Store
  def fetch_rotated_credentials_from_parameter_store
    # Use the actual parameter path structure
    base_path = ENV["AWS_PARAMETER_BASE_PATH"]

    begin
      # Use current environment credentials to access Parameter Store
      ssm_client =
        Aws::SSM::Client.new(
          region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "ca-central-1",
          access_key_id: ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"],
          secret_access_key: ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"]
        )

      # Get the current (active) access key ID - avoid pending_deletion
      access_key_param =
        ssm_client.get_parameter(
          name: "#{base_path}/current/access_key_id",
          with_decryption: true
        )

      # Get the current (active) secret access key
      secret_key_param =
        ssm_client.get_parameter(
          name: "#{base_path}/current/secret_access_key",
          with_decryption: true
        )

      Rails.logger.info "Successfully fetched current credentials from Parameter Store: #{base_path}"

      {
        access_key_id: access_key_param.parameter.value,
        secret_access_key: secret_key_param.parameter.value
      }
    rescue Aws::SSM::Errors::ParameterNotFound => e
      Rails.logger.error "Parameter not found: #{e.message}. Expected parameters at #{base_path}/current/"
      nil
    rescue => e
      Rails.logger.error "Failed to fetch from Parameter Store: #{e.message}"
      nil
    end
  end

  # Check if we're currently using a key marked as pending_deletion
  def using_pending_deletion_key?(current_creds)
    base_path =
      "/iam_users/BCGOV_WORKLOAD_admin_709391fb7b5745eda96357051a2372cf_keys"

    begin
      ssm_client =
        Aws::SSM::Client.new(
          region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "ca-central-1",
          access_key_id: ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"],
          secret_access_key: ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"]
        )

      # Check if there's a pending_deletion key and if we're using it
      pending_key_param =
        ssm_client.get_parameter(
          name: "#{base_path}/pending_deletion/access_key_id",
          with_decryption: true
        )

      pending_key_id = pending_key_param.parameter.value
      current_key_id = current_creds[:access_key_id]

      is_pending = (current_key_id == pending_key_id)

      if is_pending
        Rails.logger.warn "Current key #{current_key_id[0..8]}... is marked as pending_deletion"
      end

      is_pending
    rescue Aws::SSM::Errors::ParameterNotFound
      # No pending_deletion key exists, we're good
      false
    rescue => e
      Rails.logger.error "Failed to check pending_deletion status: #{e.message}"
      false
    end
  end

  # Check if current credentials are still valid and not pending deletion
  def credentials_still_valid?
    current_creds = AwsCredential.current_s3_credentials
    return false unless current_creds

    # Check if we're using a pending_deletion key (proactive rotation)
    if using_pending_deletion_key?(current_creds)
      Rails.logger.info "Currently using pending_deletion key, rotating to current key"
      return false
    end

    # Check if credentials expire within the next 2 hours (safety buffer)
    expiry_buffer = 2.hours
    expires_soon = current_creds[:expires_at] < (Time.current + expiry_buffer)

    if expires_soon
      Rails.logger.info "Credentials expire at #{current_creds[:expires_at]}, refreshing proactively"
      return false
    end

    # Test if credentials actually work
    if test_credentials(current_creds)
      Rails.logger.info "Credentials valid until #{current_creds[:expires_at]} (#{time_until_expiry(current_creds[:expires_at])} remaining)"
      true
    else
      Rails.logger.warn "Credentials failed validation test, need refresh"
      false
    end
  end

  # Health check method
  def test_credentials(credentials = nil)
    test_creds = credentials || AwsCredential.current_s3_credentials
    return false unless test_creds

    begin
      s3_client =
        Aws::S3::Client.new(
          access_key_id: test_creds[:access_key_id],
          secret_access_key: test_creds[:secret_access_key],
          session_token: test_creds[:session_token],
          region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "ca-central-1"
        )

      # Test by listing bucket (minimal operation)
      s3_client.head_bucket(bucket: ENV["BCGOV_OBJECT_STORAGE_BUCKET"])
      Rails.logger.info "AWS credentials test successful"
      true
    rescue => e
      Rails.logger.error "AWS credentials test failed: #{e.message}"
      false
    end
  end

  private

  def time_until_expiry(expires_at)
    time_diff = expires_at - Time.current
    if time_diff > 1.day
      "#{(time_diff / 1.day).round(1)} days"
    elsif time_diff > 1.hour
      "#{(time_diff / 1.hour).round(1)} hours"
    else
      "#{(time_diff / 1.minute).round} minutes"
    end
  end
end
