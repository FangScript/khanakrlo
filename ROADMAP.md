# Khana Krlo V2 | Development se launch tak

10 November 2026 · V2 snapshot e701bc3

## 1. Ab tak kitna kaam hua hai?

**68 mein se 68 tay-shuda screens ka code maujood hai.** Browser previews mein 29 Customer, 18 Restaurant, 10 Rider aur 11 Admin screens darj hain. Customer, Restaurant aur Rider ek mobile app mein hain. Admin ka alag staff panel hai. Screen ki ginti design aur code ki coverage batati hai. Payment, recovery aur live operations ka kaam is ginti se naapna ghalat hoga.

**Sab se bara poora hua kaam do restaurants ka COD order hai.** Alag local test setup mein customer ne PKR 600 aur PKR 900 ke do items mangwaye. PKR 120 delivery aur PKR 10 platform fee ke saath bill PKR 1,630 bana. Dono kitchens ne order tayyar kiya, ek rider ne dono pickups kiye, ghalat OTP reject hua aur sahi OTP se delivery poori hui. Restaurants ko PKR 600 aur PKR 900 mile. Prepaid balance par commission ek baar laga.

**Test ki had.** Is review mein orders, merchant aur admin ke 5 automated tests dobara chale aur sab pass hue. Upar wala poora COD safar pehle Docker integration test mein pass hua tha. Android bundle bhi pehle bana aur download hua. Physical phone par poore safar aur live paison ka saboot abhi baqi hai. Aakhri status check par local Docker aur Expo preview offline thay.

### Asli handoff ke 5 milestones

- **A · Release ke faislay — kuch tay ho gaye.** Ek mobile app, multi-restaurant cart, pehle order se pehle email verification aur PKR 10 fee tay hain. Pilot ka ilaka, rates aur exceptions abhi final karne hain.
- **B · Architecture aur contracts — kuch kaam hua hai.** Gateway aur alag services bani hain. Har service ke API aur event contracts, retry, migration aur rollback ki jaanch baqi hai.
- **C · Ek mukammal order — local COD test pass.** Customer se restaurant, rider aur receipt tak safar chala. Agli tasdeeq asli phone aur staging par hai.
- **D · Hisaab aur recovery — kuch kaam hua hai.** COD commission aur cash receipt test hui. Roz ka poora hisaab aur backup se bahali ki rehearsal baqi hai.
- **E · Mehdood live pilot — baqi hai.** Asli merchants, rider aur customer ke saath supervised pilot aur us ka sign-off record karna hai.

In paanch mein **ek milestone ka bunyadi nateeja local test par pass, teen par kuch kaam hua hai aur ek ka live saboot baqi hai**. Har milestone ki mehnat mukhtalif hai, is liye in se overall completion percentage nikalna munasib nahin.

## 2. Har hissay mein kya baqi hai?

### Customer aur account · 29 screens

**Ban gaya:** Guest browsing, signup, login, password reset, email code, address aur pin, dish search, add-ons, cart, checkout, tracking, receipt aur support. Guest cart ko sign-in ke baad wapas lane ka browser flow pehle check hua.

**Baqi:** Asli Android par location allow aur deny, gallery ke muqable mein layout, keyboard, email link, OTP aur kamzor network ke baad cart ki bahali check karein. Asli inbox mein verification aur reset email pohanchni chahiye. Google sign-in pehle defer hua tha.

### Restaurant · 18 screens

**Ban gaya:** Application, private documents, approval, branches, hours, service area, staff access, menu photos, accept/prepare/ready, pickup aur cash receipts. Service area ke andar aur bahar catalogue ka farq test hua.

**Baqi:** Pilot restaurant ki asli branch, menu, hours aur delivery boundary set karein. Staff apni branch tak mehdood rahe, sold-out dish hata sake aur ek branch cancel karne par baqi order aur bill durust rahen. In cases ka staging record chahiye.

### Rider · 10 screens

**Ban gaya:** Online/offline, offers, do pickups, directions, customer OTP, cash handoff, earnings aur payout history. Dono taraf se cash ki tasdeeq ka local test hua.

**Baqi:** Asli route aur phone par pickup sequence check karein. Rider ki base aur distance earning, fees jama karne ka waqt, cash kam milne ki zimmedari aur payout schedule tay karein. Rider ke paas bache PKR 130 ka rozana hisaab milna abhi alag kaam hai.

### Admin, support aur paisay · 11 screens

**Ban gaya:** Staff permissions, merchant/rider review, support reply, audit history aur financial approvals. Bank top-up ko reference se manually reconcile karne ka local flow hai.

**Baqi:** Digital checkout abhi server par band hai. Refund approval ke baad processor aur balance adjustment ke baad ledger posting baqi reh sakti hai. Provider ki tasdeeq, duplicate callback, partial refund, bank payout aur roz ki reconciliation ko asal payment setup se milana hoga.

## 3. Agla kaam kis tarteeb se hoga?

Yeh tarteeb ek chhote COD pilot ke liye tajweez hai. Faislay aap ke paas hain. Implementation, tests aur unke saboot hum V2 par rakhenge.

1. **Preview aur phone ka safar.** Docker aur Expo chala kar pehle ek asli Android phone par guest se checkout tak jayen. Phir restaurant aur rider flows chala kar ghalat OTP, sahi OTP aur do receipts check karein. **Poora jab:** device, build, order ID aur har qadam ka nateeja record ho.

2. **Pilot ki had aur paison ke rules.** Aap pehle sectors, hours, support contact, delivery ka zimma aur enabled payment modes tay karein. Phir delivery/rider rates, tax aur rounding, cancellation, refund, discounts kis ke kharchay par honge, aur cash jama karne ki cutoff approve karein. **Poora jab:** ek normal order, ek partial cancellation aur ek cash-short case ka hisaab aap approve karein.

3. **COD aur support ki kamiyaan band karein.** Approved rules se merchant prepaid balance, rider cash, platform fee aur customer receipt milayein. Saath order accept karne, dobara tap, pickup ke darmiyan network tootne, aur late cancellation ke tests chalayein. In-app alerts maujood hain. Background notifications aur customer-rider rabte ka pilot tareeqa verify karein. **Poora jab:** har rupee ka malik maloom ho, dobara charge na ho aur support discrepancy resolve kar sake.

4. **Staging ko launch ke qabil banayein.** Hosting, HTTPS, real email, private uploads, access control, monitoring aur alerts lagayein. Admin ki doosri tasdeeq par design aur baad ke product faislay ko ek release rule mein darj karein. Backup ko alag environment mein restore karein, service aur event retry chala kar dekhein, load aur kharcha naapain. **Poora jab:** rollback aur restore ka waqt, access checks aur peak load ka nateeja likha ho.

5. **Mehdood live pilot chalayein.** Approved ilake mein restaurant aur rider ke saath supervised COD deliveries karein. Har din orders, receipts, commission, rider cash aur complaints milayein. **Poora jab:** finance aur operations hisaab sign off karein, critical maslay band hon aur aap agla ilaka kholne ka faisla karein.

**Digital payments ki apni dependency hai.** Agar pehle din card ya wallet chahiye to provider integration aur refund/payout verification qadam 5 se pehle aayenge. Agar aap COD-only pilot chunte hain to yeh doosri release mein aa sakte hain. AI/speech, advanced ETA aur bari analytics ko expansion ke waqt scope karein.

## 4. Progress kaise update hogi?

Har acceptance case ke saath paanch cheezen likhein: requirement ID, zimmedar shakhs, test ka environment, saboot aur nateeja. Misal ke taur par **AC-16 · COD record** ke liye order ID, dono restaurant receipts aur cash ka total aik saath rakhein. Status tab badlein jab aglay environment mein bhi wohi case pass ho.

- **Agli update ki pehli ginti:** kitne physical-phone flows chale, kitne fail hue, aur kis qadam par. Is waqt phone ka poora sign-off baqi hai.
- **Doosri ginti:** 32 acceptance cases mein kitnon ke saath test aur release saboot juda hai. 15 non-functional requirements ke liye bhi saboot chahiye. Source PDF mein cases “NOT RUN” thay. V2 ke baad wale tests ko har case se jorna baqi hai.
- **Teesri ginti:** pilot mein kitne delivered orders ka customer bill, merchant receipt aur rider cash usi din mila. Digital refunds aur payouts ki ginti tab shamil karein jab woh mode enable ho.

### Saboot aur bunyaad

- [V2 setup aur features](README.md) aur [do restaurants ka integration test](tests/merchant-rider-order.mjs).
- [Orders ke tests](services/orders/orders.test.mjs), [merchant ke tests](services/merchant/merchant.test.mjs) aur [admin ke tests](services/admin/admin.test.mjs).
- [Digital checkout ki maujooda had](services/orders/server.mjs), [refund aur adjustment ke status](services/admin/store.mjs) aur [local deployment](compose.yaml).
- Project sources: DES-08 Detailed Engineering Handoff & Delivery Plan, safhay 3–5; Requirements 07 Acceptance Criteria & Traceability; Requirements 08 Decisions, Risks & Approval Register; Requirements 05 Non-Functional Requirements. Baad ke approved product faislay jahan lagu thay wahan shamil kiye gaye hain.
