# Connect to OpenShift and Access Postgres

## 1. Get database credentials from secret

These values usually do not change often.

```sh
oc get secret hesp-crunchydb-pguser-postgres -o jsonpath="{.data.dbname}" | base64 -d
oc get secret hesp-crunchydb-pguser-postgres -o jsonpath="{.data.user}" | base64 -d
oc get secret hesp-crunchydb-pguser-postgres -o jsonpath="{.data.password}" | base64 -d
```

## 2. Port-forward to the database pod

In most cases, you can connect by port-forwarding.

Use a label selector for the primary database pod in HA setups where multiple pods may exist (primary/replica/failover). Selecting `postgres-operator.crunchydata.com/role=master` helps avoid connecting to a non-primary pod during scaling or failover events.

```sh
oc port-forward pod/$(oc get pods -l postgres-operator.crunchydata.com/role=master -o jsonpath='{.items[0].metadata.name}') 19432:5432
```

Namespace-safe variant:

```sh
oc port-forward pod/$(oc get pods -n bfc7dd-<env> -l postgres-operator.crunchydata.com/role=master -o jsonpath='{.items[0].metadata.name}') 19432:5432 -n bfc7dd-<env>
```

## 3. Troubleshoot connection errors

If you get a connection error:

1. Ensure your DB client/driver is using `sslmode=disable`.
2. If it still fails, check and update `pg_hba.conf` in the DB pod.

Connect to the pod:

```sh
oc rsh $(oc get pods -l postgres-operator.crunchydata.com/role=master -o jsonpath='{.items[0].metadata.name}')
```

Namespace-safe variant:

```sh
oc rsh -n bfc7dd-<env> $(oc get pods -n bfc7dd-<env> -l postgres-operator.crunchydata.com/role=master -o jsonpath='{.items[0].metadata.name}')
```

Inside the DB pod:

```sh
cat $PGDATA/pg_hba.conf
```

Look for:

- `host all all ::1/128 md5`

If missing, add:

```sh
echo "host all all ::1/128 md5" >> $PGDATA/pg_hba.conf
```

Then reload PostgreSQL:

```sh
pg_ctl reload -D $PGDATA
```

Try your connection again.
