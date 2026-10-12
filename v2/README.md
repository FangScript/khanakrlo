# Khana KarLo v2

This is the pilot rebuild alongside the legacy Expo application. The existing app is retained as a business-rules reference; pilot users and new writes belong to v2.

## Pilot stack

- Mobile: one React Native + Expo + TypeScript app for Android and iOS, with customer, merchant and rider workspaces selected from server-assigned roles. Active client: `clients/mobile`. The old Kotlin/Swift directories are inactive references.
- Admin: desktop-only Next.js application.
- Backend: independently deployable TypeScript/Express services behind the API gateway. Each service receives credentials for its own PostgreSQL database.
- Integration: RabbitMQ events written through transactional outboxes; Redis for bounded cache/locks/live-location support; MinIO for local S3-compatible object storage.
- Contracts: OpenAPI 3.1 for HTTP, generated TypeScript mobile clients, static contract mocks and versioned JSON Schema event envelopes.

## Local setup

1. Copy `.env.example` to `.env` and set Google OAuth client IDs, token secrets, the phone-encryption key, COD custody ceiling, service-scoped internal tokens (`INTERNAL_IDENTITY_TOKEN`, `INTERNAL_CUSTOMER_TOKEN`, `INTERNAL_RESTAURANT_IDENTITY_TOKEN`, `RESTAURANT_INTERNAL_TOKEN`, `MENU_INTERNAL_TOKEN`, `PAYMENT_INTERNAL_TOKEN`, `ORDER_INTERNAL_TOKEN`, `DELIVERY_INTERNAL_TOKEN`, `REVIEW_INTERNAL_TOKEN`, `ANALYTICS_INTERNAL_TOKEN`), Admin MFA encryption/signing keys, `METRICS_TOKEN`, the explicit custody policy, commission, delivery fee and service fee before using protected workflows.
2. Start infrastructure with `pnpm compose:up`.
3. Run `pnpm install`, then use `pnpm compose:apps:up` to build and start each API process as a separate container behind the gateway. Local Compose runs each service's database migrations before starting its API. The mobile client uses the gateway on port 3100 by default.
4. Run `pnpm check` and `pnpm test` before submitting a change.

The Compose database bootstrap creates isolated databases and credentials for every service. Apply the outbox foundation and service migrations to all eleven service databases with `pnpm migrate <service>` before starting their APIs. Service health endpoints are `/health/live` and `/health/ready`; readiness requires that service's database. Configure the internal service token only in trusted backend deployments; the payment service uses it to accept COD assignment and delivery state from the order/delivery workflow.

## Pilot order of delivery

Foundation and contracts → gateway/identity → restaurant/menu/order → payment/delivery → customer/reviews/notifications/admin/analytics → security, resilience, and pilot acceptance. Android is the pilot target for all three mobile roles. Customer iOS follows the Android pilot. Digital payments and AI remain disabled until their later delivery phase.

Money policy values remain configuration. Set `COD_CUSTODY_POLICY` explicitly to `current_cash` or `projected_cash`; these have different assignment semantics. Cash reservations are separate from held cash and commission reservations. Pending remittances do not reduce custody. The staff-verification prototype does not yet meet the required separate Admin MFA/permission controls and is not pilot-ready.

## Current implementation status

The foundation includes separate deployable service processes and database credentials, Google sessions with revocation checks, Customer-owned encrypted phone/profile/address/cart records, transactional idempotency, guarded COD cash records, streaming gateway responses, and request metrics. Restaurant, Menu, Order, Payment, Delivery, Notification, Review, Customer, Identity, Analytics, and Admin now own APIs and storage or event-consumer behavior. They communicate through REST contracts or versioned RabbitMQ events rather than querying each other's databases. The API gateway restricts Admin routes to the configured canonical host and client IP allowlist. Admin has per-staff TOTP enrollment, rate-limited verification, encrypted secrets, and short-lived MFA session tokens; the desktop console UI and production identity provisioning remain unfinished.

The integrated backend slice now covers self-service merchant onboarding, menu editing and server-priced COD order placement, merchant order-state changes, durable dispatch queue creation, rider availability/offers/assignment, active-delivery tracking with stale-location indicators, cash-custody authorization, payment-confirmed collection before delivery completion, customer notifications from order events, and delivered-order review eligibility with moderation state. Event consumers deduplicate with their database effects in one transaction; outbound events use transactional outboxes. Identity customer PII was removed through a new forward-only migration, preserving already-applied migration history.

This is not pilot-complete yet. Rider role approval/onboarding, full KDS and customer/rider app journeys, FCM push delivery, chat and masked calling, Admin desktop sign-in/UI, review-photo object access, production secrets and deployments, runbooks/backup restore, and the 20-order COD/load/device acceptance evidence remain open. Compose can start service processes locally after the explicit launch secrets and money-policy values are configured. Build/contract checks are run during the migration; integration and acceptance tests still need to validate the connected system before pilot use.

See [team delivery and ownership](docs/team-delivery.md), [performance and boundaries](docs/performance-and-boundaries.md), and [mobile setup](clients/mobile/README.md). Preserve the legacy application and its current uncommitted work.
