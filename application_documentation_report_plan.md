# Plan: Complete Khana KarLo Application Documentation Report

## Goal

Produce one comprehensive Markdown report that accurately documents the Khana KarLo application as it exists after the first service-decomposition migration slice. The report will be suitable for product review, engineering handover, and launch-planning discussions. It will consolidate the application’s Customer, Business, Rider, Admin, backend, database, workspace, offline, and microservices information while clearly separating implemented behavior from preview-only behavior and planned production scope.

## Source-of-Truth Method

The report will reconcile the current implementation against the following sources before writing:

| Source category | Evidence to inspect | Use in report |
|---|---|---|
| Product and screen scope | Existing product blueprint, design, research, and gap-analysis documents | Product promise, roles, screen inventory, and roadmap context. |
| Current application code | Expo routes, workspace routing, customer state, Business management, Rider delivery, and shared UI components | Implemented mobile flows and current preview limitations. |
| Backend implementation | tRPC gateway, domain modules, service interfaces, error mapping, storage helpers, and outbox code | API structure, domain ownership, integration boundaries, and operational architecture. |
| Data layer | Drizzle schema, migrations, and indexes | Persisted entities, data ownership, and migration state. |
| Quality evidence | Vitest suite, TypeScript, lint status, and checkpoint history | Validation result and known testing coverage. |
| Project checklist | `todo.md` and approved migration plan | Completed milestones, unresolved items, and recommended next work. |

## Report Structure

The final document will contain the following sections.

1. **Executive summary.** State the product purpose, geographic pilot, one-app workspace model, current maturity, and the distinction between production-ready foundations and preview-only flows.
2. **Product model and roles.** Explain Customer, Khana KarLo Business (Restaurant and Cloud Kitchen), Rider, and internal Admin responsibilities, access gates, and workspace switching behavior.
3. **End-to-end user journeys.** Describe the current Customer mobile-number/OTP/location entry path, customer discovery/cart/order behavior, Business onboarding and approval, catalogue operations, Restaurant operations, Rider operations, and admin review.
4. **Screen and navigation inventory.** Present route groups and important screens in a structured table, including the current destination of each workspace action.
5. **Mobile architecture.** Document Expo Router, React Native, state persistence, typed tRPC client, skeleton loading, offline discovery cache, cart persistence, optimistic mutations, success feedback, and current preview adapters.
6. **Backend and API architecture.** Describe the gateway/router, Identity & Workspace, Business Onboarding, Catalogue, Discovery, error mapping, storage integration, and API compatibility approach.
7. **Data architecture.** Explain account and workspace records, Business/Cloud Kitchen tables, catalogue records, audit events, and the transactional outbox with its retry policy. State explicitly which operational data models have not yet been added.
8. **Microservices migration status.** Summarize the completed modular service-boundary foundation and give the approved future extraction order: Order, Dispatch, COD Payments, Discovery projection, Notifications, and independently deployed workers.
9. **Security and operational controls.** Cover protected procedures, server-side role checks, approval gates, document constraints, minor-unit money representation, audit trail, error normalization, outbox idempotency, and current authentication caveats.
10. **Quality and validation.** Report deterministic test count, TypeScript and lint status, migration review, plus what is and is not covered by current tests.
11. **Known gaps and production launch plan.** Separate Priority 0 launch blockers from later improvements, using practical dependencies and acceptance criteria.
12. **Repository and runbook.** Give the repository, local commands, database migration procedure, preview behavior, and a concise engineering onboarding checklist.

## Important Reporting Decisions

The report will not claim that preview-only Customer/Business/Rider pathways are fully production-authenticated. It will clearly state that the current direct phone/OTP path is a preview flow, that server-protected Business access remains approval-gated for authenticated accounts, and that Order, Dispatch, Payments, and end-user push notifications require persisted production services before launch.

## Incorporated Launch-Blocker Sequence

The user-provided implementation plan will be included as the report’s authoritative near-term delivery sequence. It establishes the following order of work: **Order Service**, **manual Rider Dispatch**, **COD Payments and settlement ledger**, and **event-driven Notifications**, followed by a small real-restaurant pilot. The report will preserve its non-negotiable requirements: every operational transition emits an outbox event; all PKR values remain in minor units; server-side approval and role enforcement are authoritative; and preview-only phone/OTP authentication remains a launch blocker until a real production authentication path exists.

Discovery projection and independently deployed workers will be documented as post-pilot scalability work rather than falsely presented as current production infrastructure. The report will also record the stated MVP boundaries: manual Rider assignment before geo-matching or live GPS tracking, COD tracking before automated JazzCash/EasyPaisa payouts or card payments, and manual settlement appropriate to the initial pilot.

All financial references will retain the established PKR minor-unit convention. The report will avoid treating a code-structure migration as proof of independent physical service deployment: the current result is a gateway-compatible domain decomposition with an outbox foundation, not yet separately hosted network services.

## Verification Before Delivery

Before delivering, the completed report will be checked against the latest routes, router procedures, schema, migration files, test output, and project checklist. Any inconsistency between older documentation and current code will be called out and resolved in favor of current code and migration state.

## Deliverable

The execution phase will create `KHANA_KARLO_APPLICATION_DOCUMENTATION.md` in the project root. It will be delivered as a rendered Markdown attachment, with no PDF conversion unless specifically requested later.

## Assumptions and Risks

This plan assumes the requested report should be an engineering and product handover document rather than an investor deck, app-store listing, or legal/privacy policy. The primary risk is that earlier product documentation describes future scope as though it is implemented; the report will mitigate this by applying explicit labels: **Implemented**, **Preview-only**, **Foundation completed**, and **Planned**.
