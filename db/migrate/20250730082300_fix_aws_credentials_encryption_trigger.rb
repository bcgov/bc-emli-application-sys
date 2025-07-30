class FixAwsCredentialsEncryptionTrigger < ActiveRecord::Migration[7.1]
  def up
    # First, check if the trigger exists
    trigger_exists =
      connection.execute(
        "SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'aws_credentials_encryption_check')"
      ).first[
        "exists"
      ]

    if trigger_exists
      say "Updating encryption trigger to accept both formats..."

      # Drop existing trigger
      execute "DROP TRIGGER IF EXISTS aws_credentials_encryption_check ON aws_credentials"
      execute "DROP FUNCTION IF EXISTS ensure_aws_credentials_encrypted()"

      # Create more flexible trigger that accepts both hex formats
      execute <<-SQL
        CREATE OR REPLACE FUNCTION ensure_aws_credentials_encrypted()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Allow both formats: plain hex or \\x prefixed hex
          -- Plain hex: just hex characters (from our encrypt_field method)
          -- Prefixed hex: \\x followed by hex characters (legacy format)
          IF NEW.access_key_id IS NOT NULL AND 
             NEW.access_key_id !~ '^(\\\\x)?[0-9a-f]+$' THEN
            RAISE EXCEPTION 'access_key_id must be encrypted (hex format)';
          END IF;
          
          IF NEW.secret_access_key IS NOT NULL AND 
             NEW.secret_access_key !~ '^(\\\\x)?[0-9a-f]+$' THEN
            RAISE EXCEPTION 'secret_access_key must be encrypted (hex format)';
          END IF;
          
          IF NEW.session_token IS NOT NULL AND 
             NEW.session_token !~ '^(\\\\x)?[0-9a-f]+$' THEN
            RAISE EXCEPTION 'session_token must be encrypted (hex format)';
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

      say "✅ Updated encryption trigger to accept both hex formats"
    else
      say "No encryption trigger found - skipping update"
    end
  end

  def down
    # Revert to original strict trigger
    execute "DROP TRIGGER IF EXISTS aws_credentials_encryption_check ON aws_credentials"
    execute "DROP FUNCTION IF EXISTS ensure_aws_credentials_encrypted()"

    execute <<-SQL
      CREATE OR REPLACE FUNCTION ensure_aws_credentials_encrypted()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Original strict format: must start with \\x
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
end
