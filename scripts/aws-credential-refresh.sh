#!/bin/bash
#
# AWS Credential Refresh Script
# Automates steps 2-6 from docs/aws-credential-refresh.md
#
# Usage: ./scripts/aws-credential-refresh.sh <env> <access_key_id> <secret_access_key>
# Example: ./scripts/aws-credential-refresh.sh test AKIA... wJalr...
#

set -e

ENV=$1
ACCESS_KEY_ID=$2
SECRET_ACCESS_KEY=$3
NAMESPACE="bfc7dd-${ENV}"

if [ -z "$ENV" ] || [ -z "$ACCESS_KEY_ID" ] || [ -z "$SECRET_ACCESS_KEY" ]; then
  echo "Usage: $0 <env> <access_key_id> <secret_access_key>"
  echo "  env: dev, test, or prod"
  exit 1
fi

if [[ ! "$ENV" =~ ^(dev|test|prod)$ ]]; then
  echo "Error: env must be dev, test, or prod"
  exit 1
fi

# Find the app pod
APP_POD=$(oc get pods -n "$NAMESPACE" -l app.kubernetes.io/name=hesp-app -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -z "$APP_POD" ]; then
  APP_POD=$(oc get pods -n "$NAMESPACE" | grep "hesp-app" | grep "Running" | awk '{print $1}' | head -1)
fi

if [ -z "$APP_POD" ]; then
  echo "Error: Could not find app pod in ${NAMESPACE}"
  exit 1
fi

echo "Environment: ${ENV}"
echo "Namespace: ${NAMESPACE}"
echo "App pod: ${APP_POD}"
echo ""

# Step 2: Update OpenShift Secret
echo "=== Step 2: Updating OpenShift secret ==="
oc patch secret hesp -n "$NAMESPACE" -p "{\"stringData\":{\"BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID\":\"${ACCESS_KEY_ID}\",\"BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY\":\"${SECRET_ACCESS_KEY}\"}}"
echo "Secret updated."
echo ""

# Step 3: Delete stale credentials from database
echo "=== Step 3: Deleting stale credentials from database ==="
oc exec -n "$NAMESPACE" "$APP_POD" -- ./bin/rails runner "AwsCredential.delete_all"
echo "Stale credentials deleted."
echo ""

# Step 4: Refresh credentials in the app
echo "=== Step 4: Refreshing credentials ==="
oc exec -n "$NAMESPACE" "$APP_POD" -- ./bin/rails aws:credentials:refresh
echo ""

# Step 5: Restart services in order
echo "=== Step 5: Restarting services ==="

echo "Restarting Redis..."
oc rollout restart statefulset/hesp-redis-node -n "$NAMESPACE"
oc rollout status statefulset/hesp-redis-node -n "$NAMESPACE"
echo "Redis restarted."
echo ""

echo "Restarting AnyCable RPC..."
oc rollout restart deployment/hesp-anycable-rpc -n "$NAMESPACE"
oc rollout status deployment/hesp-anycable-rpc -n "$NAMESPACE"
echo "AnyCable RPC restarted."
echo ""

echo "Restarting Sidekiq..."
oc rollout restart deployment/hesp-sidekiq -n "$NAMESPACE"
oc rollout status deployment/hesp-sidekiq -n "$NAMESPACE"
echo "Sidekiq restarted."
echo ""

echo "Restarting App..."
oc rollout restart deployment/hesp-app -n "$NAMESPACE"
oc rollout status deployment/hesp-app -n "$NAMESPACE"
echo "App restarted."
echo ""

# Step 6: Verify
echo "=== Step 6: Verifying ==="
SIDEKIQ_POD=$(oc get pods -n "$NAMESPACE" | grep "hesp-sidekiq" | grep "Running" | awk '{print $1}' | head -1)

if [ -z "$SIDEKIQ_POD" ]; then
  echo "Warning: Could not find Sidekiq pod. Check logs manually."
  exit 0
fi

echo "Waiting 30 seconds for health check to run..."
sleep 30

echo "Checking Sidekiq logs:"
oc logs -n "$NAMESPACE" "$SIDEKIQ_POD" --since=1m | grep -i "aws\|credential\|S3" | tail -10

echo ""
echo "Done. Verify no CRITICAL errors above."
