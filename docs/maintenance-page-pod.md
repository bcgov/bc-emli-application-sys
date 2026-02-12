# Maintenance Page Pod

## Overview

This maintenance page pod provides a user-friendly message during system outages or planned maintenance. Instead of users seeing DNS errors or browser timeouts, they will see a clear message explaining that the system is temporarily unavailable.

## Architecture

The maintenance pod consists of:

- **Lightweight nginx-alpine container** (~5MB image)
- **Static HTML page** with responsive design
- **Health check endpoint** for Kubernetes liveness/readiness probes
- **Minimal resource requirements** (50m CPU, 32Mi memory)

## Files Structure

```
maintenance/
├── Dockerfile          # Container image definition
├── nginx.conf          # Nginx server configuration
└── index.html          # Maintenance page HTML

helm/_maintenance/
├── Chart.yaml          # Helm chart metadata
├── values.yaml         # Default configuration values
├── .helmignore         # Files to ignore in Helm package
└── templates/
    ├── _helpers.tpl    # Template helpers
    ├── deployment.yaml # Kubernetes deployment
    ├── service.yaml    # Kubernetes service
    └── route.yaml      # OpenShift route (optional)
```

## Deployment

### Prerequisites

1. Docker/Podman for building the container image
2. Access to your container registry
3. Helm 3.x installed
4. kubectl/oc CLI configured for your cluster

### Step 1: Build and Push Container Image

```bash
# Navigate to maintenance directory
cd /home/siegleda/workspace/bc-emli-application-sys/maintenance

# Build the image
docker build -t <your-registry>/maintenance-page:latest .

# Push to registry
docker push <your-registry>/maintenance-page:latest
```

### Step 2: Deploy Using Helm

```bash
# Navigate to helm directory
cd /home/siegleda/workspace/bc-emli-application-sys/helm/_maintenance

# Install the maintenance pod (keep route disabled)
helm install maintenance . \
  --set image.repository=<your-registry>/maintenance-page \
  --set image.tag=latest \
  --set route.enabled=false \
  --namespace <your-namespace>
```

The maintenance pod will now be running in your cluster but not receiving any traffic.

### Step 3: Verify Deployment

```bash
# Check pod status
kubectl get pods -l app.kubernetes.io/name=maintenance

# Check service
kubectl get svc -l app.kubernetes.io/name=maintenance

# Test the maintenance page (port-forward)
kubectl port-forward svc/maintenance 8080:8080
# Visit http://localhost:8080 in your browser
```

## Switching to Maintenance Mode

When you need to show the maintenance page to users, you have several options:

### Option 1: Patch Existing Route (Recommended)

This temporarily redirects the main application route to the maintenance service:

```bash
# Get your main app route name
oc get routes

# Patch the route to point to maintenance service
oc patch route <main-app-route-name> \
  --type=merge \
  -p '{"spec":{"to":{"name":"maintenance"}}}'
```

**To restore normal service:**

```bash
# Patch the route back to main app service
oc patch route <main-app-route-name> \
  --type=merge \
  -p '{"spec":{"to":{"name":"<original-service-name>"}}}'
```

### Option 2: Enable Maintenance Route

This creates a separate route for the maintenance page. You can then update DNS or use this for testing:

```bash
# Update maintenance deployment to enable route
helm upgrade maintenance . \
  --set image.repository=<your-registry>/maintenance-page \
  --set image.tag=latest \
  --set route.enabled=true \
  --set route.host=<your-domain> \
  --namespace <your-namespace>

# Verify route was created
oc get route maintenance
```

Then temporarily disable the main app route:

```bash
# Scale down main app (if needed)
oc scale deployment/<main-app-deployment> --replicas=0

# Or delete main route temporarily
oc delete route <main-app-route-name>
```

### Option 3: Using Weighted Routes (Blue-Green)

For more controlled switches, use OpenShift's route weight feature:

```bash
# Create both routes pointing to the same hostname
oc patch route <main-app-route> \
  --type=merge \
  -p '{"spec":{"to":{"weight":0},"alternateBackends":[{"kind":"Service","name":"maintenance","weight":100}]}}'
```

**To restore:**

```bash
oc patch route <main-app-route> \
  --type=merge \
  -p '{"spec":{"to":{"weight":100},"alternateBackends":[]}}'
```

## Integration with CI/CD

### Jenkins Pipeline Example

Add a stage to your Jenkinsfile to build and deploy the maintenance pod:

```groovy
stage('Build Maintenance Page') {
    steps {
        dir('maintenance') {
            sh '''
                docker build -t ${REGISTRY}/maintenance-page:${BUILD_TAG} .
                docker push ${REGISTRY}/maintenance-page:${BUILD_TAG}
            '''
        }
    }
}

stage('Deploy Maintenance Pod') {
    steps {
        sh '''
            helm upgrade --install maintenance helm/_maintenance \
              --set image.repository=${REGISTRY}/maintenance-page \
              --set image.tag=${BUILD_TAG} \
              --namespace ${NAMESPACE}
        '''
    }
}
```

## Incident Response Procedures

### During a Planned Maintenance Window

1. **Communicate**: Notify users via email/status page
2. **Enable Maintenance Mode**: Use Option 1 (patch route)
3. **Perform Maintenance**: Complete your work
4. **Verify System**: Test that everything works
5. **Restore Service**: Patch route back to main app
6. **Monitor**: Watch logs and metrics

### During an Unplanned Outage

1. **Assess Situation**: Determine if maintenance page should be shown
2. **Quick Switch**: Use the fastest method (Option 1)
   ```bash
   oc patch route <route-name> --type=merge \
     -p '{"spec":{"to":{"name":"maintenance"}}}'
   ```
3. **Communicate**: Update status page, notify stakeholders
4. **Resolve Issue**: Fix the underlying problem
5. **Restore**: Switch traffic back when ready

### Runbook Checklist

- [ ] Maintenance pod is deployed and healthy
- [ ] Service name confirmed: `maintenance`
- [ ] Main app route name documented: `_____________`
- [ ] Main app service name documented: `_____________`
- [ ] Tested maintenance page is accessible
- [ ] Restoration command tested in non-prod
- [ ] Communication plan in place
- [ ] Rollback procedure documented

## Customization

### Update Maintenance Message

1. Edit [maintenance/index.html](../maintenance/index.html)
2. Rebuild and push image
3. Update deployment:
   ```bash
   helm upgrade maintenance helm/_maintenance \
     --set image.tag=<new-tag>
   ```

### Add Estimated Restoration Time

Modify the `index.html` to include dynamic content:

```html
<p>Expected restoration: <strong id="eta">2:00 PM PST</strong></p>
```

### Styling/Branding

The HTML page uses inline CSS for simplicity. You can:

- Modify colors in the `<style>` section
- Add your organization's logo
- Update fonts and layout

## Monitoring

The maintenance pod includes a `/health` endpoint:

```bash
# Check health
curl http://<maintenance-service>:8080/health
# Response: healthy
```

Kubernetes will automatically restart the pod if health checks fail.

## Resource Usage

The maintenance pod is intentionally lightweight:

| Resource | Request | Limit |
| -------- | ------- | ----- |
| CPU      | 50m     | 100m  |
| Memory   | 32Mi    | 64Mi  |

This ensures it can run even during resource constraints.

## Troubleshooting

### Pod Not Starting

```bash
# Check pod events
kubectl describe pod -l app.kubernetes.io/name=maintenance

# Check logs
kubectl logs -l app.kubernetes.io/name=maintenance
```

### Route Not Switching

```bash
# Verify route configuration
oc describe route <route-name>

# Check which service is currently targeted
oc get route <route-name> -o jsonpath='{.spec.to.name}'
```

### Page Not Loading

```bash
# Test from within cluster
kubectl run -it --rm debug --image=alpine --restart=Never -- sh
apk add curl
curl http://maintenance:8080
```

## Security Considerations

- Runs as non-root user (UID 101)
- Read-only root filesystem
- No privileged escalation
- Drops all capabilities
- Minimal attack surface (static content only)

## Acceptance Criteria Verification

- ✅ **AC1**: Lightweight pod created with nginx-alpine (~5MB)
- ✅ **AC2**: Clear maintenance message with user-friendly content
- ✅ **AC3**: Documented routing mechanisms (route patching, weighted routes, DNS)
- ✅ **AC4**: Helm chart integrates with existing CI/CD patterns
- ✅ **AC5**: Complete operational documentation and runbooks provided

## Support

For questions or issues, contact the platform team or refer to:

- [OpenShift Routes Documentation](https://docs.openshift.com/container-platform/latest/networking/routes/route-configuration.html)
- [Helm Documentation](https://helm.sh/docs/)
