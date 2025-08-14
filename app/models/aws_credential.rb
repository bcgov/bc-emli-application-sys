class AwsCredential < ApplicationRecord
  validates :name, presence: true, uniqueness: true
  validates :access_key_id, presence: true
  validates :secret_access_key, presence: true
  validates :expires_at, presence: true

  scope :active, -> { where(active: true) }
  scope :expired, -> { where("expires_at < ?", Time.current) }
  scope :expiring_soon,
        ->(threshold = 1.hour) do
          where("expires_at < ?", Time.current + threshold)
        end

  # PostgreSQL pgcrypto encryption - credentials encrypted at database level

  # Override attribute accessors to handle encryption/decryption
  def access_key_id
    decrypt_field(read_attribute(:access_key_id))
  end

  def access_key_id=(value)
    write_attribute(:access_key_id, encrypt_field(value))
    write_attribute(:encryption_key_id, current_key_id) if value
  end

  def secret_access_key
    decrypt_field(read_attribute(:secret_access_key))
  end

  def secret_access_key=(value)
    write_attribute(:secret_access_key, encrypt_field(value))
    write_attribute(:encryption_key_id, current_key_id) if value
  end

  def session_token
    token = read_attribute(:session_token)
    token ? decrypt_field(token) : nil
  end

  def session_token=(value)
    if value
      write_attribute(:session_token, encrypt_field(value))
      write_attribute(:encryption_key_id, current_key_id)
    else
      write_attribute(:session_token, nil)
    end
  end

  private

  def encrypt_field(value)
    return nil unless value
    key = encryption_key

    # Use PostgreSQL's pgp_sym_encrypt function with \x prefix for trigger compatibility
    # The E prefix tells PostgreSQL to interpret escape sequences
    escaped_value = self.class.connection.quote(value)
    escaped_key = self.class.connection.quote(key)

    result =
      self
        .class
        .connection
        .execute(
          "SELECT lower(encode(pgp_sym_encrypt(#{escaped_value}, #{escaped_key}), 'hex')) as encrypted"
        )
        .first

    result["encrypted"]
  end

  def decrypt_field(encrypted_value)
    return nil unless encrypted_value
    key = encryption_key

    # Handle different possible formats for backward compatibility
    hex_value =
      if encrypted_value.start_with?('\\\\x')
        # Database stored \\x (double backslash)
        encrypted_value[3..-1]
      elsif encrypted_value.start_with?('\\x')
        # Database stored \x (single backslash)
        encrypted_value[2..-1]
      else
        # Legacy format without prefix
        encrypted_value
      end

    # Validate that we have only hex characters
    unless hex_value.match?(/^[0-9a-f]+$/i)
      Rails.logger.error "Invalid hex format for decryption. Original: #{encrypted_value[0..20]}..., Extracted: #{hex_value[0..20]}..."
      return nil
    end

    # Use direct SQL with proper escaping
    escaped_hex = self.class.connection.quote(hex_value)
    escaped_key = self.class.connection.quote(key)

    result =
      self
        .class
        .connection
        .execute(
          "SELECT pgp_sym_decrypt(decode(#{escaped_hex}, 'hex'), #{escaped_key}) as decrypted"
        )
        .first

    result["decrypted"]
  rescue => e
    Rails.logger.error "Failed to decrypt field: #{e.message}"
    nil
  end

  def encryption_key
    ENV["POSTGRES_ENCRYPTION_KEY"] ||
      raise("POSTGRES_ENCRYPTION_KEY environment variable not set")
  end

  def current_key_id
    Digest::SHA256.hexdigest(encryption_key)[0..8]
  end

  class << self
    # Get current active credentials for S3 access
    def current_s3_credentials
      Rails
        .cache
        .fetch("aws_credentials/s3", expires_in: smart_cache_ttl) do
          credential =
            active
              .where(name: "s3_access")
              .where("expires_at > ?", Time.current + 5.minutes)
              .first

          if credential.nil?
            Rails.logger.warn "No valid AWS S3 credentials found in database"
            return nil
          end

          # Double-check if this key is marked as pending deletion
          cred_hash = {
            access_key_id: credential.access_key_id,
            secret_access_key: credential.secret_access_key,
            session_token: credential.session_token,
            expires_at: credential.expires_at
          }

          # If we can check Parameter Store and key is pending deletion, return nil to force refresh
          # Skip pending deletion check if we're already in a refresh context to avoid circular dependency
          if pending_deletion_check_available? &&
               !Thread.current[:aws_credential_refresh_in_progress] &&
               using_pending_deletion_key?(cred_hash)
            Rails.logger.warn "Database credential is marked as pending_deletion, invalidating cache and forcing refresh"
            Rails.cache.delete("aws_credentials/s3")
            return nil
          end

          cred_hash
        end
    end

    # Update or create S3 credentials
    def update_s3_credentials!(
      access_key_id:,
      secret_access_key:,
      session_token: nil,
      expires_at:
    )
      credential = find_or_initialize_by(name: "s3_access")

      credential.assign_attributes(
        access_key_id: access_key_id,
        secret_access_key: secret_access_key,
        session_token: session_token,
        expires_at: expires_at,
        active: true
      )

      if credential.save!
        Rails.cache.delete("aws_credentials/s3")
        Rails.logger.info "AWS S3 credentials updated successfully, expires at #{expires_at}"
        credential
      end
    end

    # Deactivate expired credentials
    def deactivate_expired!
      expired_count =
        expired.active.update_all(active: false, updated_at: Time.current)
      Rails.cache.delete("aws_credentials/s3") if expired_count > 0
      if expired_count > 0
        Rails.logger.info "Deactivated #{expired_count} expired AWS credentials"
      end
      expired_count
    end

    private

    def smart_cache_ttl
      # Shorter cache during potential rotation periods
      if likely_rotation_period?
        30.seconds # Aggressive during rotation windows
      else
        1.minute # Normal operations
      end
    end

    def likely_rotation_period?
      last_update = active.where(name: "s3_access").maximum(:updated_at)
      return false unless last_update

      # Assume rotations every 2 days, be aggressive 6 hours before expected rotation
      time_since_update = Time.current - last_update
      time_since_update > 1.75.days
    end

    def pending_deletion_check_available?
      ENV["AWS_PARAMETER_BASE_PATH"].present? &&
        ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"].present? &&
        ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"].present?
    end

    def using_pending_deletion_key?(creds)
      return false unless pending_deletion_check_available?

      begin
        service = AwsCredentialRefreshService.new
        service.send(:using_pending_deletion_key?, creds)
      rescue => e
        Rails.logger.debug "Could not check pending deletion status: #{e.message}"
        false # Don't block if we can't check
      end
    end
  end
end
