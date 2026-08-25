# Maintenance Page Pod

## Purpose

This runbook describes the operational process for:

- Building the maintenance image after HTML/CSS changes.
- Deploying/updating the maintenance pod.
- Switching application traffic to/from the maintenance page.

The goal is to show a clear outage page instead of DNS/browser error pages during incidents.

## Components

- Static page source: `maintenance/index.html`
- Nginx configs: `maintenance/nginx.conf`, `maintenance/nginx-main.conf`
- Image build: `maintenance/Dockerfile`
- Helm chart: `helm/_maintenance`
- Kubernetes/OpenShift objects:
  - Deployment: `maintenance`
  - Service: `maintenance`
  - Main app route (existing): `hesp-app`
  - Vanity route (nginx mode): `hesp-nginx` (and optional `hesp-nginx-www`)

## Prerequisites

- `oc` CLI authenticated to the target cluster.
- `helm` 3.x installed.
- Access to target project/namespace (`e3c3c4-prod`).

## Build and Deploy (First Time Per Namespace)

### 1) Select project

```bash
oc login https://api.gold.devops.gov.bc.ca:6443
oc project e3c3c4-prod
```

### 2) Create build config once

```bash
oc new-build --name=hesp-maintenance --binary --strategy=docker --to=hesp-maintenance:prod
```

### 3) Build image from local maintenance folder

```bash
oc start-build hesp-maintenance \
  --from-dir=./maintenance \
  --follow --wait
```

### 4) Deploy maintenance chart

```bash
cd ./bc-emli-application-sys/helm/_maintenance

helm upgrade --install hesp-maintenance . \
  --namespace e3c3c4-prod \
  --set image.repository=image-registry.openshift-image-registry.svc:5000/e3c3c4-prod/hesp-maintenance \
  --set image.tag=prod \
  --set image.pullPolicy=Always \
  --set replicaCount=1 \
  --set route.enabled=false \
  --set fullnameOverride=maintenance
```

### 5) Verify

```bash
oc rollout status deploy/maintenance -n e3c3c4-prod --timeout=180s
oc get deploy,pod,svc -n e3c3c4-prod -l app.kubernetes.io/name=maintenance
oc logs deploy/maintenance -n e3c3c4-prod --tail=50
```

## Update Process (After Editing HTML/CSS)

When you change `maintenance/index.html` (or nginx config):

1. Rebuild image:

```bash
oc start-build hesp-maintenance \
  -n e3c3c4-prod \
  --from-dir=./maintenance \
  --follow --wait
```

2. Force rollout (important when reusing same tag `prod`):

```bash
oc rollout restart deploy/maintenance -n e3c3c4-prod
oc rollout status deploy/maintenance -n e3c3c4-prod --timeout=180s
```

3. Validate updated page:

```bash
oc port-forward -n e3c3c4-prod svc/maintenance 8081:8080
# open http://localhost:8081
```

## Switching Traffic (Maintenance Mode)

### Recommended: use toggle script

The script now auto-detects mode:

- **nginx proxy mode** (vanity domains): switches nginx upstream between `hesp-app:3000` and `maintenance:8080`
- **direct app route mode**: patches route target between `hesp-app` and `maintenance`

```bash
NAMESPACE=e3c3c4-prod ./scripts/toggle-maintenance.sh enable
NAMESPACE=e3c3c4-prod ./scripts/toggle-maintenance.sh status
NAMESPACE=e3c3c4-prod ./scripts/toggle-maintenance.sh disable
```

### Manual fallback (nginx proxy mode)

Use this for vanity domains (`bcenergysavingsprogram.ca`, `www.bcenergysavingsprogram.ca`) when traffic flows through `hesp-nginx-proxy`.

Enable maintenance:

```bash
oc get configmap hesp-nginx-config -n e3c3c4-prod -o yaml | \
  sed 's/server hesp-app:3000;/server maintenance:8080;/g' | \
  oc apply -f -

oc rollout restart deployment/hesp-nginx-proxy -n e3c3c4-prod
oc rollout status deployment/hesp-nginx-proxy -n e3c3c4-prod --timeout=180s
```

Disable maintenance:

```bash
oc get configmap hesp-nginx-config -n e3c3c4-prod -o yaml | \
  sed 's/server maintenance:8080;/server hesp-app:3000;/g' | \
  oc apply -f -

oc rollout restart deployment/hesp-nginx-proxy -n e3c3c4-prod
oc rollout status deployment/hesp-nginx-proxy -n e3c3c4-prod --timeout=180s
```

### Manual fallback (direct app route mode)

Enable maintenance:

```bash
oc patch route hesp-app -n e3c3c4-prod --type=merge \
  -p '{"spec":{"to":{"name":"maintenance"}}}'
```

Disable maintenance:

```bash
oc patch route hesp-app -n e3c3c4-prod --type=merge \
  -p '{"spec":{"to":{"name":"hesp-app"}}}'
```

## Smoke Test Checklist

- Maintenance deployment is healthy (`1/1` ready).
- `svc/maintenance` exists and has endpoints.
- In nginx mode: upstream in `hesp-nginx-config` points to expected backend.
- In route mode: `route/hesp-app` target is correct (`maintenance` or `hesp-app`).
- External URLs return expected page content.
  - Internal route: `https://hesp.apps.gold.devops.gov.bc.ca`
  - Vanity route(s): `https://bcenergysavingsprogram.ca` and `https://www.bcenergysavingsprogram.ca`

## Troubleshooting

### Changed HTML is not showing

Cause is usually same-tag image caching.

Fix:

```bash
oc start-build hesp-maintenance -n <namespace> --from-dir=/home/siegleda/workspace/bc-emli-application-sys/maintenance --follow --wait
oc rollout restart deploy/maintenance -n <namespace>
oc rollout status deploy/maintenance -n <namespace> --timeout=180s
```

### Route points to maintenance but old app still appears

1. Verify route target:

```bash
oc get route hesp-app -n <namespace> -o jsonpath='{.spec.to.name}{"\n"}'
```

2. Verify maintenance service endpoints:

```bash
oc get endpoints maintenance -n <namespace>
```

3. Test with curl/incognito to avoid browser cache.

### Vanity domain does not switch to maintenance page

1. Verify nginx upstream target:

```bash
oc get configmap hesp-nginx-config -n <namespace> -o yaml | grep -A2 'upstream hesp_app'
```

2. Verify nginx pods restarted after ConfigMap update:

```bash
oc rollout status deployment/hesp-nginx-proxy -n <namespace> --timeout=180s
```

3. Verify routes for vanity hosts point to nginx proxy service:

```bash
oc get route -n <namespace> | grep nginx
```

### Nginx permission errors on startup

The image is configured for OpenShift restricted SCC (random UID). If this regresses, inspect:

- `maintenance/Dockerfile`
- `maintenance/nginx-main.conf`

and confirm temp/pid paths use `/tmp` and writable group permissions.

## Security Notes

- Runs under OpenShift-assigned non-root UID.
- `allowPrivilegeEscalation=false`.
- Drops Linux capabilities.
- Serves static content only.

## Quick Commands (Gold Prod)

```bash
oc project e3c3c4-prod
oc start-build hesp-maintenance --from-dir=./maintenance --follow --wait
oc rollout restart deploy/maintenance -n e3c3c4-prod
oc rollout status deploy/maintenance -n e3c3c4-prod --timeout=180s
NAMESPACE=e3c3c4-prod ./scripts/toggle-maintenance.sh enable
NAMESPACE=e3c3c4-prod ./scripts/toggle-maintenance.sh status
```
