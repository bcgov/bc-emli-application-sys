## Database Restore Procedure

This guide describes how to restore a PostgreSQL database using `pgBackRest`.

### Prerequisites

-   PostgreSQL installed and configured.
-   `pgBackRest` installed and configured with the correct stanza.
-   Access to the backup repository.
-   Appropriate permissions to run PostgreSQL and `pgBackRest` commands.
-   The target database service should be stopped before restoring.

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
