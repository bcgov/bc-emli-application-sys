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

    # Try rotated credentials from Parameter Store first
    return true if refresh_with_rotated_credentials!

    Rails.logger.warn "Parameter Store refresh failed, trying environment fallback"

    # Fallback to environment credentials if Parameter Store fails
    if refresh_with_environment_fallback!
      Rails.logger.info "Environment fallback successful"
      return true
    end

    Rails.logger.error "All credential refresh methods failed"
    false
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
        # No fallback - Parameter Store is required
        Rails.logger.error "Failed to fetch from Parameter Store, no fallback available"
        return false
      end
    rescue => e
      Rails.logger.error "Failed to fetch rotated credentials: #{e.message}"
      Rails.logger.error "Ensure Lambda rotation is working and Parameter Store contains current/* keys"
      false
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
    # Use the actual parameter path structure - Lambda stores JSON at base path
    base_path = ENV["AWS_PARAMETER_BASE_PATH"]

    # Try with database credentials first, then environment fallback
    [true, false].each do |use_database_creds|
      begin
        ssm_client_options =
          get_parameter_store_credentials(
            force_environment: !use_database_creds
          )
        ssm_client = Aws::SSM::Client.new(ssm_client_options)

        # Lambda stores credentials as JSON at the base path
        credentials_param =
          ssm_client.get_parameter(name: base_path, with_decryption: true)

        # Parse the JSON structure
        credentials_json = JSON.parse(credentials_param.parameter.value)
        current_creds = credentials_json["current"]

        unless current_creds && current_creds["AccessKeyID"] &&
                 current_creds["SecretAccessKey"]
          Rails.logger.error "Invalid credential structure in Parameter Store"
          return nil
        end

        Rails.logger.info "Successfully fetched current credentials from Parameter Store"

        return(
          {
            access_key_id: current_creds["AccessKeyID"],
            secret_access_key: current_creds["SecretAccessKey"]
          }
        )
      rescue Aws::SSM::Errors::ParameterNotFound => e
        Rails.logger.error "Parameter not found: #{e.message}. Expected parameter at #{base_path}"
        return nil # Don't retry on parameter not found
      rescue JSON::ParserError => e
        Rails.logger.error "Failed to parse credentials JSON: #{e.message}"
        return nil # Don't retry on JSON parse error
      rescue Aws::SSM::Errors::UnauthorizedOperation,
             Aws::SSM::Errors::AccessDeniedException => e
        if use_database_creds
          Rails.logger.warn "Database credentials failed for Parameter Store access: #{e.message}, trying environment fallback"
          next # Try environment credentials
        else
          Rails.logger.error "Environment credentials also failed for Parameter Store access: #{e.message}"
          return nil
        end
      rescue => e
        if use_database_creds
          Rails.logger.warn "Parameter Store access failed with database credentials: #{e.message}, trying environment fallback"
          next # Try environment credentials
        else
          Rails.logger.error "Parameter Store access failed with environment credentials: #{e.message}"
          return nil
        end
      end
    end

    nil
  end

  # Check if we're currently using a key marked as pending_deletion
  def using_pending_deletion_key?(current_creds)
    base_path = ENV["AWS_PARAMETER_BASE_PATH"]

    # Try with database credentials first, then environment fallback
    [true, false].each do |use_database_creds|
      begin
        ssm_client_options =
          get_parameter_store_credentials(
            force_environment: !use_database_creds
          )
        Rails.logger.debug "Using credentials for Parameter Store pending_deletion check"

        ssm_client = Aws::SSM::Client.new(ssm_client_options)

        # Get the JSON credentials from Parameter Store
        credentials_param =
          ssm_client.get_parameter(name: base_path, with_decryption: true)

        # Parse the JSON structure
        credentials_json = JSON.parse(credentials_param.parameter.value)
        pending_creds = credentials_json["pending_deletion"]

        # If no pending_deletion section exists, we're good
        return false unless pending_creds && pending_creds["AccessKeyID"]

        pending_key_id = pending_creds["AccessKeyID"]
        current_key_id = current_creds[:access_key_id]

        is_pending = (current_key_id == pending_key_id)

        if is_pending
          Rails.logger.warn "Current key #{current_key_id[0..8]}... is marked as pending_deletion"
        end

        return is_pending
      rescue Aws::SSM::Errors::ParameterNotFound
        # No parameter exists, we're good
        return false
      rescue JSON::ParserError => e
        Rails.logger.error "Failed to parse credentials JSON for pending check: #{e.message}"
        return false
      rescue Aws::SSM::Errors::UnauthorizedOperation,
             Aws::SSM::Errors::AccessDeniedException => e
        if use_database_creds
          Rails.logger.debug "Database credentials failed for pending check: #{e.message}, trying environment fallback"
          next # Try environment credentials
        else
          Rails.logger.error "Environment credentials also failed for pending check: #{e.message}"
          return false
        end
      rescue => e
        if use_database_creds
          Rails.logger.debug "Parameter Store pending check failed with database credentials: #{e.message}, trying environment fallback"
          next # Try environment credentials
        else
          Rails.logger.error "Parameter Store pending check failed with environment credentials: #{e.message}"
          return false
        end
      end
    end

    false
  end

  # Check if current credentials are still valid and not pending deletion
  def credentials_still_valid?
    current_creds = AwsCredential.current_s3_credentials
    return false unless current_creds

    # Check if we're using a pending_deletion key (proactive rotation)
    # Skip this check if we can't access Parameter Store (non-critical)
    begin
      if using_pending_deletion_key?(current_creds)
        Rails.logger.info "Currently using pending_deletion key, rotating to current key"
        return false
      end
    rescue => e
      Rails.logger.warn "Could not check pending_deletion status: #{e.message} (continuing anyway)"
    end

    # More aggressive expiry check - 4 hours buffer (aligned with cron schedule)
    expiry_buffer = 4.hours
    expires_soon = current_creds[:expires_at] < (Time.current + expiry_buffer)

    if expires_soon
      Rails.logger.info "Credentials expire at #{current_creds[:expires_at]} (within #{expiry_buffer / 1.hour} hours), refreshing proactively"
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
          region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "ca-central-1",
          endpoint: ENV["BCGOV_OBJECT_STORAGE_ENDPOINT"],
          force_path_style: true
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

  # Get credentials for Parameter Store access - prefer database, fallback to environment
  def get_parameter_store_credentials(force_environment: false)
    # Force environment credentials if requested, or try database first
    unless force_environment
      # Set thread-local flag to prevent circular dependency
      Thread.current[:aws_credential_refresh_in_progress] = true
      begin
        db_creds = AwsCredential.current_s3_credentials
      ensure
        Thread.current[:aws_credential_refresh_in_progress] = nil
      end

      if db_creds && !credentials_expire_soon?(db_creds)
        Rails.logger.debug "Using database credentials for Parameter Store access"
        return(
          {
            region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "ca-central-1",
            access_key_id: db_creds[:access_key_id],
            secret_access_key: db_creds[:secret_access_key],
            session_token: db_creds[:session_token]
          }
        )
      end
    end

    # Use environment credentials
    Rails.logger.debug "Using environment credentials for Parameter Store access"
    {
      region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "ca-central-1",
      access_key_id: ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"],
      secret_access_key: ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"]
    }
  end

  # Check if credentials expire within 30 minutes (for Parameter Store access)
  def credentials_expire_soon?(creds, buffer = 30.minutes)
    return true unless creds[:expires_at]
    creds[:expires_at] < (Time.current + buffer)
  end

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

  # Class method to ensure credentials exist (for app initialization)
  def self.ensure_credentials!
    service = new
    current_creds = AwsCredential.current_s3_credentials

    if current_creds.nil?
      Rails.logger.warn "No AWS credentials found at startup, initializing from environment"

      unless service.refresh_with_environment_fallback!
        Rails.logger.error "Failed to initialize AWS credentials from environment"
        return false
      end

      Rails.logger.info "Successfully initialized AWS credentials from environment"
      return true
    end

    # Test existing credentials
    if service.test_credentials(current_creds)
      Rails.logger.info "Existing AWS credentials are valid at startup"
      return true
    else
      Rails.logger.warn "Existing AWS credentials invalid at startup, refreshing"
      return service.refresh_credentials!
    end
  end

  # Method to bootstrap credentials from environment (safe to call anytime)
  def bootstrap_from_environment!
    Rails.logger.info "Bootstrapping AWS credentials from environment variables"

    unless ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"].present? &&
             ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"].present?
      Rails.logger.error "Environment variables for AWS credentials not found"
      return false
    end

    refresh_with_environment_fallback!
  end
end
