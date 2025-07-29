class AddPgcryptoEncryptionToAwsCredentials < ActiveRecord::Migration[7.1]
  def up
    # Enable pgcrypto extension for encryption functions
    enable_extension "pgcrypto"

    # Add encryption key column (stores the encryption key used for this record)
    add_column :aws_credentials, :encryption_key_id, :string

    # Migrate existing plain text data to encrypted format
    migrate_to_encrypted_format

    # Add database-level constraint to ensure encryption
    execute <<-SQL
      CREATE OR REPLACE FUNCTION ensure_aws_credentials_encrypted()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Ensure sensitive fields are encrypted (they should start with \\x for encrypted bytea)
        IF NEW.access_key_id IS NOT NULL AND NEW.access_key_id !~ '^\\\\x[0-9a-f]+$' THEN
          RAISE EXCEPTION 'access_key_id must be encrypted';
        END IF;
        
        IF NEW.secret_access_key IS NOT NULL AND NEW.secret_access_key !~ '^\\\\x[0-9a-f]+$' THEN
          RAISE EXCEPTION 'secret_access_key must be encrypted';
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    SQL

    execute <<-SQL
      CREATE TRIGGER aws_credentials_encryption_check
        BEFORE INSERT OR UPDATE ON aws_credentials
        FOR EACH ROW
        EXECUTE FUNCTION ensure_aws_credentials_encrypted();
    SQL
  end

  def down
    execute "DROP TRIGGER IF EXISTS aws_credentials_encryption_check ON aws_credentials"
    execute "DROP FUNCTION IF EXISTS ensure_aws_credentials_encrypted()"

    # Decrypt data back to plain text before removing encryption
    decrypt_to_plain_format

    remove_column :aws_credentials, :encryption_key_id
    disable_extension "pgcrypto"
  end

  private

  def migrate_to_encrypted_format
    # Get encryption key from environment or generate one
    encryption_key = ENV["POSTGRES_ENCRYPTION_KEY"] || generate_encryption_key

    say "Migrating AWS credentials to encrypted format..."

    # Update each record to encrypt sensitive fields
    execute <<-SQL
      UPDATE aws_credentials 
      SET 
        access_key_id = encode(pgp_sym_encrypt(access_key_id, '#{encryption_key}'), 'hex'),
        secret_access_key = encode(pgp_sym_encrypt(secret_access_key, '#{encryption_key}'), 'hex'),
        session_token = CASE 
          WHEN session_token IS NOT NULL 
          THEN encode(pgp_sym_encrypt(session_token, '#{encryption_key}'), 'hex')
          ELSE NULL 
        END,
        encryption_key_id = '#{Digest::SHA256.hexdigest(encryption_key)[0..8]}'
    SQL

    say "✅ #{AwsCredential.count} credentials encrypted successfully"
  end

  def decrypt_to_plain_format
    encryption_key = ENV["POSTGRES_ENCRYPTION_KEY"]
    return unless encryption_key

    say "Decrypting AWS credentials back to plain text..."

    execute <<-SQL
      UPDATE aws_credentials 
      SET 
        access_key_id = pgp_sym_decrypt(decode(access_key_id, 'hex'), '#{encryption_key}'),
        secret_access_key = pgp_sym_decrypt(decode(secret_access_key, 'hex'), '#{encryption_key}'),
        session_token = CASE 
          WHEN session_token IS NOT NULL 
          THEN pgp_sym_decrypt(decode(session_token, 'hex'), '#{encryption_key}')
          ELSE NULL 
        END
    SQL
  end

  def generate_encryption_key
    key = SecureRandom.base64(32)
    say "⚠️  Generated new encryption key. Add this to your .env files:"
    say "POSTGRES_ENCRYPTION_KEY=#{key}"
    key
  end
end
