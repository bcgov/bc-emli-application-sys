class AwsCredentialRefreshService
  include ActiveModel::Model

  attr_accessor :role_arn, :session_name, :duration_seconds

  def initialize(attributes = {})
    @role_arn = attributes[:role_arn] || ENV["AWS_ROLE_ARN"]
    @session_name =
      attributes[:session_name] || "s3-access-#{Time.current.to_i}"
    @duration_seconds = attributes[:duration_seconds] || 2.days.to_i # 2 days in seconds
    super
  end

  def refresh_credentials!
    Rails.logger.info "Starting AWS credential refresh process"

    # First, deactivate any expired credentials
    AwsCredential.deactivate_expired!

    # If no role ARN is configured, use fallback method
    if role_arn.blank?
      Rails.logger.info "No AWS role ARN configured, using existing credentials fallback"
      return refresh_with_existing_credentials!
    end

    begin
      # Use current environment credentials to assume role and get new temporary credentials
      new_credentials = assume_role_with_kms_access

      # Store new credentials in database
      AwsCredential.update_s3_credentials!(
        access_key_id: new_credentials.access_key_id,
        secret_access_key: new_credentials.secret_access_key,
        session_token: new_credentials.session_token,
        expires_at: new_credentials.expiration
      )

      Rails.logger.info "AWS credentials refreshed successfully, expires at #{new_credentials.expiration}"
      true
    rescue => e
      Rails.logger.error "Failed to refresh AWS credentials: #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      false
    end
  end

  # Alternative method if role assumption is not available
  def refresh_with_existing_credentials!
    Rails.logger.info "Refreshing credentials using existing environment variables"

    begin
      # Calculate expiration time (2 days from now)
      expires_at = Time.current + duration_seconds.seconds

      # Store current environment credentials in database with extended expiration
      AwsCredential.update_s3_credentials!(
        access_key_id: ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"],
        secret_access_key: ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"],
        session_token: nil, # Environment credentials typically don't have session tokens
        expires_at: expires_at
      )

      Rails.logger.info "AWS credentials stored from environment, expires at #{expires_at}"
      true
    rescue => e
      Rails.logger.error "Failed to store AWS credentials from environment: #{e.message}"
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

  def assume_role_with_kms_access
    # Create STS client with current credentials
    sts_client =
      Aws::STS::Client.new(
        access_key_id: ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"],
        secret_access_key: ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"],
        region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "ca-central-1"
      )

    # Assume role to get new temporary credentials with KMS access
    response =
      sts_client.assume_role(
        {
          role_arn: role_arn,
          role_session_name: session_name,
          duration_seconds: duration_seconds,
          policy: kms_access_policy.to_json
        }
      )

    response.credentials
  end

  def kms_access_policy
    # Simplified policy for basic S3 access - KMS permissions removed as they're not needed
    {
      "Version" => "2012-10-17",
      "Statement" => [
        {
          "Effect" => "Allow",
          "Action" => ["s3:*"],
          "Resource" => [
            "arn:aws:s3:::#{ENV["BCGOV_OBJECT_STORAGE_BUCKET"]}",
            "arn:aws:s3:::#{ENV["BCGOV_OBJECT_STORAGE_BUCKET"]}/*"
          ]
        }
      ]
    }
  end
end
