# Khana KarLo Application Status and Gap Analysis

**Document status:** Current implementation audit  
**Scope:** Customer, Restaurant, Rider, Cloud Kitchen, and Admin surfaces  
**Purpose:** Show what is implemented today, what is only designed, and what must be completed before a real-world launch.

## 1. Executive summary

Khana KarLo is currently a **branded, role-separated mobile prototype** built in a single Expo project. It demonstrates the primary customer ordering journey, a restaurant live-order workflow, and a rider delivery workflow. Each role has its own routes, visual language, and locally persisted operational state. The prototype is useful for validating the service model and screen flow; it is **not yet a production marketplace** because orders, accounts, payments, verification, dispatch, notifications, and support remain local or simulated.

The current project contains **21 active role-facing routes**: 13 Customer routes, 5 Restaurant routes, and 3 Rider routes. The approved launch plan calls for approximately 70 role-complete launch screens across the Customer, Restaurant, and Rider products, before Cloud Kitchen and Admin expansion.[1]

> **Readiness statement:** The app is ready for product-flow demonstrations and UI review. It is not ready to accept real payments, dispatch real riders, verify identities, or operate a live restaurant network.

| Surface | Current state | Operational readiness | Primary conclusion |
| --- | --- | --- | --- |
| Customer app | Branded discovery-to-order prototype with onboarding | Prototype only | Core journey is visible, but transactions and live data are absent. |
| Restaurant app | Local merchant sign-in and live-order execution prototype | Prototype only | Order handling is demonstrated, but menu, onboarding, settlements, and real order events are missing. |
| Rider app | Availability, offer, and delivery-state prototype | Prototype only | The field workflow is demonstrated, but activation, real navigation, location streaming, and dispatch are missing. |
| Cloud Kitchen | Product plan only | Not implemented | Requires a distinct multi-brand production workspace. |
| Admin web | Product plan only | Not implemented | Required for partner approval, dispatch oversight, support, and finance operations. |

## 2. Product model and application boundaries

Khana KarLo should remain a shared delivery platform with **separate role experiences**, rather than a single mixed interface. The current project expresses this separation through route groups and role-specific stores; the production system should turn those into separately deployed apps or deliberately selected workspaces backed by shared identity and order services.

| Application | User | Current entry and landing | Intended production job |
| --- | --- | --- | --- |
| Customer | Diner | Branded splash → Google entry → phone/OTP → location → Home | Discover restaurants, order, pay, track delivery, and obtain support. |
| Restaurant | Owner, manager, kitchen staff | Merchant phone entry → verification → Live Orders | Accept and prepare orders, control availability, hand off to a rider, manage the outlet. |
| Rider | Delivery partner | Rider Home → online/offline → delivery offer → delivery detail | Receive deliveries, navigate to pickup/drop-off, collect COD, confirm delivery, view earnings. |
| Cloud Kitchen | Kitchen operator or brand manager | Not implemented | Coordinate multiple brands, production capacity, stations, and dispatch. |
| Admin web | Khana KarLo operations staff | Not implemented | Approve partners, monitor orders/dispatch, handle support, reconcile COD and settlements. |

## 3. What is implemented today

### 3.1 Shared platform and launch experience

The root route launches a branded Khana KarLo splash screen with the logo and the **“Order • Track • Enjoy”** tagline. After a short branded launch state, it checks the locally persisted customer session and routes either to Customer Home or to the customer sign-in screen. The current splash is visually confirmed in the saved project checkpoint.

The application is written in **Expo SDK 54, React Native, TypeScript, Expo Router, NativeWind, and React 19**. It includes a Node/Express and Drizzle-capable template, but the product workflow currently uses local stores and does not persist operational data to the server database.

| Shared concern | Implemented behavior | Current limitation |
| --- | --- | --- |
| Branding | Deep green, orange, cream, launcher icon, splash configuration, role visual systems | Brand assets and screens need formal design QA on real devices. |
| Navigation | Expo Router routes for Customer, Merchant, Rider, checkout, tracking, and detail flows | No role switcher, deep-link policy, or release navigation test plan. |
| Local persistence | `AsyncStorage` retains customer, merchant, and rider prototype session/status data | Data is device-local, not secure enough for operations, and not shared across users. |
| Validation | Vitest workflow tests, TypeScript check, and Expo lint | No end-to-end device tests, load tests, security test suite, or API contract tests. |
| Backend template | Server, database, authentication, storage, notifications packages are available | Product data models, API routes, migrations, and real service integrations are not implemented. |

### 3.2 Customer application

The Customer application is the most complete user-facing prototype. It contains a launch and registration sequence, restaurant discovery, menu browsing, cart, checkout, tracking, and account views. Restaurant and menu values are seeded demo data rather than marketplace inventory.

| Customer area | Implemented routes or screens | What the user can do today | Important limitation |
| --- | --- | --- | --- |
| Launch | `/` | View branded splash before entering the customer experience | Splash duration and accessibility need device testing. |
| Identity entry | `/auth/login` | Choose **Continue with Google** | The button opens the project’s configured OAuth portal. A real Google provider must be enabled in that portal before release. |
| Phone registration | `/auth/phone`, `/auth/verify` | Enter a Pakistan number and complete a six-digit OTP UI step | No SMS provider sends or verifies an actual OTP. |
| Delivery location | `/auth/location` | Request foreground location permission or enter an address manually | Address and coordinates remain local; no address search, delivery-zone validation, or saved address book. |
| Home and discovery | `/(tabs)`, `/search` | Browse cuisines, offers, restaurants, and search results | No live restaurant catalogue, availability, service-zone logic, or ranking service. |
| Menu and cart | `/restaurant/[id]`, `/cart` | Browse menu items, customise selections, update quantities, apply demo promo feedback | Menu, modifier, stock, and prices are demo data; cart is not server-backed. |
| Checkout | `/checkout` | Review address, delivery total, and payment choice | No payment authorization, COD risk rules, tax receipt, or order creation API. |
| Tracking and history | `/order-tracking`, `/(tabs)/orders` | View prototype status and order history | No assigned rider, live map, ETA engine, notifications, or support resolution. |
| Profile | `/(tabs)/profile` | See account shell and account actions | Account data is incomplete and profile controls are not connected to a backend. |

### 3.3 Restaurant application

The Restaurant application is purpose-built for a merchant’s operational flow rather than duplicating Customer screens. It currently demonstrates phone entry, order intake, order detail, state controls, outlet status, and a profile surface.

| Restaurant area | Implemented routes or screens | What the merchant can do today | Important limitation |
| --- | --- | --- | --- |
| Merchant entry | `/merchant/welcome`, `/merchant/verify` | Enter a phone number and open a local merchant session | No owner verification, outlet onboarding, staff roles, or business approval. |
| Live Orders | `/merchant/orders` | See seeded incoming, preparing, and ready order cards | Orders do not come from Customer checkout or a shared backend. |
| Order detail | `/merchant/order/[id]` | Accept, reject, prepare, mark ready, and hand off an order through guarded local transitions | No preparation timer, substitutions, printer, rider assignment, or customer communication. |
| Outlet profile | `/merchant/profile` | View outlet profile, toggle order acceptance, see management placeholders | Menu, hours, availability, zones, payout setup, staff management, and support are not implemented. |

### 3.4 Rider application

The Rider application now demonstrates the core operational sequence: availability, offer review, pickup/drop-off context, COD visibility, proof confirmation, and a completion state. It is intentionally higher contrast and action-oriented than the Customer application.

| Rider area | Implemented routes or screens | What the rider can do today | Important limitation |
| --- | --- | --- | --- |
| Rider Home | `/rider` | Toggle availability, see active delivery, view offers, open a profile | Availability is local and cannot affect real dispatch. |
| Assignment cards | `/rider` | View pickup/drop-off addresses, distance, expected earning, and COD amount | Offers are seeded; no dispatch engine, acceptance timeout, or batching. |
| Delivery detail | `/rider/delivery/[id]` | Accept or decline an offer; advance through arrival, pickup, and delivery; check proof confirmation | No restaurant/customer contact, image proof, QR/PIN verification, cash reconciliation, or real customer state update. |
| Navigation | `/rider/delivery/[id]` | Open an external Google Maps query for pickup or drop-off address | No embedded map, turn-by-turn progress, route optimization, or live rider location. |
| Profile | `/rider/profile` | View rider profile, vehicle information, document placeholders, weekly earnings shell, and availability | No rider registration, document upload, approval status, payouts, inbox, safety flow, or settings. |

## 4. Current state and workflow rules

The project already contains guarded local state transitions for the two operational roles. These rules are a valuable foundation but must become server-authoritative once live orders exist.

| Workflow | Current local transitions | Implemented protection | Production requirement |
| --- | --- | --- | --- |
| Merchant order | `new → preparing → ready → outForDelivery` plus `rejected` | Invalid skips are blocked in the local workflow helper | Server-side order state machine, actor authorization, timestamps, audit events, retries, and exceptions. |
| Rider delivery | `offered → accepted → atPickup → pickedUp → delivered` or `offered → declined` | Invalid skips and late declines are blocked in the local workflow helper | Dispatch allocation, optimistic concurrency, live order synchronization, handoff proof, COD reconciliation, and support exceptions. |
| Customer order | Prototype cart/checkout/tracking display | Pricing helper test coverage for totals and promotions | Signed order submission, payment state, restaurant acceptance, rider assignment, cancellation/refund policy, and notifications. |

## 5. Architecture status

| Layer | Current approach | What is missing before production |
| --- | --- | --- |
| Mobile UI | Expo Router routes, React Native components, NativeWind/StyleSheet styling | Dedicated release configurations for Customer, Merchant, and Rider applications; device QA; accessibility audit. |
| Identity | Existing OAuth callback path plus locally cached session information | Confirmed Google OAuth provider, phone OTP provider, account linking, role claims, session revocation, fraud/rate limits, consent records. |
| Data | Seeded TypeScript data and `AsyncStorage` stores | PostgreSQL schema, migrations, repositories/API routes, authorization policies, backups, and multi-device synchronization. |
| Orders | Local cart and local merchant/rider transition helpers | Central order service, idempotent state commands, event stream, order history, delivery exceptions, customer and merchant consistency. |
| Payments | Checkout UI presents COD and selected payment labels | Payment-gateway integration, callbacks/webhooks, receipts, refunds, transaction ledger, COD reconciliation, settlement rules. |
| Location and maps | Foreground location request and external Google Maps query link | Delivery zones, geocoding/autocomplete, distance/ETA service, rider tracking, privacy policy, consent, location retention rules. |
| Notifications | Notification dependency is available | Push-token registration, order/rider event triggers, preferences, notification templates, delivery monitoring. |
| Files and verification | Static profile/document placeholders | Secure uploads, document scanning/review, merchant and rider approval workflow, retention policy. |
| Operations | Prototype profiles and queues | Admin web panel, dispatch console, support tooling, fraud and exception handling, observability. |

## 6. Missing work, prioritized by launch impact

### Priority 0 — required before a limited real launch

| Workstream | Missing capability | Why it blocks launch | Recommended first deliverable |
| --- | --- | --- | --- |
| Shared backend | Roles, users, restaurants, menus, addresses, carts, orders, rider assignments, and status events | The three current role experiences do not share data. | Define the PostgreSQL schema and create authenticated API routes for the full order lifecycle. |
| Real identity | Google provider configuration, phone OTP send/verify, rate limits, user-to-role records | Login and OTP are UI flows only. | Connect OAuth provider and SMS provider; create Customer/Merchant/Rider role records. |
| Restaurant onboarding | Business verification, outlet profile, hours, service zones, menu creation, approval | Restaurants cannot be safely activated or publish real menus. | Build owner registration and an admin approval gate. |
| Order and dispatch loop | Customer checkout creates an order; restaurant accepts; dispatch assigns; rider updates; customer observes it | This is the core marketplace transaction. | Implement server-authoritative order state, assignment, and event delivery. |
| Payments and COD | Gateway choice, payment callbacks, COD collection, settlement ledger | Checkout cannot accept real money. | Launch with a carefully controlled COD flow and a payment-provider integration plan. |
| Admin operations | Partner approval, order exception handling, dispatch visibility, support, COD reconciliation | No team can operate or resolve real-world failures. | Build a minimal internal web console for orders, restaurants, riders, and support tickets. |
| Security and policy | Privacy policy, terms, location consent, account deletion, data retention, audit logs | The product handles identity, location, and payments. | Complete a compliance and security baseline before collecting live user data. |

### Priority 1 — needed soon after the transaction loop is stable

| Area | Recommended capability | Benefit |
| --- | --- | --- |
| Customer | Saved addresses, delivery instructions, favourites, receipts, order-specific help, ratings | Better conversion, repeat usage, and support resolution. |
| Restaurant | Menu editor, modifiers, stock/availability, prep timers, staff permissions, simple insights | Lets merchants operate without internal intervention. |
| Rider | Application/approval, document upload, earnings detail, inbox, safety help, payout history | Makes rider operations sustainable and auditable. |
| Dispatch | ETA, demand zones, acceptance timeout, reassignment, manual dispatch override | Reduces late deliveries and failed assignments. |
| Notifications | Push notifications for acceptance, ready, rider assigned, arrival, cancellation, support | Keeps each actor informed at the correct state change. |

### Priority 2 — scale, retention, and Cloud Kitchen expansion

| Area | Recommended capability | Benefit |
| --- | --- | --- |
| Cloud Kitchen | Brand management, production board, station routing, capacity throttle, multi-brand menus | Enables the separate cloud-kitchen operating model. |
| Growth | Promotions, referral, loyalty, scheduled delivery, recommendations | Supports repeat ordering and acquisition. |
| Marketplace quality | Reviews, issue resolution, restaurant quality metrics, rider performance | Enables consistent service quality. |
| Finance | Automated payouts, invoices, tax receipts, merchant/rider statements | Reduces manual operations as volume grows. |
| Analytics | Event instrumentation, funnel, cohort, ETA, cancellation, and availability dashboards | Lets the team optimize real marketplace behavior. |

## 7. Recommended implementation sequence

The next build phase should focus on a **vertically complete real order loop**, not on broadening the number of screens. The correct sequence is to make one city, one restaurant, one rider, and one customer successfully complete a transaction against shared backend data.

| Milestone | Concrete scope | Completion evidence |
| --- | --- | --- |
| 1. Identity and roles | Google/OAuth provider, SMS OTP, Customer/Merchant/Rider records, protected API routes | A real account can sign in, survive reinstall, and only access its assigned workspace. |
| 2. Merchant activation and menu | Restaurant onboarding, approval, operating hours, delivery zone, menu CRUD, availability | An approved outlet can publish a real menu. |
| 3. Customer transaction | Address, live menu, cart, COD-first checkout, real order submission | A customer creates a real order that the restaurant receives. |
| 4. Rider dispatch | Active rider approval, assignment service, acceptance timeout, delivery updates | A rider receives the order and status changes return to Customer and Merchant. |
| 5. Operations baseline | Admin web view for approval, order support, manual assignment, COD reconciliation | The operations team can recover from a failed delivery without engineering intervention. |

## 8. Delivery readiness checklist

| Area | Demonstration-ready | Production-ready | Key missing condition |
| --- | --- | --- | --- |
| Brand and core UI | Yes | No | Device accessibility, performance, and release QA. |
| Customer discovery/cart | Yes | No | Live catalogue, real price/availability, shared cart/order data. |
| Customer authentication | Partial | No | Real Google provider and SMS OTP verification. |
| Location | Partial | No | Address validation, zones, privacy consent, and delivery eligibility. |
| Restaurant operations | Partial | No | Approved merchants, menu management, shared order events, settlements. |
| Rider operations | Partial | No | Verified riders, dispatch, real tracking, proof and cash reconciliation. |
| Payments | UI only | No | Gateway, COD workflow, ledger, refunds, receipts. |
| Cloud kitchen | No | No | Entire workspace implementation. |
| Admin and support | No | No | Entire operations console implementation. |

## 9. Immediate decision requests

The following decisions are needed before the next production-oriented implementation cycle.

1. **Launch model:** Should the first city use COD only, or must JazzCash/Easypaisa be part of the first live transaction loop?
2. **Identity provider:** Should the existing OAuth portal be configured with Google, or should the product adopt a direct Google/Firebase/Auth0-style integration?
3. **SMS provider:** Which Pakistan-capable SMS/OTP provider will be used, and what abuse/rate-limit policy is required?
4. **Operations model:** Who approves restaurants and riders during the pilot, and which staff need the first Admin web access?
5. **Dispatch model:** Will early assignments be manual, rule-based nearest-rider dispatch, or a third-party delivery fleet integration?

## References

[1]: [Khana KarLo Multi-Application Product Blueprint](./multi-app-product-blueprint.md)

[2]: [Provided Mobile App Modules and Tech Stack Blueprint](../upload/Mobile_App_Modules_and_Tech_Stack_Blueprint.pdf)

[3]: [Expo Location documentation](https://docs.expo.dev/versions/latest/sdk/location/)

[4]: [Expo Linking documentation](https://docs.expo.dev/versions/latest/sdk/linking/)
