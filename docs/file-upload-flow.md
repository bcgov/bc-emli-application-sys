# File Upload System Flow

## Overview

This document describes the complete file upload system implemented, featuring AWS S3 integration with dynamic credential management, pre-upload virus scanning, multipart upload support, and secure file handling. The system uses presigned URLs for direct browser-to-S3 uploads with comprehensive error handling and credential rotation.

## System Architecture

┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ Frontend │ │ Rails API │ │ AWS S3 │
│ (React/Uppy) │◄──►│ Storage │◄──►│ Storage │
│ │ │ Controller │ │ (Direct) │
└─────────────────┘ └──────────────────┘ └─────────────────┘
│ │ ▲
│ ▼ │
│ ┌──────────────────┐ │
│ │ PostgreSQL │ │
│ │ (Encrypted │ │
│ │ Credentials) │ │
│ └──────────────────┘ │
│ │ │
│ ▼ │
│ ┌──────────────────┐ │
└─────────────►│ ClamAV │ │
│ Virus Scanner │ │
│ (Pre-upload) │ │
└──────────────────┘ │
│ │
└──────────────────────┘

````

## File Upload Flow

### Pre-Upload Virus Scanning (Optional but Recommended)

**Endpoint:** `POST /api/storage/s3/virus_scan`

**Purpose:** Scan file content before S3 upload to prevent infected files from reaching cloud storage

**Parameters:**
- `file`: File to be scanned (multipart/form-data)

**Response:**
- `200 OK`: `{"clean": true, "message": "File is clean"}` - File passed scan
- `422 Unprocessable Entity`: `{"clean": false, "virus_detected": true, "virus_name": "EICAR-Test-File"}` - Virus detected
- `422/500`: `{"clean": false, "scan_error": true, "message": "Error details"}` - Scan failed

**Environment Control:**
- `CLAMAV_ENABLED=true/false` - Enable/disable virus scanning
- `CLAMAV_HOST` - ClamAV daemon host (default: 127.0.0.1)
- `CLAMAV_PORT` - ClamAV daemon port (default: 3310)


**Database Credentials:**

- Short-lived (2-day expiration)
- Encrypted with PostgreSQL pgcrypto
- Auto-refreshed via cron job
- Cached for 5 minutes

**Environment Variables:**

- Long-term fallback
- Stored in OpenShift secrets
- Used for initial bootstrap

### 4. Presigned URL Generation

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
````

### 5. Frontend Upload

**Frontend Action:**

1. Receive presigned URL from API
2. Perform direct PUT request to S3
3. Upload bypasses Rails server (optimal performance)

### 6. Post-Upload Processing

**File Association:**

- Files linked to models via `file_uploader.rb`
- Supported models: `SupportingDocument`, `StepCode`
- Shrine handles file metadata and storage references

**Post-Upload Virus Scanning (Legacy):**

```yaml
# Pre-upload scanning is now preferred (see step 1)
# Post-upload scanning can be enabled for additional security
CLAMAV_ENABLED: 'false'  # Default disabled

# Enable with:
CLAMAV_ENABLED: 'true'
CLAMAV_HOST: 'clamav'
CLAMAV_PORT: '3310'
CLAMAV_TIMEOUT: '30'  # Scan timeout in seconds
```

**Multipart Upload Support:**

```typescript
// Large files automatically use multipart upload via Uppy
// Configuration in uploads.ts:
FILE_UPLOAD_CHUNK_SIZE_IN_BYTES = 10 * 1024 * 1024; // 10MB chunks
MAX_NUMBER_OF_PARTS = 1000; // AWS S3 limit

// Endpoints:
// POST /api/storage/s3/multipart - Initiate multipart upload
// GET /api/storage/s3/multipart/:upload_id/batch - Get signed URLs for parts
// POST /api/storage/s3/multipart/:upload_id/complete - Complete multipart upload
```

## File Download Flow

### 1. Download Request

**Endpoint:** `GET /api/storage/s3/download`

**Parameters:**

- `id`: File identifier (cache/xyz format for temporary files)
- `model`: Model type (SupportingDocument, StepCode) - for persisted files
- `model_id`: Model record ID - for persisted files

**File Deletion (Cache Only):**

- **Endpoint:** `DELETE /api/storage/s3/delete`
- **Purpose:** Remove temporary files from cache storage
- **Note:** Persisted files are handled by cleanup jobs, not direct deletion

### 2. URL Generation

**Cache Files:**

```ruby
url = Shrine.storages[:cache].url(
  file_id,
  public: false,
  expires_in: 3600  # 1 hour expiry
)
```

## Credential Management Flow with Sidekiq Jobs

The system uses a sophisticated Sidekiq-based job scheduling system to automatically manage AWS credential rotation and health monitoring. This ensures continuous availability and security of the file upload system.

### Job Architecture Overview

```
┌─────────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────────┐
│  AwsCredentialRefreshJob │     │ AwsCredentialHealthCheckJob│     │  AWS Parameter Store    │
│  (Every 2 hours)        │────▶│  (Every 5 minutes)       │────▶│  (Rotated Credentials)  │
│                         │     │                          │     │                         │
└─────────────────────────┘     └──────────────────────────┘     └─────────────────────────┘
           │                                 │                               │
           │                                 │                               │
           ▼                                 ▼                               ▼
┌─────────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────────┐
│  AwsCredentialRefresh   │     │  Emergency Refresh       │     │  Lambda Rotation        │
│  Service                │     │  (Immediate Action)      │     │  (Every 2 days)         │
└─────────────────────────┘     └──────────────────────────┘     └─────────────────────────┘
           │                                 │                               │
           └─────────────────────────────────┼───────────────────────────────┘
                                            │
                                            ▼
                              ┌──────────────────────────┐
                              │  DynamicS3Storage        │
                              │  (Client Refresh)        │
                              └──────────────────────────┘
```

### 1. Primary Credential Refresh Job

**Class:** `AwsCredentialRefreshJob`  
**Schedule:** Every 2 hours (`0 */2 * * * America/Vancouver`)  
**Queue:** `default`  
**Retry Policy:** Exponential backoff, 3 attempts

**Responsibilities:**

1. **Proactive Credential Rotation:**

   # Checks multiple conditions before refreshing:

   - Current credentials exist and are valid
   - Not marked as pending_deletion in Parameter Store
   - Not expiring within 4 hours (buffer period)
   - Actual functionality test against S3

2. **Multi-Source Credential Fetching:**

   # Priority order:

   1. AWS Parameter Store (rotated by Lambda)
   2. Environment variables (fallback)
   3. Emergency bootstrap (if nothing works)

3. **Automatic Client Updates:**

   def refresh_shrine_clients

   # Updates both cache and store clients

   Shrine.storages[:cache].refresh_client! if Shrine.storages[:cache].is_a?(DynamicS3Storage)
   Shrine.storages[:store].refresh_client! if Shrine.storages[:store].is_a?(DynamicS3Storage)
   end

4. **Comprehensive Error Handling:**

   # Multi-tier failure recovery:

   - Test credentials with retry logic (3 attempts, 30s intervals)
   - Environment fallback on Parameter Store failure
   - Emergency bootstrap if all sources fail
   - Detailed logging for debugging

### 2. Health Check Job (Aggressive Monitoring)

**Class:** `AwsCredentialHealthCheckJob`  
**Schedule:** Every 5 minutes (`*/5 * * * * America/Vancouver`)  
**Queue:** `default`  
**Retry Policy:** Discard on error (don't retry health checks)

**Purpose:** Continuous monitoring and immediate problem detection

**Health Metrics Tracked:**

```ruby
health_status = {
  has_credentials: boolean,                    # Database has credentials
  credentials_valid: boolean,                  # S3 functionality test passes
  time_until_expiry: duration,                # Time until expiration
  needs_refresh: boolean,                      # Within 8-hour buffer
  parameter_store_accessible: boolean,         # Can fetch from Parameter Store
  environment_fallback_available: boolean,     # Environment variables present
  using_pending_key: boolean                   # Currently using deprecated key
}
```

**Immediate Actions:**

- **Critical Detection:** Triggers emergency synchronous refresh
- **Cache Invalidation:** Clears cached credentials if pending_deletion detected
- **Alert Logging:** Structured logging with color-coded status
- **Fallback Queueing:** Queues `AwsCredentialRefreshJob` if emergency refresh fails

**Alert Levels:**

```ruby
🚨 CRITICAL: No AWS credentials found in database
🚨 CRITICAL: Current AWS credentials are invalid
🚨 CRITICAL: AWS credentials expire in less than 1 hour
⚠️  WARNING: AWS credentials health: NEEDS_REFRESH
✅ GOOD: AWS credentials health: GOOD
```

### 3. Credential Sources and Rotation Logic

#### AWS Parameter Store Integration

**Lambda Rotation Schedule:**

- **Overlap Period:** 4 days (2 days active, 2 days pending_deletion)

**Database Expiration Logic:**

```ruby
# Rotation Service determines expiration:
- Parameter Store credentials: 3 days (frequent refresh)
- Environment fallback: 24 hours (shorter for security)
- Buffer periods: 4-8 hours depending on context
```

#### Credential Validation Process

**Test Sequence:**

```ruby
def test_credentials(credentials)
  1. Create S3 client with provided credentials
  2. Perform head_bucket operation (minimal S3 call)
  3. Return success/failure status
  4. Log detailed error messages on failure
end
```

**Validation Triggers:**

- Every health check (5-minute intervals)
- Before and after credential refresh
- On S3 operation failures (automatic retry)
- During application startup

###### 4. Error Handling and Recovery

#### Failure Scenarios and Recovery

1. **Parameter Store Access Denied:**

   ```ruby
   # Automatic fallback sequence:
   1. Try with database credentials
   2. Fall back to environment credentials
   3. Log error and mark as degraded operation
   ```

2. **Invalid JSON in Parameter Store:**

   ```ruby
   # Immediate failure, no retry:
   - Log parse error with details
   - Fall back to environment credentials
   - Alert operations team
   ```

3. **Network Timeouts/Connection Issues:**

   ```ruby
   # Retry with exponential backoff:
   - 3 attempts maximum
   - 30-second intervals
   - Different credential sources per attempt
   ```

4. **Complete Credential Failure:**
   ```ruby
   # Emergency procedures:
   - Attempt environment bootstrap
   - Queue immediate refresh job
   - Log critical alerts
   - Maintain service with cached credentials if possible
   ```

**Automatic Recovery:**

```ruby
# On S3 operation failure:
1. Detect credential errors (InvalidAccessKeyId, SignatureDoesNotMatch)
2. Clear client cache (@client = nil)
3. Attempt immediate credential refresh
4. Retry operation with new credentials
5. Log recovery success/failure
```

### 6. Sidekiq Job Configuration

**Health Check Commands:**

```bash
# Check credential status
rails aws:credentials:status

# Test credential functionality
rails aws:credentials:test

# Manually refresh credentials
rails aws:credentials:refresh or
AwsCredentialRefreshService.new.refresh_credentials! within the app

# Clean up expired credentials
rails aws:credentials:cleanup
```

### 2. Credential Storage

**Encryption:** PostgreSQL pgcrypto with `POSTGRES_ENCRYPTION_KEY`

```ruby
# Encrypted fields using pgp_sym_encrypt/decrypt
access_key_id: encrypted_field (hex format)
secret_access_key: encrypted_field (hex format)
session_token: encrypted_field (hex format, optional)
expires_at: timestamp
encryption_key_id: key_fingerprint (for key rotation)
active: boolean

# Caching with smart TTL
- Normal operations: 1 minute cache
- During rotation: 30 seconds cache
- Expires within 5 minutes: immediate refresh
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

###### Monitoring & Troubleshooting

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

# ClamAV health check
rails runner "puts ClamAvService.health_check"

# Test virus scanning
rails runner "puts ClamAvService.ping"
```

### Expected Status Output

```
AWS Credentials Status
==================================================
Name: s3_access
Status:  Active
Expiry:  Valid (2025-07-31 13:13:06 -0700)
Access Key: AKIAYSE4N...
Created: 2025-07-28 11:56:24 -0700
```

## Error Handling

### Common Issues

1. **Expired Credentials**

   - **Symptom:** 403 errors on S3 operations
   - **Solution:** For fallback to work,update OpenShift secrets with new credentails from AWS Parameter Store ,refresh app pod.Run `rails aws:credentials:refresh`or AwsCredentialRefreshService.new.refresh_credentials! within app,Watch Sidekiq, it refreshes every 5 minutes.Job should show token status as good.

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

- Files upload directly to S3 (bypass Rails server)
- Reduced server load and bandwidth usage
- Better upload performance for large files

### 2. Credential Caching

- Database credentials cached for 5 minutes
- Reduces database queries per upload
- Automatic cache invalidation on refresh

### 3. Presigned URL Efficiency

- Short expiration (5 minutes) for security
- No server-side file handling required
- Scales horizontally without session state

## Local Development Setup

### Prerequisites

- Ruby 3.2.2
- PostgreSQL 13+
- Redis
- Node 20.10+
- Git LFS enabled

### Option 1: Docker Compose (Recommended)

**Setup:**

1. Clone the repository with Git LFS:

   ```bash
   git lfs install
   git clone <repository-url>
   cd bc-emli-application-sys
   ```

2. Copy environment configuration:

   ```bash
   cp .env_example.docker_compose .env.docker_compose
   ```

3. Configure environment variables in `.env.docker_compose`:

   ```env
   # For MinIO local S3 setup
   BCGOV_OBJECT_STORAGE_ENDPOINT=http://127.0.0.1:9001
   BCGOV_OBJECT_STORAGE_BUCKET=hous-local
   BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID=your-minio-access-key
   BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY=your-minio-secret-key
   BCGOV_OBJECT_STORAGE_REGION=us-east-1

   # Database encryption for AWS credentials
   POSTGRES_ENCRYPTION_KEY=your-32-byte-encryption-key

   # Virus scanning (optional)
   CLAMAV_ENABLED=false  # Enable if you have ClamAV container

   ```

4. Start all services:

   ```bash
   docker compose up
   ```

5. Initialize database (first run):
   ```bash
   docker compose exec app bundle exec rails db:create
   docker compose exec app bundle exec rails db:migrate
   docker compose exec app bundle exec rails db:seed
   ```

**Notes:**

- Application runs at `http://localhost:3000`
- Vite dev server provides hot module reloading
- Use `docker compose attach app` for debugging with `binding.pry`

### Local File Storage Setup (MinIO)

**Install MinIO:**

```bash
# macOS
brew install minio

# Start MinIO server
minio server --address 127.0.0.1:9001 ~/minio-storage
```

**Configure MinIO:**

1. Access MinIO Console: `http://127.0.0.1:9001`

2. Create bucket: `hous-local`

3. Create user: `hous-formio-user`

4. Create policy: `formioupload`

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "ListBucket",
         "Effect": "Allow",
         "Action": ["s3:ListBucket"],
         "Resource": ["arn:aws:s3:::hous-local"]
       },
       {
         "Sid": "UploadFile",
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:ListMultipartUploadParts",
           "s3:PutObject",
           "s3:AbortMultipartUpload",
           "s3:DeleteObject"
         ],
         "Resource": ["arn:aws:s3:::hous-local/*"]
       }
     ]
   }
   ```

5. Assign policy to user

6. Update `.env` with MinIO credentials:
   ```env
   BCGOV_OBJECT_STORAGE_ENDPOINT=http://127.0.0.1:9001
   BCGOV_OBJECT_STORAGE_BUCKET=hous-local
   BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID=<minio-access-key>
   BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY=<minio-secret-key>
   BCGOV_OBJECT_STORAGE_REGION=us-east-1
   ```

### Local ClamAV Setup (Optional)

**Docker Approach:**

```bash
# Run ClamAV daemon in Docker
docker run -d -p 3310:3310 --name clamav clamav/clamav

# Enable in environment
CLAMAV_ENABLED=true
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
```

**Native Installation:**

```bash
# macOS
brew install clamav
freshclam  # Update virus definitions
clamd      # Start daemon

# Linux
sudo apt-get install clamav clamav-daemon
sudo freshclam
sudo systemctl start clamav-daemon
```

### Testing File Upload Flow

1. **Start the application** using either Docker or native setup

2. **Access the application** at `http://localhost:3000`

3. **Login** using configured Keycloak credentials

4. **Navigate to a form** with file upload capability

5. **Upload a test file:**

   - Small file (< 10MB): Direct single-part upload
   - Large file (> 10MB): Automatic multipart upload
   - Test virus file: Create EICAR test string to test virus scanning

6. **Verify upload process:**
   - Check browser network tab for presigned URL requests
   - Verify direct S3 upload (bypasses Rails server)
   - Check MinIO console for uploaded files
   - Review Rails logs for credential usage and virus scan results

### Troubleshooting

**Common Issues:**

1. **Sidekiq Credential Issues (Dev/Test/Prod Environments):**

   If Sidekiq stops running and AWS tokens have expired, you may need to:

   # Update credentials in OpenShift secrets

   oc edit secret <app-secret-name> -n <namespace>

   # Run AWS credential refresh rake command to align database with new tokens

   rails aws:credentials:refresh or AwsCredentialRefreshService.new.refresh_credentials! within the app

   # Alternatively, use the new credentials rake command

   rake aws:new_credentials

   # Verify credentials are working

   rails aws:credentials:test

   **Note:** This issue occurs when the automated credential rotation fails due to Sidekiq being stopped, causing the database to become out of sync with the refreshed tokens in OpenShift secrets.

2. **S3 Connection Errors:**

   ```bash
   # Check MinIO is running
   curl http://localhost:9001/minio/health/live

   # Verify credentials
   rails aws:credentials:test
   ```

3. **Database Credential Encryption:**

   ```bash
   # Generate encryption key
   openssl rand -hex 32

   # Test encryption
   rails runner "puts AwsCredential.current_s3_credentials"
   ```

4. **Virus Scanning Issues:**

   ```bash
   # Test ClamAV connection
   rails runner "puts ClamAvService.ping"

   # Check ClamAV logs
   docker logs clamav
   ```

5. **File Upload Failures:**
   - Check browser console for JavaScript errors
   - Verify CORS configuration in MinIO
   - Check Rails logs for Shrine errors
   - Confirm presigned URL generation
