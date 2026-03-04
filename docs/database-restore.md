# Database Restore Procedure

This guide describes how to copy and validate `pgBackRest` backups locally, and how to restore PostgreSQL from backup.

## Prerequisites

- PostgreSQL installed and configured.
- `pgBackRest` installed and configured with the correct stanza.
- Access to the backup repository.
- Appropriate permissions to run PostgreSQL and `pgBackRest` commands.
- The target database service should be stopped before restoring.

## Install pgBackRest on Ubuntu/Debian

```bash
sudo apt update
sudo apt install pgbackrest
```

## Copy Backup Repo to Local and Verify

Use this process to copy the backup repository from OpenShift to your local machine and inspect backups.

1. **Create a local destination directory**

   `pgbackrest` requires an absolute repository path.

   ```bash
   mkdir -p $PWD/pgbackrest/repo1
   ```

2. **Copy repo files from OpenShift repo host pod**

   ```bash
   oc cp -n bfc7dd-<env> hesp-crunchydb-repo-host-0:/pgbackrest/repo1 $PWD/pgbackrest/repo1 -c pgbackrest
   ```

   Example for DEV:

   ```bash
   oc cp -n bfc7dd-dev hesp-crunchydb-repo-host-0:/pgbackrest/repo1 $PWD/pgbackrest/repo1 -c pgbackrest
   ```

3. **Inspect backups locally using `info`**

   ```bash
   pgbackrest --stanza=db --repo1-path=$PWD/pgbackrest/repo1 info
   ```

   If you receive `missing stanza path`, check whether the copy created an extra `repo1` level and point to that path instead:

   ```bash
   pgbackrest --stanza=db --repo1-path=$PWD/pgbackrest/repo1/repo1 info
   ```

## Restore PostgreSQL from File System Backup

1. **Stop the PostgreSQL service**

   ```bash
   pg_ctl stop
   ```

2. **Run `pgBackRest` restore**

   ```bash
   pgbackrest --stanza=db restore --repo=1 --type=default --delta
   ```

   Option summary:

   - `--stanza=db`: Stanza name defined in your `pgBackRest` configuration.
   - `--repo=1`: Backup repository number.
   - `--type=default`: Default restore type.
   - `--delta`: Restore only changed files when possible.

3. **Start the PostgreSQL service**

   ```bash
   pg_ctl start
   ```

4. **Update the `postgres` user password**

   ```bash
   psql -U postgres -d hesp-crunchydb
   ```

   ```sql
   ALTER USER postgres WITH PASSWORD '<new_password>';
   ```

## Restore Cluster from Backup PVC

1. **Confirm `pgBackRest` sees backups (sanity check)**

   ```bash
   oc exec -n bfc7dd-<env> $(oc get pods -n bfc7dd-<env> | grep crunchydb-repo-host | awk '{print $1}') -- pgbackrest info
   ```

   This should output the stanza and one or more full/incremental backups.

2. **Shut down the cluster (operator-native)**

   ```bash
   oc patch -n bfc7dd-<env> postgrescluster hesp-crunchydb \
     -p '{"spec":{"shutdown":true}}' --type=merge
   ```

   Wait for PostgreSQL pods to terminate before continuing.

3. **Delete the pgdata PVC**

   Note: this does **not** delete the backup repo PVC.

   ```bash
   oc get pvc -n bfc7dd-<env>
   oc delete pvc -n bfc7dd-<env> <pgdata_pvc_name>
   ```

4. **Edit the cluster to restore from `pgBackRest`**

   ```bash
   oc edit postgrescluster hesp-crunchydb -n bfc7dd-<env>
   ```

   Add or update:

   ```yaml
   spec:
     dataSource:
       pgbackrest:
         stanza: db
         repo:
           name: repo1
   ```

5. **Start the cluster to trigger restore**

   ```bash
   oc patch -n bfc7dd-<env> postgrescluster hesp-crunchydb \
     -p '{"spec":{"shutdown":false}}' --type=merge
   ```

   Expected behavior:

   - Operator creates a new pgdata PVC.
   - New pgdata directory is initialized.
   - `pgBackRest` restore runs.
   - Pod may start as replica and then promote.
   - PostgreSQL completes startup.

6. **Watch restore logs**

   ```bash
   oc logs -n bfc7dd-<env> -f $(oc get pods -n bfc7dd-<env> | grep hesp-crunchydb-ha | awk '{print $1}')
   ```

7. **Verify in application**

   Log in to the application and validate expected data/state.
