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
    result =
      self
        .class
        .connection
        .execute(
          "SELECT '\\x' || encode(pgp_sym_encrypt(#{self.class.connection.quote(value)}, #{self.class.connection.quote(key)}), 'hex') as encrypted"
        )
        .first

    result["encrypted"]
  end

  def decrypt_field(encrypted_value)
    return nil unless encrypted_value
    key = encryption_key

    # Remove \x prefix if present before decoding
    hex_value =
      (
        if encrypted_value.start_with?('\\x')
          encrypted_value[2..-1]
        else
          encrypted_value
        end
      )

    # Use PostgreSQL's pgp_sym_decrypt function
    result =
      self
        .class
        .connection
        .execute(
          "SELECT pgp_sym_decrypt(decode(#{self.class.connection.quote(hex_value)}, 'hex'), #{self.class.connection.quote(key)}) as decrypted"
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
        .fetch("aws_credentials/s3", expires_in: 5.minutes) do
          credential =
            active
              .where(name: "s3_access")
              .where("expires_at > ?", Time.current + 10.minutes)
              .first

          if credential.nil?
            Rails.logger.warn "No valid AWS S3 credentials found in database"
            return nil
          end

          {
            access_key_id: credential.access_key_id,
            secret_access_key: credential.secret_access_key,
            session_token: credential.session_token,
            expires_at: credential.expires_at
          }
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
  end
end
