# Virus Scanning Update Flow Documentation

## Overview

This document provides simplified flows for the virus scanning functionality implemented in the BC EMLI Application System. Each section focuses on the essential steps and decision points.

## Table of Contents

1. [ Simple Architecture](#️-simple-architecture)
2. [File Upload Flow](#-file-upload-flow)
3. [ Background Processing](#️-background-processing)
4. [ Status Updates](#-status-updates)
5. [Error Handling](#-error-handling)
6. [API Usage](#-api-usage)
7. [Database Structure](#️-database-structure)
8. [Configuration](#️-configuration)
9. [Monitoring](#-monitoring)
10. [Troubleshooting](#-troubleshooting)

## 🏗️ Simple Architecture

**High-Level Flow:**

```
User Upload → Immediate Scan → Clean? → Yes: Save + Store Results in DB
                                    → No: Block Upload
```

**Components:**

- **ClamAV**: Virus scanning engine (dedicated service)
- **FileUploader**: Handles uploads with immediate validation & scanning
- **Database**: Stores scan results directly during upload
- **API**: Provides status endpoints
- **No Background Jobs**: All processing is synchronous

## 📤 File Upload Flow

### Immediate Scanning Process

```
1. User selects file
2. System scans file immediately during upload validation
3. If CLEAN → Save file + store scan results in database
4. If INFECTED → Block upload immediately + show error
5. If SCAN ERROR → Block (production) or Allow (development)
```

### Decision Tree

```
File Upload
    ↓
Immediate Virus Scan (Synchronous)
    ↓
┌─────────────┬─────────────┬─────────────┐
│    CLEAN    │  INFECTED   │    ERROR    │
│             │             │             │
│ ✅ Save +   │ ❌ Block    │ Prod: Block │
│ Store in DB │ Show Error  │ Dev: Allow  │
│ Complete    │ Message     │ Log Warning │
└─────────────┴─────────────┴─────────────┘
```

### User Experience

**✅ Success Flow:**

1. File uploads and scans immediately (1-2 seconds)
2. Scan results stored directly in database
3. File ready for immediate use

**❌ Virus Detected:**

- Upload blocked immediately during validation
- Clear error message: "Virus detected: [virus_name]"
- User instructed to scan file before retry

**⚠️ Service Error:**

- Production: Upload blocked for security
- Development: Upload allowed with warning
- Error logged for monitoring

## ⚙️ Immediate Processing

### Synchronous Scanning Flow

```
File Upload → Validate → Scan with ClamAV → Store Results → Complete Upload
```

### Processing Steps

```
1.  User uploads file via FileUploader
2.  File validation runs (including virus scan)
3.  Create temp file for ClamAV scanning
4.  Send to ClamAV daemon for immediate scan
5.  Store results directly in database
6.  Complete upload or block if infected
7.  Clean up temp file
```

### Memory Optimization

**No background processing needed:**

```
✅ Immediate scanning during upload
✅ Direct database storage
✅ No job queues or workers
✅ No memory overhead from polling
✅ No stuck job cleanup needed
```

### Status Progression

```
📤 Upload Complete
     ↓
⏳ pending
     ↓
🔄 scanning
     ↓
┌─────────────┬─────────────┬─────────────┐
│ ✅ clean    │ ❌ infected │ ⚠️ error    │
│             │             │             │
│ File ready  │ File flagged│ Retry later │
│ for use     │ for review  │             │
└─────────────┴─────────────┴─────────────┘
```

## Status Update Flow

### 1. Status Enum Values

```ruby
enum virus_scan_status: {
  pending: 0,      # Initial state, awaiting scan
  scanning: 1,     # Currently being scanned
  clean: 2,        # File is safe
  infected: 3,     # Virus detected
  scan_error: 4    # Scan failed
}
```

### 2. Status Transition Diagram

```
    [*] --> pending: File Upload
    pending --> scanning: Job Started
    scanning --> clean: No Virus Found
    scanning --> infected: Virus Detected
    scanning --> scan_error: Scan Failed
    scan_error --> pending: Retry
    infected --> [*]: Manual Review
    clean --> [*]: Complete
```

### 3. Database Updates

```ruby
# Clean file result
record.update!(
  virus_scan_status: :clean,
  virus_scan_result: "File is clean",
  virus_scan_completed_at: Time.current
)

# Infected file result
record.update!(
  virus_scan_status: :infected,
  virus_scan_result: "Virus detected: #{virus_name}",
  virus_name: virus_name,
  virus_scan_completed_at: Time.current
)

# Error result
record.update!(
  virus_scan_status: :scan_error,
  virus_scan_result: "Scan failed: #{error_message}",
  virus_scan_completed_at: Time.current
)
```

## Error Handling Flow

### 1. Error Scenarios & Responses

| Scenario            | Immediate Response                | Background Response       | User Impact                    |
| ------------------- | --------------------------------- | ------------------------- | ------------------------------ |
| ClamAV Unavailable  | Allow upload (dev) / Block (prod) | Retry later               | Minimal (dev) / Blocked (prod) |
| File Download Error | Allow upload                      | Mark as error             | Minimal                        |
| Scan Timeout        | Allow upload                      | Retry with longer timeout | Minimal                        |
| Virus Detected      | Block upload                      | Mark as infected          | Upload blocked                 |
| Unknown Error       | Allow upload (dev) / Block (prod) | Mark as error             | Varies by environment          |

### 2. Error Recovery Flow

```
    Error[Scan Error] --> Check{Error Type}
    Check -->|Timeout| Retry[Retry with Longer Timeout]
    Check -->|Network| Backoff[Exponential Backoff Retry]
    Check -->|File Access| Skip[Mark as Error]
    Check -->|ClamAV Down| Queue[Queue for Later]

    Retry --> Success{Success?}
    Backoff --> Success
    Success -->|Yes| Clean[Mark as Clean/Infected]
    Success -->|No| Final[Mark as Scan Error]
```

### 3. Production vs Development Behavior

**Production Environment:**

- Block uploads on scan errors (security-first approach)
- Log all errors for monitoring
- Queue failed scans for retry

**Development Environment:**

- Allow uploads with warnings
- Log errors for debugging
- Continue processing with degraded functionality

## API Endpoints

### 1. Virus Scan Status API

```ruby
# config/routes.rb
get 'virus_scan_status/:model/:id', to: 'virus_scan_status#show'
post 'virus_scan_status/:model/:id/rescan', to: 'virus_scan_status#rescan'
get 'virus_scan_status/bulk', to: 'virus_scan_status#bulk'
```

### 2. Endpoint Usage

**Get Status:**

```http
GET /api/virus_scan_status/SupportingDocument/123
```

**Response:**

```json
{
  "id": "123",
  "virus_scan_status": "clean",
  "virus_scan_result": "File is clean",
  "virus_scan_completed_at": "2025-07-17T22:15:30Z",
  "safe_to_use": true
}
```

**Trigger Rescan:**

```http
POST /api/virus_scan_status/SupportingDocument/123/rescan
```

**Bulk Status Check:**

```http
GET /api/virus_scan_status/bulk?model=SupportingDocument&ids[]=123&ids[]=456
```

## Database Schema

### 1. Added Columns to SupportingDocument

```sql
-- Virus scanning status tracking
ALTER TABLE supporting_documents
ADD COLUMN virus_scan_status INTEGER DEFAULT 0,
ADD COLUMN virus_scan_result TEXT,
ADD COLUMN virus_scan_started_at TIMESTAMP,
ADD COLUMN virus_scan_completed_at TIMESTAMP,
ADD COLUMN virus_name VARCHAR(255);

-- Index for performance
CREATE INDEX idx_supporting_documents_virus_scan_status
ON supporting_documents(virus_scan_status);
```

### 2. Model Integration

```ruby
# app/models/supporting_document.rb
class SupportingDocument < ApplicationRecord
  include VirusScannable

  # Virus scan status enum
  enum virus_scan_status: {
    pending: 0,
    scanning: 1,
    clean: 2,
    infected: 3,
    scan_error: 4
  }
end
```

## Configuration

### 1. Environment Variables

```bash
# ClamAV Configuration
CLAMAV_ENABLED=true                    # Enable/disable virus scanning
CLAMAV_HOST=clamav                     # ClamAV daemon hostname
CLAMAV_PORT=3310                       # ClamAV daemon port
CLAMAV_TIMEOUT=30                      # Scan timeout in seconds
VIRUS_SCAN_TEMP_DIR=/tmp/virus_scan    # Temporary file directory
```

### 2. Docker Configuration

```yaml
# docker-compose.yml
services:
  clamav:
    build: ./docker/clamav
    ports:
      - '3310:3310'
    volumes:
      - clamav_db:/var/lib/clamav
    healthcheck:
      test: ['CMD', '/usr/local/bin/health-check.sh']
      interval: 30s
      timeout: 10s
      retries: 3
```

### 3. Sidekiq Cron Schedule

```yaml
# config/sidekiq_cron_schedule.yml
process_pending_virus_scans:
  cron: '*/15 * * * * America/Vancouver'
  class: 'ProcessPendingVirusScanJob'
  queue: default
  active_job: true
```

## Monitoring & Maintenance

### 1. Health Checks

**ClamAV Health:**

```ruby
ClamAvService.health_check
# => {:status=>"healthy", :message=>"ClamAV daemon is running"}
```

**Pending Scans:**

```ruby
SupportingDocument.virus_scan_pending.count
# => Number of files awaiting scan
```

### 2. Key Metrics to Monitor

- **ClamAV daemon uptime**
- **Scan processing time**
- **Error rates by type**
- **Queue depth (pending scans)**
- **Virus detection events**

### 3. Log Monitoring

**Important log patterns:**

```bash
# Successful scans
"Virus scan completed for.*: File is clean"

# Virus detections
"Upload blocked - virus detected:"

# ClamAV connectivity issues
"ClamAV daemon is not available"

# Scan errors
"Virus scan failed for.*:"
```

### 4. Maintenance Tasks

**Daily:**

- Monitor ClamAV virus definition updates
- Check scan error rates
- Review virus detection alerts

**Weekly:**

- Analyze scan performance metrics
- Review failed scan logs
- Update virus definitions if needed

**Monthly:**

- Review security incident reports
- Update ClamAV container if needed
- Audit virus scanning configuration

## Troubleshooting

### 1. Common Issues

**Issue: Files showing as "pending" indefinitely**

```bash
# Check Sidekiq status
docker-compose exec app bundle exec sidekiq-web

# Manually process pending scans
docker-compose exec app bundle exec rails runner "ProcessPendingVirusScanJob.new.perform"
```

**Issue: ClamAV daemon not responding**

```bash
# Check ClamAV container health
docker-compose ps clamav

# Restart ClamAV
docker-compose restart clamav

# Check logs
docker-compose logs clamav
```

**Issue: Virus definitions outdated**

```bash
# Update virus definitions manually
docker-compose exec clamav freshclam

# Check definition version
docker-compose exec clamav clamd --version
```

### 2. Emergency Procedures

**Disable virus scanning temporarily:**

```bash
# Set environment variable
export CLAMAV_ENABLED=true

# Or update docker-compose.yml and restart
docker-compose restart app
```

**Force rescan all files:**

```ruby
# Rails console
SupportingDocument.where(virus_scan_status: [:clean, :infected]).update_all(virus_scan_status: :pending)
```

**Clear stuck scans:**

```ruby
# Reset scans stuck in "scanning" status
SupportingDocument.where(virus_scan_status: :scanning)
  .where('virus_scan_started_at < ?', 1.hour.ago)
  .update_all(virus_scan_status: :pending)
```

### 3. Performance Optimization

**High scan volumes:**

- Increase ClamAV memory allocation
- Scale Sidekiq workers
- Implement scan result caching

**Large file handling:**

- Increase scan timeouts
- Implement chunked scanning
- Add file size limits

## Security Considerations

### 1. Defense in Depth

- **Immediate blocking**: Infected files never reach storage
- **Background verification**: Double-check with comprehensive scan
- **Error handling**: Fail-safe approach (block on uncertainty in production)
- **Monitoring**: Real-time alerts for virus detections

### 2. Incident Response

**Virus Detection Protocol:**

1. File upload immediately blocked
2. Security team notified via logs
3. User receives clear error message
4. Incident logged for review
5. Follow-up with user if needed

### 3. Compliance

The virus scanning implementation supports:

- **SOC 2 Type II**: Continuous monitoring and logging
- **NIST Cybersecurity Framework**: Detect and respond capabilities
- **Privacy regulations**: No file content exposed in logs

---

## Document Information

- **Version**: 1.0
- **Last Updated**: July 17, 2025
- **Review Date**: January 17, 2026
