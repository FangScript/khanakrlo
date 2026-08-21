# Plan: Persisted Order Service and Secure Dish Images

## Goal

Replace the current local-only checkout and sample-catalogue dependence with a **server-authoritative Order Service**. Each order will be created from an approved live Business catalogue, priced on the server, and retain immutable snapshots of the dish, modifier, quantity, customer address, payment method, totals, and pricing inputs at the moment of checkout. In the same release, add a secure Business dish-image upload workflow and responsive image display across customer menus.

The implementation will preserve the existing one-app, approval-gated workspace model. It will use the production catalogue as the source of truth rather than copying client-side price or dish fields into an order.

| Area | Current state | Target state |
|---|---|---|
| Customer restaurant menu | Static local `khana-data` menu | Live approved Business catalogue from the server |
| Cart | Persisted locally, includes client price/name/image | Client selection intent only; server re-prices each line at checkout |
| Checkout | Local totals, random order number, local `lastOrder` | Protected create-order command, immutable snapshots, durable order ID/status |
| Order tracking | Uses local `lastOrder` | Fetches customer-owned persisted order by ID and order history |
| Restaurant queue | Local seeded preview workflow | Reads persisted Business-owned orders and changes only valid server state transitions |
| Dish images | `menu_items.imageKey` exists but is unused | Validated upload, scoped storage key, persisted reference, responsive customer rendering |

## Scope and Decisions

This work will deliver **COD-first order creation** for the Islamabad/Rawalpindi pilot. JazzCash will not be treated as paid or captured until a dedicated payment integration exists; the implementation will either hide it or label it unavailable at checkout. Delivery pricing will be derived from the active Business service zone, and the initial address snapshot will use the authenticated customer profile’s delivery address until the address-book service is introduced.

The Order Service will not trust local PKR totals, menu descriptions, item images, modifiers, or availability state. At checkout, the server will resolve each requested `menuItemId` and modifier ID against the selected Business scope, reject unavailable/archived content, calculate all minor-unit values, write the order and outbox event in a single transaction, and return an order summary.

## Phase 1 — Order Domain Schema and Immutable Snapshots

Add the following additive Drizzle tables and controlled enums. All money fields will remain integer PKR minor units.

| Table / entity | Core fields | Purpose |
|---|---|---|
| `customer_delivery_addresses` | customer user ID, label, recipient, phone, address lines, city, latitude/longitude E6, default flag | Persisted delivery origin for future address-book management; seed/migrate the current profile address only through explicit customer action |
| `orders` | public order number, customer ID, organisation/outlet/brand scope, delivery address snapshot JSON, status, payment method/status, subtotal, delivery fee, service fee, discount, total, placed timestamp | Durable aggregate root and customer/Business queue record |
| `order_items` | order ID, live menu item ID nullable, dish name/description/image snapshot, unit/base/modifier/line totals, quantity, prep time snapshot | Preserve the exact sold item even if the catalogue changes or is archived later |
| `order_item_modifiers` | order item ID, live modifier ID nullable, name, unit price, quantity snapshot | Preserve add-on choice and price at checkout |
| `order_status_history` | order ID, from status, to status, actor ID/type, note, occurred timestamp | Append-only operational transition audit |

The initial state machine will be explicit and guarded: `placed → accepted → preparing → ready_for_pickup → assigned → picked_up → delivered`, with terminal `rejected` and `cancelled` paths. The exact manual dispatch transition may be introduced as `ready_for_pickup → assigned` with no Rider assignment allowed until a valid manual dispatcher action exists. Invalid transitions will be rejected server-side.

Every order creation and valid transition will write an audit event and a transactional outbox record, such as `order.placed`, `order.accepted`, `order.rejected`, and `order.ready_for_pickup`. The implementation will use one database transaction for aggregate state, snapshots, status history, audit event, and outbox event.

## Phase 2 — Order Service Contracts, Authorization, and Pricing

Create an `orders` domain module containing typed Zod contracts, a service interface, implementation, gateway error mappings, and tRPC procedures. The service will expose the following production endpoints.

| Procedure | Actor | Behavior |
|---|---|---|
| `orders.quote` | Authenticated customer | Resolves live, available items and modifiers and returns a server-calculated non-binding checkout quote |
| `orders.place` | Authenticated customer | Re-validates the quote inputs, creates snapshots, clears no state client-side until success, and returns the persisted order |
| `orders.mine` | Authenticated customer | Lists the caller’s durable order history and active order states |
| `orders.byId` | Customer or authorised Business actor | Returns role-scoped detail; customers see their own order only, Businesses see only their organisation/outlet orders |
| `orders.businessQueue` | Approved Business owner/authorised manager | Lists operational orders for the owned Business scope |
| `orders.transition` | Authorised Business/Rider/dispatcher actor | Enforces the state machine, allowed role, ownership, and transition-specific data |

The quote and placement inputs will contain only identifiers and customer choices: Business/outlet context, item IDs, quantities, selected modifier IDs, and address ID. Server code will calculate item price, modifier price, delivery fee, service fee, discount, and total. It will reject mixed-Business carts, quantities outside safe bounds, missing/invalid required modifiers, inactive categories, unavailable/archived items, invalid service zones, suspended/paused Businesses, and stale/replayed checkout requests. A customer idempotency key will prevent duplicate submission if a network retry occurs.

## Phase 3 — Move Customer Discovery, Menu, Cart, and Checkout to Live Data

1. Add a public, read-only Business menu query for approved live Businesses, scoped to active categories and available non-archived menu items/modifiers. It will return responsive image URLs from stored menu item image references.
2. Replace `app/restaurant/[id].tsx` local sample-menu rendering with query-driven production data, plus loading, empty, unavailable, and not-found states. Existing local fixture data can remain only as isolated development fixtures, not as a production fallback for a live Business route.
3. Adapt cart lines to store identifiers, quantity, selected modifier IDs, and temporary client presentation metadata. The local cart remains useful offline, but its totals become informational only.
4. On checkout, call `orders.quote` whenever cart/address/payment inputs change. Render quote totals returned by the server and provide a clear price/availability-refresh message if the catalogue changed since the customer added an item.
5. Replace `placeOrder` random-number creation with `orders.place`. Clear the persisted local cart only after a successful response; route to `/order-tracking?orderId=<persisted-id>`.
6. Replace `lastOrder` tracking with persisted `orders.byId` and `orders.mine` data. Make current and past order views resilient to reloads and device changes.

## Phase 4 — Wire Restaurant Operations to the Persisted Queue

1. Replace seeded local orders in `/merchant/orders` and order detail with `orders.businessQueue` and `orders.byId`.
2. Use `orders.transition` for accept, reject, prepare, ready-for-pickup, and later handoff transitions. Optimistic UI may be used only with rollback after server validation.
3. Display snapshot details in the Restaurant queue: sold dish name, selected modifiers, quantity, customer notes, address summary, COD amount, and preparation snapshot. Restaurant screens must never recalculate a historical price from the current menu.
4. Keep Rider assignment as the approved next dispatch milestone. This release will make order events and `ready_for_pickup` durable but will not falsely claim automated dispatch is live.

## Phase 5 — Secure Dish-Image Upload Pipeline

### Server-side controls

1. Add a protected `businessOperations.uploadMenuItemImage` command that verifies approved Business ownership of the `menuItemId` before accepting a file.
2. Accept JPEG, PNG, and WebP only. Enforce a conservative upload limit, validate decoded bytes/signature rather than trusting the client MIME type alone, and reject empty/malformed payloads.
3. Normalise the filename away; generate a non-guessable, Business- and item-scoped storage key such as `business-menu/<organisation>/<item>/<uuid>.<extension>`.
4. Upload through the server’s storage helper, persist the resulting key/reference against the owned menu item, and record `menu_item_image_updated` in both audit and transactional outbox tables.
5. Do not accept arbitrary storage URLs from the client, and do not allow one Business to replace another Business’s image. Replaced image keys become unreachable from the catalogue record; the storage layer’s no-delete policy is respected.

### Mobile workflow and responsive display

1. Add `expo-image-picker` using the Expo-compatible installer and configure the platform permission strings. Offer gallery selection and camera capture only after necessary camera permission is granted; handle cancellation and Android pending picker results.
2. In the approved Business catalogue editor, add image upload/replace/remove intent next to the dish form. The form will show a local preview, progress/disabled state, error feedback, and the persisted server image on refetch.
3. Use `expo-image` for cached, responsive customer menu images. Render a fixed-aspect thumbnail with a branded placeholder when no image exists or loading fails; use content-fit cover, rounded clipping, and accessible image labels.
4. Ensure the order snapshot persists the resolved image reference/name at checkout, so historic order detail remains understandable even after a dish image is replaced or the item is archived.

## Phase 6 — Test, Migration, and Validation Strategy

| Layer | Required evidence |
|---|---|
| Database/migration | Generated additive migration reviewed before application; no destructive catalogue or historical-order migration |
| Unit/contract | PKR minor-unit calculations, item/modifier availability, required modifier validation, idempotency-key rules, safe image input limits/type validation |
| Order Service | Customer ownership, Business scope ownership, mixed-restaurant cart rejection, stale/unavailable item rejection, immutable snapshot contents, duplicate-request behavior |
| State machine | Valid/invalid transition matrix, actor-role denial, audit/history/outbox written for each accepted transition |
| Security | Cross-Business image upload rejection, arbitrary URL rejection, invalid MIME/signature/size rejection, archived image/item never returned as a live menu item |
| Client integration | Customer sees live image/menu data; server quote replaces local total; cart clears only after successful place; reload can re-open persisted tracking; Restaurant queue renders server order snapshots |
| Quality | Full deterministic suite, TypeScript, lint, migration applied, manual happy-path validation for Business image upload → customer menu image → customer order → Business queue |

## Assumptions and Risks

The plan assumes the current user request authorises replacing static customer menu/checkout behavior with real server catalogue data. That replacement is necessary for a genuine order-time snapshot: a client-only sample item cannot be safely sold as a production catalogue item.

The present mobile-number preview authentication is still not sufficient for production customer identity. The Order Service will require an authoritative authenticated account and customer profile; the client must present a clear sign-in/onboarding gate rather than creating anonymous production orders. Real SMS OTP remains a launch blocker.

Manual dispatch, online payments, real rider assignment, address-geocoding, tax rules, promotions, and inventory are intentionally not included in the first persisted order slice. The service will retain the appropriate events and snapshots so those capabilities can safely follow in the approved launch sequence: **Order Service → manual Dispatch → COD Payments → Notifications → controlled pilot**.
