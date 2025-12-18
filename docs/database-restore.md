## Database Restore Procedure - Restoring from File System

This guide describes how to restore a PostgreSQL database using `pgBackRest`.

### Prerequisites

- PostgreSQL installed and configured.
- `pgBackRest` installed and configured with the correct stanza.
- Access to the backup repository.
- Appropriate permissions to run PostgreSQL and `pgBackRest` commands.
- The target database service should be stopped before restoring.

---

### Steps

1. **Stop the PostgreSQL Service**

   ```bash
   pg_ctl stop
   ```

   This ensures the database is not running during the restore process.

2. **Run pgBackRest Restore**

   ```bash
   pgbackrest --stanza=db restore --repo=1 --type=default --delta
   ```

   **Explanation of options:**

   - `--stanza=db`: The stanza name defined in your `pgBackRest` configuration.
   - `--repo=1`: Specifies the backup repository number.
   - `--type=default`: Restores the default backup type.
   - `--delta`: Restores only the changes since the last backup (faster when possible).

3. **Start the PostgreSQL Service**

   ```bash
   pg_ctl start
   ```

4. **Update the `postgres` User Password**

   Log into PostgreSQL:

   ```bash
   psql -U postgres -d hesp-crunchydb
   ```

   Then run:

   ```sql
   ALTER USER postgres WITH PASSWORD '<new_password>';
   ```

   Replace `<new_password>` with your desired secure password.

## Restore Cluster from Backup PVC

**Confirm pgBackRest sees backups (sanity check)**

oc exec -n bfc7dd-<env> $(oc get pods | grep crunchydb-repo-host ) -- pgbackrest info

This will output the _stanza_ and _one or more full/incr backups_

If Yes then continue

**Scale down the cluster**

oc scale -n bfc7dd-<env> postgrescluster hesp-crunchydb --replicas=0
(you may need to delete the pod depending on how the cluster reacts or where it's failing)

**Delete the pgdata PVC**

**NOTE**: this is not deleting the backups or the pgBackrest repo

oc get pvc -n bfc7dd-<env>

verify the name of that data pvc i.e. hesp-crunchydb-ha-abc1-pgdata

delete only that pvc

oc delete pvc -n bfc7dd-<env> <pvc_name>

**Edit the cluster to restore from pgBackrest**

oc edit postgrescluster hesp-crunchydb -n bfc7dd-<env>
**NOTE** opens in VI, I key to Insert mode, ESC to exit Insert mode, SHIFT+: to enter command mode, in command mode qw to (quit + write)

Add (or update if existing) dataSource.pgBackrest

spec:
dataSource:
pgbackrest:
stanza: db
repo:
name: repo1

Save and Exit VI (see note above)

**Let the cluster restore**

oc scale -n bfc7dd-<env> postgrescluster hesp-crunchydb --replicas=1

- The operator should create a new pgdata PVC
- initialize a new pgdata directory
- runs pgBackrest to restore
- pod may start as a secondary and promote to master
- postgres completes the startup

You can watch the restore with

oc logs -n bfc7dd-<env> -f $(oc get pods | grep hesp-crunchydb-ha | awk '{print $1}')

**Verify Using Application**

Login to the application.
