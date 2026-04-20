# JIRA Tickets — Runtime & Dependency Version Upgrades

> Copy each block below directly into a JIRA ticket.
> Create the **Epic first**, then create each Sub-task and link it to the Epic via the _Epic Link_ field.

---

---

## EPIC (Parent Ticket)

---

**Summary:**
`[Tech Debt] Upgrade core runtimes before EOL — Ruby, Node.js, Redis`

**Issue Type:** `Epic`
**Priority:** `High`
**Labels:** `tech-debt`, `dependencies`, `runtime`, `security`
**Components:** `Infrastructure`, `Backend`, `Frontend`
**Fix Version / Sprint:** TBD

---

**Description:**

Several core runtimes are imminently approaching or have already passed their end-of-active-support dates. Without upgrading, the application will continue to run but will no longer receive security patches or community support from those runtimes' maintainers.

This Epic tracks four sub-tasks to bring the affected runtimes to versions with at least 2 more years of full support. PostgreSQL 16 and Elasticsearch 9.1.2 are **not in scope** — both remain within their supported windows.

**Current vs Target State:**

| Runtime       | Current | EOL (Current)         | Target   | EOL (Target) |
| ------------- | ------- | --------------------- | -------- | ------------ |
| Ruby          | 3.2.5   | Mar 31 2026           | 4.0.x    | Mar 31 2029  |
| Node.js       | 20.10.0 | Apr 30 2026           | 24.x LTS | Apr 30 2028  |
| Redis         | 7.x     | Extended support only | 8.6+     | ~Feb 2029    |
| PostgreSQL    | 16      | Nov 09 2028           | —        | No action    |
| Elasticsearch | 9.1.2   | ~Dec 2027             | —        | No action    |

**Node.js version note:** Node.js 25 is an odd-numbered temporary release — do not use. Node.js 26 LTS does not release until April 2026. Node.js 24 is the correct current LTS target with security support through April 2028.

**Recommended execution order:**

1. SUB-TASK 3 — Redis (lowest risk; unblocks the Redis gem upgrade needed for Ruby)
2. SUB-TASK 2 — Node.js (parallel to Redis; frontend-scoped, independent)
3. SUB-TASK 1 — Ruby (highest risk; do last so Redis gem is already resolved)
4. SUB-TASK 4 — CI & Regression (after all three are merged)

**Urgency:** Ruby 3.2 EOL is March 31 2026 and Node.js 20 EOL is April 30 2026. Upgrades should be merged to a deployable branch before those dates.

**Out of scope:**

- PostgreSQL 16 (supported until Nov 2028)
- Elasticsearch 9.1.2 (supported until ~Dec 2027)
- Rails version upgrade (follow-on ticket once Ruby 4.0 compatibility is confirmed)

---

**Acceptance Criteria:**

- [ ] Ruby upgraded to 4.0.x; full test suite passes
- [ ] Node.js upgraded to 24.x; TypeScript compiles and Vite build succeeds
- [ ] Redis upgraded to 8.x; all Redis-backed services (Sidekiq, AnyCable, cache, rate-limiting, activity feed) verified
- [ ] All CI pipelines pass on new runtime versions
- [ ] Application deployed to dev environment and regression smoke tested
- [ ] No runtime version pins remain pointed at EOL versions anywhere in the codebase

---

---

## SUB-TASK 1 — Ruby Upgrade

---

**Summary:**
`[Tech Debt] Upgrade Ruby 3.2.5 → 4.0.x`

**Issue Type:** `Sub-task`
**Parent Epic:** _(link to Epic above)_
**Priority:** `High`
**Labels:** `tech-debt`, `ruby`, `backend`, `breaking-changes`
**Components:** `Backend`, `Infrastructure`
**Blocked By:** SUB-TASK 3 (Redis gem upgrade should land first)
**Story Points:** `8` _(suggested — high effort due to breaking changes)_

---

**Description:**

Ruby 3.2 reaches end-of-life on March 31 2026. This sub-task upgrades Ruby to 4.0.x (EOL March 2029), extending support by 3 years.

**Risk: HIGH** — Ruby 4.0 introduces breaking language changes that are likely to affect application and spec code.

---

**Files to Update:**

| File                               | Change                             |
| ---------------------------------- | ---------------------------------- |
| `.tool-versions`                   | `ruby 4.0.x`                       |
| `.ruby-version`                    | `4.0.x`                            |
| `Gemfile`                          | `ruby "4.0.x"`                     |
| `devops/docker/app/Dockerfile`     | `ARG RUBY_VERSION=4.0.x-<variant>` |
| `devops/docker/app/Dockerfile.dev` | `ARG RUBY_VERSION=4.0.x-<variant>` |
| `maintenance/Dockerfile`           | Verify Ruby base image reference   |

---

**Known Breaking Changes to Investigate:**

1. **Frozen string literals become the default.** Any code mutating a string literal in place (`<<`, `gsub!`, `replace`, etc.) will raise a `FrozenError`. Audit `app/` and `lib/` for in-place string mutations.

2. **`it` becomes a block parameter shorthand.** Any code or spec using `it` as a local variable name will break. Run `bundle exec rubocop` after upgrading.

3. **Keyword argument separation fully enforced.** Any remaining hash-to-keyword or positional-to-keyword auto-coercion that survived Ruby 3.x will hard fail.

4. **Standard library gems removed from default bundle.** Gems such as `ostruct`, `base64`, `bigdecimal`, and `mutex_m` are no longer included by default. Add them explicitly to the Gemfile if used.

5. **`fetch` / `dig` edge-case behaviour changes.** Verify any custom error handling around `Hash#fetch` and `Hash#dig`.

---

**Gem Compatibility Verification Required:**

| Gem                       | Concern                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `rails ~> 7.1.4.1`        | Rails 7.1 may require upgrade to 7.2/8.0 for full Ruby 4.0 support — check Rails compatibility matrix |
| `devise 4.9.3`            | Verify Ruby 4.0 compatible release exists                                                             |
| `devise-jwt 0.8.1`        | Pinned to old version — check for Ruby 4.0 issues                                                     |
| `dry-container 0.8.0`     | Pinned — may need update                                                                              |
| `omniauth-keycloak 1.5.1` | Pinned — verify compatibility                                                                         |
| `sidekiq ~> 7.2.4`        | Should support Ruby 4.0 — confirm                                                                     |
| `searchkick ~> 5.5.2`     | Verify compatibility                                                                                  |
| `anycable-rails ~> 1.4`   | Verify compatibility                                                                                  |

---

**Acceptance Criteria:**

- [ ] `.tool-versions`, `.ruby-version`, `Gemfile`, and both Dockerfiles updated
- [ ] `bundle install` completes without errors
- [ ] `bundle exec rubocop` passes (update `.rubocop.yml` `TargetRubyVersion` to `4.0`)
- [ ] Full RSpec suite passes: `bundle exec rspec`
- [ ] Docker dev image builds successfully
- [ ] Application boots and returns HTTP 200 on the root path in the dev environment

---

---

## SUB-TASK 2 — Node.js Upgrade

---

**Summary:**
`[Tech Debt] Upgrade Node.js 20.10.0 → 24.x LTS`

**Issue Type:** `Sub-task`
**Parent Epic:** _(link to Epic above)_
**Priority:** `High`
**Labels:** `tech-debt`, `nodejs`, `frontend`
**Components:** `Frontend`, `Infrastructure`
**Story Points:** `5` _(suggested — medium effort; primarily tooling and type resolution)_

---

**Description:**

Node.js 20 reaches end-of-life on April 30 2026. This sub-task upgrades to Node.js 24 LTS (EOL April 2028), extending support by 2 years.

**Risk: MEDIUM** — Major Node.js version bumps commonly break npm package peer dependencies, Vite configuration, and TypeScript type definitions.

**Version selection rationale:** Node.js 25 is an odd-numbered temporary release and must not be used. Node.js 26 LTS does not release until April 2026. Node.js 24 is the correct upgrade target.

---

**Files to Update:**

| File                               | Change                            |
| ---------------------------------- | --------------------------------- |
| `.tool-versions`                   | `nodejs 24.x.y`                   |
| `devops/docker/app/Dockerfile`     | `ARG NODE_VERSION=24.x.y`         |
| `devops/docker/app/Dockerfile.dev` | `ARG NODE_VERSION=24.x.y`         |
| `package.json`                     | `engines.node` → `">=v24.0.0"`    |
| `package.json`                     | `@types/node` dev dep → `"^24.x"` |

---

**Known Areas to Investigate:**

1. **npm peer dependency compatibility.** Several `devDependencies` are pinned to older major versions (e.g. `lint-staged ^11.0.0`, `@typescript-eslint/* ^6.x`). Run `npm install --legacy-peer-deps` and review warnings.

2. **Vite build.** Verify `vite.config.ts` builds correctly under Node 24. Confirm `@vitejs/plugin-react` has no Node 24 minimum version conflict.

3. **`node-gyp` native modules.** The Dockerfile installs `node-gyp` — verify all native modules compile under Node 24.

4. **ESM / CJS interop.** `package.json` declares `"type": "module"`. Confirm CJS-only dependencies still load correctly, particularly in server-side render paths where `require()` may be used.

5. **TypeScript type errors from `@types/node` bump.** Currently pinned to `^20.12.2`. Bumping to `^24.x` may surface new type errors — review `npx tsc --noEmit` output thoroughly.

---

**Acceptance Criteria:**

- [ ] `.tool-versions`, both Dockerfiles, and `package.json` updated
- [ ] `npm install` (or `npm ci`) succeeds without peer dependency errors
- [ ] TypeScript compiles without new errors: `npx tsc --noEmit`
- [ ] Vite dev build succeeds: `./bin/vite build`
- [ ] Docker dev image builds successfully
- [ ] Frontend renders correctly and no console errors present in the dev environment

---

---

## SUB-TASK 3 — Redis Upgrade

---

**Summary:**
`[Tech Debt] Upgrade Redis 7 → 8.x`

**Issue Type:** `Sub-task`
**Parent Epic:** _(link to Epic above)_
**Priority:** `Medium`
**Labels:** `tech-debt`, `redis`, `infrastructure`
**Components:** `Infrastructure`, `Backend`
**Blocks:** SUB-TASK 1 (Redis gem upgrade should land before Ruby upgrade)
**Story Points:** `3` _(suggested — low-medium effort; primarily image and gem version bumps)_

---

**Description:**

Redis 7 active support has ended and the version is in extended support only. This sub-task upgrades to Redis 8.6+ (estimated EOL February 2029).

**Risk: LOW-MEDIUM** — Redis 8 is largely backward-compatible for core commands but has changes to the client handshake protocol that affect older Redis client gem versions.

**Note:** This sub-task should be completed before (or alongside) the Ruby upgrade because the `redis` gem must be bumped to `~> 5.3` for Redis 8 compatibility — and that gem bump is best validated in isolation before Ruby 4.0 is introduced.

---

**This application uses Redis for 5 purposes — all must be validated:**

| Purpose                  | Redis DB Index |
| ------------------------ | -------------- |
| Sidekiq job queues       | `/0`           |
| AnyCable / ActionCable   | `/1`           |
| Rate limiting            | `/2`           |
| SimpleFeed activity feed | `/3`           |
| Cache store              | `/4`           |

---

**Files to Update:**

| File                    | Change                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| `docker-compose.yml`    | `image: redis:8` (or `redis:8.6`)                                      |
| Helm chart redis values | Update Redis image tag for all deployed environments (dev, test, prod) |
| `Gemfile`               | `redis` gem → `~> 5.3` (minimum for Redis 8 client compatibility)      |

---

**Known Areas to Investigate:**

1. **Redis gem `HELLO` handshake.** `redis ~> 5.0.8` is incompatible with the Redis 8 protocol handshake changes. Must upgrade to `~> 5.3` or latest 5.x.

2. **Sidekiq and `sidekiq-unique-jobs` compatibility.** Both use the Redis client internally. Verify `sidekiq ~> 7.2.4` and `sidekiq-unique-jobs ~> 8.0` are compatible with Redis 8.

3. **AnyCable-go image.** `anycable/anycable-go:1.4.8` (in `docker-compose.yml`) connects to Redis — verify this image version supports the Redis 8 protocol. May need a version bump.

4. **`simple-feed` gem.** Connects to Redis directly. Verify `simple-feed ~> 3.2.0` is Redis 8 compatible.

5. **Production data migration.** For persistent Redis instances (test/prod environments), review Redis 8 RDB format version change notes before upgrading in place. A rebuild from scratch is safe for ephemeral/dev environments.

---

**Acceptance Criteria:**

- [ ] `docker-compose.yml` Redis image updated
- [ ] Helm chart Redis values updated for all environments
- [ ] `redis` gem bumped to `~> 5.3` and `bundle install` succeeds
- [ ] `docker compose up` starts cleanly with no Redis connection errors
- [ ] Sidekiq starts and processes a test job without errors
- [ ] AnyCable WebSocket connections establish successfully
- [ ] Activity feed, cache, and rate-limiting verified in the dev environment

---

---

## SUB-TASK 4 — CI & Regression Validation

---

**Summary:**
`[Tech Debt] Post-upgrade CI pipeline and regression validation`

**Issue Type:** `Sub-task`
**Parent Epic:** _(link to Epic above)_
**Priority:** `High`
**Labels:** `tech-debt`, `ci`, `regression`, `qa`
**Components:** `Infrastructure`, `CI/CD`
**Blocked By:** SUB-TASK 1, SUB-TASK 2, SUB-TASK 3
**Story Points:** `3` _(suggested — primarily verification and pipeline fixes)_

---

**Description:**

After the three runtime upgrades are merged (Ruby, Node.js, Redis), this sub-task validates that all CI pipelines and deployed environments are healthy on the new versions.

**This sub-task must be done last.**

---

**Scope:**

1. **GitHub Actions workflows** — Verify the following pass end-to-end on the updated runtimes:

   - `.github/workflows/test.yml`
   - `.github/workflows/pull-request.yml`
   - `.github/workflows/dev.yml` / `deploy-dev.yml`
   - `.github/workflows/prod.yml` / `deploy-prod.yml`

2. **Hardcoded version pins in CI.** Audit all workflow files for any hardcoded `ruby-version`, `node-version`, or image tags that still reference the old versions. Update where found.

3. **Dev environment smoke test.** Deploy to the dev OpenShift environment and walk through the following key user flows:

   - User login (BCeID / Keycloak)
   - Permit application submission
   - File upload and virus scan
   - Background job processing (Sidekiq)
   - Real-time updates (AnyCable WebSocket)
   - Activity feed

4. **Confirm no deprecated warnings in logs.** Review Rails and Ruby logs post-deploy for deprecation warnings that should be resolved before moving to production.

---

**Acceptance Criteria:**

- [ ] All GitHub Actions workflows pass on the new runtime versions
- [ ] No hardcoded EOL version references remain in any workflow file
- [ ] Dev environment deployed and accessible
- [ ] Smoke test of key user flows completed without errors
- [ ] No NEW deprecation warnings introduced by the upgrade appear in application logs
- [ ] Team sign-off before promoting to test/prod environments

---
