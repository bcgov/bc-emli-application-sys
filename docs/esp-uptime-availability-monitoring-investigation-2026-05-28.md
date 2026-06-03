# ESP Uptime and Availability Monitoring Investigation

Date: 2026-05-28
Owner: Dev/Ops Investigation
Status: Recommendation

## Objective

Investigate and recommend an approach for reliable uptime and availability monitoring for ESP, including dashboards and reporting, aligned with Ministry standards and client expectations.

## 1. Current State Assessment

### What exists today

- Application health endpoints exist and are explicitly intended for uptime monitors:
  - `GET /up` (Rails health endpoint)
  - `GET /health` (returns plain text `ok` for monitor string match)
- Kubernetes liveness/readiness probes for app components are configured to use `/health`.
- GOLD production (`e3c3c4`) has broad HA controls (replicas, PDBs, anti-affinity, failover-friendly settings).

### Sysdig status from repository evidence

- Sysdig is present only as a team CRD manifest (`SysdigTeam`) under `devops/sysdig`.
- No in-repo Sysdig monitor definitions were found (no uptime checks, alert rules, dashboard JSON, notification channels, or report automation).

### Gaps identified

- No explicit end-to-end uptime measurement implementation for ESP service availability.
- No documented source-of-truth for uptime/downtime events.
- No automated monthly/weekly uptime reporting artifacts in repo.
- Monitoring appears component-focused (probes, HA setup) rather than service-level availability reporting.
- In base values and older env values, metrics features are mostly disabled (except select GOLD PostgreSQL monitor settings), indicating reporting readiness is incomplete.

## 2. Monitoring Options Evaluated

### Option A: Sysdig-first (recommended if Ministry tenant is operational)

Use Sysdig as the primary availability platform with external and internal checks.

What to implement:

- Synthetic uptime checks against public endpoint(s):
  - Primary user path check (HTTPS + expected status/content)
  - Dedicated `/health` check for fast heartbeat
- Alert policies:
  - Immediate outage alerts (multi-location failure)
  - Degradation alerts (latency and intermittent failures)
- Dashboards:
  - Real-time status
  - 7/30/90-day availability trend
  - Incident timeline with outage durations
- Reporting:
  - Scheduled weekly/monthly availability report export
  - Downtime event list with duration and probable root cause tag

Pros:

- Aligns with Ministry standard tooling.
- Usually strongest path for security + ops governance.
- Good executive reporting support if tenant features are enabled.

Cons/Risks:

- Current Sysdig state for ESP is unclear (artifact exists, operational setup not confirmed).
- May require platform-side access, team onboarding, and monitor policy setup outside app repo.

Effort (high level):

- Investigation/enablement: Medium
- Initial implementation: Medium
- Ongoing operations: Low-Medium

### Option B: OpenShift/Prometheus + Alertmanager + Grafana (platform-native fallback)

Use platform-native observability stack for uptime SLI and reporting.

What to implement:

- Blackbox/synthetic checks (or equivalent route probing) for public endpoint.
- Service-level availability SLI recording rules.
- Alertmanager notifications.
- Grafana uptime dashboards and periodic report snapshots/export.

Pros:

- Platform-native, avoids dependency on Sysdig tenant state.
- Fine-grained control over SLI/SLO definitions.

Cons/Risks:

- More engineering ownership and setup burden.
- Reporting UX may need additional work for client-facing summaries.

Effort (high level):

- Investigation/enablement: Medium
- Initial implementation: Medium-High
- Ongoing operations: Medium

### Option C: Hybrid (recommended default decision path)

- Sysdig for client-facing uptime dashboards and scheduled reporting.
- Platform-native probes/metrics as technical corroboration and resilience.

Pros:

- Best balance of Ministry alignment and operational resilience.
- Reduces single-tool dependency risk.

Cons/Risks:

- Slightly more governance/coordination overhead.

Effort (high level):

- Investigation/enablement: Medium
- Initial implementation: Medium-High
- Ongoing operations: Medium

## 3. Reporting Capability Requirements Mapping

Required capability coverage:

- Capture uptime/downtime events: achievable via synthetic check incidents + probe failures.
- Historical availability data: achievable via time-series retention and uptime SLI records.
- Real-time dashboards: achievable in Sysdig or Grafana.
- Historical dashboards: achievable in Sysdig or Grafana.
- Automated weekly/monthly reports: feasible, but requires explicit scheduled report setup (not currently present).

## 4. Technical and Operational Considerations

### Installation/config changes likely required

- Confirm/enable monitoring tenancy and team permissions (Sysdig and/or platform stack).
- Add/verify synthetic checks for public endpoints.
- Define SLI/SLO policy and alert thresholds.
- Configure notification routing (Ops + support + optional business recipients).
- Add reporting schedules and destination (email/Teams/SharePoint/etc.).
- Add runbook links for incident response.

### Access and visibility

- Minimum audiences:
  - Ops/support: full dashboard + alert access
  - Client stakeholders: read-only dashboard + scheduled report
- Role mapping must align with Ministry access standards.

### Security and standards alignment

- Favor Ministry-standard toolchain where viable (Sysdig-first validation).
- Avoid exposing internal endpoints publicly beyond intended health routes.
- Ensure reports omit sensitive internals while preserving outage transparency.

### Known limitations/risks

- A plain `/health` returning `ok` confirms reachability, not full dependency health.
- Probe success does not always equal user-experience success.
- Availability numbers vary by measurement method (synthetic user path vs pod health).

## Recommendation

Proceed with a staged hybrid approach, with a Sysdig-first decision gate:

1. Validate Sysdig viability in Ministry tenant for ESP (access, monitor creation, alerting, scheduled reporting).
2. If viable within timeline, implement Sysdig as primary reporting surface.
3. In parallel, implement/retain platform-native SLI instrumentation as technical backup and cross-check.
4. Publish a single agreed uptime definition and monthly report template.

## Proposed Definition of Availability (for stakeholder approval)

- Service availability is measured from synthetic HTTPS checks to production public endpoint(s).
- Monthly availability %:
  - `availability = (total_minutes - downtime_minutes) / total_minutes * 100`
- Planned maintenance windows are reported separately and excluded only if pre-approved.

## 30-60-90 Day Implementation Plan

### 0-30 days

- Confirm Sysdig tenancy health and ESP permissions.
- Define SLI/SLO and outage classification policy.
- Stand up baseline uptime checks (`/health` + representative user path).
- Configure critical outage alerts.

### 31-60 days

- Build real-time and historical dashboards.
- Implement scheduled weekly/monthly reports.
- Add runbooks and incident tagging taxonomy.

### 61-90 days

- Tune thresholds and reduce noise.
- Reconcile Sysdig vs platform-native measurements.
- Finalize executive/client reporting format and operating cadence.

## Acceptance Criteria

- Uptime/downtime events are captured with timestamps and durations.
- Historical availability is queryable for at least 90 days.
- Real-time and historical dashboards are accessible to support and client stakeholders.
- Weekly/monthly reports are generated automatically.
- Alerting and escalation path is tested and documented.

## 5. Sysdig Implementation Guide (Build This Now)

This section is a practical build recipe for `app.sysdigcloud.com` using the ESP context in this repository.

### A. Before building

Collect these values first:

- Sysdig team: use the existing ESP team in Sysdig.
- Cluster: GOLD production OpenShift cluster.
- Namespace (expected): `e3c3c4-prod`.
- Public hosts:
  - `bcenergysavingsprogram.ca` (primary client-facing URL)
  - `hesp.apps.gold.devops.gov.bc.ca` (platform route)
- Health endpoints:
  - `https://bcenergysavingsprogram.ca/health`
  - `https://bcenergysavingsprogram.ca/up`

### B. Create synthetic monitors first (source of uptime truth)

Create three checks. Use separate names so dashboards and alerts are easy to filter.

1. `ESP PROD - External Health`:

- URL: `https://bcenergysavingsprogram.ca/health`
- Method: `GET`
- Success criteria: HTTP `200` and response contains `ok`
- Frequency: 1 minute
- Timeout: 10 seconds
- Run from multiple regions/locations (at least 3)

2. `ESP PROD - External Up`:

- URL: `https://bcenergysavingsprogram.ca/up`
- Method: `GET`
- Success criteria: HTTP `200`
- Frequency: 1 minute

3. `ESP PROD - User Path`:

- URL: landing page or a lightweight authenticated flow endpoint your team agrees represents user availability.
- Success criteria: HTTP `200` and expected text/title marker.
- Frequency: 1 minute

Why three checks:

- `/health` gives fast platform reachability.
- `/up` validates app boot/rails health behavior.
- User-path check is what the client actually experiences.

### C. Build dashboard: `ESP Availability - Production`

Create dashboard from scratch and define dashboard scope variables so all panels are reusable:

- `kube_cluster_name = <prod-cluster>`
- `kube_namespace_name = e3c3c4-prod`
- optional `workload_prefix = hesp-`

Recommended sections and panels:

#### Section 1: Executive Availability (client-facing)

1. `Availability 30d (%)` (single value)

- Data: synthetic success ratio for `ESP PROD - User Path`
- Formula concept: `success checks / total checks * 100`

2. `Availability MTD (%)` (single value)

- Same source as above, month-to-date time range.

3. `Current Status` (single value or status)

- Green if latest synthetic run is successful, red otherwise.

4. `Total Downtime (MTD, minutes)` (single value)

- Sum failure intervals from user-path synthetic check.

#### Section 2: Outage and Degradation Timeline

5. `Synthetic Success by Check` (time series)

- Show all three checks on one chart.

6. `Latency p95 by Check` (time series)

- Highlight response-time degradation before outages.

7. `Failures by Location` (table or bar)

- Distinguish local ISP/regional issues from global outage.

8. `Incident Event Overlay` (event overlay enabled)

- Overlay alert triggered/resolved events on success/latency charts.

#### Section 3: Platform Correlation (Ops-facing)

9. `App Pod Readiness` (time series)

- Ready pod count for app workload in `e3c3c4-prod`.

10. `App Pod Restarts` (time series)

- Restart count/rate for app containers.

11. `Ingress/Route HTTP 5xx` (time series)

- Error-rate panel for external request failures.

12. `Redis / Postgres Health Signals` (time series)

- Use available metrics you already ingest; this is for triage correlation, not availability scoring.

Notes:

- Prefer PromQL panels where possible (easier to version mentally and tune).
- Set a dashboard minimum query interval if charts look sparse over long windows.

### D. Alerts to pair with dashboard

Create alerts immediately after dashboard panels are in place:

1. `P1 - ESP External Outage`:

- Condition: `ESP PROD - User Path` failing across at least 2 locations for >= 3 minutes.
- Notify: Pager/on-call + team channel.

2. `P2 - ESP Degraded Latency`:

- Condition: p95 latency above agreed threshold (for example > 2s) for >= 10 minutes.
- Notify: Ops channel.

3. `P2 - ESP /health Intermittent Failures`:

- Condition: failure ratio > 5% over 15 minutes.

4. `P3 - App Readiness Erosion`:

- Condition: ready pod count below expected baseline for >= 10 minutes.

Recommended alert metadata fields:

- `service=ESP`
- `env=prod`
- `owner=DevOps`
- `runbook=<link to incident runbook>`

### E. Reporting configuration

Configure outputs so this meets client reporting requirements:

- Weekly operational report:
  - Availability %, downtime minutes, incident count, top 3 incidents.
- Monthly client report:
  - MTD availability %, downtime event table (start/end/duration), SLA/SLO status.

If your Sysdig plan supports scheduled dashboard/report delivery, automate weekly and monthly sends.
If not, use a fallback:

- Export dashboard views + export events for the period.
- Store report artifacts in a shared Ministry-approved location.

### F. Suggested SLO defaults (tune with stakeholders)

- Availability SLO (monthly): `99.9%` for user-path synthetic check.
- Error budget per 30 days: about `43.2` minutes.
- Planned maintenance is tracked separately and excluded only when pre-approved.

### G. 60-minute build order

1. Create synthetic checks (A/B section above).
2. Build Section 1 panels first (client value quickly visible).
3. Add timeline and event overlay.
4. Add platform-correlation panels.
5. Create 4 core alerts.
6. Configure notification channels and test one synthetic failure.

### H. Definition of done for this dashboard

- Dashboard shows 24h, 7d, and 30d availability views.
- At least one real or test downtime event appears in timeline/events.
- Alert fires and resolves correctly with notification delivery confirmed.
- Weekly and monthly report workflow is documented and runnable by support staff.

## Repo Evidence Used

- Health endpoints and monitor intent in routes/controller.
- Helm probes target `/health`.
- Sysdig team manifest exists; no monitor/dashboard/report artifacts found.
- Base and older values show monitoring disabled in multiple areas; GOLD has selective PG monitoring enabled.
