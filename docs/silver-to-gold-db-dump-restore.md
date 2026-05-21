# SILVER to GOLD Database Dump and Restore

This runbook copies a PostgreSQL database from the SILVER cluster to the GOLD cluster using `oc`, `pg_dump`, and `pg_restore`.

## Warning

- This process will overwrite the target database in GOLD.
- Run only during an approved maintenance window.
- Confirm you are logged into the correct cluster/project before each step.

## Prerequisites

- `oc` CLI installed and authenticated.
- Access to both SILVER and GOLD OpenShift namespaces.
- Access to PostgreSQL as user `postgres` in the database pods.

## Variables

Set these in your shell first:

```bash
export SILVER_NS="your-silver-namespace"
export GOLD_NS="your-gold-namespace"
export DB_NAME="hesp-crunchydb"
export DUMP_FILE="./db.dump"
```

Find source and target master pods:

```bash
export OLD_DBPOD=$(oc get pods -n "$SILVER_NS" -l postgres-operator.crunchydata.com/role=master -o jsonpath='{.items[0].metadata.name}')
export NEW_DBPOD=$(oc get pods -n "$GOLD_NS" -l postgres-operator.crunchydata.com/role=master -o jsonpath='{.items[0].metadata.name}')

echo "OLD_DBPOD=$OLD_DBPOD"
echo "NEW_DBPOD=$NEW_DBPOD"
```

## 1) Verify source counts in SILVER

```bash
oc rsh -n "$SILVER_NS" "$OLD_DBPOD"
psql -U postgres -d "$DB_NAME"
SELECT count(*) FROM users;
SELECT count(*) FROM permit_applications;
\q
exit
```

## 2) Dump database in SILVER and copy locally

Preferred: stream dump directly to your local machine (avoids writing large files in pod `/tmp`):

```bash
oc exec -n "$SILVER_NS" "$OLD_DBPOD" -- \
	env PGTZ=UTC PGOPTIONS='-c statement_timeout=0' \
	pg_dump -U postgres -d "$DB_NAME" -Fc -Z 0 --no-owner --no-privileges \
	> "$DUMP_FILE"

ls -lh "$DUMP_FILE"
```

Alternative: create dump file inside the SILVER DB pod (use only if streaming is not possible):

```bash
oc rsh -n "$SILVER_NS" "$OLD_DBPOD"
pg_dump -U postgres -d "$DB_NAME" -Fc -Z 0 --no-owner --no-privileges -f /tmp/db.dump
ls -lh /tmp/db.dump
exit
```

If you used the in-pod dump method above, copy dump from pod to your local machine:

```bash
oc cp -n "$SILVER_NS" "$OLD_DBPOD":/tmp/db.dump "$DUMP_FILE"
ls -lh "$DUMP_FILE"
```

## 3) Copy dump into GOLD pod

```bash
oc cp -n "$GOLD_NS" "$DUMP_FILE" "$NEW_DBPOD":/tmp/db.dump
```

## 4) Recreate target database in GOLD

```bash
oc rsh -n "$GOLD_NS" "$NEW_DBPOD"
psql -U postgres -d postgres
```

Run in `psql`:

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'hesp-crunchydb';

DROP DATABASE IF EXISTS "hesp-crunchydb";
CREATE DATABASE "hesp-crunchydb";
```

Then quit `psql`:

```sql
\q
```

## 5) Restore into GOLD

Still inside the GOLD pod shell:

```bash
pg_restore -U postgres -d "$DB_NAME" -j 4 /tmp/db.dump
```

## 6) Validate target counts in GOLD

```bash
psql -U postgres -d "$DB_NAME"
SELECT count(*) FROM users;
SELECT count(*) FROM permit_applications;
\q
exit
```

## Optional cleanup

Remove local and pod dump files after validation:

```bash
rm -f "$DUMP_FILE"
```

Inside each pod shell (when needed):

```bash
rm -f /tmp/db.dump
```

## Quick checklist

- Confirm pod names and namespaces before running commands.
- Compare row counts between SILVER and GOLD for key tables.
- Run app smoke checks after restore.

## Troubleshooting: pg_dump kills the DB pod

If you see errors like:

- `PQgetCopyData() failed`
- `server closed the connection unexpectedly`
- `error executing command in container: signal: killed`

the pod was likely OOM-killed or evicted during the dump.

Check restart/kill reason:

```bash
oc get pod -n "$SILVER_NS" "$OLD_DBPOD" -o jsonpath='{.status.containerStatuses[*].restartCount}{"\n"}'
oc describe pod -n "$SILVER_NS" "$OLD_DBPOD" | sed -n '/Last State:/,/Ready:/p'
oc logs -n "$SILVER_NS" "$OLD_DBPOD" --previous | tail -n 200
```

Mitigations:

- Use the streaming method above instead of writing to pod `/tmp`.
- Run during low-traffic window.
- Prefer dumping from a replica if available.
- Temporarily increase PostgreSQL pod memory request/limit before dump.
- If one table (for example `public.audit_logs`) is too large, take an app-consistent dump excluding that table data first:

```bash
oc exec -n "$SILVER_NS" "$OLD_DBPOD" -- \
	env PGTZ=UTC PGOPTIONS='-c statement_timeout=0' \
	pg_dump -U postgres -d "$DB_NAME" -Fc -Z 0 --no-owner --no-privileges \
	--exclude-table-data=public.audit_logs \
	> "$DUMP_FILE"
```
