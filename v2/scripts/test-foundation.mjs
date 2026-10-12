import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import pg from "pg";
import { SignJWT } from "jose";

if (!process.env.INTEGRATION_DATABASE_URL) throw new Error("Set INTEGRATION_DATABASE_URL to a disposable PostgreSQL instance with database/role creation privileges.");
const admin = new pg.Client({ connectionString: process.env.INTEGRATION_DATABASE_URL });
const tag = randomBytes(6).toString("hex");
const databases = [], processes = [], clients = [];
const secret = randomBytes(32).toString("hex"), internalToken = randomBytes(32).toString("hex");
const env = { ...process.env, NODE_ENV: "test", ACCESS_TOKEN_SECRET: secret, JWT_ISSUER: "test-identity", JWT_AUDIENCE: "test-app", INTERNAL_IDENTITY_TOKEN: internalToken, INTERNAL_CUSTOMER_TOKEN: internalToken, INTERNAL_RESTAURANT_IDENTITY_TOKEN: internalToken, RESTAURANT_INTERNAL_TOKEN: internalToken, MENU_INTERNAL_TOKEN: internalToken, PAYMENT_INTERNAL_TOKEN: internalToken, PHONE_ENCRYPTION_KEY_HEX: randomBytes(32).toString("hex"), COD_CUSTODY_LIMIT_PAISE: "1000", COD_CUSTODY_POLICY: "current_cash", RABBITMQ_URL: "" };

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const port = server.address().port;
  await new Promise((done) => server.close(done));
  return port;
}
async function database(service) {
  const name = `khana_test_${tag}_${service}`;
  assert.match(name, /^khana_test_[a-f0-9]{12}_[a-z]+$/);
  const password = randomBytes(24).toString("hex");
  await admin.query(`CREATE ROLE ${name} LOGIN PASSWORD '${password}'`);
  databases.push(name);
  await admin.query(`CREATE DATABASE ${name} OWNER ${name}`);
  await admin.query(`REVOKE CONNECT ON DATABASE ${name} FROM PUBLIC`);
  const url = new URL(process.env.INTEGRATION_DATABASE_URL);
  url.username = name; url.password = password; url.pathname = `/${name}`;
  env[`${service.toUpperCase()}_DATABASE_URL`] = url.toString();
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect(); clients.push(client);
  for (const directory of ["infrastructure/db-migrations", `services/${service}/migrations`]) {
    for (const file of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) await client.query(await readFile(resolve(directory, file), "utf8"));
  }
  return client;
}
async function start(service) {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  env[`${service.toUpperCase()}_URL`] = url;
  const child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], { cwd: resolve("services", service), env: { ...env, PORT: String(port) }, stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
  let errors = "";
  child.stderr.on("data", (data) => { errors = (errors + data.toString()).slice(-4000); });
  processes.push(child);
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`${service} failed to start: ${errors}`);
    try { if ((await fetch(`${url}/health/ready`)).ok) return url; } catch { /* startup */ }
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`${service} readiness timed out: ${errors}`);
}
async function request(base, path, { token, method = "GET", body, key, internal = false } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(key ? { "idempotency-key": key } : {}), ...(internal ? { "x-service-token": internalToken } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
async function user(identity, roles) {
  const id = randomUUID(), sid = randomUUID();
  await identity.query("INSERT INTO identity_users (id,google_subject) VALUES ($1,$2)", [id,id]);
  for (const role of roles) await identity.query("INSERT INTO identity_user_roles (user_id,role) VALUES ($1,$2)", [id,role]);
  await identity.query("INSERT INTO identity_sessions (id,user_id,refresh_token_hash,refresh_expires_at) VALUES ($1,$2,$3,now()+interval '1 day')", [sid,id,"0".repeat(64)]);
  const token = await new SignJWT({ sid,roles }).setSubject(id).setProtectedHeader({ alg: "HS256" }).setIssuer(env.JWT_ISSUER).setAudience(env.JWT_AUDIENCE).setExpirationTime("5m").sign(new TextEncoder().encode(secret));
  return { id,sid,token };
}

await admin.connect();
try {
  const identity = await database("identity"), customer = await database("customer"), payment = await database("payment");
  const foreign = new pg.Client({ connectionString: env.IDENTITY_DATABASE_URL.replace(new URL(env.IDENTITY_DATABASE_URL).pathname, new URL(env.CUSTOMER_DATABASE_URL).pathname) });
  await assert.rejects(foreign.connect(), /permission denied/);
  await foreign.end().catch(() => undefined);
  await start("identity"); const customerUrl = await start("customer"), paymentUrl = await start("payment");
  const owner = await user(identity,["customer"]), other = await user(identity,["customer"]), rider = await user(identity,["rider"]);
  assert.equal((await request(customerUrl,"/v1/profile/phone-consent",{ token:owner.token, method:"PUT", body:{ phone:"+923001234567",consent:false } })).status,400);
  const phone = await request(customerUrl,"/v1/profile/phone-consent",{ token:owner.token,method:"PUT",body:{ phone:"+923001234567",consent:true } });
  assert.equal(phone.status,200); assert.ok(phone.body.phone.endsWith("4567")); assert.ok(!JSON.stringify(phone.body).includes("923001234567"));
  const address = { label:"Home",addressLine:"Pilot test address",latitude:24.8,longitude:67.0 };
  const duplicates = await Promise.all([1,2].map(() => request(customerUrl,"/v1/addresses",{ token:owner.token,method:"POST",key:"address-request-001",body:address })));
  assert.deepEqual(duplicates.map((value) => value.status),[201,201]); assert.equal(duplicates[0].body.id,duplicates[1].body.id);
  assert.equal((await customer.query("SELECT count(*)::int AS count FROM customer_addresses")).rows[0].count,1);
  assert.equal((await request(customerUrl,`/v1/addresses/${duplicates[0].body.id}`,{ token:other.token,method:"PATCH",body:address })).status,404);
  const cart = { outletId:randomUUID(),version:0,items:[] };
  const saves = await Promise.all([1,2].map(() => request(customerUrl,"/v1/cart",{ token:owner.token,method:"PUT",body:cart })));
  assert.deepEqual(saves.map((value) => value.status).sort(),[200,409]);
  const initialOrders = [randomUUID(),randomUUID()];
  const assign = (orderId) => request(paymentUrl,`/internal/v1/cod/order-authorizations/${orderId}`,{ internal:true,method:"PUT",body:{ riderId:rider.id,amountPaisa:600,status:"assigned" } });
  const offers = await Promise.all(initialOrders.map(assign));
  assert.deepEqual(offers.map((value) => value.status).sort(),[204,409]);
  const accepted = initialOrders[offers.findIndex((value) => value.status === 204)];
  for (const [index,orderId] of [accepted,randomUUID()].entries()) {
    if (index) assert.equal((await assign(orderId)).status,204);
    assert.equal((await request(paymentUrl,`/internal/v1/cod/order-authorizations/${orderId}`,{ internal:true,method:"PUT",body:{ riderId:rider.id,amountPaisa:600,status:"delivered" } })).status,204);
    const options = { token:rider.token,method:"POST",key:`cash-collection-${index}-original`,body:{ orderId,amountPaisa:600 } };
    assert.equal((await request(paymentUrl,"/v1/cod/collections",options)).status,201);
    assert.equal((await request(paymentUrl,"/v1/cod/collections",options)).status,200);
    assert.equal((await request(paymentUrl,"/v1/cod/collections",{ ...options,key:`cash-collection-${index}-different` })).status,409);
  }
  assert.equal((await assign(randomUUID())).status,409);
  const submitted = await request(paymentUrl,"/v1/cod/remittances",{ token:rider.token,method:"POST",key:"remittance-request-001",body:{ amountPaisa:1200,reference:"pilot-test" } });
  assert.equal(submitted.status,201);
  assert.equal((await request(paymentUrl,"/v1/cod/custody",{ token:rider.token })).body.outstandingPaisa,1200);
  assert.equal((await request(paymentUrl,`/v1/cod/remittances/${submitted.body.id}/verify`,{ token:rider.token,method:"POST",body:{} })).status,403);
  assert.equal(Number((await payment.query("SELECT variance_paisa FROM cod_custody_reconciliation WHERE rider_id=$1",[rider.id])).rows[0].variance_paisa),0);
  await assert.rejects(payment.query("DELETE FROM cod_cash_ledger"),/append-only/);
  await assert.rejects(payment.query("TRUNCATE cod_cash_ledger"),/append-only/);
  assert.equal((await request(env.IDENTITY_URL,"/v1/sessions/logout",{ token:owner.token,method:"POST",body:{} })).status,200);
  assert.equal((await request(customerUrl,"/v1/profile",{ token:owner.token })).status,401);
  console.log("Foundation integration passed: database isolation, masked consent, ownership, concurrent writes/assignments, cash retries, pending custody, immutable ledger, reconciliation and revocation.");
  console.log("This is not the complete 20-order pilot acceptance journey.");
} finally {
  for (const child of processes) {
    if (child.exitCode === null) { const exited = once(child,"exit"); child.kill(); await exited; }
  }
  for (const client of clients) await client.end().catch(() => undefined);
  for (const name of databases.reverse()) {
    assert.match(name,/^khana_test_[a-f0-9]{12}_[a-z]+$/);
    await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await admin.query(`DROP ROLE IF EXISTS ${name}`);
  }
  await admin.end();
}
