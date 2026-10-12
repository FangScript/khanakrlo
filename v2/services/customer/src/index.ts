import { createCipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { asyncRoute, createService, databaseUrlFor, getPool, HttpError, internalAuth, requireSession, parsePort, startService, transaction, idempotent } from "@khana/service-kit";

const service = "customer";
const pool = getPool(databaseUrlFor(service));
const addressInput = z.object({ label: z.string().trim().min(1).max(80), addressLine: z.string().trim().min(5).max(500), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict();
const cartInput = z.object({ outletId: z.string().uuid(), version: z.number().int().nonnegative().max(2147483646), items: z.array(z.object({ menuItemId: z.string().uuid(), quantity: z.number().int().min(1).max(50), modifierIds: z.array(z.string().uuid()).max(30) }).strict()).max(50) }).strict();
const app = createService({ name: service, version: "0.1.0", databaseUrl: databaseUrlFor(service), routes(router) {
  router.post("/internal/v1/addresses/validate", internalAuth("INTERNAL_CUSTOMER_TOKEN"), asyncRoute(async (req, res) => {
    const input = z.object({ userId: z.string().uuid(), addressId: z.string().uuid() }).strict().parse(req.body);
    const result = await pool.query('SELECT a.id, a.address_line AS "addressLine", a.latitude, a.longitude, p.phone_consent_at FROM customer_addresses a LEFT JOIN customer_profiles p ON p.user_id=a.user_id WHERE a.id=$1 AND a.user_id=$2', [input.addressId, input.userId]);
    const row = result.rows[0];
    if (!row) throw new HttpError(404, "ADDRESS_NOT_FOUND", "The address could not be found.");
    if (!row.phone_consent_at) throw new HttpError(409, "PHONE_CONSENT_REQUIRED", "Add a phone number and accept phone-use consent before checkout.");
    res.json({ id: row.id, addressLine: row.addressLine, latitude: row.latitude, longitude: row.longitude });
  }));
  router.use("/v1", requireSession);
  router.get("/v1/profile", asyncRoute(async (_req, res) => {
    const result = await pool.query("SELECT display_name, phone_last_four, phone_consent_at FROM customer_profiles WHERE user_id=$1", [res.locals.session.sub]);
    const row = result.rows[0];
    res.json({ id: res.locals.session.sub, displayName: row?.display_name ?? "", phone: row?.phone_last_four ? `+••••••••••${row.phone_last_four}` : null, phoneConsentAt: row?.phone_consent_at ?? null });
  }));
  router.patch("/v1/profile", asyncRoute(async (req, res) => {
    const input = z.object({ displayName: z.string().trim().min(1).max(120) }).strict().parse(req.body);
    await pool.query("INSERT INTO customer_profiles (user_id, display_name) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET display_name=EXCLUDED.display_name, updated_at=now()", [res.locals.session.sub, input.displayName]);
    res.json(input);
  }));
  router.put("/v1/profile/phone-consent", asyncRoute(async (req, res) => {
    const input = z.object({ phone: z.string().regex(/^\+[1-9]\d{7,14}$/), consent: z.literal(true) }).strict().parse(req.body);
    const rawKey = process.env.PHONE_ENCRYPTION_KEY_HEX ?? "";
    if (!/^[0-9a-f]{64}$/i.test(rawKey)) throw new HttpError(503, "PHONE_CAPTURE_NOT_CONFIGURED", "Phone capture is not configured.");
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", Buffer.from(rawKey, "hex"), nonce);
    const ciphertext = Buffer.concat([cipher.update(input.phone, "utf8"), cipher.final(), cipher.getAuthTag()]);
    const lastFour = input.phone.slice(-4);
    const result = await pool.query("INSERT INTO customer_profiles (user_id, phone_ciphertext, phone_nonce, phone_last_four, phone_consent_at) VALUES ($1,$2,$3,$4,now()) ON CONFLICT (user_id) DO UPDATE SET phone_ciphertext=EXCLUDED.phone_ciphertext, phone_nonce=EXCLUDED.phone_nonce, phone_last_four=EXCLUDED.phone_last_four, phone_consent_at=now(), updated_at=now() RETURNING phone_consent_at", [res.locals.session.sub, ciphertext, nonce, lastFour]);
    res.json({ phone: `+••••••••••${lastFour}`, phoneConsentAt: result.rows[0].phone_consent_at });
  }));
  router.get("/v1/addresses", asyncRoute(async (_req, res) => {
    const result = await pool.query('SELECT id, label, address_line AS "addressLine", latitude, longitude FROM customer_addresses WHERE user_id=$1 ORDER BY created_at, id LIMIT 50', [res.locals.session.sub]);
    res.json({ items: result.rows });
  }));
  router.post("/v1/addresses", asyncRoute(async (req, res) => {
    const input = addressInput.parse(req.body), userId = res.locals.session.sub as string;
    const result = await transaction(pool, (client) => idempotent(client, userId, "address.create", req.header("idempotency-key"), input, async () => {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`addresses:${userId}`]);
      const count = await client.query("SELECT count(*)::int AS count FROM customer_addresses WHERE user_id=$1", [userId]);
      if (count.rows[0].count >= 50) throw new HttpError(409, "ADDRESS_LIMIT", "Remove an address before adding another.");
      const saved = await client.query("INSERT INTO customer_addresses (user_id,label,address_line,latitude,longitude) VALUES ($1,$2,$3,$4,$5) RETURNING id", [userId,input.label,input.addressLine,input.latitude,input.longitude]);
      return { id: saved.rows[0].id, ...input };
    }));
    res.status(201).json(result);
  }));
  router.patch("/v1/addresses/:id", asyncRoute(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id), input = addressInput.parse(req.body);
    const result = await pool.query("UPDATE customer_addresses SET label=$3,address_line=$4,latitude=$5,longitude=$6 WHERE id=$1 AND user_id=$2 RETURNING id", [id,res.locals.session.sub,input.label,input.addressLine,input.latitude,input.longitude]);
    if (!result.rowCount) throw new HttpError(404, "ADDRESS_NOT_FOUND", "The address could not be found.");
    res.json({ id, ...input });
  }));
  router.delete("/v1/addresses/:id", asyncRoute(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await pool.query("DELETE FROM customer_addresses WHERE id=$1 AND user_id=$2", [id,res.locals.session.sub]);
    res.status(204).end();
  }));
  router.get("/v1/cart", asyncRoute(async (_req, res) => {
    const result = await pool.query('SELECT outlet_id AS "outletId", items, version FROM customer_carts WHERE user_id=$1', [res.locals.session.sub]);
    res.json(result.rows[0] ?? { outletId: null, items: [], version: 0 });
  }));
  router.put("/v1/cart", asyncRoute(async (req, res) => {
    const input = cartInput.parse(req.body), userId = res.locals.session.sub as string;
    const saved = await transaction(pool, async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`cart:${userId}`]);
      const current = await client.query("SELECT version FROM customer_carts WHERE user_id=$1", [userId]);
      if ((current.rows[0]?.version ?? 0) !== input.version) throw new HttpError(409, "CART_VERSION_CONFLICT", "Reload the cart before saving changes.");
      const version = input.version + 1;
      await client.query("INSERT INTO customer_carts (user_id,outlet_id,items,version) VALUES ($1,$2,$3::jsonb,$4) ON CONFLICT (user_id) DO UPDATE SET outlet_id=EXCLUDED.outlet_id,items=EXCLUDED.items,version=EXCLUDED.version,updated_at=now()", [userId,input.outletId,JSON.stringify(input.items),version]);
      return { ...input, version };
    });
    res.json(saved);
  }));
} });
const port = parsePort(process.env.PORT, 3106);
await startService(app, port, service);
