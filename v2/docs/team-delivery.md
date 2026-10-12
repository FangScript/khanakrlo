# Four-person pilot delivery

One React Native/Expo app contains all three mobile workspaces and targets Android and iOS. Android remains the first pilot rollout. Admin is a separate desktop console. Legacy application files remain a read-only business-rules reference during v2 implementation.

## Ownership and reviews

- Shayaan: platform, gateway, Identity, Admin, security, deployments, React Native shell/auth/navigation. Reviews shared build and financial changes.
- Bakhtawar: Restaurant, Menu, Order, restaurant workspace and KDS. Backup deployment owner; reviews order/payment changes.
- Jawad: Customer, Review, Notification, customer workspace, shared design, English/Urdu and accessibility. Reviews design-system changes.
- Zeeshan: Payment, Delivery, Analytics, realtime, rider workspace, complete COD acceptance scenario. Financial changes require another reviewer.

Contract changes need the affected consumers' review. Use small PRs and one primary feature per person. Real GitHub handles are not yet supplied; do not invent CODEOWNERS identities. Each member budgets 10 hours implementation (including React Native learning), 3 integration/testing and 2 review/coordination per week. Hold one staging integration demo each week.

## Gates and current evidence

1. Weeks 1–2: reproducible setup, CI/staging, single-app modules, sessions/revocation, Customer profile/phone/addresses, merchant onboarding, finance contracts. Foundation changes now include Customer APIs, generated TypeScript Customer client/static mock, live session validation, immutable cash guards and modular React Native app. Staging, native compilation, merchant onboarding and financial contract reconciliation remain open. Gate 1 is **not passed**.
2. Weeks 3–4: catalogue and availability, server-priced snapshots, checkout, FCM, COD commission ledger, rider registration, gateway limits and staff TOTP. Gate: an idempotent COD order appears in KDS. **Not passed.**
3. Weeks 5–6: KDS transitions/cancellation/timeouts, customer tracking, dispatch/reassignment/navigation/location, collection/recovery, audited staff investigation. Gate: complete staging delivery with retry recovery and correct commission/cash entries. **Not passed.**
4. Weeks 7–8: remittance rejection/verification/PDF receipts/variance, finance permissions and perimeter controls, reviews/privacy/reporting/chat, event-fed analytics. Gate: verified custody release and ownership isolation. **Not passed.**
5. Weeks 9–10: integrated failures, load, alerts, backup recovery, offline recovery, localization, device/security tests and runbooks. **Not passed.**
6. Weeks 11–12: signed release, production readiness, restaurant/rider training, customer support guidance and controlled Play internal testing. **Not passed.**

Reforecast after weeks 2 and 4 using demonstrated integration, not the number of scaffold files. If gates remain unfinished at week 12, use two-week completion sprints. Do not remove financial/security controls to meet the date. iOS release, AI, digital payments, exports and optional features follow pilot readiness.

## Required launch evidence

- 20 consecutive complete customer → kitchen → rider → collection → verified remittance → receipt scenarios, with zero reconciliation mismatches. `test:integration` is a smaller foundation test and cannot satisfy this gate.
- Duplicate requests/events, concurrent rider acceptance, cancellation, variance, remittance rejection and broker/provider recovery.
- Custody blocking/clearing across retries, devices and roles; separate staff MFA and finance permissions; masked communication, review privacy and append-only audit/ledger.
- At 50 orders/minute: p95 reads ≤500 ms, writes ≤800 ms, checkout ≤3 s; KDS ≤3 s; captured location delivery ≤5 s; first dispatch offer ≤10 s.
- Real Android devices including low-memory, poor network, background location, KDS alerts, Urdu/RTL and crash recovery.
- Restored backups, alert drills, reviewed security findings, signed internal testing build, support ownership and daily reconciliation.

Shayaan and Zeeshan must record approved commission rates, custody policy/thresholds, service areas, timeouts and retention before financial acceptance. The existing staff verification prototype is not separate Admin MFA and must not be exposed to pilot users. No production readiness is implied by passing unit tests.
