# GOLD vs SILVER Production Environment — Plain Language Summary

**Document purpose:** Help non-technical stakeholders understand what changed when the BC Energy Savings Program (HESP) moved from the SILVER production environment to the GOLD production environment.

**Date:** April 2026

---

## What Are These Environments?

The application runs on the BC Government's OpenShift cloud platform. There are two "tiers" of that platform:

- **SILVER** — a standard hosting environment suitable for most government applications.
- **GOLD** — a higher-availability hosting environment designed for applications that cannot afford extended downtime.

Both environments run the same application. The difference is in how resilient, redundant, and recoverable each one is.

---

## The Bottom Line

> GOLD is significantly more reliable than SILVER. It is designed to keep the application running through hardware failures, software deployments, and infrastructure maintenance with minimal or no interruption to users.

---

## Key Improvements in GOLD

### 1. The Application Stays Up During Maintenance

**SILVER:** If one of the servers hosting the application needs maintenance or fails, the application goes down until it is restarted.

**GOLD:** Multiple copies of the application run simultaneously across different physical servers. If one server fails or is taken offline for maintenance, the others continue serving users without interruption. The platform is also configured to ensure at least one copy of the application is always running — it will refuse requests to shut everything down at once.

---

### 2. The Application Recovers Automatically from Problems

**SILVER:** If the application crashes or becomes unresponsive, there is no automatic detection. The platform will continue sending users to the broken application until someone notices and restarts it manually.

**GOLD:** Automated health checks run continuously. If the application stops responding, the platform detects it within seconds and automatically restarts that copy. Users are only sent to copies that have passed their health check. This means most crashes are self-healing and invisible to users.

---

### 3. Background Processing Is More Reliable

The application processes tasks in the background — things like sending emails, processing invoices, and preparing documents. These run separately from the web application itself.

**SILVER:** One background processor runs. If it crashes, background tasks stop until it is restarted manually.

**GOLD:** Two background processors run on different servers. If one fails, the other continues processing. The platform also checks whether the processor is still connected to its required services and restarts it automatically if it loses connection.

---

### 4. The Database Is Protected Against Hardware Failure

The database is where all application data — applications, users, documents, invoices — is permanently stored. It is the most critical component.

**SILVER:** One database server. If that server fails, the application cannot read or write any data until the server is restored. Data recovery would depend on the most recent backup.

**GOLD:** Three database servers run together as a cluster. One acts as the primary (accepts all reads and writes), and two others stay continuously synchronized as replicas. If the primary server fails, the cluster automatically promotes one of the replicas to become the new primary within seconds — with no data loss and no manual intervention required.

---

### 5. Database Backups Are More Frequent and Stored Off-Site

**SILVER:** Backups are taken once per day and kept for 1 day. If a problem is discovered after the daily backup runs, up to 24 hours of data could be at risk.

**GOLD:**

- Full backups run **twice per day** (midnight and noon).
- Incremental backups (capturing only what changed) run **every hour** in between.
- In the worst case, at most one hour of data could be lost.
- Backups are stored in **two places**: on the cluster's own storage AND in a separate Amazon S3 cloud storage bucket in a different physical location. This means a total loss of the cluster would not mean a total loss of data.
- Backups are retained for **4 days** instead of 1.

---

### 6. The Cache and Search Services Are Also Redundant

The application uses supporting services to speed up responses (cache) and power the search functionality.

**SILVER:** Each of these runs as a single instance. A failure of either would degrade or break the application.

**GOLD:** Both services run as clusters with multiple members. If one member fails, the others take over automatically. A built-in coordinator (called Sentinel for the cache) manages the handover without any human action needed.

---

### 7. WebSocket Connections Are More Resilient

The application uses real-time connections (WebSockets) to push live updates to users' browsers — for example, updating the status of a file upload without requiring a page refresh.

**SILVER:** One server handles all WebSocket connections. If it restarts, all active connections are dropped and users must reload their page.

**GOLD:** Two servers share WebSocket connections across different physical nodes. A single server restart drops only the connections it was handling, and clients reconnect automatically.

---

### 8. A Security Credential Is Rotated Automatically

The application uses a security key to access cloud file storage. That key should be rotated (changed) regularly to reduce the risk of compromise.

**SILVER:** Fragile automatic rotation — the key remains static until changed manually in Openshift but a Sidekiq rake job runs and stores the key in the database. If the rake job fails to update the key in the database, the application loses access to file storage until the mismatch is resolved requiring manual intervention.

**GOLD:** The key is automatically rotated in Openshift **every 2 hours** by a scheduled background job. The sidekiq job still continues to run but if it fails to update the key in the database, the application continues to have access to file storage because the Openshift secret is rotated but the old key remains valid until the new key is successfully stored in the database. This means there is no risk of losing access to file storage due to a failed key rotation.

---

### 9. Legacy Browser and Client Compatibility

**SILVER:** Connects directly to the application server.

**GOLD:** Includes an additional layer (an NGINX proxy) that supports older security protocols required by some legacy operating systems and browsers. This is required for the vanity domain `bcenergysavingsprogram.ca` to be accessible from all expected clients.

---

## Summary Table

| Area                         | SILVER (Before) | GOLD (After)                                 |
| ---------------------------- | --------------- | -------------------------------------------- |
| App copies running           | 1               | 2 (across separate node servers)             |
| Auto-recovery from crashes   | No              | Yes — within seconds                         |
| Survives planned maintenance | No              | Yes                                          |
| Background job redundancy    | 1 copy          | 2 copies                                     |
| Database redundancy          | 1 server        | 3-server cluster, auto-failover              |
| Max data loss in failure     | Up to 4 hours   | Up to 1 hour                                 |
| Backup frequency             | Daily           | Every hour (incremental), twice daily (full) |
| Off-site backups             | No              | Yes (Amazon S3, separate region)             |
| Backup retention             | 1 day           | 4 days                                       |
| Cache redundancy             | 1 server        | 3-server cluster                             |
| Search redundancy            | 1 server        | 2-server cluster                             |
| Credential rotation          | Sidekiq/Manual  | Automatic every 2 hours                      |

---

## What This Means for Users

Under normal operating conditions, users will not notice any difference. The application will look and behave identically.

The difference becomes apparent during:

- **Server failures** — GOLD recovers automatically; SILVER requires manual intervention.
- **Platform maintenance windows** — GOLD can be maintained with no downtime; SILVER has potential service interruption.
- **Application deployments** — GOLD detects and removes unhealthy pods before they reach users; SILVER has no such protection.
- **Disaster recovery** — GOLD can recover from a total cluster loss with at most one hour of data loss; SILVER's recovery depends entirely on when the last daily backup was taken, potentially resulting in up to 4 hours of data loss.
