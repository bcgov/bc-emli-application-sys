# NGINX TLS Certificate Update Runbook

This runbook covers updating the TLS certificate for the NGINX proxy that handles SSL termination for bcenergysavingsprogram.ca and www.bcenergysavingsprogram.ca.

## Architecture Overview

- **NGINX Deployment**: Terminates SSL/TLS on ports 8080 (HTTP) → 8443 (HTTPS)
- **TLS Secret**: Kubernetes Secret named `nginx-tls` containing `tls.crt` and `tls.key`
- **Pod Restart Trigger**: Secret checksum annotation automatically restarts pods when cert changes
- **Domain Coverage**: Both `bcenergysavingsprogram.ca` and `www.bcenergysavingsprogram.ca`

## Prerequisites

- kubectl/oc access to the OpenShift cluster
- New certificate files from your CA:
  - Server certificate (e.g., `bcenergysavingsprogram.ca.pem`)
  - Private key (e.g., `bcenergysavingsprogram-tls.key`)
  - Intermediate CA chain files
- Correct namespace and secret names (from your actual deployment):
  - Run: `oc get pods -l app.kubernetes.io/component=nginx-proxy` to see your namespace
  - Check your helm values for the actual TLS secret name (not the template default)

## Step 1: Prepare the certificate files

**Navigate to your cert directory:**

```bash
cd /home/dir/to/certificates
```

**Build the certificate chain** (Entrust CA bundle - order matters):

```bash
cat bcenergysavingsprogram.ca.pem \
    'Entrust OV TLS Issuing RSA CA 2.pem' \
    'USERTrust RSA Certification Authority.pem' > tls.crt
```

**Copy the private key:**

```bash
cp bcenergysavingsprogram-tls.key tls.key
```

**Verify certificate validity**

```bash
openssl x509 -in tls.crt -noout -text | grep -E "Subject:|CN =|DNS:"
```

Confirm output includes:

- `CN = bcenergysavingsprogram.ca`
- SANs for both `bcenergysavingsprogram.ca` and `www.bcenergysavingsprogram.ca`

**Verify key matches certificate**

```bash
openssl x509 -noout -modulus -in tls.crt | openssl md5
openssl rsa -noout -modulus -in tls.key | openssl md5
```

Both hashes must match. If they don't, stop—the key/cert pair is mismatched.

## Step 2: Identify your namespace and secret names

**Get your actual namespace and TLS secret name:**

```bash
NAMESPACE=$(oc get pods -l app.kubernetes.io/component=nginx-proxy -o jsonpath='{.items[0].metadata.namespace}') #get's the currently logged in namespace
TLS_SECRET_NAME=hesp-tls  # Replace with your actual TLS secret name from helm values

echo "NAMESPACE=$NAMESPACE"
echo "TLS_SECRET_NAME=$TLS_SECRET_NAME"
```

## Step 2b: Backup current TLS secret

```bash
oc get secret $TLS_SECRET_NAME -n $NAMESPACE -o yaml > nginx-tls-backup-$(date +%Y%m%d-%H%M%S).yaml

cat nginx-tls-backup-*.yaml | grep -E "name:|namespace:|type:|data:" | head -20 #quick verify, the data fields should be base64 encoded
```

## Step 3: Update the Kubernetes secret

Delete the old secret and create a new one:

```bash
oc delete secret $TLS_SECRET_NAME -n $NAMESPACE --ignore-not-found=true
oc create secret tls $TLS_SECRET_NAME \
  --cert=tls.crt \
  --key=tls.key \
  -n $NAMESPACE

oc get secret $TLS_SECRET_NAME -n $NAMESPACE -o yaml | grep -E "name:|namespace:|type:|data:" | head -20 #quick verify that it created successfully
```

## Step 3b: Store the CSR for audit/backup

Back up the CSR in the `hesp-csr-key` secret (data field `pfk`) for future reference:

```bash
CSR_SECRET_NAME=hesp-csr-key

# Create or patch the CSR storage secret
oc create secret generic $CSR_SECRET_NAME \
  --from-file=pfk=bcenergysavingsprogram-tls.csr \
  -n $NAMESPACE \
  --dry-run=client -o yaml | oc apply -f -

oc get secret $CSR_SECRET_NAME -n $NAMESPACE -o yaml | grep -E "name:|namespace:|type:|data:" | head -20 #quick verify that it created successfully
```

## Step 4: Manually restart pods (required for manual secret updates)

When updating the secret manually (not via Helm), force a pod restart:

```bash
oc rollout restart deployment/hesp-nginx-proxy -n $NAMESPACE

# Wait for restart to complete
oc rollout status deployment/hesp-nginx-proxy -n $NAMESPACE --timeout=5m

# Verify all 3 pods are Running
oc get pods -n $NAMESPACE -l app.kubernetes.io/component=nginx-proxy
```

Expected output: 3 pods with STATUS=Running and incremented RESTARTS count

## Step 4b: Update NGINX ConfigMap (if needed)

If the NGINX config doesn't have both `server_name` entries, update the ConfigMap:

```bash
# Find the ConfigMap name
CONFIGMAP_NAME=$(oc get configmap -n $NAMESPACE | grep nginx | awk '{print $1}')

# Verify current server_name
oc get configmap $CONFIGMAP_NAME -n $NAMESPACE -o yaml | grep "server_name"

# If it only shows bcenergysavingsprogram.ca (not www), update it:
oc get configmap $CONFIGMAP_NAME -n $NAMESPACE -o yaml | \
  sed 's/server_name bcenergysavingsprogram.ca;/server_name bcenergysavingsprogram.ca www.bcenergysavingsprogram.ca;/g' | \
  oc apply -f -

# Verify the update
oc get configmap $CONFIGMAP_NAME -n $NAMESPACE -o yaml | grep "server_name"
```

Should now show both domains.

## Step 4c: Create OpenShift Route for www variant

Ensure traffic for `www.bcenergysavingsprogram.ca` routes to the nginx proxy:

```bash
# Check existing routes
oc get route -n $NAMESPACE | grep nginx

# If there's only a route for bcenergysavingsprogram.ca, create one for www:
oc create route passthrough hesp-nginx-www \
  --hostname=www.bcenergysavingsprogram.ca \
  --service=hesp-nginx-proxy \
  --port=https \
  -n $NAMESPACE \
  --ignore-not-found=false

# Verify both routes exist
oc get route -n $NAMESPACE | grep nginx
```

Expected: Two routes (hesp-nginx and hesp-nginx-www) both pointing to hesp-nginx-proxy service

**Check nginx logs**

```bash
oc logs -n $NAMESPACE -l app.kubernetes.io/component=nginx-proxy -c nginx | head -20
```

Look for any SSL/TLS errors.

**Verify certificate details from inside the pod**

```bash
POD_NAME=$(oc get pods -n $NAMESPACE -l app.kubernetes.io/component=nginx-proxy -o jsonpath='{.items[0].metadata.name}')

oc exec -it $POD_NAME -n $NAMESPACE -c nginx -- \
  openssl x509 -in /etc/nginx/certs/tls.crt -noout -text | grep -E "Subject:|CN =|DNS:|Not Before:|Not After:"
```

**Test external HTTPS connection for bcenergysavingsprogram.ca**

```bash
openssl s_client -connect bcenergysavingsprogram.ca:443 -servername bcenergysavingsprogram.ca < /dev/null | grep -E "subject=|CN =|Issuer"
```

Expected output:

- `subject=... CN = bcenergysavingsprogram.ca`
- `Issuer: C = CA, O = Entrust Limited`
- No SSL errors

**Test external HTTPS connection for www.bcenergysavingsprogram.ca**

```bash
openssl s_client -connect www.bcenergysavingsprogram.ca:443 -servername www.bcenergysavingsprogram.ca < /dev/null | grep -E "subject=|CN =|Issuer"
```

Should return identical certificate (same CN, same Issuer).

## Rollback (if needed)

If the new certificate causes issues:

```bash
# List your backups
ls nginx-tls-backup-*.yaml

# Restore from backup (replace timestamp)
oc apply -f nginx-tls-backup-<timestamp>.yaml

# Monitor rollback pod restart
oc rollout status deployment/hesp-nginx-proxy -n $NAMESPACE --timeout=5m
```

This restores the previous secret and triggers another pod restart automatically.

## Troubleshooting

### Pods not restarting after secret update

Check if the checksum annotation is working:

```bash
oc get deployment hesp-nginx-proxy -n $NAMESPACE -o yaml | grep -A 5 annotations
```

If checksum is not present, update the Helm values and redeploy:

```bash
helm upgrade hesp ./helm/main \
  -n $NAMESPACE \
  -f values.yaml
```

### Certificate mismatch errors in logs

Confirm key and certificate match (see Step 1). If they don't, generate a new CSR.

### HTTPS requests fail with certificate errors

Verify the intermediate chain is included in `tls.crt`:

```bash
openssl x509 -in tls.crt -noout -text
```

Should show all certificates in the chain, not just the leaf.

### Both www and non-www variants not working

**Check 1: NGINX config has both server_name entries**

```bash
oc get configmap -n $NAMESPACE -o yaml | grep "server_name"
```

Should show:

```
server_name bcenergysavingsprogram.ca www.bcenergysavingsprogram.ca;
```

If not, follow Step 4b to update the ConfigMap.

**Check 2: OpenShift routes exist for both domains**

```bash
oc get route -n $NAMESPACE | grep nginx
```

Should show two routes:

- `hesp-nginx` with host `bcenergysavingsprogram.ca`
- `hesp-nginx-www` with host `www.bcenergysavingsprogram.ca`

If missing the www route, follow Step 4c to create it.

**Check 3: DNS resolves both to same IP**

```bash
nslookup bcenergysavingsprogram.ca
nslookup www.bcenergysavingsprogram.ca
```

Both should resolve to the same IP address (e.g., 142.34.229.4).

If `www` points elsewhere, contact your DNS provider.

## Maintenance reminders

- Certificate expiration: Monitor via monitoring/alerting (add to your Prometheus or similar)
- Renewal cycle: Typically 90 days before expiry
- Update frequency: Only when certificate changes or security patches are needed
