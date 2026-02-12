# Maintenance Page

A lightweight nginx-based maintenance page for the BC Home Energy platform.

## Quick Start

### Build Image

```bash
docker build -t <your-registry>/maintenance-page:latest .
docker push <your-registry>/maintenance-page:latest
```

### Deploy with Helm

```bash
cd ../helm/_maintenance
helm install maintenance . \
  --set image.repository=<your-registry>/maintenance-page \
  --set image.tag=latest \
  --namespace <your-namespace>
```

## Files

- **Dockerfile**: Alpine-based nginx container (~5MB)
- **nginx.conf**: Web server configuration with health check endpoint
- **index.html**: Responsive maintenance page

## Features

- ✅ Lightweight (50m CPU, 32Mi RAM)
- ✅ Health check at `/health`
- ✅ Responsive design
- ✅ Runs as non-root user
- ✅ Read-only filesystem

## Testing Locally

```bash
# Build and run locally
docker build -t maintenance-page .
docker run -p 8080:8080 maintenance-page

# Visit http://localhost:8080
```

## Documentation

See [../docs/maintenance-page-pod.md](../docs/maintenance-page-pod.md) for complete deployment and operational procedures.
