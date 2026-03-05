# BC Home Energy Savings Program - Application System

A full-stack web application supporting the BC Home Energy Savings Program (BCHESP) Program. The system manages applications, requirement blocks, file uploads, user authorization, and real-time notifications, deployed on OpenShift/Kubernetes via Helm.

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Domain Concepts](#domain-concepts)
- [Authentication](#authentication)
- [Local Development Setup](#local-development-setup)
  - [Docker Compose](#docker-compose)
  - [Local Object Storage (Minio)](#local-object-storage-minio)
- [Background Jobs](#background-jobs)
- [Real-Time (AnyCable)](#real-time-anycable)
- [Search (Elasticsearch)](#search-elasticsearch)
- [File Uploads & Virus Scanning](#file-uploads--virus-scanning)
- [Email](#email)
- [Testing](#testing)
- [Formatting & Linting](#formatting--linting)
- [Helm & Deployment](#helm--deployment)
- [Release Workflow](#release-workflow)
- [Additional Documentation](#additional-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The BC Home Energy Savings Program Application System is a applications/invoicing management platform. It allows permit applicants and reviewers to manage applications through structured workflows, with requirement blocks, file attachments, state-machine-driven status transitions, policy-based authorization, and real-time UI updates via WebSockets.

---

## Technology Stack

| Layer                   | Technology                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Language (backend)      | Ruby (see [.ruby-version](.ruby-version))                                                                      |
| Framework               | Ruby on Rails                                                                                                  |
| Frontend                | React (TypeScript), served via Vite                                                                            |
| UI Component Library    | Chakra UI                                                                                                      |
| State Management        | MobX + MobX State Tree                                                                                         |
| Form Builder            | Formio (dynamic requirement block forms)                                                                       |
| Internationalisation    | i18next                                                                                                        |
| Analytics               | Snowplow (BC Government analytics — session tracking, page views)                                              |
| Database                | PostgreSQL (Crunchy Postgres operator in production, with pgBouncer connection pooling and pgBackRest backups) |
| Background Jobs         | Sidekiq + Redis                                                                                                |
| Real-Time               | AnyCable (gRPC RPC server + anycable-go WebSocket gateway)                                                     |
| File Storage            | Shrine 3.5.0 (AWS S3 `ca-central-1` in production)                                                             |
| Virus Scanning          | ClamAV                                                                                                         |
| Search                  | Elasticsearch (via Searchkick gem)                                                                             |
| Authorization           | Pundit (policy objects)                                                                                        |
| Authentication          | Keycloak / BCeID (BC Government SSO via `loginproxy.gov.bc.ca`)                                                |
| State Machines          | AASM                                                                                                           |
| Serialization           | Blueprinter                                                                                                    |
| Email                   | CHES (BC Common Hosted Email Service) via custom delivery adapter                                              |
| Container Orchestration | OpenShift / Kubernetes                                                                                         |
| Helm                    | Helm v3 (umbrella chart pattern)                                                                               |
| CI/CD                   | GitHub Actions (workflows under `.github/workflows/`)                                                          |
| Node Version            | See [.nvmrc](.nvmrc)                                                                                           |

---

## Architecture

The application follows a standard Rails monolith pattern with the frontend embedded via Vite, but has several distinct runtime processes:

```
┌───────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│  React SPA (Vite)   ←──── WebSocket (ws://) ────►  anycable-go    │
│       │                                                  │        │
│  HTTP/HTTPS                                         gRPC RPC call │
│       ▼                                                  ▼        │
│  Rails (Puma)  ─────────────────────────────────►  AnyCable RPC   │
│       │                                           (Rails process) │
│       ├── ActiveRecord ──► PostgreSQL                             │
│       ├── Shrine       ──► Object Storage (S3)                    │
│       ├── Searchkick   ──► Elasticsearch                          │
│       └── Sidekiq      ──► Redis                                  │
│                │                                                  │
│           Background Jobs                                         │
│           ├── ClamAV (virus scanning)                             │
│           └── (email, sync, etc.)                                 │
└───────────────────────────────────────────────────────────────────┘
```

**Key processes in production:**

| Process        | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| `web` (Puma)   | Serves Rails API + Vite-compiled frontend assets             |
| `sidekiq`      | Processes background jobs from Redis queues                  |
| `anycable-rpc` | Rails-side gRPC server for AnyCable channel logic            |
| `anycable-go`  | High-performance WebSocket gateway (binary), forwards to RPC |
| `clamav`       | ClamAV daemon for virus scanning uploaded files              |

See [docs/system-architecture-diagram.md](docs/system-architecture-diagram.md) for a more detailed diagram.

---

## Domain Concepts

| Concept                  | Description                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| **Application**          | Core domain entity representing a submission, driven by AASM state machine (see below)      |
| **Classification**       | STI base model for all typed classification records (Type, Activity, SubmissionType, etc.)  |
| **Requirement Block**    | Configurable blocks of fields/requirements attached to applications; supports template sync |
| **Program**              | The permitting program context for an application                                           |
| **User / Contact**       | Applicants and reviewers; authorization via Pundit policies                                 |
| **Supporting Documents** | File attachments on applications, subject to virus scanning before acceptance               |

State machines (AASM) govern application status transitions. Pundit policy objects govern all authorization checks. See [app/policies](app/policies) and [app/models](app/models).

### Application Classification

Every `Application` is described by a combination of classification dimensions, all backed by the `classifications` table using Rails STI. This allows requirement templates to target a specific combination of type, activity, audience, user group, and submission type.

**Audience Type** — who the application is directed toward:

| Code       | Name                               |
| ---------- | ---------------------------------- |
| `internal` | Internal (program staff-facing)    |
| `external` | External (public/applicant-facing) |

**User Group Type** — the category of the applicant:

| Code          | Name                                     |
| ------------- | ---------------------------------------- |
| `participant` | Program participant (homeowner/resident) |
| `contractor`  | Registered contractor                    |

**Submission Type** — the functional category of the submission:

| Code              | Name                             | Variants                   |
| ----------------- | -------------------------------- | -------------------------- |
| `application`     | General program application      | —                          |
| `onboarding`      | Contractor onboarding submission | —                          |
| `support_request` | Support / help request           | —                          |
| `invoice`         | Invoice submission               | See invoice variants below |

**Submission Variants** (`SubmissionVariant`) are children of a `SubmissionType`. Currently all variants belong to the `invoice` type:

| Code                         | Name                                        |
| ---------------------------- | ------------------------------------------- |
| `invoice_heat_pump_space`    | Heat pump (space heating)                   |
| `invoice_heat_pump_water`    | Heat pump water heater (including combined) |
| `invoice_insulation`         | Insulation                                  |
| `invoice_windows_doors`      | Windows and doors                           |
| `invoice_ventilation`        | Ventilation                                 |
| `invoice_electrical_upgrade` | Electrical service upgrade                  |
| `invoice_health_safety`      | Health and safety remediation               |

### Application Status Lifecycle

Application status is managed via AASM with the following states:

```
new_draft → newly_submitted → in_review → approved
                           ↘ revisions_requested → resubmitted → in_review
                           ↘ ineligible
                           ↘ update_needed
                           ↘ training_pending → approved_pending → approved_paid
```

| Status                | Description                               |
| --------------------- | ----------------------------------------- |
| `new_draft`           | Created but not yet submitted             |
| `newly_submitted`     | Submitted for the first time              |
| `revisions_requested` | Reviewer has requested changes            |
| `resubmitted`         | Applicant has resubmitted after revisions |
| `in_review`           | Under active review                       |
| `update_needed`       | Additional information required           |
| `approved`            | Application approved                      |
| `ineligible`          | Determined ineligible                     |
| `training_pending`    | Awaiting training completion              |
| `approved_pending`    | Approved but pending final step           |
| `approved_paid`       | Approved and payment confirmed            |

---

## Authentication

The application uses **Keycloak** for single sign-on, integrated with BC Government's **BCeID** identity provider via `loginproxy.gov.bc.ca`. All user authentication is handled through OAuth 2.0 / OIDC flows managed by Keycloak.

To run locally, the `KEYCLOAK_CLIENT`, `KEYCLOAK_SECRET`, and `KEYCLOAK_AUTH_URL` values in `.env.docker_compose` must be filled in — these are the OAuth client credentials the app uses to communicate with Keycloak. Contact the team to obtain these values for the development realm. User accounts (BCeID or Keycloak realm accounts) are managed separately.

---

## Local Development Setup

The team develops using Docker Compose. The native (non-Docker) setup is not maintained and is not recommended.

### Docker Compose

Copy the Docker-specific env file and bring services up:

```bash
cp .env_example.docker_compose .env.docker_compose
# Edit .env.docker_compose as needed

docker compose up
```

Then, on first run:

```bash
docker compose exec app bundle exec rails db:create
docker compose exec app bundle exec rails db:migrate
docker compose exec app bundle exec rails db:seed
```

This starts Rails, Sidekiq, AnyCable, ClamAV, Elasticsearch, PostgreSQL, and Redis as a coordinated stack. See [docker-compose.yml](docker-compose.yml) for full service definitions.

**Notes:**

- A minimal set of ENV vars for local services (Redis, Postgres, etc.) are defaulted in `docker-compose.yml`. Additional vars for CHES email, Keycloak, and object storage must be set in `.env.docker_compose`.
- To attach a debugger (e.g. `binding.pry`), run `docker compose attach app`.
- Email previews via `letter_opener` are accessible at `http://localhost:3000/letter_opener`.

### Local Object Storage (Minio)

To test the full file upload flow locally, run a local [Minio](https://min.io/) instance to emulate S3-compatible object storage:

```bash
brew install minio
minio server --address 127.0.0.1:9001 ~/path/to/storage
```

Set the following in your `.env.docker_compose`:

```
BCGOV_OBJECT_STORAGE_ENDPOINT=http://127.0.0.1:9001
BCGOV_OBJECT_STORAGE_BUCKET=your-local-bucket-name
BCGOV_OBJECT_STORAGE_ACCESS_KEY_ID=your-local-user-access-key
BCGOV_OBJECT_STORAGE_SECRET_ACCESS_KEY=your-local-user-secret-access
BCGOV_OBJECT_STORAGE_REGION=us-east-1
```

The bucket path convention used is: `:bucket_name/permit-applications/:id/*`

---

## Background Jobs

Sidekiq is the background job processor, backed by Redis. Jobs are defined under [app/jobs](app/jobs).

Recurring/scheduled jobs are defined in [config/sidekiq_cron_schedule.yml](config/sidekiq_cron_schedule.yml) and managed by `sidekiq-cron`.

Notable job categories:

- **Virus scan callbacks** – ClamAV results trigger document status updates
- **Email dispatch** – Asynchronous delivery via CHES
- **Requirement block sync** – Propagating template changes to applications (see [docs/requirement-block-sync.md](docs/requirement-block-sync.md))

> **Note:** Redis serves 5 separate logical databases, each with its own ENV var: Sidekiq (`REDIS_URL`), AnyCable (`ANYCABLE_REDIS_URL`), rate limiting (`RATE_LIMIT_DEV_REDIS_URL`), activity feed (`SIMPLE_FEED_DEV_REDIS_URL`), and Rails cache (`CACHE_DEV_REDIS_URL`). Production environments use HA Redis via Sentinels — the required ENV vars differ from the simple `REDIS_URL` used locally.

---

## Real-Time (AnyCable)

The application uses [AnyCable](https://anycable.io/) for scalable WebSocket support, replacing ActionCable's default Ruby WebSocket handling.

- **`anycable-go`** — a standalone Go binary that handles WebSocket connections at scale, bundled at [bin/anycable-go](bin/anycable-go).
- **AnyCable RPC** — a Rails process exposing channel logic over gRPC, which `anycable-go` calls for connect/subscribe/message handling.

Configuration: [config/anycable.yml](config/anycable.yml), [config/cable.yml](config/cable.yml).

In development, both processes are started via Docker Compose. It is recommended to use a separate Redis DB for AnyCable (e.g. `ANYCABLE_REDIS_URL=redis://localhost:6379/2`) to avoid interference with Sidekiq queues.

---

## Search (Elasticsearch)

Full-text and filtered search is powered by Elasticsearch via the [Searchkick](https://github.com/ankane/searchkick) gem. Models that support search (applications, users, contractors, requirement blocks, templates, jurisdictions, etc.) define `searchkick` in their model and are indexed in Elasticsearch.

In development, Elasticsearch runs as a Docker Compose service on port `9200`. The `ELASTICSEARCH_URL` env var controls the connection.

---

## File Uploads & Virus Scanning

Files are uploaded via Shrine 3.5.0 (see [app/uploaders](app/uploaders)). All uploaded files are queued for virus scanning by ClamAV before they are made available.

The scan flow:

1. File is uploaded and stored with a `pending` scan status.
2. A background job submits the file to ClamAV.
3. ClamAV result triggers a callback that updates the document's scan status (`clean` / `infected`).
4. Infected files are quarantined and never surfaced to users.

See [docs/file-upload-flow.md](docs/file-upload-flow.md) and [docs/virus-scanning-update-flow.md](docs/virus-scanning-update-flow.md) for complete flow documentation.

---

## Email

Outbound email is delivered via the **BC Common Hosted Email Service (CHES)**. A custom delivery adapter is implemented in [lib/ches_email_delivery.rb](lib/ches_email_delivery.rb). Mailers are under [app/mailers](app/mailers).

Email delivery is always performed asynchronously via Sidekiq. In development, `letter_opener` is used to preview emails in the browser at `http://localhost:3000/letter_opener`.

---

## Testing

The test suite uses RSpec. Run it with:

```bash
bundle exec rspec
```

Configuration is in [.rspec](.rspec). Factories, support files, and shared examples live under `spec/`.

To generate an up-to-date ERD diagram (requires Graphviz):

```bash
bundle exec erd
```

---

## Formatting & Linting

- **Backend:** RuboCop ([.rubocop.yml](.rubocop.yml)) for linting; Ruby LSP for formatting. Install the RubyLSP VS Code extension and select it as the formatter.
- **Frontend:** Prettier ([.prettierrc.mjs](.prettierrc.mjs)) and ESLint ([.eslintrc](.eslintrc)).
- Pre-commit hooks are enforced via Husky ([.husky](.husky/)).

---

## Helm & Deployment

The application is deployed to OpenShift using Helm v3 in an **umbrella chart** pattern.

### Chart Structure

```
helm/
├── main/               ← Umbrella chart (aggregates all sub-charts)
│   ├── Chart.yaml
│   └── values.yaml     ← Environment-specific overrides go here
├── _app/               ← Rails application sub-chart
├── _sidekiq/           ← Sidekiq worker sub-chart
├── _anycable-rpc/      ← AnyCable RPC sub-chart
├── _clamav/            ← ClamAV sub-chart
└── _maintenance/       ← Maintenance pod sub-chart
```

Each sub-chart is prefixed with `_` to indicate it is a dependency of the umbrella `main` chart and not deployed independently.

### Secrets Management

Production secrets are managed via **Vault** (`global.vault` in helm values). Developers working on deployments or environment configuration should refer to the team's Vault setup for the appropriate secret paths and access policies.

### Deploying

Deployments are managed through GitHub Actions workflows under [.github/workflows](.github/workflows).

Environment-specific values (image tags, replica counts, resource limits, ingress hostnames) are supplied as `values.yaml` overrides in `helm/main/`.

For OpenShift-specific notes and legacy template history, see [openshift/Readme.md](openshift/Readme.md) and [devops/README.md](devops/README.md).

---

## Release Workflow

- **Regular releases:** Branching and tagging workflow described in [docs/test-and-prod-release-workflow.md](docs/test-and-prod-release-workflow.md).
- **Hotfixes:** Process documented in [docs/hotfix-branch-tag-workflow.md](docs/hotfix-branch-tag-workflow.md).
- Release versions are tracked in [VERSION](VERSION) and managed by `release-it` ([.release-it.json](.release-it.json)).

---

## Additional Documentation

| Document                                                                         | Description                            |
| -------------------------------------------------------------------------------- | -------------------------------------- |
| [docs/system-architecture-diagram.md](docs/system-architecture-diagram.md)       | System architecture overview           |
| [docs/file-upload-flow.md](docs/file-upload-flow.md)                             | File upload and storage flow           |
| [docs/virus-scanning-update-flow.md](docs/virus-scanning-update-flow.md)         | ClamAV scan lifecycle                  |
| [docs/requirement-block-sync.md](docs/requirement-block-sync.md)                 | Requirement block template sync design |
| [docs/database-restore.md](docs/database-restore.md)                             | Database restore procedures            |
| [docs/test-and-prod-release-workflow.md](docs/test-and-prod-release-workflow.md) | Release process                        |
| [docs/hotfix-branch-tag-workflow.md](docs/hotfix-branch-tag-workflow.md)         | Hotfix process                         |
| [devops/README.md](devops/README.md)                                             | DevOps and infrastructure notes        |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## License

See [LICENSE](LICENSE).
