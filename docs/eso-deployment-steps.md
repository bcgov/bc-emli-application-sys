# External Secrets Operator Deployment Steps

This guide provides step-by-step instructions to deploy External Secrets Operator (ESO) for AWS credential rotation.

## Prerequisites

- **BCGOV OpenShift Silver/Gold Platform** access
- Helm 3.x installed
- `oc` CLI configured and logged in to your OpenShift cluster
- AWS IAM user credentials with Parameter Store access
- Existing AWS Parameter Store with rotating credentials at path:
  `/iam_users/BCGOV_WORKLOAD_admin_709391fb7b5745eda96357051a2372cf_keys`

## Deployment Steps

### Step 1: Install External Secrets Operator

**\* IMPORTANT: This requires cluster-admin permissions**

#### Option A: Check if ESO is Already Installed

```bash
# Check if ESO is already available (many BCGOV clusters have it)
oc get pods -n external-secrets-system
oc get crd | grep external-secrets
```

**If you see ESO resources, skip to Step 2!**

#### Option B: Request ESO Installation (BCGOV Silver/Gold Platform)

If ESO is not installed, you need to request it from Platform Services:

1. **GitHub Issue**: Create issue in [platform-services repository](https://github.com/BCDevOps/platform-services)
2. **Rocket.Chat**: Post in `#devops-operations` or `#platform-services`

**Request Template:**

```
Title: Install External Secrets Operator on Silver/Gold Platform

Description:
We need External Secrets Operator installed cluster-wide to manage rotating AWS credentials.

Namespace: bc-emli-application-sys
License Plate: bfc7dd

Installation Commands:
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true

Justification: Automated AWS credential rotation for secure S3 access
```

#### Option C: Manual Installation (If You Have Cluster-Admin)

```bash
# Add ESO Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install ESO operator
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true

# Verify installation
oc get pods -n external-secrets-system
```

**Expected Output:**

```
NAME                                               READY   STATUS    RESTARTS   AGE
external-secrets-86f46b8c9c-xyz12                 1/1     Running   0          1m
external-secrets-cert-controller-abc123-def45     1/1     Running   0          1m
external-secrets-webhook-789xyz-123abc             1/1     Running   0          1m
```

**\* Wait for Platform Services approval (1-3 business days) if using Option B**

### Step 2: Create Bootstrap Credentials Secret

```bash
# Replace AKIA... and your-secret-key with actual AWS credentials
oc create secret generic aws-bootstrap-credentials \
  --from-literal=access-key-id="AKIA..." \
  --from-literal=secret-access-key="your-secret-key" \
  --namespace bc-emli-application-sys

# Verify secret creation
oc get secret aws-bootstrap-credentials -n bc-emli-application-sys
```

**Expected Output:**

```
NAME                        TYPE     DATA   AGE
aws-bootstrap-credentials   Opaque   2      10s
```

### Step 3: Deploy ESO Configuration

```bash
# Deploy SecretStore and ExternalSecret
helm install external-secrets-setup ./helm/external-secrets-setup \
  --namespace bc-emli-application-sys

# Verify ESO resources
oc get secretstore,externalsecret -n bc-emli-application-sys
```

**Expected Output:**

```
NAME                                        AGE   STATUS   CAPABILITIES   READY
secretstore.external-secrets.io/aws-parameter-store   30s   Valid    ReadWrite      True

NAME                                              STORE               REFRESH INTERVAL   STATUS         READY
externalsecret.external-secrets.io/s3-rotated-credentials   aws-parameter-store   2m                 SecretSynced   True
```

### Step 4: Verify Managed Secret Creation

```bash
# Check that ESO created the managed secret
oc get secret s3-access-keys -n bc-emli-application-sys

# Verify secret contains required keys
oc get secret s3-access-keys -n bc-emli-application-sys -o jsonpath='{.data}' | jq 'keys'
```

**Expected Output:**

```
NAME             TYPE     DATA   AGE
s3-access-keys   Opaque   3      1m

[
  "access-key-id",
  "pending-access-key-id",
  "secret-access-key"
]
```

### Step 5: Deploy Application with ESO Integration

Choose the appropriate environment:

#### For Development Environment:

```bash
helm upgrade --install bc-emli-application-sys ./helm/main \
  --namespace bc-emli-application-sys \
  --values ./helm/main/values-bfc7dd-dev.yaml
```

#### For Test Environment:

```bash
helm upgrade --install bc-emli-application-sys ./helm/main \
  --namespace bc-emli-application-sys \
  --values ./helm/main/values-bfc7dd-test.yaml
```

#### For Production Environment:

```bash
helm upgrade --install bc-emli-application-sys ./helm/main \
  --namespace bc-emli-application-sys \
  --values ./helm/main/values-bfc7dd-prod.yaml
```

### Step 6: Verify Application Integration

```bash
# Check application pods are running
oc get pods -n bc-emli-application-sys

# Verify environment variables are set from ESO secret
oc describe pod <app-pod-name> -n bc-emli-application-sys | grep -A 5 "BCGOV_OBJECT_STORAGE"

# Test S3 connectivity from application pod
oc exec <app-pod-name> -n bc-emli-application-sys -- \
  rails runner "puts 'S3 test: ' + Shrine.storages[:store].client.list_buckets.buckets.size.to_s + ' buckets found'"
```

**Expected Output:**

```
Environment:
  BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID:      <set to the key 'access-key-id' in secret 's3-access-keys'>
  BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY:  <set to the key 'secret-access-key' in secret 's3-access-keys'>

S3 test: 1 buckets found
```

## Verification Checklist

- [ ] ESO operator pods running in `external-secrets-system` namespace
- [ ] Bootstrap secret `aws-bootstrap-credentials` created
- [ ] SecretStore `aws-parameter-store` status is `Valid` and `Ready`
- [ ] ExternalSecret `s3-rotated-credentials` status is `SecretSynced` and `Ready`
- [ ] Managed secret `s3-access-keys` exists with required keys
- [ ] Application pods have ESO-managed environment variables
- [ ] S3 connectivity test passes from application pod
- [ ] File uploads work correctly

## Monitoring ESO

### Watch ExternalSecret Sync Status

```bash
# Monitor sync status (refreshes every 2 minutes)
watch oc get externalsecret s3-rotated-credentials -n bc-emli-application-sys

# View detailed sync information
oc describe externalsecret s3-rotated-credentials -n bc-emli-application-sys
```

### Check ESO Operator Logs

```bash
# View ESO controller logs
oc logs -n external-secrets-system deployment/external-secrets -f

# Check for any sync errors
oc logs -n external-secrets-system deployment/external-secrets | grep ERROR
```

### Monitor Secret Updates

```bash
# Watch secret changes
watch oc get secret s3-access-keys -n bc-emli-application-sys -o jsonpath='{.metadata.resourceVersion}'

# View secret metadata including last update
oc get secret s3-access-keys -n bc-emli-application-sys -o yaml | grep -E "(creationTimestamp|resourceVersion)"
```

## Troubleshooting

### ExternalSecret Not Syncing

```bash
# Check SecretStore status
oc describe secretstore aws-parameter-store -n bc-emli-application-sys

# Verify bootstrap credentials can access Parameter Store
oc exec -it deployment/external-secrets -n external-secrets-system -- \
  aws ssm get-parameter --name "/iam_users/BCGOV_WORKLOAD_admin_709391fb7b5745eda96357051a2372cf_keys" --region ca-central-1
```

### Application Can't Access S3

```bash
# Check if secret exists and has correct keys
oc get secret s3-access-keys -n bc-emli-application-sys -o yaml

# Verify environment variables in pod
oc exec <app-pod-name> -n bc-emli-application-sys -- env | grep BCGOV_OBJECT_STORAGE

# Check Shrine configuration
oc exec <app-pod-name> -n bc-emli-application-sys -- \
  rails runner "puts Shrine.storages.keys"
```

### Parameter Store Access Issues

```bash
# Test Parameter Store access with bootstrap credentials
ACCESS_KEY=$(oc get secret aws-bootstrap-credentials -n bc-emli-application-sys -o jsonpath='{.data.access-key-id}' | base64 -d)
SECRET_KEY=$(oc get secret aws-bootstrap-credentials -n bc-emli-application-sys -o jsonpath='{.data.secret-access-key}' | base64 -d)

AWS_ACCESS_KEY_ID=$ACCESS_KEY AWS_SECRET_ACCESS_KEY=$SECRET_KEY \
  aws ssm get-parameter \
  --name "/iam_users/BCGOV_WORKLOAD_admin_709391fb7b5745eda96357051a2372cf_keys" \
  --with-decryption \
  --region ca-central-1
```

## Success Indicators

When everything is working correctly:

1. **ESO syncs every 2 minutes** - ExternalSecret shows recent `refreshTime`
2. **Managed secret updates automatically** - `resourceVersion` changes when credentials rotate
3. **Application pods restart when secret changes** - Kubernetes detects secret updates
4. **File uploads work continuously** - No authentication errors during credential rotation
5. **Logs show no ESO errors** - Clean sync logs in ESO operator

## Next Steps

After successful deployment:

1. **Monitor the first credential rotation** (within 2 days of Lambda rotation)
2. **Set up alerts** for ExternalSecret sync failures
3. **Document any environment-specific configurations**
4. **Train team on ESO monitoring and troubleshooting**

## Rollback Plan

If issues arise, you can temporarily rollback by:

1. **Disable ESO in values.yaml:**

   ```yaml
   app:
     externalSecrets:
       enabled: false
   ```

2. **Set environment variables directly:**

   ```bash
   oc set env deployment/<app-name> \
     BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID="fallback-key" \
     BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY="fallback-secret"
   ```

3. **Investigate and fix ESO issues, then re-enable**

## Complete ESO Integration Checklist

Use this checklist to ensure ESO is fully working:

### Phase 1: ESO Operator Installation

- [ ] ESO operator pods running in `external-secrets-system`
- [ ] ESO CRDs available (`oc get crd | grep external-secrets`)
- [ ] No error logs in ESO operator (`oc logs -n external-secrets-system deployment/external-secrets`)

### Phase 2: Bootstrap Configuration

- [ ] Bootstrap secret `aws-bootstrap-credentials` created with valid AWS credentials
- [ ] Bootstrap credentials can access Parameter Store (test with AWS CLI)
- [ ] Parameter Store contains credential JSON at correct path

### Phase 3: ESO Resources

- [ ] SecretStore `aws-parameter-store` status shows `Valid` and `Ready`
- [ ] ExternalSecret `s3-rotated-credentials` status shows `SecretSynced` and `Ready`
- [ ] ExternalSecret shows recent `refreshTime` (within last 2 minutes)

### Phase 4: Application Integration

- [ ] Managed secret `s3-access-keys` exists with keys: `access-key-id`, `secret-access-key`
- [ ] Application deployment includes ESO environment variables
- [ ] Application pods have correct `BCGOV_OBJECT_STORAGE_*` environment variables
- [ ] Application can successfully connect to S3

### Phase 5: End-to-End Testing

- [ ] File upload works through application
- [ ] S3 operations succeed in application logs
- [ ] Monitor credential rotation cycle (occurs every 2 days)
- [ ] Verify pods restart automatically when credentials rotate

## BCGOV Support Contacts

If you need help:

- **Platform Services**: `#devops-operations` on Rocket.Chat
- **GitHub Issues**: [BCDevOps/platform-services](https://github.com/BCDevOps/platform-services)
- **Documentation**: [BCGOV Developer Guide](https://developer.gov.bc.ca/)

## Success Criteria

ESO is fully working when:

1. **Credentials sync every 2 minutes** automatically
2. **Application file uploads work continuously** without credential errors
3. **No manual credential management required**
4. **Automatic pod restart** when credentials rotate
5. **Clean ESO operator logs** with no sync errors

**🎉 Once all checklist items are complete, your AWS credential rotation is fully automated!**
