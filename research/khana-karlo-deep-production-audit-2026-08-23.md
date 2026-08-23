# Khana KarLo Deep Production Audit

**Assessment date:** 23 August 2026  
**Scope:** Expo mobile client, Node/tRPC API, Drizzle/TiDB schema delivery, authentication, Rider tracking, notifications, maps, operational finance, and managed-preview readiness.

## Executive conclusion

The codebase has a substantial amount of implemented domain functionality and a healthy static baseline, but it is **not ready for a public production launch**. The primary risks are not TypeScript failures; they are configuration, security-boundary, deployment, and delivery-reliability defects that normal unit and source-contract tests do not exercise.

The audit confirmed **five release-blocking findings**, eight high-priority risks, and several medium-priority hardening gaps. The immediate priority is to establish a secure, fixed, native-reachable runtime before adding further product features.

## Evidence collected

| Check | Result | Interpretation |
|---|---:|---|
| Vitest | 47 files passed; 1 skipped; 134 tests passed | Existing domain and source-contract coverage is healthy, but it does not prove native or managed-preview operation. |
| TypeScript | Passed | No compile-time errors were found. |
| Expo lint | Passed with `MODULE_TYPELESS_PACKAGE_JSON` warning | The warning is non-blocking but should be resolved during build hygiene work. |
| Drizzle static check | Passed | The local migration metadata is internally consistent. |
| Database migration ledger | Only one applied record returned | The database contains newer tables that are not represented in the migration ledger. |
| Managed development preview | Stopped; managed restarts timed out | Local/manual processes can listen, but the platform-managed phone preview does not register reliably. |
| Production dependency audit | 2 critical, 71 high, 44 moderate findings | Dependency remediation must be triaged before release. |

> **Important distinction:** passing tests and linting show that the checked source paths compile and satisfy the existing test assertions. They do not validate a real device, background task execution, Expo Push delivery, Maps rendering, a clean database restore, or a managed sandbox connection.

## Release-blocking findings

| ID | Severity | Confirmed finding | Evidence | Impact | Required remediation |
|---|---|---|---|---|---|
| P0-01 | Critical | The phone sign-in route is preview authentication, not production OTP. It accepts a mobile number, creates a preview identity, and issues a one-year bearer session; it has no environment guard or rate limit. | `server/_core/previewPhoneAuth.ts:14-31` | Any caller who knows a valid format can create a long-lived account session. This cannot ship in a public service. | Disable the route outside preview, replace it with rate-limited OTP verification, shorten session lifetime, and add device/session revocation. |
| P0-02 | Critical | CORS reflects **any** request origin while allowing credentials. Session cookies are cross-site (`sameSite: "none"`) and shared across the parent domain. | `server/_core/index.ts:36-55`; `server/_core/cookies.ts:47-59` | A hostile website can make credentialed browser requests and read API responses when a victim has an active web session. | Replace origin reflection with an explicit allowlist, reject unknown origins, add `Vary: Origin`, and use a stricter cookie policy where possible. |
| P0-03 | Critical | Native clients have no reliable API-base fallback. `getApiBaseUrl()` can return an empty string outside web, while the server may silently select `3001`–`3019` if port 3000 is busy. | `constants/oauth.ts:32-49`; `server/_core/index.ts:22-29,76-85`; `lib/preview-phone-session.ts:10-16` | Native sign-in, tRPC, and preview-phone requests can target relative URLs or the wrong API origin. This is a direct candidate cause of phone failures after installation. | Require `EXPO_PUBLIC_API_BASE_URL` for native builds, fail fast when absent, keep the API port fixed under the managed supervisor, and validate the resolved endpoint during app launch. |
| P0-04 | Critical | The migration ledger records one migration while the live database already contains recent notification, ledger, command, route, and tracking tables. | `SELECT ... FROM __drizzle_migrations` returned one row; newer tables exist in `information_schema`; local migrations run through `0029`. | A clean environment, rollback, or future `drizzle migrate` can diverge from the actual schema or fail on already-created objects. | Reconcile migration history in a controlled staging copy, create a verified baseline, test an empty-database restore, and never apply future schema changes outside the ledgered migration process. |
| P0-05 | Critical | The configured development entry point is web-only (`expo start --web`), while physical phone testing needs a native Metro/dev-client path and a managed tunnel. Managed restarts time out despite manually reachable ports. | `package.json` `dev:metro`; managed runtime status and restart evidence | The phone-facing sandbox can remain disabled even though local HTTP responds, and native-only modules cannot be validated through the web preview. | Split managed web preview and native development scripts; start the native path with a non-interactive tunnel/dev-client configuration, then verify a real Android/iOS device before release. |

## High-priority defects and delivery risks

| ID | Severity | Confirmed finding | Evidence | Impact | Required remediation |
|---|---|---|---|---|---|
| P1-01 | High | Expo Push registration silently exits if no EAS project ID exists. The current public Expo configuration has no such project ID. | `app/_layout.tsx:74-78`; generated Expo config | No device token is registered; push notifications remain in-app only. The catch block gives no operational signal. | Configure the EAS project ID and native credentials, report registration state to the user and operations dashboard, and add a physical-device registration test. |
| P1-02 | High | Native Maps configuration has no platform map API key, while the app imports `react-native-maps`. Google Routes is also intentionally unconfigured. | `app.config.ts`; `components/delivery-tracking-map.native.tsx`; routing service configuration | Maps or route/ETA data can be blank or unavailable in a release build. | Configure restricted Android/iOS Maps keys and a server-only Routes key, then add quota/error monitoring and a no-key fallback test. |
| P1-03 | High | `expo-location` is registered twice with conflicting permission descriptions. | `app.config.ts:100-108,135-139`; generated config repeats location permissions | Permission copy and background-location capability can vary by generated native project; Android receives duplicate declarations. | Merge to one `expo-location` plugin declaration with the complete foreground/background configuration. |
| P1-04 | High | Background Rider tracking only persists samples to AsyncStorage. It performs no authenticated upload in the background; uploads wait for the foreground root synchronizer. | `lib/rider-background-tracking.ts:23-39`; `app/_layout.tsx:44-55` | A Rider can move while the app is backgrounded but the Customer will not receive a live position until the app later foregrounds and flushes. | Add a bounded authenticated background transport or explicitly market this as deferred sync; verify platform execution/OS quotas in a real dev build. |
| P1-05 | High | The Rider command queue and active-delivery state are global device keys, not scoped to the authenticated Rider. Storage write failures are swallowed. | `lib/rider-command-queue.ts:12-45`; `lib/rider-background-tracking.ts:8-20,49`; queue flush in `app/_layout.tsx` | After account switching, old commands can flush under another Rider; offline commands can disappear without a visible recovery state. | Namespace queue/session keys by user and device, stop/clear on logout or account switch, persist failure visibility, and add concurrency-safe queue writes. |
| P1-06 | High | Notification retries are only triggered after creating another notification. No durable worker claims queued deliveries after restart; parallel calls can inspect the same queued row. | `server/notification-service.ts:52,81-120` | Scheduled retries are not reliable, and duplicate push sends are possible under concurrent load. | Use a worker/queue with an atomic claim or lease, retry scheduling, Expo receipt processing, and dead-letter monitoring. |
| P1-07 | High | Location samples, command receipts, notification deliveries, and route snapshots have no retention or purge implementation. | `drizzle/schema.ts`; no location/notification retention job found; `server/order-service.ts:633-640` writes each sample | Sensitive Rider location history and operational records grow without a retention boundary, increasing privacy and cost risk. | Define retention by data class, run an auditable purge job, retain only aggregated operational evidence where needed, and document the policy. |
| P1-08 | High | Production dependency audit reports 2 critical, 71 high, and 44 moderate advisories in the production dependency graph. | `pnpm audit --prod --json` | Known vulnerable transitive packages may be pulled into release builds or tooling. | Produce a lockfile/SBOM triage, update direct dependencies first, use supported overrides only after compatibility testing, and re-run the audit until accepted residual risk is documented. |

## Medium-priority hardening findings

| ID | Finding | Evidence | Recommended action |
|---|---|---|---|
| P2-01 | Critical operational tables have no observed database foreign-key constraints. | `information_schema.table_constraints` returned no foreign-key rows for the audited tracking, finance, support, command, and notification tables. | Add referential constraints where TiDB deployment policy permits, or compensate with transaction-level existence checks, reconciliation jobs, and orphan-detection reports. |
| P2-02 | The API accepts JSON and URL-encoded bodies up to 50 MB globally. | `server/_core/index.ts:57-58` | Apply endpoint-specific payload limits; keep small JSON endpoints small and isolate legitimate upload routes. |
| P2-03 | A push is marked `delivered` when Expo accepts a ticket, not after provider receipt confirmation. | `server/notification-service.ts:101-110` | Store ticket IDs as accepted, retrieve Expo receipts asynchronously, and distinguish accepted, delivered, and device-unregistered outcomes. |
| P2-04 | One authentication test is skipped, and most automated checks are source/contract tests rather than end-to-end native tests. | Vitest summary; test suite structure | Add real-device smoke tests for sign-in, checkout, Rider lifecycle, foreground/background location, push reception, and deep links. |
| P2-05 | Lint emits a module-type warning for the ESLint configuration. | `pnpm lint` output | Standardize package module type or convert the ESLint config format after confirming Expo tooling compatibility. |

## Activation blockers, not source-code defects

The following features are intentionally provider-ready but cannot be represented as live in production until their operational prerequisites are supplied and tested.

| Capability | Current state | Blocker |
|---|---|---|
| SMS OTP | Preview-only path remains active | Approved Pakistan SMS provider, sender/template approval, rate limits, session policy, and fraud controls. |
| Expo Push | In-app inbox works; remote push code is conditional | EAS project ID, Android/iOS credentials, physical-device token registration, worker/receipt processing. |
| Maps and ETA | Native map component and route adapter exist | Restricted Maps keys, server Routes key, quota/billing controls, native build validation. |
| Redis live state | Interface exists | Redis service URL/credentials, connection monitoring, channel authorization, and worker lifecycle. |
| Payments and refunds | Internal ledger and controlled manual flow exist | PSP selection, settlement/reconciliation policy, refunds authority, consumer disclosures, tax/legal review. |
| Managed phone sandbox | Local HTTP process can respond | Managed runtime/tunnel registration remains unavailable; this needs platform support if it persists after using the native-managed start path. |

## Remediation sequence

### Release gate 1 — security and identity

Remove preview authentication from all non-preview deployments, introduce OTP verification with explicit rate limits and short-lived sessions, and restrict CORS to known Customer, Business, Rider, and Admin origins. Complete this gate before accepting real orders or publishing a public web client.

### Release gate 2 — deterministic deployment

Make the API origin mandatory for native builds, prevent silent port substitution in managed environments, reconcile the Drizzle migration ledger, and prove a clean database restore in staging. The web preview and native development path should be separate scripts with documented ownership.

### Release gate 3 — real operations

Configure EAS/Push, Maps, Routes, and Redis; then run a real-device Rider-to-Customer delivery test. Add worker-backed notification retries, Expo receipt processing, and an explicit live-location freshness service.

### Release gate 4 — privacy, reliability, and supply chain

Scope offline queues to the signed-in user, make storage failure visible, implement location/notification retention, perform dependency remediation, and add device-level end-to-end tests. Require these controls before expanding beyond a controlled Islamabad/Rawalpindi pilot.

## What is working well

The project has strong business-domain coverage for order state transitions, cash custody, support ownership, dispatch scoring, Admin separation, and operational audit trails. The offline command and notification schemas provide a useful foundation. The major next step is to convert those foundations into a securely configured, deployable, device-validated system rather than adding more feature surface.

## Audit limitations

This assessment used source inspection, database metadata, dependency scanning, and automated checks. It did not perform destructive database testing, live payment transactions, actual provider delivery, penetration testing, load testing, or real-device OS background execution because required provider credentials and a managed phone runtime were unavailable. These remain mandatory before production launch.
