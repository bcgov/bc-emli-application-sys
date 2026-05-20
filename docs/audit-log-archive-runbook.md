# Audit Log Archive & Prune Runbook

This runbook describes how to enable, test, and verify the weekly audit log archive/prune job in any environment (e.g. -dev, -test, -prod).

## Prerequisites

- Your environment must have:
  - S3 credentials configured in the `hesp` secret/configmap
  - A dedicated S3 bucket for audit-log archives (`AUDIT_LOG_ARCHIVE_S3_BUCKET`)
  - The audit archive bucket must be separate from:
    - app file upload bucket
    - pgBackRest/database backup bucket
  - The database must be accessible from the CronJob pod

## Enabling the Job in Your Environment

1. Edit your environment values file (e.g. `helm/main/values-e3c3c4-dev.yaml`).
2. Add or update the following block:

   ```yaml
   auditLogArchive:
     enabled: true
     schedule: '0 23 * * 0' # Sunday 11:00 PM local time
     timeZone: 'America/Vancouver' # Or 'America/Edmonton' for Alberta
     env:
       AUDIT_LOG_RETENTION_DAYS: '30' # For testing, use a small number (e.g. 1 or 2)
       AUDIT_LOG_ARCHIVE_PREFIX: 'audit-log-archives/dev'
          AUDIT_LOG_ARCHIVE_S3_BUCKET: 'your-dedicated-audit-archive-bucket'
   ```

3. Save and commit the change.

## Deploying the Job

1. Deploy the Helm chart to your environment:
   ```sh
   helm upgrade --install hesp ./helm/main -f helm/main/values.yaml -f helm/main/values-e3c3c4-dev.yaml -n <your-dev-namespace>
   ```

## Manually Triggering the Job

1. In OpenShift Console:
   - Go to Workloads > CronJobs
   - Find `hesp-audit-log-archive`
   - Click "Create Job" to run immediately

   Or, using `oc` CLI:

   ```sh
   oc create job --from=cronjob/hesp-audit-log-archive manual-audit-log-archive-$(date +%s) -n <your-dev-namespace>
   ```

## Verifying the Job

1. Check the Job pod logs for output confirming:
   - Number of audit logs exported
   - S3 upload success
   - Number of rows pruned
2. In S3, verify a new archive file appears under the prefix (e.g. `audit-log-archives/dev/`)
3. In the database, confirm old audit_logs are pruned (if retention is low, this should be visible)

## Troubleshooting

- If the job fails:
  - Check pod logs for Ruby or AWS errors
  - Ensure `AUDIT_LOG_ARCHIVE_S3_BUCKET` is set and points to the dedicated archive bucket
  - Ensure S3 credentials have write access to that bucket
  - Confirm the database secret is correct and accessible
- You can adjust retention or prefix for repeated tests

## Disabling the Job

- Set `enabled: false` in your environment values file and redeploy Helm.

---

For further help, see the implementation in `lib/tasks/audit_logs.rake` and the Helm template in `helm/main/templates/audit-log-archive-cronjob.yaml`.
