# Manual Build, Tag, Push & Deploy Guide

This guide replicates what the GitHub Actions workflows do automatically, allowing you to build and deploy from the command line.

---

## Prerequisites

- `docker` (or `podman`) installed and authenticated
- `helm` v3 installed
- `kubectl` / `oc` (OpenShift CLI) authenticated to the target cluster
- Write access to `ghcr.io/bcgov/hesp-app`
- `make` available (used by the Helm `Makefile`)

---

## Environment Variables

Set these once at the top of your shell session. Adjust as needed.

```bash
# Your GitHub username (must have write access to ghcr.io/bcgov/hesp-app)
export GITHUB_USER=<your-github-username>
export GITHUB_TOKEN=<your-ghcr-pat>          # Classic PAT with write:packages scope

# The image tag to use. For dev use the short git SHA; for test/prod use a semver tag.
export IMAGE_TAG=$(git rev-parse --short=8 HEAD)        # dev  -- full SHA $(git rev-parse HEAD)
# export IMAGE_TAG=1.2.3                      # test/prod -- semver (no "v" prefix)

# Target OpenShift namespace (matches the values file suffix)
# Examples:
#   bfc7dd-dev   -> values-bfc7dd-dev.yaml
#   bfc7dd-test  -> values-bfc7dd-test.yaml
#   bfc7dd-prod  -> values-bfc7dd-prod.yaml
export NAMESPACE=bfc7dd-dev

# Optional build-time VITE args
export DEPLOYMENT_TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
export VITE_ENABLE_TEMPLATE_FORCE_PUBLISH=true
```

---

## Step 1 — Authenticate to GHCR

```bash
echo "${GITHUB_TOKEN}" | podman login ghcr.io -u "${GITHUB_USER}" --password-stdin
```

---

## Step 2 — Build the Application Image

Run from the **repository root** (same directory as `Gemfile`, `package.json`, etc.).

```bash
cd /path/to/bc-emli-application-sys

podman build \
  -f devops/docker/app/Dockerfile \
  --build-arg DEPLOYMENT_TIMESTAMP="${DEPLOYMENT_TIMESTAMP}" \
  --build-arg VITE_ENABLE_TEMPLATE_FORCE_PUBLISH="${VITE_ENABLE_TEMPLATE_FORCE_PUBLISH}" \
  -t hesp-app-local \
  .
```

> **Optional VITE build args** (pass any that differ from defaults):
>
> ```
> --build-arg VITE_BCEID_URL=...
> --build-arg VITE_BUSINESS_BCEID_REGISTRATION_URL=...
> --build-arg VITE_BASIC_BCEID_REGISTRATION_URL=...
> --build-arg VITE_SITEMINDER_LOGOUT_URL=...
> --build-arg VITE_KEYCLOAK_LOGOUT_URL=...
> --build-arg VITE_POST_LOGOUT_REDIRECT_URL=...
> --build-arg VITE_SUBMIT_INVOICE_ENABLED=...
> ```

---

## Step 3 — Tag the Image

### For dev (SHA-based tag, mirrors `deploy-dev.yml`)

```bash
# Full SHA tag (used by helm upgrade)
podman tag hesp-app-local ghcr.io/bcgov/hesp-app:${IMAGE_TAG}

# Branch tag (optional convenience)
podman tag hesp-app-local ghcr.io/bcgov/hesp-app:main
```

### For test/prod (semver tag, mirrors `deploy-test.yml` / `deploy-prod.yml`)

```bash
# Semver tag (strip the leading "v" — the Makefile expects bare numbers)
export IMAGE_TAG=1.2.3

podman tag hesp-app-local ghcr.io/bcgov/hesp-app:${IMAGE_TAG}
podman tag hesp-app-local ghcr.io/bcgov/hesp-app:1.2          # major.minor
podman tag hesp-app-local ghcr.io/bcgov/hesp-app:1            # major
```

---

## Step 4 — Push the Image to GHCR

```bash
podman push ghcr.io/bcgov/hesp-app:${IMAGE_TAG}

# Push the additional convenience tags if you created them
podman push ghcr.io/bcgov/hesp-app:main          # dev only
# podman push ghcr.io/bcgov/hesp-app:1.2         # test/prod
# podman push ghcr.io/bcgov/hesp-app:1           # test/prod
```

---

## Step 5 — Update Helm Chart Dependencies

The `main` chart has local sub-chart dependencies (`_app`, `_sidekiq`, `_anycable-rpc`, `_clamav`) plus upstream charts. Run this once, or any time `Chart.yaml` / `Chart.lock` changes.

```bash
cd helm/main

helm dependency update
```

---

## Step 6 — Deploy to OpenShift with Helm

The `Makefile` wraps the `helm upgrade --install` command and sets the image tag on `app`, `sidekiq`, and `anycable-rpc` sub-charts simultaneously.

```bash
# Still inside helm/main
make upgrade NAMESPACE=${NAMESPACE} IMAGE_TAG=${IMAGE_TAG}
```

This expands to:

```bash
helm upgrade --install hesp . \
  -n "${NAMESPACE}" \
  -f values.yaml \
  -f "values-${NAMESPACE}.yaml" \
  --set app.image.tag="${IMAGE_TAG}" \
  --set sidekiq.image.tag="${IMAGE_TAG}" \
  --set anycable-rpc.image.tag="${IMAGE_TAG}"
```

---

## Step 7 — Verify the Rollout

```bash
kubectl rollout status deployment/hesp-app -n ${NAMESPACE}
```

Watch all pods come healthy:

```bash
kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/name=hesp-app -w
```

---

## Quick Reference — Target Environments

| Environment  | Namespace     | Values file               | Image tag format        |
| ------------ | ------------- | ------------------------- | ----------------------- |
| dev          | `bfc7dd-dev`  | `values-bfc7dd-dev.yaml`  | full git SHA            |
| test         | `bfc7dd-test` | `values-bfc7dd-test.yaml` | semver `1.2.3` (no `v`) |
| prod         | `bfc7dd-prod` | `values-bfc7dd-prod.yaml` | semver `1.2.3` (no `v`) |
| dev (e3c3c4) | `e3c3c4-dev`  | `values-e3c3c4-dev.yaml`  | full git SHA            |
| test(e3c3c4) | `e3c3c4-test` | `values-e3c3c4-test.yaml` | semver `1.2.3` (no `v`) |
| prod(e3c3c4) | `e3c3c4-prod` | `values-e3c3c4-prod.yaml` | semver `1.2.3` (no `v`) |

---

## All-in-One Dev Example

Copy-paste the full sequence for a dev deployment from scratch:

```bash
# --- config ---
export GITHUB_USER=<your-github-username>
export GITHUB_TOKEN=<your-ghcr-pat>
export NAMESPACE=bfc7dd-dev
export IMAGE_TAG=$(git rev-parse HEAD)
export DEPLOYMENT_TIMESTAMP=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# 1. login
echo "${GITHUB_TOKEN}" | podman login ghcr.io -u "${GITHUB_USER}" --password-stdin

# 2. build
podman build \
  -f devops/docker/app/Dockerfile \
  --build-arg DEPLOYMENT_TIMESTAMP="${DEPLOYMENT_TIMESTAMP}" \
  --build-arg VITE_ENABLE_TEMPLATE_FORCE_PUBLISH=true \
  -t hesp-app-local .

# 3. tag
podman tag hesp-app-local ghcr.io/bcgov/hesp-app:${IMAGE_TAG}
podman tag hesp-app-local ghcr.io/bcgov/hesp-app:main

# 4. push
podman push ghcr.io/bcgov/hesp-app:${IMAGE_TAG}
podman push ghcr.io/bcgov/hesp-app:main

# 5. helm deps
cd helm/main && helm dependency update

# 6. deploy
make upgrade NAMESPACE=${NAMESPACE} IMAGE_TAG=${IMAGE_TAG}

# 7. verify
kubectl rollout status deployment/hesp-app -n ${NAMESPACE}
```

---

## Helm-Only Notes

If the image is already in GHCR and you only need to re-deploy (e.g. config change):

```bash
cd helm/main
make upgrade NAMESPACE=${NAMESPACE} IMAGE_TAG=${IMAGE_TAG}
```

To do a dry-run first:

```bash
make lint NAMESPACE=${NAMESPACE} IMAGE_TAG=${IMAGE_TAG}
```

To render templates locally without deploying:

```bash
make template NAMESPACE=${NAMESPACE} IMAGE_TAG=${IMAGE_TAG}
# output written to template.yaml
```
