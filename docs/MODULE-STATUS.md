# Khana Krlo V2 | Kitna ban gaya aur kya baqi hai?

**10 November 2026 · Public launch ka faisla: abhi tayyar nahin.** Customer, Restaurant aur Rider ek mobile app mein hain. Admin ka alag panel hai. Tamam 68 tay-shuda screens ka code aur browser previews maujood hain. Asli device, asli partners, paison aur launch server par tasdeeq baqi hai.

| Progress ka paimana | Darj nateeja |
| --- | --- |
| Screen coverage | Customer 29/29, Restaurant 18/18, Rider 10/10, Admin 11/11 |
| Is review ke automated tests | Orders, merchant aur admin ke 5 tests chalaye, 5 pass hue |
| Pehle ka integration test | Do restaurant accounts se approval, menu publish, rider approval, checkout, dono pickups, delivery aur cash receipts local setup mein pass hue |
| Release ki tasdeeq | 32 acceptance cases aur 15 non-functional requirements ke saath release ka saboot jorna baqi hai. In mein se kitne launch par pass hain, is ki tasdeeq-shuda ginti abhi maujood nahin |

### Restaurant aur rider ki profile asal mein kahan tak bani hai?

**Restaurant.** Owner naam, pickup address, shehar aur contact email save karta hai. Business licence, owner ka CNIC aur restaurant ki photo upload karta hai aur terms qabool karta hai. Reviewer faisla aur wajah record karta hai. Approval par pehli branch banti hai. Draft ya rejected application dobara edit ho sakti hai. Approved restaurant ke asal naam, contact ya ownership mein tabdeeli ka alag raasta is application form mein maujood nahin. Launch se pehle tay karna hai ke yeh tabdeeli kaun kar sakta hai aur dobara review kab hoga. [Restaurant application aur approval ka code](../services/merchant/partners.mjs)

**Rider.** Signed-in rider apna naam aur shehar jama karta hai. Email uske account se aata hai. Reviewer wajah ke saath approve ya reject karta hai. Rejection ke baad rider phir apply kar sakta hai. Approval ke baad rider workspace aur online hone ka raasta local test mein chala. Maujooda application mein rider ke vehicle, licence, shanakhti documents ya payout details jama karne ke fields nahin hain. Launch owner ko tay karna hai ke pilot ke liye in mein se kya chahiye, kaun verify karega aur approval ke baad profile kaise update hogi. [Rider application ka code](../services/rider/server.mjs) · [Mobile form](../apps/mobile/RiderWorkspace.jsx)

### Module ke hisaab se kaam

| Module | V2 mein kya maujood hai | Agla baqi kaam aur poora hone ki nishani |
| --- | --- | --- |
| 1. Customer account aur access | Guest, signup, sign-in, logout, email code, password reset, workspace access aur closure | Asli inbox mein verification aur reset link pohanchein. Phone par account wapas khule aur band account access kho de. Google sign-in filhal multawi hai. |
| 2. Address, search aur catalogue | Delivery pin, manual address, restaurants aur dishes ki search, area ke mutabiq catalogue | GPS allow aur deny dono par address save ho. Pilot ke asal address par sirf us ilake ki khuli branches aur available dishes milen. |
| 3. Restaurant onboarding aur profile | Application, teen private uploads, accepted terms, review aur pehli branch | Asli files se upload, rejection, dobara submission aur approval staging par chalayein. Approved profile badalne ka tareeqa tay karein. |
| 4. Branch, staff aur menu | Branches, opening hours, pause, delivery boundary, staff access, dish photo, price, add-ons aur availability | Do alag branches ke staff se access check karein. Sold-out dish aur paused branch ka asar customer ki search aur checkout mein bhi nazar aaye. |
| 5. Cart, checkout aur kitchen | Kai restaurants ki ek cart, quantity/add-on price, sign-in ke baad cart ki wapsi, har kitchen ka apna order aur ready status | Network tootne, dobara tap aur ek restaurant ki cancellation par baqi order, stock aur customer ka total check karein. |
| 6. Rider onboarding aur profile | Naam, email, shehar, review status, approved workspace aur availability | Pilot ke liye zaroori rider evidence aur baad ki profile updates tay karein. Alag applicant aur reviewer ke saath staging sign-off lein. |
| 7. Delivery aur tracking | Offers, multiple pickups, directions, order status, OTP aur handoff | Asli route par pickup sequence, kamzor signal, rider se rabta aur customer ko waqt par status milna verify karein. |
| 8. Cash, commission aur rider earnings | Prepaid commission aur dono taraf se cash receipt ka local saboot hai. Earnings aur payout history ki screens hain. | Rider rates, cash jama karne ka waqt aur shortage ka zimma tay karein. Din ke aakhir par rider, dono restaurants aur platform ka hisaab mile. |
| 9. Card, wallet, refunds aur payouts | Payment choice/status aur admin approvals maujood hain. Digital checkout server par band hai. | Provider jorein. Payment, duplicate callback, partial refund, ledger entry aur bank payout ko provider ke record se milayein. |
| 10. Support aur notifications | Order se juda support chat, staff reply, order updates aur in-app alerts | App band ho to bhi notification pohanche. Missing item ki complaint se resolution tak customer aur staff dono ka record match kare. |
| 11. Admin aur audit | Merchant/rider review, staff permissions, financial approvals, bank reference ka manual milaan aur audit history | Launch server par roles ki had, private files aur audit access check karein. Refund approval ke baad asal paisay wapas jane ka saboot rakhein. |
| 12. Hosting, security aur recovery | Gateway, alag services, local databases aur local messaging setup | HTTPS, asli email, alerts, load aur retry ki jaanch karein. Backup se restore aur pichle version par wapsi ka waqt record karein. |

### Kis tarteeb se launch tak pohnchna hai?

1. **Operations ke faislay.** Pilot ke sectors, merchant aur rider profile ki zaroori maloomat, support contact, rider rates, tax, cancellation aur payment modes tay karein. In faislon se bachi coding ka scope maloom hoga.
2. **Asli phone aur launch jaisa server.** Naye customer, restaurant, rider aur reviewer ke alag accounts par upar ke flows chalayein. Har nateeje ke saath device, build, tareekh aur record rakhein.
3. **Paison aur recovery ki tasdeeq.** Har enabled payment mode ka hisaab milayein. Agar pehle din card ya wallet dena hai to provider, refund aur payout ka test isi qadam mein zaroori hai. Backup restore aur alerts bhi azmayein.
4. **Mehdood live pilot.** Asli restaurant aur rider ke saath deliveries chalayein. Orders, complaints aur rozana payout ka nateeja dekh kar public rollout ka faisla karein.

**Agli progress report mein** har module ke saamne zimmedar shakhs, khula kaam, test ki jagah (local, staging ya pilot), saboot aur nateeja darj karein. Screen count ko screen coverage ke liye istemal karein. Production ki progress acceptance cases aur pilot ke nataij se naapain.

**Bunyaad:** [V2 roadmap aur asal handoff ke paanch milestones](../ROADMAP.md), [setup aur test record](../README.md), [do restaurant aur rider ka integration test](../tests/merchant-rider-order.mjs). Project documents mein DES-08 Detailed Engineering Handoff, Requirements 07 Acceptance Criteria aur Requirements 05 Non-Functional Requirements hawalay hain.
