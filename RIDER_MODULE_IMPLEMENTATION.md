# Khana KarLo Rider Module Implementation

**Status:** Implemented on `feature/khanakrlo-development`  
**Scope:** Rider workspace, dashboard, delivery workflow, earnings, vehicle, documents, safety, and support  
**Non-scope:** Customer, Business, Restaurant, Merchant, Admin, checkout, and other member-owned surfaces were not changed.

## 1. Executive summary

The Rider experience is now a complete, navigable operational preview under **Profile → Khana KarLo Workspaces → Rider**. It is intentionally isolated from the other role dashboards. The existing workspace approval boundary remains intact: the workspace hub can open the Rider preview for demonstration, while the server-connected workspace still depends on the existing approval model.

The implementation covers the Rider MVP described in the provided Mobile-App Modules & Build Plan. A rider can switch availability, inspect active and offered deliveries, accept or decline a request, navigate to pickup or drop-off using Google Maps, advance the delivery through guarded status transitions, confirm cash collection for COD, confirm handoff proof, review earnings, inspect vehicle readiness, view masked verification records, and access safety/support actions.

## 2. Files changed

| File | Purpose | Change boundary |
| --- | --- | --- |
| `app/rider/index.tsx` | Rider dashboard | Rider-only. Added calculated metrics and quick links to earnings, profile, and support. |
| `app/rider/delivery/[id].tsx` | Delivery detail and workflow | Rider-only. Added explicit COD cash confirmation before delivery completion. |
| `app/rider/profile.tsx` | Rider profile and workspace controls | Rider-only. Connected every account row and added support/sign-out actions. |
| `app/rider/earnings.tsx` | Earnings and payout history | New Rider-only screen. |
| `app/rider/vehicle.tsx` | Vehicle and readiness checks | New Rider-only screen. |
| `app/rider/documents.tsx` | Verification status and document update request | New Rider-only screen. |
| `app/rider/support.tsx` | Emergency help, issue reporting, and safety guidance | New Rider-only screen. |
| `lib/rider-store.ts` | Local Rider state and persistence | Rider-only. Added cash-collection state, completion timestamps, and calculated metrics. |
| `RIDER_MODULE_IMPLEMENTATION.md` | Implementation and research record | New documentation file. |

The existing `app/account/workspaces.tsx` already exposed the Rider workspace and was deliberately left unchanged. The existing shared workspace gating and all non-Rider screens were also left untouched.

## 3. Rider screen map

| Screen | Main responsibility | Functional actions |
| --- | --- | --- |
| Rider dashboard | Shift overview and dispatch inbox | Toggle online/offline, open active delivery, open offered request, open earnings, profile, or support. |
| Delivery detail | Execute one delivery safely | Open pickup/drop-off navigation, accept, decline, mark arrival, confirm pickup, confirm COD cash, confirm proof, and complete delivery. |
| Rider profile | Account and workspace controls | Toggle availability, open vehicle, documents, earnings, support, and request sign-out. |
| Earnings & payouts | Financial visibility | Review weekly/today earnings, rating, completed deliveries, and COD reconciliation status. |
| Vehicle details | Operational readiness | Toggle daily inspection and safety gear readiness, inspect registration, and request an update. |
| Documents | Verification visibility | View masked CNIC, licence, and payout statuses; request re-verification/update. |
| Safety & support | Incident and rider support entry point | Call 1122, contact support, report an issue, and read the safety guide. |

## 4. Delivery state machine

The workflow remains guarded by `lib/rider-delivery-workflow.ts`. Valid progression is:

`offered → accepted → atPickup → pickedUp → delivered`

A request can be declined only while it is `offered`. Skipped states and late declines remain blocked. Delivery completion now requires two explicit confirmations when the order is COD: the rider must mark the cash as collected and confirm the customer handoff/proof. Cash collection is persisted with the local Rider session so a reload does not silently lose the reconciliation state.

| Delivery state | Rider action | Completion requirement |
| --- | --- | --- |
| Offered | Accept or decline | Review route and earning first. |
| Accepted | Start toward restaurant; mark arrival | Pickup navigation is available. |
| At pickup | Confirm the packed order was collected | Order number should be checked with the restaurant. |
| Picked up | Navigate to customer; record COD if applicable | Cash confirmation is required for COD. |
| Delivered | No further transition | The order is complete and the earning is shown in history. |

## 5. Research-backed product decisions

The attached blueprint defines the Rider MVP around verified onboarding, online/offline availability, job assignment with accept/decline, navigation deep links, one-tap status updates, COD confirmation, earnings visibility, and payout flow. The implementation keeps those as the primary operational path and treats richer dispatch automation as a later phase.

Google's official Maps URL documentation describes a universal cross-platform URL format for launching search, directions, navigation, and map views. The delivery detail screen uses a URL-encoded Google Maps search link with `api=1`, which is appropriate for the current preview and avoids coupling the isolated Rider UI to a map SDK before production API and billing decisions are made.[2]

Expo's official location documentation distinguishes foreground location from background location and describes additional platform configuration and termination constraints for background tracking. Accordingly, this branch does not add speculative live GPS tracking. Production tracking should be implemented only after consent copy, foreground/background permissions, retention rules, battery behavior, dispatch event synchronization, and privacy review are defined.[3]

The product research also supports several professional add-ons: route and demand-zone guidance, batch optimization, masked contact or in-app support, detailed earnings breakdown, incentives, performance metrics, and stronger proof-of-delivery options. These are recorded as follow-up scope rather than being represented as fake production capabilities in this preview.

## 6. What is real in this branch versus production work still required

| Capability | This branch | Production requirement |
| --- | --- | --- |
| Availability | Persisted local toggle | Server-authoritative availability with heartbeats and dispatch eligibility. |
| Job assignment | Seeded local offers | Dispatch allocation, expiry, reassignment, concurrency protection, and push events. |
| Status updates | Guarded local state machine | Authoritative Order/Dispatch commands with audit events and idempotency. |
| Navigation | Google Maps URL launch | Route/ETA service, deep-link fallback, location consent, and delivery-zone policy. |
| COD | Explicit local cash confirmation | Ledger, reconciliation, exception handling, and finance/admin oversight. |
| Earnings | Calculated from completed local deliveries | Server ledger, payout statements, bonuses, adjustments, and cash-out provider. |
| Documents | Masked verification records and update request | Secure uploads, document retention, review workflow, and approval audit trail. |
| Support | Emergency dial and local support entry points | Ticketing, masked calling/chat, escalation, and incident records. |
| Live tracking | Not simulated | Background location, customer visibility, battery controls, privacy and retention policy. |

## 7. Test and verification record

| Check | Result | Notes |
| --- | --- | --- |
| TypeScript | Passed | `pnpm check` completed without errors. |
| Automated tests | Passed | 18 test files passed; 47 tests passed; 1 existing auth logout test remained skipped. |
| Lint | Passed | `pnpm lint` completed with a pre-existing Node module-type warning for `eslint.config.js`. |
| Backend build | Passed | `pnpm build` produced `dist/index.js`. |
| Rider dashboard route | Verified | `/rider` rendered dashboard, availability, active delivery, requests, metrics, and quick links. |
| Earnings route | Verified | `/rider/earnings` rendered metrics, completed delivery history, and COD reconciliation status. |
| Profile route | Verified | `/rider/profile` rendered connected account actions and support entry point. |
| Documents route | Verified | `/rider/documents` rendered masked records and update action. |
| Vehicle route | Verified | `/rider/vehicle` rendered readiness switches and registration details. |
| Support route | Verified | `/rider/support` rendered emergency, support, issue, and safety actions. |
| Delivery detail route | Verified | `/rider/delivery/RD-6014` rendered pickup/drop-off, navigation controls, COD amount, and guarded next status action. |
| Pressable audit | Passed | No Rider `Pressable` was found without an `onPress` handler. |
| Non-Rider isolation | Passed | Git diff is limited to Rider screens, Rider store, and this documentation file. |

The browser harness occasionally invalidated an interaction snapshot while Expo web rehydrated and returned to the authentication entry route. Direct route verification remained successful, and the state-machine tests plus static handler audit covered the workflow boundaries. On a physical device, Google Maps, telephone dialing, haptics, push notifications, and background location should receive a separate native QA pass.

## 8. How to preview the Rider module

Start the repository from the development branch with:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open the application and navigate through **Profile → Khana KarLo Workspaces → Open Rider dashboard**. For deterministic web verification, the relevant paths are `/rider`, `/rider/earnings`, `/rider/profile`, `/rider/vehicle`, `/rider/documents`, `/rider/support`, and `/rider/delivery/RD-6014`.

The seeded preview begins with one active delivery and two offers. To test the core flow, open the active delivery, advance through pickup, confirm cash collection if displayed, confirm proof, and complete delivery. Then return to the dashboard and open Earnings to verify that the completed delivery is reflected in local history.

## References

[1]: Mobile-App Modules & Tech Stack Blueprint, provided as a task attachment. Rider requirements are in Module 2C, pages 7–8.
[2]: [Google Maps URLs — Get Started](https://developers.google.com/maps/documentation/urls/get-started)
[3]: [Expo Location documentation](https://docs.expo.dev/versions/latest/sdk/location/)
