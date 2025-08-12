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

    # Use rotated credentials from Parameter Store (managed by Lambda rotation)
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

    begin
      # Use IAM role or environment credentials to access Parameter Store
      ssm_client_options = {
        region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "ca-central-1"
      }

      # Check if we should assume an IAM role
      if ENV["AWS_ROLE_ARN"].present?
        Rails.logger.info "Attempting to assume IAM role: #{ENV["AWS_ROLE_ARN"]}"

        begin
          # Try role assumption (works in dev/test/prod with SAML federation)
          sts_client =
            Aws::STS::Client.new(region: ENV["AWS_REGION"] || "ca-central-1")
          assumed_role =
            sts_client.assume_role(
              role_arn: ENV["AWS_ROLE_ARN"],
              role_session_name: "bcgov-credential-refresh-#{Time.current.to_i}"
            )

          ssm_client_options.merge!(
            access_key_id: assumed_role.credentials.access_key_id,
            secret_access_key: assumed_role.credentials.secret_access_key,
            session_token: assumed_role.credentials.session_token
          )
          Rails.logger.info "✅ Successfully assumed role: #{ENV["AWS_ROLE_ARN"]}"
        rescue Aws::STS::Errors::AccessDenied => e
          Rails.logger.warn "⚠️ Role assumption failed (expected in local dev): #{e.message}"
          Rails.logger.info "📋 Falling back to direct credentials for Parameter Store access"
          # Continue with direct credentials (environment or container role)
        end
      else
        Rails.logger.info "Using container's default IAM role for Parameter Store access"
        # AWS SDK automatically detects and uses:
        # - ECS task role
        # - EC2 instance profile
        # - OpenShift ServiceAccount with IAM role annotation
        # - Container credentials endpoint
      end

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

      Rails.logger.info "Successfully fetched current credentials from Parameter Store: #{base_path}"

      {
        access_key_id: current_creds["AccessKeyID"],
        secret_access_key: current_creds["SecretAccessKey"]
      }
    rescue Aws::SSM::Errors::ParameterNotFound => e
      Rails.logger.error "Parameter not found: #{e.message}. Expected parameter at #{base_path}"
      nil
    rescue JSON::ParserError => e
      Rails.logger.error "Failed to parse credentials JSON: #{e.message}"
      nil
    rescue => e
      Rails.logger.error "Failed to fetch from Parameter Store: #{e.message}"
      nil
    end
  end

  # Check if we're currently using a key marked as pending_deletion
  def using_pending_deletion_key?(current_creds)
    base_path = ENV["AWS_PARAMETER_BASE_PATH"]

    begin
      ssm_client_options = {
        region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "ca-central-1"
      }

      # Check if we should assume an IAM role
      if ENV["AWS_ROLE_ARN"].present?
        Rails.logger.info "Assuming IAM role: #{ENV["AWS_ROLE_ARN"]}"

        # Use current credentials (user creds or container role) to assume the target role
        sts_client =
          Aws::STS::Client.new(region: ENV["AWS_REGION"] || "ca-central-1")
        assumed_role =
          sts_client.assume_role(
            role_arn: ENV["AWS_ROLE_ARN"],
            role_session_name: "bcgov-credential-refresh-#{Time.current.to_i}"
          )

        ssm_client_options.merge!(
          access_key_id: assumed_role.credentials.access_key_id,
          secret_access_key: assumed_role.credentials.secret_access_key,
          session_token: assumed_role.credentials.session_token
        )
      else
        Rails.logger.info "Using container's default IAM role for Parameter Store access"
        # AWS SDK automatically detects and uses:
        # - ECS task role
        # - EC2 instance profile
        # - OpenShift ServiceAccount with IAM role annotation
        # - Container credentials endpoint
      end

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

      is_pending
    rescue Aws::SSM::Errors::ParameterNotFound
      # No parameter exists, we're good
      false
    rescue JSON::ParserError => e
      Rails.logger.error "Failed to parse credentials JSON for pending check: #{e.message}"
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
    # Skip this check if we can't access Parameter Store (non-critical)
    begin
      if using_pending_deletion_key?(current_creds)
        Rails.logger.info "Currently using pending_deletion key, rotating to current key"
        return false
      end
    rescue => e
      Rails.logger.warn "Could not check pending_deletion status: #{e.message} (continuing anyway)"
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
