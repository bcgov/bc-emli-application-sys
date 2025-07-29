namespace :aws do
  namespace :credentials do
    desc "Refresh AWS credentials for S3 access"
    task refresh: :environment do
      puts "Starting AWS credential refresh..."
      
      service = AwsCredentialRefreshService.new
      
      if service.refresh_credentials!
        puts "✅ AWS credentials refreshed successfully"
        
        # Test the new credentials
        if service.test_credentials
          puts "✅ New credentials tested and working"
        else
          puts "⚠️  Warning: New credentials may not be working properly"
        end
      else
        puts "❌ Failed to refresh AWS credentials"
        exit 1
      end
    end
    
    desc "Test current AWS credentials"
    task test: :environment do
      puts "Testing current AWS credentials..."
      
      credentials = AwsCredential.current_s3_credentials
      
      if credentials.nil?
        puts "❌ No AWS credentials found in database"
        exit 1
      end
      
      service = AwsCredentialRefreshService.new
      
      if service.test_credentials(credentials)
        puts "✅ AWS credentials are working"
        puts "   Expires at: #{credentials[:expires_at]}"
        
        time_left = credentials[:expires_at] - Time.current
        if time_left < 1.hour
          puts "⚠️  Warning: Credentials expire in #{time_left.to_i / 60} minutes"
        elsif time_left < 1.day
          puts "⚠️  Warning: Credentials expire in #{time_left.to_i / 3600} hours"
        else
          puts "   Time until expiry: #{time_left.to_i / 86400} days"
        end
      else
        puts "❌ AWS credentials test failed"
        exit 1
      end
    end
    
    desc "Clean up expired AWS credentials"
    task cleanup: :environment do
      puts "Cleaning up expired AWS credentials..."
      
      count = AwsCredential.deactivate_expired!
      puts "✅ Deactivated #{count} expired credentials"
    end
    
    desc "Show AWS credentials status"
    task status: :environment do
      puts "AWS Credentials Status"
      puts "=" * 50
      
      credentials = AwsCredential.all.order(:created_at)
      
      if credentials.empty?
        puts "No AWS credentials found in database"
        return
      end
      
      credentials.each do |cred|
        status = cred.active? ? "✅ Active" : "❌ Inactive"
        expiry_status = cred.expires_at < Time.current ? "❌ Expired" : "✅ Valid"
        
        puts "Name: #{cred.name}"
        puts "Status: #{status}"
        puts "Expiry: #{expiry_status} (#{cred.expires_at})"
        puts "Access Key: #{cred.access_key_id[0..8]}..."
        puts "Created: #{cred.created_at}"
        puts "-" * 30
      end
    end
    
    desc "Store current environment credentials in database (fallback method)"
    task store_env: :environment do
      puts "Storing current environment credentials in database..."
      
      required_vars = %w[BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY]
      missing_vars = required_vars.select { |var| ENV[var].blank? }
      
      if missing_vars.any?
        puts "❌ Missing required environment variables: #{missing_vars.join(', ')}"
        exit 1
      end
      
      begin
        expires_at = Time.current + 2.days
        
        # Try to create directly if model methods fail
        credential = AwsCredential.find_or_initialize_by(name: 's3_access')
        credential.assign_attributes(
          access_key_id: ENV['BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID'],
          secret_access_key: ENV['BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY'],
          session_token: nil,
          expires_at: expires_at,
          active: true
        )
        
        if credential.save!
          puts "✅ Environment credentials stored successfully"
          puts "   Expires at: #{expires_at}"
        end
      rescue => e
        puts "❌ Failed to store environment credentials: #{e.message}"
        puts "   Error: #{e.class}: #{e.message}"
        puts "   Backtrace: #{e.backtrace.first(3).join('\n')}"
        exit 1
      end
    end
  end
end