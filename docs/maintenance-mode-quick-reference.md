# Maintenance Mode - Quick Reference

## Prerequisites Check

```bash
# Verify maintenance pod is running
kubectl get pods -l app.kubernetes.io/name=maintenance
# Should show: STATUS = Running

# Get your route names
oc get routes | grep -E "(hesp|main)"
```

## 🚨 ENABLE MAINTENANCE MODE (3 commands)

```bash
# 1. Get main app route name
MAIN_ROUTE=$(oc get routes -o name | grep hesp-app | head -n1 | cut -d'/' -f2)

# 2. Switch traffic to maintenance page
oc patch route $MAIN_ROUTE --type=merge \
  -p '{"spec":{"to":{"name":"maintenance"}}}'

# 3. Verify switch
oc get route $MAIN_ROUTE -o jsonpath='{.spec.to.name}'
# Should show: maintenance
```

## ✅ RESTORE NORMAL SERVICE (3 commands)

```bash
# 1. Get main app route name
MAIN_ROUTE=$(oc get routes -o name | grep hesp-app | head -n1 | cut -d'/' -f2)

# 2. Switch traffic back to main app
oc patch route $MAIN_ROUTE --type=merge \
  -p '{"spec":{"to":{"name":"hesp-app"}}}'

# 3. Verify restoration
oc get route $MAIN_ROUTE -o jsonpath='{.spec.to.name}'
# Should show: hesp-app
```

## Verification

```bash
# Test maintenance page is accessible
curl -I https://<your-domain> | grep "HTTP/2 200"

# Check which service is currently active
oc describe route $MAIN_ROUTE | grep "To:"
```

## Rollback (if issues occur)

```bash
# Immediate rollback to main app
oc patch route hesp-app --type=merge \
  -p '{"spec":{"to":{"name":"hesp-app"}}}'
```

---

**Emergency Contact**: [Your team's contact info]  
**Full Documentation**: [docs/maintenance-page-pod.md](maintenance-page-pod.md)
