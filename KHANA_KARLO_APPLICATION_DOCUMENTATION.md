# Khana KarLo — Complete Application Documentation

**Document status:** Current implementation and launch-readiness report  
**Author:** Manus AI  
**Current application checkpoint:** `286dae60`  
**Repository:** [FangScript/khanakrlo](https://github.com/FangScript/khanakrlo)  
**Pilot market:** Islamabad and Rawalpindi, Pakistan  
**Product model:** One mobile application with Customer, Khana KarLo Business, and Rider workspaces; Admin operations are an internal protected surface.

> **Status statement.** Khana KarLo now has a production-oriented Business, catalogue, discovery, workspace, audit, and gateway foundation. It is **not yet a live marketplace** because the shared Order, Dispatch, COD ledger, production phone authentication, and end-user notification services are not yet implemented. The existing Customer, Restaurant, and Rider operational flows are useful for demonstration and workflow validation, but several still use preview-local state until the Order and Dispatch domains replace them.

## 1. Executive Summary

Khana KarLo is a Pakistan-first food-ordering platform designed around a single branded Expo mobile application. A user enters as a Customer by default and can open additional approval-gated workspaces for a Restaurant/Cloud Kitchen Business or as a Rider. This model avoids maintaining three unrelated apps while preserving role-specific operational screens and permissions.

The current implementation supports mobile-number-first Customer onboarding, persisted local Customer sessions, approved Business onboarding and document review, catalogue management, live Business discovery, Customer profile/logout, workspace switching, Restaurant order-operation preview flows, and Rider delivery-operation preview flows. The backend uses Node/Express, tRPC, Drizzle, MySQL/TiDB-compatible schema definitions, storage integration, audit events, and a new transactional-outbox foundation. The mobile client uses Expo SDK 54, React Native, TypeScript, Expo Router, NativeWind, and React Query. [1] [2]

| Area | Current maturity | What is real today | What must exist before commercial launch |
|---|---|---|---|
| Customer entry | **Preview-ready** | Pakistan +92 phone UI, OTP preview route, location setup, persisted session | Real SMS OTP, rate limiting, account recovery, consent, and secure account linking |
| Customer discovery | **Foundation completed** | Live approved Business query, Restaurant/Cloud Kitchen filter, local cache fallback | Service-zone eligibility, ranking, true menu detail, real order creation |
| Business onboarding | **Production-oriented foundation** | Database records, uploads, review checklist, Admin decisions, activation guard | Operational verification policy, staff controls, real identity verification |
| Catalogue | **Production-oriented foundation** | Categories, menu items, modifiers, availability, live/paused status | Order-time price snapshot, inventory/stock, image pipeline, menu publishing controls |
| Restaurant operations | **Preview + guarded workflow** | Live-order interface, state controls, Business workspace access | Persisted Order service and authoritative Restaurant queue |
| Rider operations | **Preview + guarded workflow** | Availability, assignment/delivery screens, proof flow shell | Rider approval, Dispatch service, assignments, GPS/location, COD collection |
| Admin operations | **Initial internal surface** | Protected Business application review queue | Full order support, manual dispatch, rider review, COD reconciliation and finance console |
| Service architecture | **Migration foundation completed** | Typed domain interfaces, gateway contracts, typed errors, transactional outbox schema | Order/Dispatch/Payments/Notifications domains and independently deployed workers |

## 2. Product and Role Model

Khana KarLo is intentionally a **one-app workspace platform**, not three unrelated consumer, restaurant, and rider applications. Customer is the default experience. Business and Rider entry points are shown through **Khana KarLo Workspaces** in the Customer profile. In a connected production account, access is authoritative through workspace membership and approval status. In the mobile preview, persisted local session bridges are used only so the currently implemented Business and Rider screens remain demonstrable after a reload. [1]

| Role or workspace | Primary user | Current capability | Access policy |
|---|---|---|---|
| **Customer** | Diner | Discover live Business records, browse existing food experience, maintain local cart, view orders/profile | Default workspace after phone/location onboarding |
| **Khana KarLo Business** | Restaurant owner or Cloud Kitchen operator | Apply, upload documents, undergo Admin review, manage menu/catalogue, set live state, view Restaurant operations | Approval-gated for real backend access; preview bridge supports local operating-screen demonstration |
| **Rider** | Delivery partner | View rider dashboard, availability state, delivery offer and proof-of-delivery workflow | Approval-gated conceptually; persisted preview workflow exists pending Dispatch service |
| **Admin** | Khana KarLo operations staff | Review Business applications, approve, request changes, suspend, and inspect checklist context | Server-protected admin role |

### Restaurant and Cloud Kitchen Scope

Both **Restaurant** and **Cloud Kitchen** models are day-one Business types. The schema supports an organisation, Restaurant outlets, Cloud Kitchen facilities, multiple brands, production stations, service zones, hours, menu categories, items, modifiers, staff records, payout profile, documents, and review checklists. The mobile Business workflow renders a unified management experience while the data model retains the distinct operational structure required by Cloud Kitchens. [1]

## 3. Customer Experience

### 3.1 Entry, Registration, and Location

The active Customer entry route is mobile-number-first. Google and the temporary mock-Google route were removed from the active screen. The user enters a Pakistan mobile number using a **+92** prefix, progresses to an OTP verification view, then completes delivery location setup before entering Customer Home. The OTP flow is currently a preview UI; it does not send or verify a real SMS. This must be treated as a launch blocker, not as finished authentication.

| Route | Screen purpose | Current implementation status |
|---|---|---|
| `/auth/login` | Direct Customer mobile-number entry | Implemented preview flow |
| `/auth/phone` and `/auth/welcome` | Phone-oriented entry variants used by the onboarding sequence | Implemented preview flow |
| `/auth/verify` | OTP entry and progression | Preview-only; no SMS provider |
| `/auth/location` | Foreground location request or manual delivery detail | Implemented client flow; no zone enforcement yet |
| `/auth/profile` | Customer profile basics | Implemented onboarding data capture |

The application persists Customer session information locally so a verified preview user can return to Home without repeating initial onboarding. Customer logout appears in the Profile screen, requests confirmation, clears the local session, and returns to sign-in.

### 3.2 Discovery, Catalogue, Cart, and Offline Behavior

The Customer Home uses the public `discovery.liveBusinesses` query to retrieve approved, customer-ready Restaurants and Cloud Kitchens. It supports Restaurant and Cloud Kitchen filters and shows a branded skeleton while server data is loading. The last successful discovery response is cached locally, so the user can browse previously loaded kitchens during temporary connectivity loss. Cached data is labeled as offline/stale rather than presented as live availability.

The Customer cart is persisted locally. This lets a user continue building an order without a connection, but it is **not yet a server cart or a real order**. Existing cart pricing logic follows the project’s PKR minor-unit convention; all production money must remain integer paisas rather than floating-point values. [1]

| Feature | Current behavior | Limit before launch |
|---|---|---|
| Live discovery | Reads approved/live Business records through tRPC | No full service-zone eligibility or ranking projection |
| Business type filter | Restaurant and Cloud Kitchen chips | No cuisine, distance, ETA, promotion, or open-hours filter engine |
| Loading feedback | Branded low-motion-aware skeletons | Needs device accessibility QA |
| Offline discovery | AsyncStorage-backed last-successful result | No conflict refresh policy or image prefetch policy |
| Cart | Locally persisted | No server inventory validation, reservation, or checkout idempotency |
| Checkout | Experience shell and COD-first direction | No real Order, payment, receipt, or Restaurant handoff |
| Customer order alerts | In-app visual status-alert component | No server-driven state stream or push delivery |

## 4. Business Experience

### 4.1 Business Onboarding and Approval

Business onboarding is one of the strongest production-oriented foundations in the current build. A Restaurant or Cloud Kitchen applicant can save a resumable application, provide legal and operating details, upload approved file types, submit for review, and receive an approval decision. Documents are stored through the configured storage layer, while metadata and review state remain in the database. An Admin can approve, request changes, or suspend an application; approval activates the relevant Business workspace membership. [1]

The approval action writes both its Business/workspace state and a `business.approved` transactional outbox event. This is important because later Discovery, Notifications, and operational services can react without synchronously coupling their state changes to the approval handler.

### 4.2 Business Dashboard and Catalogue Management

Approved Business users have a dashboard showing operating context, live/paused state, catalogue summary, and links to catalogue and Restaurant operations. The catalogue interface supports categories, items, modifiers, prices in minor units, preparation time, availability controls, and Business live status. Availability mutations update optimistically for responsiveness and roll back if the server mutation fails. Failed availability mutations are persisted in a local queue and retried when network reachability returns.

| Business surface | Current capability | Operational note |
|---|---|---|
| `/business/onboarding` | Restaurant and Cloud Kitchen application workflow | Persists Business application and associated records |
| `/admin/business-applications` | Admin Business review queue | Protected admin review surface |
| `/business/home` | Business dashboard | Supports approval-aware and preview-session access behavior |
| `/business/catalogue` | Category, item, modifier, availability, live-status editor | Backed by protected gateway procedures |
| `/merchant/orders` | Restaurant operational queue | Currently a preview/local order workflow pending Order service |
| `/merchant/profile` | Merchant profile shell | Requires persisted staff, payout, hours, and support features |

## 5. Rider Experience

The Rider workspace provides the current visual and interaction basis for a delivery partner operation. A Rider can set availability, review an offered assignment, advance through pickup and delivery states, view cash-collection information, and confirm proof-of-delivery. It includes success feedback for operational updates and a profile shell for vehicle/document/earnings context.

This is not yet connected to a production Dispatch domain. Assignment cards and delivery lifecycle state are still preview-oriented. The future Dispatch service will own delivery jobs, manual assignment first, Rider acceptance, pickup, delivery completion, proof metadata, and operational exception handling.

| Rider route | Current purpose | Required production replacement |
|---|---|---|
| `/rider` | Availability dashboard and delivery-offer list | Dispatch-backed Rider workload query |
| `/rider/delivery/[id]` | Offer, pickup, delivery, and proof flow | Persisted delivery job and actor-authorized transition commands |
| `/rider/profile` | Rider profile and earnings shell | Rider approval, document review, payout ledger, safety and settings |

## 6. Workspace Routing and Access Control

The app previously returned users to registration when they switched workspaces after Customer onboarding. This was corrected by separating persisted Customer/Restaurant session checks from temporary in-memory navigation state. A registered preview user can now open **Profile → Khana KarLo Workspaces** and enter Customer Home, Restaurant Management, or Rider operations without a reload restarting the phone-registration sequence.

The distinction between preview routing and production authorization is deliberate:

| Concern | Preview behavior | Production behavior required |
|---|---|---|
| Customer session | Local persisted profile/session | Real phone identity and secure server session |
| Workspace selection | Local bridge permits existing screens to be inspected | `workspace_memberships` and approval state must be source of truth |
| Business access | Preview fallback permits screen demonstration | Protected tRPC and approved Business membership |
| Rider access | Preview rider workflow is available | Approved Rider membership plus Dispatch-owned assigned jobs |
| Admin access | Protected role check | Formal internal account policy and administrative audit controls |

## 7. Mobile Architecture

The mobile app is built with Expo SDK 54, React Native 0.81, React 19, TypeScript, Expo Router 6, NativeWind, TanStack Query, tRPC v11, and AsyncStorage. Expo Network is included for retry behavior that depends on Internet reachability. The app maintains portrait-first layouts and applies the Khana KarLo deep green (`#064B2C`), orange (`#FF6B00`), saffron (`#FFB73D`), and cream (`#FFF8ED`) brand system. [1]

### 7.1 State and Reliability Patterns

| Pattern | Implementation | Why it matters |
|---|---|---|
| Loading skeletons | Shared animated, low-motion-aware skeleton component | Prevents empty or static screens while Business/discovery data loads |
| Optimistic mutation | Catalogue availability updates | Makes Business management feel responsive while retaining rollback safety |
| Success feedback | Animated success toast after Restaurant and Rider actions | Confirms state transitions without blocking workflow |
| Offline discovery | Typed local cache and stale-data indicator | Allows previously loaded kitchens to remain browsable offline |
| Offline cart | Local cart hydration and persistence | Preserves selection before a real Order service exists |
| Retry queue | Durable queued catalogue availability mutations | Retries protected updates when connectivity returns |
| Workspace bridge | Persisted local preview context | Avoids registration loops in Expo preview; not a substitute for server authorization |

### 7.2 Route Inventory

The current source contains 24 Expo route components. The most important role-facing routes are summarized below; development and callback routes are intentionally excluded from product-flow counts.

| Route group | Main routes | Role and responsibility |
|---|---|---|
| Customer onboarding | `/auth/login`, `/auth/verify`, `/auth/location`, `/auth/profile` | Mobile number, preview OTP, location and profile setup |
| Customer tabs | `/(tabs)`, `/(tabs)/orders`, `/(tabs)/profile` | Discovery, order-state display, profile/logout/workspaces |
| Customer detail | `/restaurant/[id]` | Restaurant/menu experience; requires Order integration for live purchasing |
| Account | `/account/workspaces` | Customer, Business, and Rider workspace hub |
| Business | `/business/onboarding`, `/business/home`, `/business/catalogue` | Application, dashboard, catalogue and live controls |
| Restaurant operations | `/merchant/orders`, merchant profile routes | Restaurant operating preview and status workflow |
| Rider | `/rider`, `/rider/delivery/[id]`, `/rider/profile` | Rider availability and delivery workflow preview |
| Admin | `/admin/business-applications` | Internal Business approval review |

## 8. Backend and API Architecture

### 8.1 Current Gateway Model

The backend is a Node/Express server using tRPC as the mobile API gateway. The Expo client calls a typed `AppRouter` using React Query. The gateway retains existing tRPC procedure names so the mobile client does not need a wholesale networking rewrite while the backend is decomposed. [1]

The first service-decomposition slice is complete. `server/routers.ts` now acts as a gateway adapter over typed domain modules rather than owning validation and direct aggregate calls inline. The original Business implementation remains an underlying compatibility adapter during the migration; it has **not** yet become independently deployed network services.

| Domain module | Responsibility now | Gateway-facing area |
|---|---|---|
| Identity & Workspace | Workspace summaries, application save/review boundary | `workspace.*` |
| Business Onboarding | Applicant records, documents, Admin review interface | `businessApplication.*`, `adminBusiness.*` |
| Catalogue | Categories, items, modifiers, availability, live status | `businessOperations.*` |
| Discovery | Customer-ready Business discovery filter | `discovery.liveBusinesses` |
| Gateway error layer | Maps typed domain errors to stable tRPC error codes | All extracted gateway calls |
| Event/Outbox layer | Contract definitions, retry policy, outbox persistence | Cross-domain foundation |

### 8.2 Typed Contracts and Error Handling

Request schemas for Workspace, Business onboarding, catalogue, and discovery live in domain contract modules. This removes repeated Zod declarations from the central router and makes it easier to test or relocate a service implementation later. A domain error adapter maps validation, forbidden, not-found, conflict, unavailable, and internal failures into predictable tRPC errors instead of leaking accidental low-level errors to the mobile app.

### 8.3 Transactional Outbox

The `domain_outbox_events` table is an additive foundation for reliable cross-domain integration. It stores the owning domain, event type, aggregate identity, serialized payload, deduplication key, attempt count, retry schedule, failure context, and processing status. The Business approval transaction writes a `business.approved` event atomically with the relevant activation changes.

> **Current boundary:** The outbox table and retry repository exist, but a continuously running event consumer/worker is not deployed yet. No claim should be made that Discovery, Notifications, Dispatch, or Payments are already consuming events.

| Outbox control | Current design |
|---|---|
| Idempotency | Unique `deduplicationKey` prevents duplicate logical event records |
| Retry | Bounded exponential backoff, capped at 30 minutes |
| Scheduling | `nextAttemptAt` makes failed events eligible after backoff |
| Completion | `processedAt` records successful handling |
| Failure visibility | Attempt count and truncated failure text retained per event |
| First emitted event | `business.approved` from the Business approval transaction |

## 9. Data Architecture

The Drizzle schema currently defines 21 tables. It is designed around one account holding multiple workspace memberships instead of separate user identities for Customer, Business, and Rider. Relationships are represented through explicit integer IDs and indexed ownership/status fields. [1]

| Data domain | Main tables | Current use |
|---|---|---|
| Core identity | `users`, `account_profiles` | Account identity and Customer contact/profile record |
| Workspaces and audit | `workspace_memberships`, `workspace_applications`, `audit_events` | Customer default membership, Business/Rider approval state, protected action trail |
| Business onboarding | `business_application_details`, `business_documents`, `business_review_checklists` | Restaurant/Cloud Kitchen application and review evidence |
| Business operations | `business_organisations`, `business_outlets`, `cloud_kitchens`, `kitchen_brands`, `production_stations`, `business_hours`, `service_zones` | Approved Business structure and delivery/production configuration |
| Catalogue | `menu_categories`, `menu_items`, `menu_modifiers` | Business-managed food catalogue and availability |
| Business operations support | `business_payout_profiles`, `business_staff_memberships` | Future payout and staff authorization foundation |
| Event integration | `domain_outbox_events` | Durable cross-domain event handoff foundation |

### 9.1 Data Not Yet Persisted

The following must be added before commercial operations: `orders`, `order_lines`, order price snapshots, order-state history, idempotency records, Rider profiles/approval data, delivery jobs/assignments, proof-of-delivery records, payment/collection records, commission/settlement ledger entries, device tokens, end-user notification records, and support/exception records.

## 10. Security, Privacy, and Operational Controls

The production-oriented backend uses protected tRPC procedures for authenticated actions and server-side admin role checks for Business review. Business documents accept constrained MIME types, and workflow records retain audit events. Prices and delivery amounts are represented as integer minor units. The outbox deduplication model protects future event consumers from repeated publication.

However, the Customer phone/OTP route remains preview-only. It should never be treated as sufficient for real identity, payment, or cash-collection operations. Production launch requires a Pakistan-capable OTP provider, abuse controls, user consent, session/token handling, workspace identity linking, data-retention policy, and account deletion workflow.

| Control | Current status | Required next action |
|---|---|---|
| Server procedure protection | Present for protected tRPC routes | Ensure all new Order/Dispatch/Payment commands use it |
| Workspace approval checks | Present in data model and Business flows | Remove reliance on preview fallback for production builds |
| Document constraints | Present for Business uploads | Add malware scanning, retention, reviewer policy, and signed access audit |
| Audit events | Present | Add correlation/request IDs and operational retention policy |
| Money precision | Minor-unit conventions and pricing tests | Enforce server price snapshot at Order creation |
| Phone identity | Preview only | Integrate real SMS OTP and anti-abuse policy |
| Push device identity | Not implemented | Add token registration and permission preference model |

## 11. Quality, Validation, and Developer Workflow

The latest validated checkpoint reports **34 deterministic passing tests**, TypeScript with no errors, and Expo lint passing. One legacy auth logout test remains intentionally skipped. The test suite includes Customer onboarding, launch routing, registration routing, cart pricing, catalogue validation, discovery cache, workspace contracts, Business contracts, Merchant order workflow, Rider delivery workflow, menu mutation queue behavior, domain event contracts, gateway error mapping, and outbox retry policy.

| Command | Purpose |
|---|---|
| `pnpm test` | Run deterministic Vitest suite |
| `pnpm check` | Run TypeScript compilation without emitting code |
| `pnpm lint` | Run Expo lint rules |
| `pnpm drizzle-kit generate` | Generate SQL after a Drizzle schema change |
| `pnpm dev` | Start API server and Expo/Metro development session |

Database changes must follow the established discipline: update `drizzle/schema.ts`, generate the migration, inspect the generated SQL, apply the reviewed additive migration, and run the full suite. Schema changes should avoid destructive operations unless an explicit data migration and rollback procedure exists.

## 12. Approved Launch Roadmap

The agreed delivery order is intentionally **vertical**, not a broad expansion of prototype screens. Khana KarLo should prove one real Customer → Restaurant → Rider → COD transaction in Islamabad/Rawalpindi before building scale features or physically splitting services.

### Priority 1 — Launch Blockers

| Phase | Domain and scope | Exit gate |
|---|---|---|
| **1. Order Service** | Persist orders, lines, price snapshots, exact minor-unit totals, Customer/Restaurant lists, server state machine, idempotency, and outbox events on every transition | A Customer places a real order; Restaurant receives it and progresses valid states |
| **2. Dispatch Service** | Manual Rider assignment first, available Rider list, assignment, pickup and delivery commands, delivery outbox events | A ready order can be assigned and completed by a Rider |
| **3. COD Payments** | COD collection records, 12% Restaurant and 2% Rider commission policy, settlement status, Restaurant/Rider ledger views | Delivered order computes commission and updates both earnings positions |
| **4. Notifications** | Device registration, in-app notification log, event-driven push for new order, acceptance, assignment, and delivery | Correct role receives each meaningful state update within seconds |
| **Pilot** | One or two real Restaurants, controlled Rider group, manual operations support | Team can complete, observe, and recover real transactions |

### Explicitly Deferred Until After Pilot

| Deferred capability | Reason for deferral |
|---|---|
| Automatic nearest-Rider matching | Manual assignment is sufficient to prove the order loop; geo-matching adds real operational complexity |
| Live Rider GPS tracking and route optimization | Requires stronger privacy, battery, map, and Dispatch foundations |
| Automated JazzCash/EasyPaisa payouts and card payments | COD tracking and manual bank-transfer settlement are safer for the initial pilot |
| Discovery projection service | Current live-table discovery is acceptable for a very small pilot; projection is a scale optimization |
| Independently deployed workers/services | The current gateway-compatible modular boundary and outbox should prove their value before adding operational infrastructure |

### Non-Negotiables

1. **Every operational state transition emits an outbox event.** Dispatch, payments, discovery, and notifications must not depend on hidden synchronous side effects.
2. **All money remains in minor units.** No floating-point order, commission, or settlement calculation is permitted.
3. **Server authorization is authoritative.** Client state may improve UX but never decides whether a Customer, Business, Rider, or Admin may perform a protected action.
4. **Preview phone/OTP is a launch blocker.** It must be replaced by a real production authentication and anti-abuse design before real users or money are involved.

## 13. Remaining Production Gaps

| Priority | Gap | Why it matters | First concrete deliverable |
|---|---|---|---|
| P0 | Real phone authentication | Identity, fraud control, recovery, and user trust | Pakistan-capable SMS OTP send/verify with rate limits |
| P0 | Order Service | Creates the shared marketplace transaction | Persisted Order schema, authoritative state machine, tRPC contract |
| P0 | Dispatch | Connects Restaurant readiness to Rider delivery | Manual Rider assignment and persisted delivery jobs |
| P0 | COD ledger | Makes cash collection and commission auditable | Immutable collection/settlement records and calculated earnings |
| P0 | Admin operations | Lets Khana KarLo resolve live exceptions | Internal order, Rider, Business, and reconciliation console |
| P0 | Privacy and legal baseline | Location, phone, documents, and cash create risk | Terms, privacy, consent, retention, deletion, support policy |
| P1 | Notification delivery | Keeps all actors informed | Event-driven in-app log and push provider integration |
| P1 | Service zone and ETA engine | Prevents undeliverable Customer orders | Address validation and Business-zone eligibility |
| P1 | Staff and payout operations | Makes Businesses independently operable | Staff roles, hours, payout details, settlement reporting |
| P2 | Discovery projection | Improves marketplace performance at scale | Event-fed searchable read model |
| P2 | Physical service deployment | Adds scaling and team isolation | Authenticated service-to-service deployment and event worker infrastructure |

## 14. Engineering Onboarding and Operations Runbook

Start from the project root, install dependencies through the existing package manager, and run `pnpm dev`. The Expo client and API service run together in development. After a mobile route or backend code change, use the managed preview’s refreshed QR code and reload Expo Go. If Expo Go shows stale code, close the active project, rescan the latest QR code, and reload the opened project.

When implementing a new domain, create the domain contract, service interface, repository/data owner, gateway adapter, error mapping, tests, and outbox event before extending the mobile screen. New domain operations must not be added directly into the gateway router or an unrelated legacy service. The initial physical deployment remains one managed backend process; services become independently hosted only after their persistence, contracts, monitoring, and event consumer behavior have been proven.

## 15. Documentation Sources and References

[1]: [Khana KarLo Service Decomposition and Microservices Migration Plan](./microservices_migration_plan.md)  
[2]: [Khana KarLo Application Status and Gap Analysis](./APPLICATION_STATUS_AND_GAPS.md)  
[3]: [Project implementation checklist](./todo.md)  
[4]: [User-provided Order, Dispatch, COD, Notifications, and pilot sequencing](../upload/pasted_content.txt)  
[5]: [Expo SDK 54 documentation](https://docs.expo.dev/)  
[6]: [tRPC documentation](https://trpc.io/docs)  
[7]: [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview)
