# Plan: Production Restaurant Catalogue CRUD

## Goal

Deliver a **production-only Restaurant Management catalogue** for approved Khana KarLo Businesses. The Restaurant owner or authorised staff member will manage real server-backed categories, dishes, PKR prices, preparation times, modifiers, availability, and publication state. The management path will no longer substitute a limited local preview catalogue when the user lacks an approved Business workspace.

## Current Assessment

The project already has server-backed create and update operations for categories, menu items, modifiers, dish price, preparation time, availability, and Business live/paused status. These procedures are exposed through protected `businessOperations.*` tRPC calls and are scoped to the authenticated approved Business. However, the current `BusinessCatalogueScreen` falls back to a static local **Preview Catalogue** for locally registered users, which only provides pre-seeded dishes and availability switches. The existing API has no explicit delete/archive procedures, and the preview route makes the full production CRUD unavailable in the user’s current Expo path.

| Requirement | Current state | Planned correction |
|---|---|---|
| Production access | Protected gateway exists, but preview fallback masks access requirement | Require authenticated, approved Business workspace and show a clear application/approval state instead of local menu controls |
| Dish CRUD | Create and update exists | Retain and refine server-backed create/edit forms with strong PKR, preparation, and category validation |
| Category CRUD | Create and update exists | Add archive/delete-safe behaviour, active state and empty-category guard |
| Modifier CRUD | Create and update exists | Add archive/delete-safe behaviour and item ownership validation |
| Dish price | Editable in existing production form | Validate non-negative minor-unit conversion, price-change audit event, and customer publication behavior |
| Deletion | Missing | Add soft archive operations for categories, items and modifiers; prohibit destructive deletion of records referenced by orders once Order Service exists |
| Preview experience | Static local fallback | Remove management fallback; direct non-approved users to Business onboarding/application status |

## Target Access Policy

The production catalogue path requires all of the following server-side checks:

1. An authenticated account.
2. An active `business` workspace membership.
3. An approved, non-suspended Business organisation.
4. A catalogue actor role that permits the command: Owner or Manager for all operations; Kitchen Operator for availability-only actions if staff permissions are enabled.
5. Organisation/outlet ownership of every category, item and modifier ID in the request.

The client may render a helpful locked state, but it must never use a locally persisted Customer or Merchant preview session to bypass these checks. Unapproved users will see the Business application state and a single clear action: continue/inspect onboarding or await review.

## Implementation Phases

### Phase 1 — Remove the Misleading Preview Management Path

1. Remove `PreviewCatalogue` from the active `/business/catalogue` decision branch.
2. Replace it with a production-access state that explains whether the user must sign in, complete a Business application, wait for review, or resolve suspension.
3. Update Account Workspaces so Restaurant Management opens the actual Business application status for unapproved users and the real catalogue only for approved Business memberships.
4. Keep any local demo menu data isolated from production management routes.

**Acceptance gate:** A Customer cannot edit “Lahori Dera” sample data. A user with an approved Business membership opens only their own live catalogue.

### Phase 2 — Complete Server-Side CRUD and Archive Semantics

1. Add dedicated protected gateway and Catalogue service procedures for `archiveCategory`, `archiveItem`, and `archiveModifier`.
2. Implement soft archive as the production delete behavior. Archive changes visibility and availability while preserving auditability and future order references.
3. Prevent category archive while it contains active menu items unless an explicit cascade/archive-confirmation policy is chosen. The default policy will require all items to be moved or archived first.
4. Prevent a modifier from being edited or archived unless it belongs to an item owned by the requesting Business.
5. Add price-change audit events with old and new minor-unit values; emit `catalogue.item_updated` or `catalogue.item_availability_changed` outbox events where appropriate.
6. Add data indexes only if query review demonstrates a hot-path need; do not create premature indexes without a query owner.

**Acceptance gate:** Every Create, Read, Update and Archive command is server-authorised, ownership-scoped, idempotently auditable where needed, and visible to the next catalogue query.

### Phase 3 — Production Restaurant Menu UI

1. Refine `/business/catalogue` into an approved-Business-only editor with clear tabs or sections for **Categories**, **Dishes**, **Modifiers**, and **Publication**.
2. Provide a dish form for name, customer description, category, PKR price, prep minutes, availability, and archive action. Add input feedback before submission; server validation remains authoritative.
3. Provide category create, rename, archive and active/inactive behavior. Make archived content visually distinct and excluded from customer discovery.
4. Provide modifier create, edit, availability, required/optional state, price and archive behavior.
5. Add explicit destructive-action confirmations for archive operations, error states, success feedback, loading skeletons, and offline availability retry only for safe availability commands.
6. Keep the current minor-unit conversion helper; display PKR as human-readable values but send integer minor units to the server.

**Acceptance gate:** An approved Restaurant can create a category, add a dish for PKR 950, change it to PKR 1,050, set prep time, add/price a modifier, temporarily hide the dish, archive it, and see the exact result after refresh.

### Phase 4 — Customer Publication and Audit Validation

1. Confirm archived/unavailable items and inactive categories are excluded from customer-ready discovery/menu queries.
2. Ensure Business live/paused status remains a separate publication gate: a valid menu is not customer-visible while the Business is paused.
3. Verify optimistic availability updates roll back on failure and that the retry queue does not retry unsafe create/edit/archive commands.
4. Record catalogue events in the transactional outbox for future Discovery and Notification consumers; do not claim an independent consumer exists until it is deployed.

**Acceptance gate:** Customer discovery reflects only approved, live Businesses with active categories and available, non-archived dishes; every server catalogue command has an audit/outbox trail as designed.

## API and Data Contract Changes

| Procedure | Input | Authorisation | Result |
|---|---|---|---|
| `businessOperations.createCategory` | name, sort order | Owner/Manager, Business scoped | Category record |
| `businessOperations.updateCategory` | category ID, name, sort order, active | Owner/Manager, ownership check | Updated category |
| `businessOperations.archiveCategory` | category ID | Owner/Manager, must have no active items | Archived category |
| `businessOperations.createItem` | category ID, name, description, PKR minor price, prep time, availability | Owner/Manager, category ownership | Item record |
| `businessOperations.updateItem` | item ID and editable fields | Owner/Manager, item ownership | Updated item and price audit if price changed |
| `businessOperations.archiveItem` | item ID | Owner/Manager, item ownership | Archived/unavailable item |
| `businessOperations.createModifier` | item ID, name, minor price, required, availability | Owner/Manager, item ownership | Modifier record |
| `businessOperations.updateModifier` | modifier ID and editable fields | Owner/Manager, modifier ownership | Updated modifier |
| `businessOperations.archiveModifier` | modifier ID | Owner/Manager, modifier ownership | Archived/unavailable modifier |

The implementation will add `archivedAt` and `archivedBy` fields, or an equivalent explicit archive status, through an additive reviewed Drizzle migration. It will not hard-delete production catalogue rows.

## Data and Event Rules

| Rule | Decision |
|---|---|
| Currency | Store and transmit PKR in minor units only; UI uses `toMinorUnits` / `fromMinorUnits` conversion |
| Price changes | Audit old/new values and effective timestamp; future Order Service snapshots price at checkout |
| Archive | Soft archive rather than delete; archived records do not appear in customer/active Business lists |
| Category archive | Block while active items remain; require move/archive action first |
| Item archive | Make unavailable immediately; retain historical order reference compatibility |
| Outbox | Publish catalogue changes from the owning transaction; future Discovery projection consumes events |
| Retry queue | Allow only safe availability state retry; do not silently replay create, price edit or archive commands |

## Test Plan

| Test layer | Required coverage |
|---|---|
| Unit/contract | Name required, price non-negative, prep time at least one minute, valid minor-unit conversion, archive guards |
| Authorisation | Unapproved account, wrong Business, wrong outlet/item/modifier ownership, suspended Business, staff role denial |
| Data | Archive hides item/category/modifier, category archive blocked with active items, price audit generated |
| Gateway compatibility | Existing catalogue procedures retain response compatibility; new archive procedures return stable typed outcomes |
| UI | Production editor renders only after approved query succeeds; blocked state contains no static sample CRUD controls |
| Publication | Customer query excludes paused/archived/unavailable catalogue records |
| Reliability | Availability optimistic rollback and retry work; archive/edit/create failures display safe error and do not retry automatically |

## Assumptions and Open Risks

This plan assumes the user wants the current preview Restaurant Management path replaced by real approved-Business operations, even though that means a new user will need to complete Business onboarding and receive Admin approval before editing dishes. It does not yet add order-time price snapshots because that belongs to the next persisted Order Service, but it preserves the audit trail and archive semantics required to make that future integration safe.

The key risk is that development/preview authentication currently does not establish a real server account automatically. The implementation will therefore make the production access block explicit rather than falsely presenting editable local menu data as live Restaurant management.
