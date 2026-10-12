# Performance without weakening service boundaries

Each service uses its own PostgreSQL URL and credentials. Common migration 0003 removes PUBLIC database connection privileges. Customer owns profile, encrypted phone, addresses and cart; Identity owns authentication, sessions and roles. Reporting must consume events, never another service's database. The profile transfer script is a one-time offline operator tool, not a runtime dependency.

## Implemented controls

- Customer reads use primary-key/owner indexes, a 50-address cap and bounded cart/item/modifier inputs. Cart writes use optimistic versions; concurrent requests cannot silently overwrite each other.
- Idempotent address writes and order-scoped cash writes acquire transactional locks. Unique collection and active-assignment indexes protect retries and concurrent devices. Money remains integer Paisa.
- Separate cash policy modes: `current_cash` permits an assignment while held cash is below the threshold, including a crossing order; `projected_cash` requires held plus reserved plus proposed cash within the threshold. There is no automatic default. Assignment reservations are exposure, not held cash or commission reservations. One uncollected assignment is permitted per rider. Collection of already accepted cash is recorded even if it crosses the current-cash threshold; subsequent assignment is blocked.
- Service pools cap at 10 connections, with 1 s acquisition, 5 s statement, 2 s lock and 10 s idle-transaction limits. Size the total pool budget across all replicas before deployment. Timeouts bound failures; they do not prove the latency targets.
- Internal HTTP calls have a 2 s deadline and disallow redirects. Production calls require TLS. Session validation checks Identity on every protected request, fails closed and uses current roles. No revocation-sensitive authorization cache is used.
- Gateway responses stream with backpressure instead of buffering entire bodies. Upstream deadlines remain 5 s. Authentication headers and internal credentials are never forwarded indiscriminately.
- Outbox publishing uses confirmations, a 2 s confirmation deadline and mandatory routing. Unrouted events remain unpublished with retry state. Provision durable consumer queues/bindings before relying on delivery. Complete consumer retries/dead-letter/replay tooling is still required.
- React Native uses asynchronous networking and SecureStore, one shared session refresh, account-scoped query caches, disabled mutation retries and cancellation. Only the selected workspace mounts. Release bundle and native-device profiling remain gates; shared code does not prove frame/startup performance. Response sizes are checked, but fetch still buffers responses, so APIs must enforce bounded payloads.
- Internal `/metrics` exposes bounded route-template request histograms, in-flight requests and memory. Set `METRICS_TOKEN` and send `X-Service-Token`; never expose metrics through the public gateway. Do not attach IDs or raw URLs as metric labels.

## Evidence still required

The service histograms include live session validation and database work. Scrape each replica and aggregate histogram buckets before estimating p95. Alert separately on error rate, saturation and outbox age; fast errors are not successful performance.

`tests/load/customer-baseline.js` is a k6 baseline at 50 **profile reads** per minute. It is not the 50 **orders** per minute pilot acceptance test. Run against staging fixtures with `API_BASE_URL` and a short-lived `ACCESS_TOKEN`. Do not commit tokens or test results containing credentials.

The full load journey must use realistic menu sizes, concurrent customers/riders, cold and warm starts, broker outages and slow networks. Measure checkout, KDS arrival, captured-location delivery and first dispatch offer end to end. Retain machine size, replica counts, database settings, build hash, workload, errors and percentile evidence. Add Android startup/frame/memory measurements on representative low-memory devices before declaring performance acceptance.

## Profile migration

Apply Customer migrations; keep the existing phone encryption key unchanged. Deploy the Identity phone writer retirement (old route returns 410). Pause conflicting profile writes, back up both stores and run `node --env-file=.env scripts/migrate-customer-profiles.mjs` with `PROFILE_MIGRATION_WRITES_PAUSED=true` in the operator environment. The job copies ciphertext in batches, checks conflicts, never overwrites an existing Customer profile and retains the source. Resolve conflicts explicitly and rerun. Source cleanup requires a separate reviewed migration after verification and backup recovery tests.

Migration files now have checksums and a per-database migration lock. Old deployments without recorded checksums stop until their applied SQL is reviewed; `ADOPT_MIGRATION_CHECKSUMS=true` explicitly adopts the checked files. Never edit applied migrations to bypass a failed financial unique index; investigate and reconcile existing duplicates first.

## Remaining security and reliability work

Separate migration-owner and restricted runtime database roles are required for production: row triggers guard ordinary mutations but database owners can change schema. Staff MFA, finance permissions, trusted host/IP enforcement, distributed rate limiting, broker consumers/dead letters, private image handling, and audit/backup/alert drills remain release blockers. Current shared signing and service credentials need production secret rotation and least-privilege deployment review.
