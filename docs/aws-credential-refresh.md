# AWS Credential Refresh

This guide describes how to rotate AWS S3 credentials across environments.

Credentials are rotated automatically via Sidekiq:

- `AwsCredentialRefreshJob` — runs every 2 hours, fetches credentials from AWS Parameter Store and syncs them to the database. Falls back to the `hesp` OpenShift secret for authentication if database credentials are invalid.
- `AwsCredentialHealthCheckJob` — runs every 5 minutes, verifies credentials are valid.

AWS Lambda rotates the credentials in Parameter Store every 2 days. The app reads these and syncs them to the database automatically. If OpenShift goes down during a rotation window, both the database credentials and the OpenShift secret environment fallback can become stale simultaneously.

**The auto-refresh cannot self-heal in this scenario.** Even though the health check logs show "Emergency credential refresh completed successfully", it is just writing the stale environment credentials back to the database — not actually fixing the problem. Once the OpenShift secret is updated with valid credentials, the health check job will automatically sync them to the database within 5 minutes — however for production where uploads are broken, follow the full manual steps below to restore service immediately.

Symptoms: `Aws::S3::Errors::Forbidden` errors in Sidekiq logs, failed file uploads, repeated `CRITICAL: Current AWS credentials are invalid` in logs every 5 minutes.

---

## Prerequisites

- `oc` CLI access to the target OpenShift namespace
- Access to the target environment's OpenShift secrets

### Useful commands

Get all pod names for an environment:

```bash
oc get pods -n bfc7dd-<env>
```

Check which environment you are currently targeting:

```bash
oc project
```

Switch to a different environment:

```bash
oc project bfc7dd-<env>
```

Replace `<env>` with `dev`, `test`, or `prod`.

---

## 1) Get New Credentials from AWS Parameter Store

1. Sign in via AWS SAML at `https://login.nimbus.cloud.gov.bc.ca/api` using your IDIR
2. Select the appropriate account and choose role **BCGOV_WORKLOAD_admin**:
   - **Dev / Test**: `588738584323 - fffbff-dev`
   - **Prod**: `253490792481 - fffbff-prod`
3. Click **Login to Console** on BCGOV_WORKLOAD_admin.
4. Navigate to **AWS Systems Manager → Parameter Store** (direct link after login: https://ca-central-1.console.aws.amazon.com/systems-manager/parameters/?region=ca-central-1&tab=Table — note: you must be logged into the correct account first).
5. Search for `/iam` and select `/iam_users/BCGOV_WORKLOAD_admin_709391fb7b5745eda96357051a2372cf_keys`.
6. Click **Show decrypted value** — the JSON contains `pending_deletion` and `current` sections, each with `AccessKeyID` and `SecretAccessKey`.
7. Copy the **current** values:
   - `current.AccessKeyID` → use as `BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID`
   - `current.SecretAccessKey` → use as `BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY`

---

## Automated Script

Once you have the credentials from Parameter Store (Step 1), the refresh script at `scripts/aws-credential-refresh.sh` automates all remaining steps (2-6). Run from the repo root:

```bash
./scripts/aws-credential-refresh.sh <env> "<access_key_id>" "<secret_access_key>"
```

Replace `<env>` with `dev`, `test`, or `prod`. Use quotes around the credentials in case they contain special characters.

Or follow the manual steps below.

---

## 2) Update OpenShift Secret

Update the `hesp` secret in the target namespace with the new credentials:

```bash
oc patch secret hesp -n bfc7dd-<env> -p '{"stringData":{"BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID":"<new_key_id>","BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY":"<new_secret>"}}'
```

Replace `<env>` with `dev`, `test`, or `prod`.

---

## 3) Delete Stale Credentials from Database

Credentials are encrypted in the database using pgcrypto, so they cannot be read or updated directly in Postgres. Delete the row via Rails:

```bash
oc exec -n bfc7dd-<env> <app-pod> -- ./bin/rails runner "AwsCredential.delete_all"
```

Alternatively, deleting the row directly in Postgres is safe — there are no callbacks that would cause issues.

You can verify the deletion by checking the `aws_credentials` table in the database, or via Rails:

```bash
oc exec -n bfc7dd-<env> <app-pod> -- ./bin/rails runner "puts AwsCredential.count"
```

---

## 4) Refresh Credentials in the App

Run the credential refresh task in the app pod:

```bash
oc exec -n bfc7dd-<env> <app-pod> -- ./bin/rails aws:credentials:refresh
```

Or via Rails runner:

```bash
oc exec -n bfc7dd-<env> <app-pod> -- ./bin/rails runner "AwsCredentialRefreshService.new.refresh_credentials!"
```

---

## 5) Restart Services

Restart in this order, waiting for each to complete before moving to the next:

```bash
oc rollout restart statefulset/hesp-redis-node -n bfc7dd-<env>
oc rollout status statefulset/hesp-redis-node -n bfc7dd-<env>

oc rollout restart deployment/hesp-anycable-rpc -n bfc7dd-<env>
oc rollout status deployment/hesp-anycable-rpc -n bfc7dd-<env>

oc rollout restart deployment/hesp-sidekiq -n bfc7dd-<env>
oc rollout status deployment/hesp-sidekiq -n bfc7dd-<env>

oc rollout restart deployment/hesp-app -n bfc7dd-<env>
oc rollout status deployment/hesp-app -n bfc7dd-<env>
```

`rollout status` will block and print when the rollout is complete.

---

## 6) Verify

Check Sidekiq logs for credential health:

```bash
oc logs -n bfc7dd-<env> <sidekiq-pod> --since=5m | grep -i "aws\|credential\|S3"
```

Expected: `AWS credentials health: OK` — no `Forbidden` or `CRITICAL` errors.

---

## Notes

- Credentials must be refreshed per environment (dev, test, prod) separately.
- Dev and test share the same AWS account (`588738584323 - fffbff-dev`). Prod uses a separate account (`253490792481 - fffbff-prod`).
- The `AwsCredentialHealthCheckJob` runs on a schedule and will log `CRITICAL` until credentials are refreshed.
- If the refresh job still fails after updating the secret, verify the new credentials are correct in Parameter Store.
