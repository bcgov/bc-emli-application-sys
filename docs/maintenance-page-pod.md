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

## Prerequisites

- `oc` CLI authenticated to the target cluster.
- `helm` 3.x installed.
- Access to target project/namespace (`bfc7dd-dev`, `bfc7dd-test`, `bfc7dd-prod`).

## Build and Deploy (First Time Per Namespace)

### 1) Select project

```bash
oc login https://api.silver.devops.gov.bc.ca:6443
oc project <namespace>
```

### 2) Create build config once

```bash
oc new-build --name=hesp-maintenance --binary --strategy=docker --to=hesp-maintenance:<tag>
```

Use `dev`/`test`/`prod` as `<tag>` based on namespace.

### 3) Build image from local maintenance folder

```bash
oc start-build hesp-maintenance \
  --from-dir=./bc-emli-application-sys/maintenance \
  --follow --wait
```

### 4) Deploy maintenance chart

```bash
cd ./bc-emli-application-sys/helm/_maintenance

helm upgrade --install hesp-maintenance . \
  --namespace <namespace> \
  --set image.repository=image-registry.openshift-image-registry.svc:5000/<namespace>/hesp-maintenance \
  --set image.tag=<tag> \
  --set image.pullPolicy=Always \
  --set replicaCount=1 \
  --set route.enabled=false \
  --set fullnameOverride=maintenance
```

> `fullnameOverride=maintenance` ensures the service name is always `maintenance` for route switching.

### 5) Verify

```bash
oc rollout status deploy/maintenance -n <namespace> --timeout=180s
oc get deploy,pod,svc -n <namespace> -l app.kubernetes.io/name=maintenance
oc logs deploy/maintenance -n <namespace> --tail=50
```

## Update Process (After Editing HTML/CSS)

When you change `maintenance/index.html` (or nginx config):

1. Rebuild image:

```bash
oc start-build hesp-maintenance \
  -n <namespace> \
  --from-dir=./bc-emli-application-sys/maintenance \
  --follow --wait
```

2. Force rollout (important when reusing same tag like `dev` or `prod`):

```bash
oc rollout restart deploy/maintenance -n <namespace>
oc rollout status deploy/maintenance -n <namespace> --timeout=180s
```

3. Validate updated page:

```bash
oc port-forward -n <namespace> svc/maintenance 8081:8080
# open http://localhost:8081
```

## Switching Routes (Maintenance Mode)

### Enable maintenance mode (redirect traffic)

```bash
oc patch route hesp-app -n <namespace> --type=merge \
  -p '{"spec":{"to":{"name":"maintenance"}}}'
```

### Confirm route target

```bash
oc get route hesp-app -n <namespace> -o jsonpath='{.spec.to.name}{"\n"}'
```

Expected output: `maintenance`

### Disable maintenance mode (restore app)

```bash
oc patch route hesp-app -n <namespace> --type=merge \
  -p '{"spec":{"to":{"name":"hesp-app"}}}'
```

## Smoke Test Checklist

- Maintenance deployment is healthy (`1/1` ready).
- `svc/maintenance` exists and has endpoints.
- `route/hesp-app` target is correct (`maintenance` or `hesp-app`).
- External URL returns expected page content.

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

## Quick Commands (Prod Example)

```bash
oc project bfc7dd-prod
oc start-build hesp-maintenance --from-dir=/home/siegleda/workspace/bc-emli-application-sys/maintenance --follow --wait
oc rollout restart deploy/maintenance -n bfc7dd-prod
oc rollout status deploy/maintenance -n bfc7dd-prod --timeout=180s
oc patch route hesp-app -n bfc7dd-prod --type=merge -p '{"spec":{"to":{"name":"maintenance"}}}'
```
