# Khana Krlo · V2

Khana Krlo Islamabad aur Rawalpindi ke liye food delivery app hai. Customer ek cart mein mukhtalif restaurants ki dishes rakh sakta hai. Har restaurant apna hissa tayyar karta hai aur ek rider sab pickups ke baad customer ko ek delivery deta hai.

## App mein kya hai

| Hissa | Screens | Kahan se khulta hai | Kaam |
| --- | ---: | --- | --- |
| Customer | 29 | Mobile app khol kar | Guest browsing, account, address aur pin, search, menu, cart, checkout, order tracking, delivery code, receipt aur support |
| Restaurant | 18 | Account → Workspace access | Application aur documents jama karna, approval dekhna, branch hours, delivery area, staff, menu, kitchen orders, rider pickup aur cash receipts |
| Rider | 10 | Account → Workspace access | Availability, delivery offers, pickups, customer ki manzil, handover code, restaurant ko cash dena, earnings aur payout history |
| Admin | 11 | Computer par alag staff panel | Applications ka review, staff access, support cases, refunds, balance adjustments, payout reconciliation aur audit history |

Restaurant aur rider dono isi mobile app mein khulte hain. Sign in ke baad user apni application de sakta hai. Approval milne par us account ke workspace mein kaam ke controls khulte hain.

## Local preview chalayein

Neeche Windows PowerShell ke commands hain. Is setup ke liye Git, Docker Desktop (Linux containers aur Compose), Node.js 24, pnpm 10 aur phone par SDK 58 ke saath compatible Expo Go chahiye.

```powershell
git clone --branch V2 https://github.com/FangScript/khanakrlo.git
cd khanakrlo
```

**1. Naye local setup ki settings banayein.** Computer aur phone ko ek Wi-Fi par rakhein. Computer ka Wi-Fi IPv4 address `ipconfig` se milta hai. Neeche ka block pehli baar chalayein. Baad mein isi database ke saath wohi `.env` istemal karein.

```powershell
if (Test-Path -LiteralPath .env) { throw 'Is folder mein .env pehle se hai. Maujooda settings istemal karein.' }
$lanIp = (Read-Host 'Computer ka Wi-Fi IPv4 address').Trim()
$keys = 'POSTGRES_PASSWORD','IDENTITY_PASSWORD','NATS_TOKEN','CODE_SECRET','ORDER_OPERATIONS_KEY','ACCOUNT_ERASURE_KEY','ADMIN_ACCESS_KEY'
$settings = foreach ($key in $keys) {
    $secret = node -p "require('node:crypto').randomBytes(32).toString('hex')"
    if ($LASTEXITCODE -ne 0) { throw 'Local key generate nahin hui.' }
    "$key=$secret"
}
$settings += @(
    "GATEWAY_BIND=$lanIp", 'GATEWAY_PORT=18218',
    "WEB_ORIGINS=http://${lanIp}:8097,http://localhost:8097,http://127.0.0.1:8097",
    "RESET_URL=http://${lanIp}:8097", 'CATALOGUE_FILE=/app/preview.json',
    'PREVIEW_DELIVERY_PAISA=12000', 'PREVIEW_TAX_BPS=0'
)
$settings | Set-Content -LiteralPath .env -Encoding ascii
```

`.env` Git se excluded hai. `CATALOGUE_FILE` demo restaurants dikhata hai. Apni approved branches ka catalogue dekhne ke liye is setting ki value khaali kar sakte hain.

**2. Backend shuru karein.** Repo ke root mein chalayein. Readiness check mein `ready: true` aana chahiye.

```powershell
docker compose up -d --build
docker compose ps
$lanIp = ((Get-Content .env | Select-String '^GATEWAY_BIND=').Line -split '=',2)[1]
Invoke-RestMethod "http://${lanIp}:18218/identity/ready"
```

**3. Mobile app kholein.** Usi PowerShell window mein chalayein, phir Expo Go mein terminal ka QR scan karein. Browser preview ke liye terminal mein **w** dabayein.

```powershell
cd apps/mobile
pnpm install --frozen-lockfile
$env:EXPO_PUBLIC_GATEWAY_URL = "http://${lanIp}:18218"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $lanIp
pnpm exec expo start --go --lan --port 8097
```

Email verification aur password reset ke local messages computer par [Mailpit](http://127.0.0.1:8026) mein milte hain. [Admin panel](http://127.0.0.1:18320) ke liye staff access chahiye. Pehle administrator ka role database administrator ek registered account ko deta hai. Iski working misaal [integration test](tests/merchant-rider-order.mjs) mein hai.

## Ek COD order ka hisaab

Test mein do restaurants ka khana PKR 600 aur PKR 900 tha. PKR 120 delivery aur PKR 10 platform fee mila kar customer ka bill **PKR 1,630** bana. Dono pickups ke baad rider ne customer ka delivery code enter kiya. Restaurants ne apne poore PKR 600 aur PKR 900 ki cash receipts confirm ki. Unka 20% commission prepaid balance se settle hua. Raqmein backend mein paisa mein store hoti hain.

## Code aur tests

| Jagah | Zimmedari |
| --- | --- |
| [Mobile app](apps/mobile/) | Expo aur React Native mein customer, restaurant aur rider screens |
| [Gateway](services/gateway/) aur [identity](services/identity/) | Mobile requests, PostgreSQL accounts, sessions, email codes aur staff roles |
| [Catalogue](services/catalogue/) aur [merchant](services/merchant/) | Address ke hisaab se menu, branch operations, kitchen aur restaurant ledger |
| [Orders](services/orders/) aur [rider](services/rider/) | Checkout, order status, OTP, delivery assignments aur cash handoff |
| [Admin](services/admin/) | Staff web panel, approvals, reconciliation aur audit |
| [Compose](compose.yaml) | Local services, PostgreSQL, NATS JetStream, Mailpit aur persistent volumes |

Repo ke root mein ye tests chalayein.

```powershell
node --test services/orders/orders.test.mjs services/merchant/merchant.test.mjs services/admin/admin.test.mjs
node tests/merchant-rider-order.mjs
```

Doosra command Docker mein alag test environment banata hai. Is mein email verification, restaurant aur rider approvals, menu publish karna, do restaurants ka checkout, ghalat aur sahi OTP, cash receipts aur account closure check hote hain. Test apne temporary containers aur volumes saaf karta hai.

## Verification aur launch ki surat-e-haal

Local backend par signup, login, logout aur dono shehron ki restaurant list verify hui hai. Android bundle download karke dono workspaces ki maujoodgi check hui hai. Physical phone par aakhri layout aur tap-through check baqi hai. Live digital payments, refund processing aur bank transfers ke liye provider integration aur settlement verification bhi baqi hain. Preview ki delivery aur tax settings sirf local test ke liye hain.
