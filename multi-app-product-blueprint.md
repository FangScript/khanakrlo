# Khana KarLo Multi-Application Product Blueprint

## Product architecture decision

Khana KarLo should operate as **three distinct role-based applications** built on one shared platform: a customer app for ordering, a merchant operations app for restaurants and cloud kitchens, and a rider app for delivery execution. The web-based admin panel remains a fourth, internal surface and should not be bundled into any mobile app. Each application gets its own navigation, permissions, visual priorities, and session state; the shared backend remains the single source of truth for users, menus, orders, payments, dispatch, and notifications.

The merchant surface should be one deployable application with **two visibly separate workspaces** selected during onboarding: **Restaurant** for a single public-facing outlet and **Cloud Kitchen** for multi-brand or multi-outlet production. This preserves the separate application flow the operating models need without duplicating common capabilities such as the live order queue, menu management, staff access, settlements, and support. Published merchant tooling similarly centers order handling, delivery visibility, item availability, menu editing, and operating-hour controls in one operational product.[1]

| Application | Primary user | Product job | Authentication posture |
| --- | --- | --- | --- |
| Customer | Diners | Discover, order, pay, track, and seek help | Low-friction phone OTP; guest discovery and first-order checkout supported |
| Merchant — Restaurant | Owner, manager, counter staff | Accept, prepare, dispatch, manage menu, and review business performance | Account plus business verification, staff invitations, and outlet-scoped access |
| Merchant — Cloud Kitchen | Kitchen operator, brand manager, production lead | Coordinate brands, production queues, capacity, dispatch, and settlements | Account plus organisation and kitchen verification, with brand/outlet permissions |
| Rider | Delivery partner | Become available, accept assignments, navigate, verify pickup/drop-off, and view earnings | Account plus staged identity/vehicle/document verification before activation |
| Admin — Web | Khana KarLo operations team | Approve partners, monitor exceptions, manage support and settlements | Internal administrator SSO or strong staff authentication |

## Shared identity and authorization model

All three apps can use one identity service, but they must not share a generic “logged-in user” experience. A verified phone number identifies a person, while a **role claim** and a **membership record** decide which application and data they can access. A user may eventually hold more than one role, such as restaurant owner and customer, but the app must require a deliberate workspace switch rather than silently mixing order, settlement, or delivery data.

| Identity element | Customer | Restaurant | Cloud kitchen | Rider |
| --- | --- | --- | --- | --- |
| Core sign-in | Phone + OTP | Phone or email + OTP | Phone or email + OTP | Phone + OTP |
| Initial profile | Name and contact number | Owner/staff identity | Operator identity | Name, contact, emergency contact |
| Organisation link | Optional | Restaurant outlet membership | Kitchen organisation, outlets, brands | Rider fleet or independent partner link |
| Approval gate | None for browsing; payment checks at order time | Business profile reviewed before going live | Kitchen and virtual-brand review before going live | Identity, vehicle, and document review before accepting jobs |
| Session landing | Customer Home | Live Orders | Kitchen Control | Availability Home |

## Authentication and onboarding flows

### Customer app: fast access, verification at the point of trust

The customer flow should not present separate traditional “login” and “signup” screens. A single phone-first path handles both outcomes: the system checks the number after OTP verification and either restores the account or collects the minimal new-user profile. This is consistent with the supplied market blueprint, which prioritizes phone OTP, guest checkout, location permission with a clear explanation, and manual address entry for the Pakistan launch market.[2]

| Step | Screen | New customer outcome | Returning customer outcome |
| --- | --- | --- | --- |
| 1 | Welcome | “Continue with phone” and “Explore as guest” | Same entry point |
| 2 | Phone number | Country selector defaults to `+92`; consent and terms link | Phone number prefilled when safely available |
| 3 | OTP verification | Verify code, resend timer, change number | Verify code, restore session |
| 4 | Profile basics | First name and optional referral code | Skipped |
| 5 | Delivery location | Location permission rationale, GPS locate, or manual address | Show saved address confirmation |
| 6 | Home | Start discovery | Resume Home or active-order tracking |

Guest users may browse, search, view menus, and build a cart. The flow should request phone verification before payment/order submission, when there is a clear user benefit: delivery communication, receipt access, and order recovery. The app must not request location before the user understands why nearby results or delivery eligibility depend on it.

### Restaurant app: account setup becomes a business launch workflow

Restaurant onboarding is not merely signup. It is a role-gated operational workflow that must establish the business, a first outlet, a menu, working hours, and a responsible owner. Staff should never create a merchant in isolation; they receive an invitation and join an approved outlet with a limited role.

| Step | Restaurant screen | Required decision or data | Exit condition |
| --- | --- | --- | --- |
| 1 | Merchant welcome | “Join an existing outlet” or “Register a restaurant” | Route chosen |
| 2 | Owner sign-in | Phone/email and OTP | Owner identity verified |
| 3 | Business type | Restaurant or cloud kitchen | Workspace variant selected |
| 4 | Business profile | Legal/trading name, contact, cuisine, outlet address | Profile complete |
| 5 | Operating setup | Hours, prep-time defaults, delivery/pickup service choices | Store configuration valid |
| 6 | Verification | Required business/contact documentation and payout review | Submitted for review |
| 7 | Menu setup | Menu import or manual first category and items | At least one publishable menu category |
| 8 | Launch review | Availability, photos, hours, acceptance settings | Owner submits for activation |
| 9 | Approval pending | Clear status, missing items, support route | Admin approval completes |
| 10 | Live Orders | Operational landing screen | Outlet live |

### Cloud-kitchen workspace: organisation and brand configuration

The cloud-kitchen path begins with the same owner authentication but adds a **kitchen organisation** and **brand model** before menu publication. A cloud kitchen may manage multiple digital brands from one physical kitchen, so brand, menu, hours, capacity, and dispatch visibility must be independently configurable. The first active screen is Kitchen Control, not a consumer-style restaurant profile.

| Step | Cloud-kitchen screen | Required decision or data | Exit condition |
| --- | --- | --- | --- |
| 1 | Kitchen type | Single production kitchen, multi-outlet kitchen, or managed group | Operating model declared |
| 2 | Kitchen profile | Kitchen location, production contact, operating hours | Kitchen record created |
| 3 | Brand creation | Brand name, cuisine, public menu identity, visual assets | First brand created |
| 4 | Production rules | Prep stations, capacity cues, order throttling, packaging notes | Rules saved |
| 5 | Team roles | Kitchen manager, station lead, dispatcher, finance viewer | Access invitations issued |
| 6 | Brand menu mapping | Items and availability by brand | Brands ready for review |
| 7 | Review and activation | Verification, testing, operating status | Kitchen Control opens |

### Rider app: register first, activate only after verification

The rider flow must distinguish a person who has created an account from a partner approved to collect food and carry cash-on-delivery orders. The rider is directed to a clear **application under review** state until checks pass. This reflects the supplied platform blueprint’s requirement for rider document verification, availability, job acceptance, navigation, cash confirmation, and earnings management.[2] Once active, the rider app should maintain a simple three-stage delivery process—pickup navigation, item verification, and drop-off completion—rather than exposing a complex order-management UI.[3]

| Step | Rider screen | Required decision or data | Exit condition |
| --- | --- | --- | --- |
| 1 | Deliver with Khana KarLo | Explain earning model, safety, and requirements | Rider starts application |
| 2 | Phone number | `+92` phone entry | OTP sent |
| 3 | OTP verification | Code confirmation | Identity session created |
| 4 | Personal details | Legal name, city, emergency contact | Profile complete |
| 5 | Vehicle details | Bike type, registration information, vehicle photo if required | Vehicle record submitted |
| 6 | Documents | CNIC and licence where applicable | Verification submitted |
| 7 | Safety and COD acknowledgement | Safety process, cash handling, support expectations | Training acknowledged |
| 8 | Application status | Review, missing information, or approved state | Activation approved |
| 9 | Rider Home | Online/offline control | Active rider account |

## Authentication experience rules

The customer app should optimize conversion; merchant and rider apps should optimize correctness and trust. Every OTP screen needs a clear resend timer, a route to edit the number, and an error state that does not discard the entered number. Approval-based roles need transparent status cards, not blank dashboards. No unapproved merchant should accept orders, and no unapproved rider should appear in dispatch matching.

## Screen-count convention

The following inventory counts **distinct navigable screens and full-screen states**, not confirmation alerts, reusable sheets, empty states, permission dialogs, or one-off error modals. This is the useful count for product planning and design estimation. The complete platform contains **173 planned screens** across the three role applications and the internal admin panel; the role-complete MVP contains **115 screens**. A launch sequence limited to the customer, single-outlet restaurant, and rider surfaces contains **70 MVP screens** before the cloud-kitchen and admin expansion.

| Surface | Complete inventory | Role-complete MVP | Navigation model | Primary design objective |
| --- | ---: | ---: | --- | --- |
| Customer app | 30 | 21 | Bottom tabs: Home, Search, Orders, Account; stacked checkout and tracking flows | Warm, confidence-building food discovery with low-friction purchasing |
| Restaurant app | 35 | 25 | Live Orders, Menu, Insights, More; operational detail stacks | Dense, calm, glanceable order execution for staff |
| Cloud-kitchen workspace | 50 | 31 | Kitchen Control, Brands, Production, Insights, More | Fast multi-brand control, production clarity, and capacity awareness |
| Rider app | 34 | 24 | Home, Earnings, Inbox, Account; single-purpose active-delivery flow | One-handed, map-led, safety-conscious field work |
| Admin web | 24 | 14 | Desktop side navigation with deep data tables | Exceptions, approvals, dispatch visibility, and platform control |
| **Total platform** | **173** | **115** | Role-separated surfaces on one shared backend | Build in vertically complete operating flows |

### Customer app: 30 planned screens

The current Khana KarLo prototype covers part of this surface. The production customer app adds first-class authentication, saved-address management, payment handling, support, and retention screens around the discovery-to-delivery journey. Customer tracking should use a dedicated order area and map/contact details only after rider assignment, matching established order-tracking patterns.[4]

| Customer module | Screen inventory | MVP priority |
| --- | --- | --- |
| Access and address setup | 1. Welcome; 2. Phone number; 3. OTP verification; 4. Profile basics; 5. Location rationale; 6. Manual address search | All six, except profile enrichment may follow first order |
| Discovery | 7. Home; 8. Search; 9. Cuisine/category results; 10. Filters and sort; 11. Restaurant detail/menu; 12. Restaurant reviews | Home, search, filters, and menu are MVP; reviews can follow |
| Menu and cart | 13. Item customisation; 14. Cart; 15. Promo code; 16. Address book; 17. Add/edit address; 18. Delivery instructions | Item, cart, address, and instructions are MVP; promos are included but optional at launch |
| Checkout | 19. Checkout review; 20. Payment selection; 21. Payment result/retry; 22. Order confirmation | All four, with COD as the mandatory initial method |
| Delivery and help | 23. Active order tracking; 24. Rider map/contact; 25. Order-specific help; 26. Rate order and rider | Tracking and help are MVP; live map/contact and rating can roll out after dispatch reliability |
| Account and retention | 27. Orders list; 28. Past order detail and receipt; 29. Favourites; 30. Profile and settings | Orders and profile are MVP; favourites can follow |

The customer visual language should remain **warm cream, deep green, and orange**, with food photography at discovery time and very clear totals during checkout. Large one-handed touch targets, a persistent cart affordance, and non-technical delivery language matter more than operational density.

### Restaurant app: 35 planned screens

This app is for a restaurant owner, manager, counter operator, or kitchen staff member. It is not a customer app in different colours. Its home must be the Live Orders queue, because established merchant tools center the full order lifecycle, delivery visibility, and menu availability in one operational workspace.[1]

| Restaurant module | Screen inventory | MVP priority |
| --- | --- | --- |
| Merchant access and launch | 1. Merchant welcome; 2. Owner/staff sign-in; 3. OTP verification; 4. Join or register choice; 5. Restaurant profile; 6. Outlet location and delivery zones; 7. Hours and prep-time setup; 8. Verification and payout setup; 9. Menu onboarding choice; 10. Menu import; 11. First category/menu builder; 12. Launch checklist and approval status | Sign-in, profile, hours, verification, manual menu builder, launch checklist |
| Live operations | 13. Live Orders queue; 14. Incoming-order alert; 15. Order detail and edit; 16. Accept/reject and reason; 17. Prep timer/status; 18. Ready for pickup; 19. Rider handoff and tracking; 20. Store paused/closed state | All eight are MVP because they form the operating loop |
| Catalogue management | 21. Menu overview; 22. Category editor; 23. Item editor; 24. Modifier editor; 25. Item availability; 26. Bulk price/availability change; 27. Photo management; 28. Scheduled availability and holiday hours | Core menu, item, modifier, and availability are MVP; import, bulk changes, photos, and schedules can iterate |
| People and support | 29. Outlet profile; 30. Staff and roles; 31. Notification preferences; 32. Merchant support | Profile, basic staff, support are MVP |
| Commercial insight | 33. Performance dashboard; 34. Sales/order reports; 35. Payouts and tax receipts | Basic performance and payout records are MVP; richer reporting can follow |

The restaurant interface should use a **white/ink operational canvas with green state cues and orange attention states**. Food photos appear only in menu maintenance. Every order must be readable at arm’s length, with the order number, countdown, payment mode, order source, and primary acceptance action visible before scroll.

### Cloud-kitchen workspace: 50 planned screens

The cloud-kitchen experience is a separate merchant flow because one production facility can fulfil multiple public brands. The product must let an operator answer three questions instantly: **What is new? What is delayed? Which brand or station needs attention?** It should be planned as its own workspace from the start, while reusing the restaurant platform’s identity, menu, order, settlement, and support services.

| Cloud-kitchen module | Screen inventory | MVP priority |
| --- | --- | --- |
| Organisation and verification | 1. Kitchen welcome; 2. Sign-in/OTP; 3. Kitchen type; 4. Organisation profile; 5. Kitchen location and hours; 6. Verification and payout; 7. First brand create; 8. Brand identity; 9. Production-station setup; 10. Team roles/invites; 11. Launch readiness and approval | Organisation, profile, verification, first brand, stations, and approval |
| Kitchen control | 12. Kitchen Control dashboard; 13. Incoming orders; 14. Order detail; 15. Order edit/substitution; 16. Production ticket; 17. Station board; 18. Delay and priority control; 19. Capacity/throttle control; 20. Brand-routing view; 21. Ready/pickup handoff; 22. Rider tracking | Dashboard, orders, tickets, station board, priority, handoff, rider tracking |
| Brand and menu | 23. Brand switcher; 24. Brand profile; 25. Brand menu overview; 26. Category editor; 27. Item editor; 28. Availability and batch disable; 29. Modifier rules; 30. Brand hours; 31. Brand service zones | First-brand management, menus, availability, and hours |
| Inventory and capacity | 32. Ingredient inventory; 33. Low-stock queue; 34. Recipe-to-ingredient mapping; 35. Supplier purchase records; 36. Waste/production log; 37. Packaging configuration; 38. Capacity forecast | Basic low-stock and packaging cues are MVP; the remaining controls are V2 |
| Insight and administration | 39. Kitchen performance; 40. Brand performance; 41. Sales/payouts; 42. Refunds/exceptions; 43. Quality and ratings; 44. Team performance; 45. Operations notifications; 46. Devices/printers; 47. Ordering-channel integrations; 48. Support; 49. Organisation settings; 50. Activity/audit log | Performance, exceptions, notifications, devices, support, and settings; advanced reports and audit depth later |

The cloud-kitchen design should use **compact cards, prominent timers, brand colour chips, and no decorative imagery**. Kitchen Control is a production board, not an analytics dashboard. A red/orange exception is more important than a photo, and a brand switch must always be unambiguous.

### Rider app: 34 planned screens

The rider app is a field-work tool. Its design must prioritize battery-aware navigation, status confirmation, safety, and cash handling over visual richness. External driver guidance separates availability, offer review, pickup, item verification, drop-off evidence, earnings, and communications—an appropriate structure for Khana KarLo’s rider surface.[3]

| Rider module | Screen inventory | MVP priority |
| --- | --- | --- |
| Application and activation | 1. Deliver with Khana KarLo; 2. Phone number; 3. OTP verification; 4. Personal details; 5. City and emergency contact; 6. Vehicle details; 7. Document upload; 8. Safety/COD acknowledgement; 9. Application review status | All nine, with document and approval states clearly separated |
| Availability and assignment | 10. Rider Home/offline; 11. Online map and busy zones; 12. Delivery preferences; 13. Assignment offer; 14. Accept/decline confirmation | Home, online switch, offer, and accept/decline are MVP; demand heat maps can follow |
| Active delivery | 15. Navigate to pickup; 16. Pickup details; 17. Contact restaurant; 18. Pickup verification; 19. Pickup cash/instruction confirmation; 20. Navigate to drop-off; 21. Drop-off details and customer contact; 22. Delivery proof; 23. COD collection confirmation; 24. Delivery success; 25. Active assignment timeline; 26. Stacked-delivery flow | Single-order pickup through delivery proof is MVP; stacked delivery follows after dispatch maturity |
| Earnings and account | 27. Earnings summary; 28. Earnings detail; 29. Payout/cash-out; 30. Incentives; 31. Inbox; 32. Safety/help; 33. Profile/documents; 34. Settings | Earnings summary, inbox, support, and documents are MVP; payout automation and incentives can follow |

The rider UI should use **high contrast, large status controls, minimal text while moving, and persistent emergency/help access**. The active delivery screen has one unambiguous next action—arrived, picked up, or delivered—and must never expose controls that could accidentally cancel or reassign the job.

### Admin web: 24 planned screens

The admin panel is a web-only back-office surface and is necessary for launch even though it is not a fourth mobile app. It owns partner approval, exceptions, support, cash reconciliation, and dispatch oversight.

| Admin module | Screen inventory | MVP priority |
| --- | --- | --- |
| Access and overview | 1. Staff sign-in; 2. Operations dashboard | Both |
| Partner operations | 3. Restaurant applications; 4. Restaurant approval detail; 5. Cloud-kitchen applications; 6. Cloud-kitchen operation detail; 7. Rider applications; 8. Rider verification detail; 9. User lookup | Restaurant and rider approval are MVP; cloud-kitchen detail can follow with the workspace |
| Order and dispatch control | 10. Orders; 11. Order detail/dispute; 12. Dispatch map; 13. Rider operations; 14. Menu/catalog review; 15. Delivery zones | Orders, order detail, rider operations, zones are MVP |
| Finance, support, and control | 16. Payments/COD reconciliation; 17. Settlements; 18. Support tickets; 19. Support ticket detail; 20. Promotions; 21. Notification campaigns; 22. WhatsApp low-confidence queue; 23. Audit log; 24. Platform settings and roles | Finance, support, and core roles are MVP; campaigns, WhatsApp review, and deep audit tooling follow |

## Shared platform state model

Every app must operate on the same state transitions. The backend publishes a signed event whenever a state changes; each application only exposes the actions that its current role is allowed to execute.

| Entity | State progression | Actor allowed to move the state |
| --- | --- | --- |
| Order | Draft → Submitted → Accepted → Preparing → Ready → Rider assigned → Picked up → Delivered; with Cancelled, Rejected, Payment failed, and Support review exception states | Customer creates; merchant accepts/prepares; dispatch assigns; rider confirms pickup/delivery; admin resolves exceptions |
| Merchant outlet/brand | Draft → Verification pending → Changes required → Approved → Live ↔ Paused → Suspended | Owner creates; admin approves/suspends; authorised merchant staff manages live/paused state |
| Rider | Applied → Verification pending → Changes required → Active → Offline/Online → Assigned → On delivery → Offline/Online; with Suspended exception state | Rider applies and changes availability; admin approves/suspends; dispatch assigns jobs |
| Payment | Pending → Authorised/COD expected → Paid/COD collected → Settled; with Failed, Refunded, and Reconciled exception states | Payment service, rider for COD collection, merchant/admin for settlement confirmation |

## Phased implementation roadmap

The best delivery sequence is not to build 173 disconnected screens. It is to launch complete operational loops, then broaden each role’s capability once the shared order state is reliable.

| Phase | Outcome | Surfaces and scope |
| --- | --- | --- |
| 0. Platform foundation | Shared identity, roles, order state, notifications, audit events, delivery zones, and OTP service | Backend, basic admin access, role-aware design system |
| 1. Customer conversion loop | A diner can verify, locate an address, order, choose COD, and see the order status | Customer MVP authentication, discovery, cart, checkout, order tracking, support route |
| 2. Restaurant fulfilment loop | An approved restaurant can go live, manage a menu, accept an order, prepare it, and hand it to a rider | Restaurant onboarding, Live Orders, item availability, menu editor, basic settlement view |
| 3. Rider delivery loop | An approved rider can become available, accept a task, complete pickup/drop-off, and record COD status | Rider onboarding, availability, assignment, navigation deep link, proof of delivery, earnings summary |
| 4. Dispatch and reliability | Operations team can resolve real-world exceptions | Admin order/rider views, support tickets, dispatch map, COD reconciliation, push notifications |
| 5. Cloud-kitchen scale | One kitchen can operate multiple brands with production visibility and throttling | Cloud-kitchen onboarding, Kitchen Control, station board, brand routing, capacity controls |
| 6. Growth channels | Retention, automation, and the optional WhatsApp route are added without creating a separate order system | Promotions, favourites, loyalty, advanced analytics, WhatsApp AI ordering and review queue |

## Design-system direction by role

The customer app uses the existing **Khana KarLo** deep green, orange, saffron, and cream palette to reinforce speed and warmth. The restaurant app uses the same brand colours more sparingly: green for accepted/ready status, orange for attention, and neutral white surfaces for order legibility. The cloud-kitchen app introduces stronger brand chips and timer hierarchy but remains mostly operational white/ink. The rider app uses high-contrast green/off-white with large orange action controls and an always-reachable safety route. The admin panel is intentionally neutral and data-heavy; it should use colour only for operational states and escalation.

## References

[1]: https://merchants.ubereats.com/us/en/technology/manage-orders/uber-eats-orders-app/ "Manage Operations with the Uber Eats Orders App"

[2]: Provided file: *Mobile_App_Modules_and_Tech_Stack_Blueprint.pdf*

[3]: https://www.uber.com/us/en/deliver/driver-app/ "Get to know the Driver app"

[4]: https://help.uber.com/en/ubereats/restaurants/article/check-the-status-of-my-order-?nodeId=4148ea8b-c9d8-409d-b7bf-b2fcb019a498 "Check the status of my order"
