# AWS S3 Credentials: Secret-Volume Migration

## Purpose

Move S3 credential handling away from the Rails database and Sidekiq credential-refresh jobs.

The target design uses the existing OpenShift S3 key-rotation CronJob as the only rotation control plane:

```text
AWS SSM Parameter Store
        |
        v
OpenShift s3-key-rotation CronJob
        |
        v
hesp Secret is patched
        |
        v
Mounted Secret files update in running pods
        |
        v
Rails and Sidekiq reload credentials at runtime
```

This avoids pod recycling during normal two-day key rotation and avoids storing S3 key material in PostgreSQL.

## Current Rotation Model

The OpenShift CronJob already:

1. Reads bootstrap credentials from the `hesp` Secret.
2. Fetches the current credentials from AWS SSM Parameter Store.
3. Patches the `hesp` Secret.
4. Runs independently of the Rails Sidekiq refresh path.

The relevant template is:

```text
helm/main/templates/s3-key-rotation-cronjob.yaml
```

The application currently has a separate DB-backed credential path through:

```text
app/models/aws_credential.rb
app/services/aws_credential_refresh_service.rb
app/jobs/aws_credential_refresh_job.rb
app/jobs/aws_credential_health_check_job.rb
config/initializers/shrine.rb
```

The migration removes that DB dependency after the file-backed path is proven.

## Important Kubernetes Rules

- Use an OpenShift `Secret` for access keys, not a `ConfigMap`.
- Mount the Secret as a directory, not with `subPath`.
- Kubernetes updates a normal Secret volume in a running pod after the Secret changes.
- Environment variables do not update in running processes.
- A process-created AWS client does not automatically reload credentials; application code must detect the changed files and rebuild the client.
- Secret-volume propagation is not instantaneous. The existing overlap period between old and new keys remains an important safety margin.

## Target Mount Path

Use the same path in every S3-using container:

```text
/run/secrets/aws
```

Expected files:

```text
/run/secrets/aws/BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID
/run/secrets/aws/BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY
```

Optional file path configuration can be provided through non-secret configuration:

```text
AWS_ACCESS_KEY_FILE=/run/secrets/aws/BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID
AWS_SECRET_KEY_FILE=/run/secrets/aws/BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY
```

Do not place the actual key values in a ConfigMap.

## Phase 1: Add Secret Volume Mounts

### Rails application deployment

Update:

```text
helm/_app/templates/deployment.yaml
```

Add the Secret volume under the pod `spec`:

```yaml
volumes:
  - name: aws-credentials
    secret:
      secretName: { { .Values.global.envSecretName | quote } }
      optional: false
```

Add the volume mount under the Rails container:

```yaml
volumeMounts:
  - name: aws-credentials
    mountPath: /run/secrets/aws
    readOnly: true
```

If the template already contains `volumes` or `volumeMounts`, append to the existing lists. Do not create duplicate YAML keys.

### Sidekiq deployment

Update:

```text
helm/_sidekiq/templates/deployment.yaml
```

Add the same volume:

```yaml
volumes:
  - name: aws-credentials
    secret:
      secretName: { { .Values.global.envSecretName | quote } }
      optional: false
```

Add the same mount:

```yaml
volumeMounts:
  - name: aws-credentials
    mountPath: /run/secrets/aws
    readOnly: true
```

Sidekiq requires the mount because background jobs may perform S3 uploads, downloads, deletes, and presigned URL operations.

### Audit-log archive CronJob

Update:

```text
helm/main/templates/audit-log-archive-cronjob.yaml
```

Add the volume under the CronJob pod `spec`:

```yaml
volumes:
  - name: aws-credentials
    secret:
      secretName: { { .Values.global.envSecretName | quote } }
      optional: false
```

Add the mount under the archive container:

```yaml
volumeMounts:
  - name: aws-credentials
    mountPath: /run/secrets/aws
    readOnly: true
```

The archive task currently creates its own S3 client from environment variables, so its Ruby code must also be changed to read the mounted files.

## Phase 2: Add the File-Backed Credential Provider

Create a small Rails service, for example:

```text
app/services/openshift_aws_credentials.rb
```

Suggested implementation:

```ruby
class OpenshiftAwsCredentials
  ACCESS_KEY_PATH = ENV.fetch(
    "AWS_ACCESS_KEY_FILE",
    "/run/secrets/aws/BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"
  )

  SECRET_KEY_PATH = ENV.fetch(
    "AWS_SECRET_KEY_FILE",
    "/run/secrets/aws/BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"
  )

  class << self
    def current
      {
        access_key_id: read_required(ACCESS_KEY_PATH),
        secret_access_key: read_required(SECRET_KEY_PATH),
        session_token: nil
      }
    end

    private

    def read_required(path)
      value = File.read(path).strip
      raise "AWS credential file is empty: #{path}" if value.empty?

      value
    rescue Errno::ENOENT, Errno::EACCES => e
      raise "Unable to read AWS credential file #{path}: #{e.message}"
    end
  end
end
```

The provider must read the files when credentials are requested. Do not read them once at process boot and retain them permanently.

## Phase 3: Change Shrine to Use Mounted Secret Files

Update:

```text
config/initializers/shrine.rb
```

The current implementation uses `AwsCredential.current_s3_credentials` as the primary runtime source. Replace that DB-first path with the file-backed provider.

The dynamic storage client should:

1. Read both mounted credential files when creating a client.
2. Calculate a fingerprint from the credentials.
3. Re-read the files before reusing the client, or at a controlled short interval.
4. Rebuild the AWS client when the fingerprint changes.
5. Retry once after `InvalidAccessKeyId` or `SignatureDoesNotMatch`.

Use a cryptographic digest for the fingerprint:

```ruby
Digest::SHA256.hexdigest(
  [
    credentials[:access_key_id],
    credentials[:secret_access_key],
    credentials[:session_token]
  ].join("\0")
)
```

Conceptual client logic:

```ruby
def client
  credentials = OpenshiftAwsCredentials.current
  fingerprint = Digest::SHA256.hexdigest(
    [
      credentials[:access_key_id],
      credentials[:secret_access_key],
      credentials[:session_token]
    ].join("\0")
  )

  if @client.nil? || @credential_fingerprint != fingerprint
    @client = Aws::S3::Client.new(
      endpoint: @dynamic_options[:endpoint],
      region: @dynamic_options[:region],
      access_key_id: credentials[:access_key_id],
      secret_access_key: credentials[:secret_access_key],
      session_token: credentials[:session_token],
      force_path_style: @dynamic_options[:force_path_style]
    )

    @credential_fingerprint = fingerprint
  end

  @client
end
```

Update the following Shrine paths to use the same provider:

- Upload
- Download
- Object existence checks
- Presigned PUT URL generation
- Any custom S3 client construction

Search for all runtime references to:

```ruby
AwsCredential.current_s3_credentials
```

and remove them from the S3 runtime path.

## Phase 4: Change the Audit Archive Task

Update:

```text
lib/tasks/audit_logs.rake
```

The current implementation constructs the client from:

```ruby
ENV["BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID"]
ENV["BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY"]
```

Change it to:

```ruby
credentials = OpenshiftAwsCredentials.current

s3_client = Aws::S3::Client.new(
  access_key_id: credentials[:access_key_id],
  secret_access_key: credentials[:secret_access_key],
  region: ENV["BCGOV_OBJECT_STORAGE_REGION"] || "ca-central-1",
  endpoint: ENV["BCGOV_OBJECT_STORAGE_ENDPOINT"],
  force_path_style: true
)
```

The archive CronJob will then use the mounted Secret rather than static environment values.

## Phase 5: Remove the Sidekiq Credential Rotation Path

After the file-backed runtime path is validated, remove or disable these schedule entries:

```text
aws_credential_refresh
aws_credential_health_check
```

They are defined in:

```text
config/sidekiq_cron_schedule.yml
```

The following files become obsolete for normal credential operation:

```text
app/jobs/aws_credential_refresh_job.rb
app/jobs/aws_credential_health_check_job.rb
app/services/aws_credential_refresh_service.rb
lib/tasks/aws_credentials.rake
```

During the bake period, the files can remain in the repository but must not be part of the runtime credential path.

## Phase 6: Remove DB Credential Persistence

Do not drop the table in the first deployment.

During the bake period:

1. Confirm no application code reads `AwsCredential`.
2. Confirm no job writes `AwsCredential`.
3. Confirm no Sidekiq schedule references the refresh or health jobs.
4. Confirm uploads, downloads, presigned URLs, and archive jobs use mounted files.
5. Confirm key rotation works without pod restarts.
6. Confirm logs contain no DB credential refresh errors.

After the bake period, add a migration to drop the `aws_credentials` table. Remove the associated encryption migrations only if their functionality is not used anywhere else.

## Dev Values to Preserve

For the e3c3c4 development environment, retain the existing S3 rotation settings:

```yaml
s3KeyRotation:
  enabled: true
  schedule: '0 */2 * * *'
  syncPgbackrestSecret: false
  parameterStorePath: '/iam_users/a5c711-dev_HESPUser_keys'
```

Keep non-secret AWS settings in the shared configuration ConfigMap:

```yaml
sharedConfig:
  aws:
    region: ca-central-1
    defaultRegion: ca-central-1
    parameterBasePath: '/iam_users/a5c711-dev_HESPUser_keys'
```

The ConfigMap may contain region, endpoint, bucket, and SSM parameter path. It must not contain access keys or secret keys.

## Helm Rendering Checks

Render the dev chart before deployment:

```bash
cd /home/siegleda/workspace/bc-emli-application-sys

helm template hesp ./helm/main \
  -f ./helm/main/values.yaml \
  -f ./helm/main/values-e3c3c4-dev.yaml \
  > /tmp/hesp-dev-rendered.yaml
```

Confirm the volume and mounts exist:

```bash
rg -n \
  "aws-credentials|/run/secrets/aws|BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID|BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY" \
  /tmp/hesp-dev-rendered.yaml
```

Confirm credential mounts do not use `subPath`:

```bash
rg -n "subPath" /tmp/hesp-dev-rendered.yaml
```

Any `subPath` use for the AWS credential files is a defect because Secret updates will not propagate through that mount.

## Initial Deployment

Adding a new volume mount changes the pod template, so the first migration deployment will create new pods once.

```bash
helm upgrade hesp ./helm/main \
  -f ./helm/main/values.yaml \
  -f ./helm/main/values-e3c3c4-dev.yaml \
  -n e3c3c4-dev
```

This is the one-time migration restart. Subsequent S3 key rotations should not require pod restarts.

Verify the mounted files without printing their contents:

```bash
oc exec -n e3c3c4-dev deploy/hesp-app -- \
  sh -c 'ls -l /run/secrets/aws && sha256sum /run/secrets/aws/*'

oc exec -n e3c3c4-dev deploy/hesp-sidekiq -- \
  sh -c 'ls -l /run/secrets/aws && sha256sum /run/secrets/aws/*'
```

Do not use `cat` on the credential files in shared terminals or logs.

## Test Secret Propagation Without Restarting Pods

Record current pod creation times:

```bash
oc get pods -n e3c3c4-dev \
  -l app.kubernetes.io/name=hesp-app \
  -o 'custom-columns=NAME:.metadata.name,CREATED:.metadata.creationTimestamp'
```

Record the current mounted-file fingerprints:

```bash
oc exec -n e3c3c4-dev deploy/hesp-app -- \
  sh -c 'sha256sum /run/secrets/aws/*'
```

Create a one-off run of the existing rotation CronJob:

```bash
JOB_NAME="hesp-s3-key-rotation-manual-$(date +%s)"

oc create job \
  --from=cronjob/hesp-s3-key-rotation \
  "$JOB_NAME" \
  -n e3c3c4-dev
```

Watch the job:

```bash
oc logs -n e3c3c4-dev -f "job/$JOB_NAME"
```

After the Secret is patched, check the mounted-file fingerprints again:

```bash
oc exec -n e3c3c4-dev deploy/hesp-app -- \
  sh -c 'sha256sum /run/secrets/aws/*'
```

Check pod creation times again:

```bash
oc get pods -n e3c3c4-dev \
  -l app.kubernetes.io/name=hesp-app \
  -o 'custom-columns=NAME:.metadata.name,CREATED:.metadata.creationTimestamp'
```

Expected result:

- Mounted file fingerprints change when the Secret projection updates.
- Pod creation timestamps remain unchanged.
- No deployment rollout occurs.

## Test Runtime S3 Reloading

Perform a normal application S3 operation after the mounted files update. Prefer the application’s regular upload/download workflow.

Inspect application logs without exposing secrets:

```bash
oc logs -n e3c3c4-dev deploy/hesp-app --since=10m | \
  grep -Ei 's3|credential|signature|invalidaccess|forbidden'
```

Inspect Sidekiq logs:

```bash
oc logs -n e3c3c4-dev deploy/hesp-sidekiq --since=10m | \
  grep -Ei 's3|credential|signature|invalidaccess|forbidden'
```

Expected result:

- No `InvalidAccessKeyId` errors.
- No `SignatureDoesNotMatch` errors.
- No `Forbidden` errors caused by stale keys.
- No pod restart is required.

## Failure and Recovery Tests

Test these in dev before removing the DB path:

1. Patch the Secret with a known valid overlapping key set.
2. Confirm mounted files update.
3. Perform S3 operations from the app.
4. Perform an S3 operation from Sidekiq.
5. Run the audit archive job against a controlled test dataset.
6. Confirm clients rebuild after the credential fingerprint changes.
7. Confirm a deliberately invalid key produces a clear error.
8. Restore valid credentials and confirm the next operation recovers without a pod restart.

Never print full credentials while running these tests.

## Steady-State Result

After migration:

```text
OpenShift CronJob patches hesp Secret
    |
    v
Secret volume projection updates in existing pods
    |
    v
Next S3 operation reads changed files
    |
    v
Application rebuilds its S3 client
    |
    v
Request uses the new key
```

The resulting properties are:

- No AWS S3 keys stored in PostgreSQL.
- No Sidekiq credential-refresh dependency.
- No pod restart for normal two-day key rotation.
- OpenShift CronJob is the single rotation control plane.
- Existing old/new key overlap remains the recovery margin.
