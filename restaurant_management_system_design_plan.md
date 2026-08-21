# Plan: Restaurant Management System Design and Audit

## Goal

Create a detailed, production-oriented **Restaurant Management System Design and Audit** for Khana KarLo. The report will assess the current Restaurant Management dashboard, catalogue tools, Business approval flow, and preview Live Orders queue, then define the target operational system required for a real Restaurant and Cloud Kitchen pilot in Islamabad/Rawalpindi.

The report will clearly distinguish:

1. **Implemented now:** Business onboarding and approval, catalogue CRUD, Business live/paused state, Admin review, and preview Restaurant order operations.
2. **Preview-only:** Local Merchant order queue, local transition state, preview workspace access, zero-value incoming-order metric, and local profile/session behavior.
3. **Required for pilot launch:** Persisted Order Service, Restaurant command authorization, prep/SLA management, manual Rider dispatch integration, COD handoff, operational audit trail, and real notifications.
4. **Post-pilot scale features:** Multi-outlet aggregation, Cloud Kitchen multi-brand production routing, capacity controls, performance analytics, role/permission expansion, and independently deployed service workers.

## Evidence Base

The design will be based on current routes and server modules rather than generic restaurant-software assumptions.

| Evidence | Current finding to reflect in the design |
|---|---|
| `app/business/home.tsx` | Dashboard includes approved-Business live toggle, catalogue summary, Restaurant/Cloud Kitchen wording, management links, and a preview fallback. Incoming order count is currently hard-coded to zero. |
| `app/business/catalogue.tsx` and Catalogue domain module | Categories, items, modifiers, price/prep-time, availability, and live status exist behind protected Business procedures. |
| `app/merchant/orders.tsx` and Merchant store | Restaurant queue supports local `new → preparing → ready → outForDelivery` behavior and success feedback, but it is not connected to persisted Customer orders. |
| Business Onboarding and Admin modules | Restaurant/Cloud Kitchen review, documents, checklist, activation, and approval audit are the current entry gate. |
| Microservices migration plan and outbox | The gateway-compatible module structure and `business.approved` outbox event are complete; Order, Dispatch, COD, and Notifications remain future domains. |
| User-provided launch plan | The delivery sequence is Order → manual Dispatch → COD → Notifications → controlled pilot. |

## Planned Report Structure

### 1. Restaurant Management Audit

The report will catalogue every current screen, action, data dependency, authorization rule, and preview fallback. It will rate each capability as **implemented production foundation**, **implemented preview**, **missing pilot blocker**, or **post-pilot enhancement**.

### 2. Target Operating Model

The document will define the end-to-end Restaurant operating day: activation, opening/pausing, receiving an order, acceptance/rejection, preparation, ready-for-dispatch handoff, fulfilment visibility, COD completion, exception handling, closing, and daily reconciliation.

It will separately define Cloud Kitchen extensions: organisation, kitchen facility, multiple brands, production stations, capacity, order routing, and outlet/brand ownership.

### 3. Functional Modules and Screen Design

The system design will specify the required modules, screens, key fields, actions, state, and acceptance criteria for:

| Module | Main capabilities |
|---|---|
| Business activation | Application status, documents, approval, suspension, first-live checklist |
| Operations dashboard | Open/paused status, real queue metrics, SLA alerts, readiness and capacity signal |
| Order command center | Real order queue, filter, detail, accept/reject, preparation progress, dispatch handoff, history |
| Catalogue and availability | Categories, items, modifiers, price/prep time, inventory/availability, controlled publication |
| Outlet operations | Hours, service zones, holiday/temporary closure, prep capacity, contact details |
| Staff and permissions | Owner, manager, kitchen operator, support/viewer role matrix and auditable commands |
| Finance/COD | Order-level COD expectations, delivery settlement state, commissions, statements and payout status |
| Quality/support | Item substitution, cancellation, delay, incident, customer issue, and support escalation workflows |
| Cloud Kitchen controls | Brand routing, station workload, capacity throttling, production board, shared stock policy |

### 4. Detailed State Machines

The report will give explicit authority, transition guards, immutable timestamps, outbox events, SLA timers, and exception branches for:

1. Business application and activation.
2. Restaurant open/live state.
3. Order lifecycle: `Placed → Accepted → Preparing → Ready → Assigned → Picked Up → Delivered → Completed`, including rejection and cancellation branches.
4. Item availability and menu publication.
5. Manual Rider assignment and handoff.
6. COD collection and settlement status.

### 5. Data and Service Design

The report will map current tables to their owners and design the missing Order, Dispatch, COD/Payments, Notifications, Restaurant staff, support, and reporting records. It will define aggregate ownership, indexed query paths, money-in-minor-unit rules, transaction/outbox boundaries, idempotency keys, event names, and read-model requirements.

### 6. API and Integration Contracts

The design will propose gateway-compatible tRPC procedures and versioned event contracts for Restaurant Management. It will retain the current client procedure compatibility where possible, rather than introduce a disruptive rewrite. It will explicitly identify integrations not yet selected, including SMS OTP, push provider, payment payout rails, maps/geocoding, and printer/POS integration.

### 7. Security, Audit, and Compliance

The report will document server-authoritative Business/staff permissions, approval gates, audit requirements for financial and order actions, document-access boundaries, data retention, outlet-level ownership, and pilot-specific COD control rules.

### 8. Operational Metrics and Alerts

The document will define Restaurant-facing metrics (new orders, preparation time, breach risk, rejection/cancellation rate, out-of-stock rate, order value, COD outstanding) and Khana KarLo operations metrics (approval turnaround, queue age, dispatch delay, delivery completion, settlement ageing). It will distinguish the present UI-only counts from metrics requiring persisted Order/Dispatch data.

### 9. Delivery Roadmap and Acceptance Gates

The report will translate the approved sequence into Restaurant Management increments:

1. Order-backed Restaurant command center.
2. Manual Dispatch handoff.
3. COD collection and Restaurant statement.
4. Event-driven notifications and operational alerts.
5. Controlled one-to-two Restaurant pilot.
6. Cloud Kitchen capacity and production-board expansion.

Each increment will define implementation scope, dependencies, non-goals, and testable acceptance criteria.

## Important Architecture Decisions

The planned design will retain the current one-app workspace model, mobile tRPC gateway, single-database first extraction strategy, integer PKR minor units, approval-gated Business access, and transactional outbox discipline. It will not propose immediate physical microservice deployment, automatic Rider matching, live GPS, online-card payments, or automated wallet payouts for the first pilot.

## Assumptions and Risks

The report will assume a controlled COD-first pilot with one or two Restaurants and manual Rider assignment. It will make explicit that the current Restaurant screens cannot accept real orders yet; that capability depends on the persisted Order Service. The main risk is implementing attractive management screens before authoritative Order, Dispatch, and finance data exists; the design will make those dependencies non-negotiable.

## Deliverable

After approval, execution will create `RESTAURANT_MANAGEMENT_SYSTEM_DESIGN.md` in the project root. The final Markdown document will be suitable for Product, Engineering, Operations, and Business stakeholders, and will include a current-state audit, detailed system design, tables, state-machine diagrams, interface contracts, and pilot-ready roadmap. No PDF will be generated unless requested.
