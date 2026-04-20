# Technical Debt: Runtime & Dependency Version Upgrades

**Type:** Technical Debt
**Priority:** High
**Reason:** Approaching end-of-life on core runtimes — security patches and community support will cease.

---

## Background

Several core runtimes are approaching or have already passed their end-of-active-support dates. This ticket tracks the work to bring them forward to versions with at least ~2 more years of full support.

PostgreSQL and Elasticsearch are **not in scope** — both remain within their supported windows.

### Current vs Target

| Runtime       | Current Version | EOL (Current)         | Target Version | EOL (Target) | Notes                                                                 |
| ------------- | --------------- | --------------------- | -------------- | ------------ | --------------------------------------------------------------------- |
| **Ruby**      | 3.2.5           | Mar 31 2026           | 4.0.x          | Mar 31 2029  | Breaking changes expected                                             |
| **Node.js**   | 20.10.0         | Apr 30 2026           | 24.x LTS       | Apr 30 2028  | v25 is odd/temporary; v26 not out until Apr 2026                      |
| **Redis**     | 7.x             | Extended Support only | 8.6+           | ~Feb 2029    | Active support only ended; no security risk yet but window is closing |
| PostgreSQL    | 16              | Nov 09 2028           | —              | —            | No action needed                                                      |
| Elasticsearch | 9.1.2           | ~Dec 2027             | —              | —            | No action needed                                                      |

### Version Pinning Locations (all sub-tasks must update these)

| File                                                                    | What it pins                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------- |
| [.tool-versions](../.tool-versions)                                     | `ruby`, `nodejs` — used by asdf for local dev  |
| [Gemfile](../Gemfile)                                                   | `ruby "3.2.5"` directive                       |
| [.ruby-version](../.ruby-version)                                       | Ruby version for bundler/rbenv compatibility   |
| [devops/docker/app/Dockerfile](../devops/docker/app/Dockerfile)         | `ARG RUBY_VERSION` and `ARG NODE_VERSION`      |
| [devops/docker/app/Dockerfile.dev](../devops/docker/app/Dockerfile.dev) | `ARG RUBY_VERSION` and `ARG NODE_VERSION`      |
| [maintenance/Dockerfile](../maintenance/Dockerfile)                     | Check for Ruby base image reference            |
| [package.json](../package.json)                                         | `engines.node` field and `@types/node` dev dep |
| [docker-compose.yml](../docker-compose.yml)                             | `image: redis:7` service tag                   |
| Helm chart values (redis section)                                       | Redis image tag for deployed environments      |

---

## Sub-tasks

These sub-tasks are largely independent and can be worked in parallel by different developers. See the **Recommended Order** section at the bottom for sequencing advice.

---

### SUB-TASK 1 — Upgrade Ruby 3.2.5 → 4.0.x

**Risk: HIGH** — Ruby 4.0 has breaking changes that will likely touch application code.

#### What needs to change

- `.tool-versions` → `ruby 4.0.x`
- `.ruby-version` → `4.0.x`
- `Gemfile` → `ruby "4.0.x"`
- `devops/docker/app/Dockerfile` → `ARG RUBY_VERSION=4.0.x-<variant>`
- `devops/docker/app/Dockerfile.dev` → `ARG RUBY_VERSION=4.0.x-<variant>`
- `maintenance/Dockerfile` → verify base image

#### Known Breaking Changes to Investigate

Ruby 4.0 introduces several changes that are highly likely to affect this codebase:

1. **Frozen string literals will be the default.** Any code that mutates a string literal in place (`<<`, `gsub!`, `replace`, etc.) will raise a `FrozenError`. Search for in-place string mutations across `app/` and `lib/`.

2. **`it` becomes a block parameter shorthand.** Any spec or code using `it` as a local variable name will break. Run `bundle exec rubocop` after upgrading — this is likely to surface in RSpec `it` blocks if any custom matchers use the name.

3. **Keyword argument separation is fully enforced.** Any remaining `**options` hash-to-keyword or positional-to-keyword auto-coercion that survived Ruby 3.x will hard fail in 4.0.

4. **`Hash#[]` returns nil for missing keys (no change), but `fetch` and `dig` behavior has edge-case changes.** Verify any custom error-handling around these.

5. **Several standard library gems were removed from the default bundle in Ruby 3.x and are fully absent in 4.0** (`ostruct`, `base64`, `bigdecimal`, `mutex_m`, etc.). Run `bundle exec ruby -e 'require "ostruct"'` style checks or search the Gemfile for these and add explicit deps.

#### Gem Compatibility Checks Required

All gems should be verified against their Ruby 4.0 support matrix before upgrading. Pay particular attention to:

| Gem                       | Concern                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `rails ~> 7.1.4.1`        | Rails 7.1 may need a point release or upgrade to 7.2/8.0 to fully support Ruby 4.0 — check Rails compatibility matrix |
| `devise 4.9.3`            | Verify devise has a release targeting Ruby 4.0                                                                        |
| `devise-jwt 0.8.1`        | Pinned to an old version; check for Ruby 4.0 issues                                                                   |
| `dry-container 0.8.0`     | Pinned; may need update                                                                                               |
| `omniauth-keycloak 1.5.1` | Pinned; verify compatibility                                                                                          |
| `sidekiq ~> 7.2.4`        | Sidekiq 7.x should support Ruby 4.0 — confirm                                                                         |
| `searchkick ~> 5.5.2`     | Verify compatibility                                                                                                  |
| `anycable-rails ~> 1.4`   | Verify compatibility                                                                                                  |

#### Acceptance Criteria

- [ ] All version pins updated (see table above)
- [ ] `bundle install` completes without errors
- [ ] `bundle exec rubocop` passes (adjust `.rubocop.yml` target version to `4.0`)
- [ ] Full RSpec suite passes locally: `bundle exec rspec`
- [ ] Docker dev image builds successfully
- [ ] Application boots and basic smoke test passes in dev environment

---

### SUB-TASK 2 — Upgrade Node.js 20.10.0 → 24.x LTS

**Risk: MEDIUM** — Major npm package version bumps often introduce breaking changes in TypeScript types, Vite configuration, or React tooling.

#### Version Selection Rationale

- Node.js 25 is an odd-numbered (temporary) release — **do not use**.
- Node.js 26 LTS is not released until April 2026 — **do not wait for it**.
- Node.js 24 is the current even-numbered LTS release with security support through April 2028.

#### What needs to change

- `.tool-versions` → `nodejs 24.x.y`
- `devops/docker/app/Dockerfile` → `ARG NODE_VERSION=24.x.y`
- `devops/docker/app/Dockerfile.dev` → `ARG NODE_VERSION=24.x.y`
- `package.json` → `engines.node` → `">=v24.0.0"`
- `package.json` → `@types/node` dev dep → `"^24.x"`

#### Known Areas to Investigate

1. **npm package compatibility.** Run `npm install --legacy-peer-deps` after bumping Node and review any new peer dependency warnings or errors. Pay attention to packages in the `devDependencies` that are version-pinned to v6/v7-era packages (e.g. `lint-staged ^11.0.0`, `@typescript-eslint/*  ^6.x`).

2. **Vite configuration.** Vite 4/5 and `@vitejs/plugin-react` may have Node 24 minimum version changes — verify `vite.config.ts` still builds correctly.

3. **`node-gyp` native modules.** The Dockerfile installs `node-gyp` — verify any native modules still compile under Node 24.

4. **ESM / CJS interop changes.** Node 24 continues tightening ESM behaviour. Since `package.json` declares `"type": "module"`, confirm that any CJS-only deps still load correctly (check for `require()` of ESM-only packages in server-side render paths).

5. **`@types/node` version.** Currently pinned to `^20.12.2`. Bumping to `^24.x` may surface type errors across the codebase — review TypeScript compile output.

#### Acceptance Criteria

- [ ] `.tool-versions`, Dockerfiles, and `package.json` updated
- [ ] `npm install` (or `npm ci`) succeeds without peer errors
- [ ] TypeScript compiles without new errors: `npx tsc --noEmit`
- [ ] Vite dev build succeeds: `./bin/vite build`
- [ ] Docker dev image builds successfully
- [ ] Frontend renders and functions correctly in dev environment

---

### SUB-TASK 3 — Upgrade Redis 7 → 8.x

**Risk: LOW-MEDIUM** — Redis 8 is backward-compatible for core commands but introduces changes to module behaviour and some command semantics.

#### Context

This application uses Redis for **5 distinct purposes**, each isolated to a separate logical database index:

| Purpose                | URL / Config           |
| ---------------------- | ---------------------- |
| ActionCable / AnyCable | `redis://redis:6379/1` |
| Rate limiting          | `redis://redis:6379/2` |
| SimpleFeed activity    | `redis://redis:6379/3` |
| Cache store            | `redis://redis:6379/4` |
| Sidekiq queues         | `redis://redis:6379/0` |

All of these must be validated after the upgrade.

#### What needs to change

- `docker-compose.yml` → `image: redis:8` (or `redis:8.6`)
- Helm chart redis values → update image tag for deployed environments
- `Gemfile` redis gem pin (`~> 5.0.8`) → verify Redis 8 is supported; Redis gem v5.3+ is recommended for Redis 8 compatibility

#### Known Areas to Investigate

1. **Redis gem compatibility.** The `redis` gem is pinned to `~> 5.0.8`. Redis 8 introduced changes to the `HELLO` command handshake that can affect older client versions. Upgrade the gem to `~> 5.3` or latest 5.x before upgrading the server.

2. **Sidekiq and `sidekiq-unique-jobs`.** Both have Redis client dependencies. Verify the versions in use (`sidekiq ~> 7.2.4`, `sidekiq-unique-jobs ~> 8.0`) are compatible with Redis 8.

3. **AnyCable Redis URL.** AnyCable-go (`anycable/anycable-go:1.4.8` in docker-compose) connects to Redis — verify this image version supports the Redis 8 protocol.

4. **`simple-feed` gem.** Uses Redis directly; verify `simple-feed ~> 3.2.0` is Redis 8 compatible.

5. **Data migration.** If upgrading a persistent Redis instance (production/test environments), review Redis 8 migration notes for the RDB format version change. A clean restart with no persistence concern is fine for dev.

#### Acceptance Criteria

- [ ] `docker-compose.yml` and Helm values updated
- [ ] Redis gem updated and `bundle install` succeeds
- [ ] Development environment starts cleanly with `docker compose up`
- [ ] Sidekiq processes jobs without errors
- [ ] AnyCable WebSocket connections establish successfully
- [ ] Activity feed, caching, and rate-limiting smoke tested

---

### SUB-TASK 4 — Post-upgrade CI & Regression Validation

**This sub-task should be done last**, after all three upgrades have been merged or are ready for a combined integration test.

#### Scope

- Verify the full GitHub Actions test workflow (`/.github/workflows/test.yml`) passes against the new runtime versions
- Verify the pull-request workflow (`/.github/workflows/pull-request.yml`) passes
- Deploy to the dev environment and run a regression smoke test across key user flows
- Confirm the prod pipeline (`/.github/workflows/prod.yml`) and deploy workflows are not pinning the old runtime versions anywhere
- Update any CI-side `node-version` or `ruby-version` setup steps if they are hardcoded

---

## Recommended Implementation Order

The three upgrades are logically independent — different developers can own different streams. However:

1. **Start Redis first (SUB-TASK 3)** — lowest risk, fewest blast radius, unlocks Redis gem version upgrade which unblocks the Ruby upgrade.
2. **Node.js in parallel with Redis (SUB-TASK 2)** — frontend-focused work, touches mostly `package.json` and TypeScript; can be merged independently.
3. **Ruby last (SUB-TASK 1)** — highest risk, most likely to require iterative gem resolution and application code fixes. Should not be rushed. Allow dedicated time for a full RSpec run and manual smoke testing.
4. **CI validation (SUB-TASK 4)** — once the first three are merged to the main branch or a combined feature branch.

> **Note for the team:** Ruby 3.2 EOL is March 31 2026 and Node.js 20 EOL is April 30 2026. Both are imminent. Prioritise getting the upgrades merged to a deployable branch before those dates. Redis is less urgent (extended support, no active security risk in the near term) but should be included in the same release to reduce future churn.

---

## Out of Scope

- PostgreSQL 16 — supported until Nov 2028, no action required.
- Elasticsearch 9.1.2 — supported until ~Dec 2027, no action required.
- Rails version upgrade — should be considered as a follow-on ticket once Ruby 4.0 compatibility is confirmed at the gem level.
