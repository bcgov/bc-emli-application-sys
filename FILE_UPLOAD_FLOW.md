# File Upload System Flow

## Overview

This document describes the complete file upload system implemented, featuring AWS S3 integration with dynamic credential management, virus scanning, and secure file handling.

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Rails API      │    │   AWS S3        │
│   (Form/Uppy)   │◄──►│   Controllers    │◄──►│   Storage       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   PostgreSQL     │
                       │   (Encrypted     │
                       │   Credentials)   │
                       └──────────────────┘
```

## File Upload Flow

### 1. Upload Request Initiation

**Endpoint:** `GET /api/storage/s3`

**Parameters:**

- `filename`: Target filename for upload
- `type`: MIME type of the file

**Authentication:** Required (API authentication)

### 2. Credential Resolution

The system uses a two-tier credential system:

```ruby
# Priority 1: Database Credentials (Preferred)
db_credentials = AwsCredential.current_s3_credentials
if db_credentials && !Rails.env.test?
  # Use encrypted database credentials (short-lived)
  use_database_credentials(db_credentials)
else
  # Priority 2: Environment Variables (Fallback)
  use_environment_credentials()
end
```

**Database Credentials:**

- ✅ Short-lived (2-day expiration)
- ✅ Encrypted with PostgreSQL pgcrypto
- ✅ Auto-refreshed via cron job
- ✅ Cached for 5 minutes

**Environment Variables:**

- ✅ Long-term fallback
- ✅ Stored in OpenShift secrets
- ✅ Used for initial bootstrap

### 3. Presigned URL Generation

**Process:**

1. Generate unique S3 object key
2. Create presigned PUT URL with:
   - **Method:** PUT
   - **Expires:** 5 minutes (300 seconds)
   - **Content-Type:** From request parameter
   - **Content-Disposition:** Attachment with filename

**Regional Endpoint Logic:**

```ruby
if ENV["BCGOV_OBJECT_STORAGE_PUBLIC_ENDPOINT"].present?
  # Use public endpoint for presigned URLs
  endpoint = ENV["BCGOV_OBJECT_STORAGE_PUBLIC_ENDPOINT"]
else
  endpoint = ENV["BCGOV_OBJECT_STORAGE_ENDPOINT"]
end
```

### 4. Frontend Upload

**Response Format:**

```json
{
  "method": "put",
  "url": "https://s3.ca-central-1.amazonaws.com/bucket/path?X-Amz-Credential=...",
  "headers": {
    "Content-Type": "text/plain",
    "Content-Disposition": "attachment; filename=\"example.txt\""
  }
}
```

**Frontend Action:**

1. Receive presigned URL from API
2. Perform direct PUT request to S3
3. Upload bypasses Rails server (optimal performance)

### 5. Post-Upload Processing

**File Association:**

- Files linked to models via `file_uploader.rb`
- Supported models: `SupportingDocument`, `StepCode`
- Shrine handles file metadata and storage references

**Virus Scanning (Optional):**

```yaml
# Currently disabled in deployment
CLAMAV_ENABLED: 'false'

# Can be enabled later with:
CLAMAV_ENABLED: 'true'
CLAMAV_HOST: 'clamav'
CLAMAV_PORT: '3310'
```

## File Download Flow

### 1. Download Request

**Endpoint:** `GET /api/storage/s3/download`

**Parameters:**

- `id`: File identifier (cache/xyz or model record)
- `model`: Model type (SupportingDocument, StepCode)
- `model_id`: Model record ID

### 2. Authorization Check

```ruby
if params[:model_id] && AUTHORIZED_S3_MODELS[params[:model]]
  record_class = AUTHORIZED_S3_MODELS[params[:model]]
  record = record_class.find(params[:model_id])
  authorize record  # Policy-based authorization
end
```

### 3. URL Generation

**Cache Files:**

```ruby
url = Shrine.storages[:cache].url(
  file_id,
  public: false,
  expires_in: 3600  # 1 hour expiry
)
```

**Persisted Files:**

```ruby
url = record.file_url  # Model-specific URL generation
```

## Credential Management Flow

### 1. Credential Refresh Job

**Schedule:** Every 2 days (`0 0 */2 * * America/Vancouver`)

**Process:**

```ruby
class AwsCredentialRefreshJob < ApplicationJob
  def perform
    service = AwsCredentialRefreshService.new

    if service.refresh_credentials!
      refresh_shrine_clients  # Update S3 clients
      test_new_credentials   # Verify functionality
    end
  end
end
```

### 2. Credential Storage

**Encryption:** PostgreSQL pgcrypto with `POSTGRES_ENCRYPTION_KEY`

```ruby
# Encrypted fields
access_key_id: encrypted_field
secret_access_key: encrypted_field
session_token: encrypted_field (optional)
expires_at: timestamp
```

### 3. Dynamic Client Refresh

```ruby
class DynamicS3Storage < Shrine::Storage::S3
  def client
    @client ||= begin
      db_credentials = AwsCredential.current_s3_credentials
      if db_credentials
        Aws::S3::Client.new(
          access_key_id: db_credentials[:access_key_id],
          secret_access_key: db_credentials[:secret_access_key],
          session_token: db_credentials[:session_token]
        )
      end
    end
  end
end
```

## Configuration

### Environment Variables

**OpenShift Secrets (Confidential):**

```yaml
BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID: <aws-access-key>
BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY: <aws-secret-key>
POSTGRES_ENCRYPTION_KEY: <encryption-key>
```

**Helm Values (Non-Confidential):**

```yaml
BCGOV_OBJECT_STORAGE_REGION: 'ca-central-1'
BCGOV_OBJECT_STORAGE_ENDPOINT: 'https://s3.ca-central-1.amazonaws.com'
BCGOV_OBJECT_STORAGE_PUBLIC_ENDPOINT: 'https://s3.ca-central-1.amazonaws.com'
BCGOV_OBJECT_STORAGE_BUCKET: 'your-bucket-name'
CLAMAV_ENABLED: 'false' # Disabled for initial deployment
```

### Regional Endpoints

**Important:** Always use regional endpoints for optimal performance:

- ✅ `https://s3.ca-central-1.amazonaws.com`
- ❌ `https://s3.amazonaws.com` (generic, causes redirects)

## Security Features

### 1. Authentication & Authorization

- ✅ API authentication required for all endpoints
- ✅ Policy-based authorization for file access
- ✅ Model-specific access controls

### 2. Encryption

- ✅ Database credentials encrypted at rest
- ✅ HTTPS for all API communications
- ✅ Presigned URLs with time expiration

### 3. Access Control

- ✅ Presigned URLs expire in 5 minutes
- ✅ Download URLs expire in 1 hour
- ✅ No public file access without authorization

## Monitoring & Troubleshooting

### Health Check Commands

```bash
# Check credential status
rails aws:credentials:status

# Test credential functionality
rails aws:credentials:test

# Manually refresh credentials
rails aws:credentials:refresh

# Clean up expired credentials
rails aws:credentials:cleanup
```

### Expected Status Output

```
AWS Credentials Status
==================================================
Name: s3_access
Status: ✅ Active
Expiry: ✅ Valid (2025-07-31 13:13:06 -0700)
Access Key: AKIAYSE4N...
Created: 2025-07-28 11:56:24 -0700
```

### Log Monitoring

**Successful Operations:**

```
INFO: Using AWS credentials from database (expires: 2025-07-31 12:14:13 -0700)
INFO: AWS credentials refreshed successfully
INFO: S3 client refreshed
```

**Warning Signs:**

```
WARN: No database credentials available, using environment
ERROR: AWS credential refresh failed
ERROR: AWS credentials test failed
```

## Error Handling

### Common Issues

1. **Expired Credentials**

   - **Symptom:** 403 errors on S3 operations
   - **Solution:** Run `rails aws:credentials:refresh`

2. **Missing Encryption Key**

   - **Symptom:** `POSTGRES_ENCRYPTION_KEY environment variable not set`
   - **Solution:** Add to OpenShift secrets

3. **S3 Permission Errors**

   - **Symptom:** Access denied on bucket operations
   - **Solution:** Verify AWS IAM permissions

4. **Regional Endpoint Issues**
   - **Symptom:** 301 redirect errors
   - **Solution:** Use regional endpoint format

## Performance Considerations

### 1. Direct Upload Benefits

- ✅ Files upload directly to S3 (bypass Rails server)
- ✅ Reduced server load and bandwidth usage
- ✅ Better upload performance for large files

### 2. Credential Caching

- ✅ Database credentials cached for 5 minutes
- ✅ Reduces database queries per upload
- ✅ Automatic cache invalidation on refresh

### 3. Presigned URL Efficiency

- ✅ Short expiration (5 minutes) for security
- ✅ No server-side file handling required
- ✅ Scales horizontally without session state

## Future Enhancements

### 1. ClamAV Virus Scanning

```yaml
# Enable when ready
CLAMAV_ENABLED: 'true'
```

### 2. CDN Integration

```ruby
# Potential CDN configuration
url_options = {
  public: true,
  host: ENV['CDN_HOST_URL']
}
```

### 3. Multipart Upload Support

- Already configured via `uppy_s3_multipart` plugin
- Handles large file uploads efficiently
- Uses `BCGOV_OBJECT_STORAGE_PUBLIC_ENDPOINT`
