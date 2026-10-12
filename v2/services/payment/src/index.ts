import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { canAcceptCashOrder, parseCustodyPolicy } from "./custody-policy.js";
import { asyncRoute, createService, databaseUrlFor, enqueueDomainEvent, getPool, internalAuth, internalJson, newDomainEvent, parsePort, requireRole, requireSession, startOutboxRelay, startService } from "@khana/service-kit";

const service = "payment";
const databaseUrl = databaseUrlFor(service);
const pool = getPool(databaseUrl);
const money = z.number().int().positive().max(100_000_000);
const orderId = z.string().uuid();
const collectionInput = z.object({ orderId, amountPaisa: money }).strict();
const orderAuthorizationInput = z.object({ orderId, riderId: z.string().uuid(), amountPaisa: money, status: z.enum(["assigned", "delivered", "cancelled"]) }).strict();
const remittanceInput = z.object({ amountPaisa: money, reference: z.string().trim().min(4).max(100) }).strict();
const idempotencyHeader = z.string().trim().min(16).max(128);
const outletId = z.string().uuid();

function custodyLimitPaisa() {
  const raw = process.env.COD_CUSTODY_LIMIT_PAISE;
  if (!raw || !/^\d+$/.test(raw) || (Number(raw) <= 0 || !Number.isSafeInteger(Number(raw)))) return undefined;
  try { parseCustodyPolicy(process.env.COD_CUSTODY_POLICY); } catch { return undefined; }
  return Number(raw);
}

function requestHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function hasValidServiceToken(value: string | undefined) {
  const expected = process.env.PAYMENT_INTERNAL_TOKEN ?? "";
  if (!value || Buffer.byteLength(expected) < 32) return false;
  const providedBytes = Buffer.from(value);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

const app = createService({ name: service, version: "0.1.0", databaseUrl, routes(router) {
  router.post("/internal/v1/commission/quote", internalAuth("PAYMENT_INTERNAL_TOKEN"), asyncRoute(async (req,res)=>{
    const input=z.object({outletId,subtotalPaisa:z.number().int().positive().max(1_000_000_000)}).strict().parse(req.body);
    const stored=await pool.query<{rate_bps:number}>("SELECT rate_bps FROM merchant_commission_policies WHERE outlet_id=$1",[input.outletId]);
    const configured=process.env.PLATFORM_COMMISSION_BPS ?? "";
    const raw=stored.rows[0]?.rate_bps ?? (/^\d+$/.test(configured)?Number(configured):Number.NaN);
    if (!Number.isInteger(raw)||raw<0||raw>10000) { res.status(503).json({error:"COMMISSION_POLICY_NOT_CONFIGURED",message:"An approved commission rate is required."}); return; }
    const commissionPaisa=Number((BigInt(input.subtotalPaisa)*BigInt(raw))/10000n);
    res.json({rateBps:raw,commissionPaisa});
  }));

  router.put("/v1/commission/outlets/:outletId", requireSession, requireRole("merchant"), asyncRoute(async(req,res)=>{
    const session=res.locals.session as {sub:string};
    const id=outletId.parse(req.params.outletId);
    const {rateBps}=z.object({rateBps:z.number().int().min(0).max(10000)}).strict().parse(req.body);
    await internalJson("RESTAURANT_URL","RESTAURANT_INTERNAL_TOKEN",`/internal/v1/outlets/${id}/authorize`,{userId:session.sub});
    const client=await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO merchant_commission_policies(outlet_id,rate_bps,updated_by) VALUES($1,$2,$3) ON CONFLICT(outlet_id) DO UPDATE SET rate_bps=EXCLUDED.rate_bps,updated_by=EXCLUDED.updated_by,updated_at=now()",[id,rateBps,session.sub]);
      await client.query("INSERT INTO payment_audit_log(actor_id,action,subject_id,details) VALUES($1,'commission_policy_updated',$2,$3::jsonb)",[session.sub,id,JSON.stringify({rateBps})]);
      await enqueueDomainEvent(client,newDomainEvent({type:"payment.commission_policy_updated",version:1,producer:service,aggregateId:id,payload:{outletId:id,rateBps,updatedBy:session.sub}}));
      await client.query("COMMIT");
    } catch(error) { await client.query("ROLLBACK").catch(()=>undefined); throw error; }
    finally { client.release(); }
    res.json({outletId:id,rateBps});
  }));

  router.put("/internal/v1/cod/order-authorizations/:orderId", asyncRoute(async (req, res) => {
    if (!hasValidServiceToken(req.header("x-service-token"))) {
      res.status(401).json({ error: "SERVICE_UNAUTHENTICATED", message: "A trusted service identity is required." });
      return;
    }
    const id = orderId.safeParse(req.params.orderId);
    const parsed = orderAuthorizationInput.safeParse({ ...req.body, orderId: req.params.orderId });
    if (!id.success || !parsed.success) {
      res.status(400).json({ error: "INVALID_REQUEST", message: "Provide a valid order, rider, COD amount, and delivery state." });
      return;
    }
    const limit = custodyLimitPaisa();
    if (limit === undefined) {
      res.status(503).json({ error: "COD_POLICY_NOT_CONFIGURED", message: "Cash custody policy has not been configured." });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`cod-order:${id.data}`]);
      const existingResult = await client.query<{ rider_id: string; amount_paisa: string; delivery_status: string }>("SELECT rider_id, amount_paisa, delivery_status FROM cod_order_authorizations WHERE order_id = $1 FOR UPDATE", [id.data]);
      const existing = existingResult.rows[0];
      if (parsed.data.status === "assigned") {
        if (existing?.delivery_status === "assigned" && existing.rider_id === parsed.data.riderId && Number(existing.amount_paisa) === parsed.data.amountPaisa) {
          await client.query("COMMIT");
          res.status(204).end();
          return;
        }
        if (existing && existing.delivery_status !== "cancelled") {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "ORDER_ASSIGNMENT_CONFLICT", message: "An active COD order assignment cannot be replaced." });
          return;
        }
        await client.query("INSERT INTO rider_cash_custody (rider_id) VALUES ($1) ON CONFLICT DO NOTHING", [parsed.data.riderId]);
        const custody = await client.query<{ outstanding_paisa: string; reserved_paisa: string }>("SELECT outstanding_paisa, reserved_paisa FROM rider_cash_custody WHERE rider_id = $1 FOR UPDATE", [parsed.data.riderId]);
        const outstanding = Number(custody.rows[0]?.outstanding_paisa ?? 0);
        const reserved = Number(custody.rows[0]?.reserved_paisa ?? 0);
        const active = await client.query("SELECT order_id FROM cod_order_authorizations WHERE rider_id=$1 AND delivery_status IN ('assigned','delivered') AND collected_at IS NULL", [parsed.data.riderId]);
        if (active.rowCount) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "RIDER_ALREADY_ASSIGNED", message: "Complete the current delivery and cash collection before accepting another order." });
          return;
        }
        if (!canAcceptCashOrder(parseCustodyPolicy(process.env.COD_CUSTODY_POLICY), outstanding, reserved, parsed.data.amountPaisa, limit)) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "COD_CUSTODY_LIMIT", message: "This rider cannot accept the order within the configured cash custody limit.", outstandingPaisa: outstanding, reservedPaisa: reserved, limitPaisa: limit });
          return;
        }
        await client.query("INSERT INTO cod_order_authorizations (order_id, rider_id, amount_paisa, delivery_status) VALUES ($1, $2, $3, 'assigned') ON CONFLICT (order_id) DO UPDATE SET rider_id = EXCLUDED.rider_id, amount_paisa = EXCLUDED.amount_paisa, delivery_status = 'assigned', updated_at = now()", [id.data, parsed.data.riderId, parsed.data.amountPaisa]);
        await client.query("UPDATE rider_cash_custody SET reserved_paisa = reserved_paisa + $2, updated_at = now() WHERE rider_id = $1", [parsed.data.riderId, parsed.data.amountPaisa]);
      } else if (parsed.data.status === "delivered") {
        if (existing?.rider_id !== parsed.data.riderId || Number(existing?.amount_paisa) !== parsed.data.amountPaisa || !["assigned", "delivered"].includes(existing?.delivery_status ?? "")) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "ORDER_ASSIGNMENT_CONFLICT", message: "Only the assigned rider and exact COD amount can complete this order." });
          return;
        }
        await client.query("UPDATE cod_order_authorizations SET delivery_status = 'delivered', updated_at = now() WHERE order_id = $1", [id.data]);
      } else {
        if (existing?.delivery_status === "cancelled" && existing.rider_id === parsed.data.riderId && Number(existing.amount_paisa) === parsed.data.amountPaisa) {
          await client.query("COMMIT"); res.status(204).end(); return;
        }
        if (existing?.rider_id !== parsed.data.riderId || Number(existing?.amount_paisa) !== parsed.data.amountPaisa || !existing || existing.delivery_status !== "assigned") {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "ORDER_ASSIGNMENT_CONFLICT", message: "Only an undelivered assignment can release a cash custody reservation." });
          return;
        }
        await client.query("UPDATE rider_cash_custody SET reserved_paisa = reserved_paisa - $2, updated_at = now() WHERE rider_id = $1 AND reserved_paisa >= $2", [existing.rider_id, Number(existing.amount_paisa)]);
        await client.query("UPDATE cod_order_authorizations SET delivery_status = 'cancelled', updated_at = now() WHERE order_id = $1", [id.data]);
      }
      await client.query("COMMIT");
      res.status(204).end();
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      res.status(503).json({ error: "ORDER_AUTHORIZATION_UNAVAILABLE", message: "Order authorization could not be recorded." });
    } finally { client.release(); }
  }));

  router.post("/internal/v1/cod/orders/:orderId/collection", internalAuth("PAYMENT_INTERNAL_TOKEN"), asyncRoute(async (req, res) => {
    const parsed = z.object({ riderId: z.string().uuid() }).strict().safeParse(req.body);
    const id = orderId.safeParse(req.params.orderId);
    if (!parsed.success || !id.success) { res.status(400).json({ error: "INVALID_REQUEST" }); return; }
    const result = await pool.query("SELECT 1 FROM cod_cash_ledger WHERE order_id=$1 AND rider_id=$2 AND entry_type='collected'", [id.data, parsed.data.riderId]);
    if (!result.rowCount) { res.status(409).json({ error: "COD_NOT_COLLECTED" }); return; }
    res.status(204).end();
  }));

  router.post("/v1/cod/collections", requireSession, requireRole("rider"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const parsed = collectionInput.safeParse(req.body);
    const key = idempotencyHeader.safeParse(req.header("idempotency-key"));
    if (!parsed.success || !key.success) {
      res.status(400).json({ error: "INVALID_REQUEST", message: "Provide an order, positive cash amount, and Idempotency-Key." });
      return;
    }
    const limit = custodyLimitPaisa();
    if (limit === undefined) {
      res.status(503).json({ error: "COD_POLICY_NOT_CONFIGURED", message: "Cash custody policy has not been configured." });
      return;
    }
    const hash = requestHash(parsed.data);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`cod-order:${parsed.data.orderId}`]);
      await client.query("INSERT INTO rider_cash_custody (rider_id) VALUES ($1) ON CONFLICT DO NOTHING", [session.sub]);
      const custody = await client.query<{ outstanding_paisa: string; reserved_paisa: string }>("SELECT outstanding_paisa, reserved_paisa FROM rider_cash_custody WHERE rider_id = $1 FOR UPDATE", [session.sub]);
      const duplicate = await client.query<{ id: string; request_hash: string; amount_paisa: string; order_id: string }>("SELECT id, request_hash, amount_paisa, order_id FROM cod_cash_ledger WHERE rider_id = $1 AND idempotency_key = $2", [session.sub, key.data]);
      if (duplicate.rows[0]) {
        await client.query("COMMIT");
        if (duplicate.rows[0].request_hash !== hash) {
          res.status(409).json({ error: "IDEMPOTENCY_KEY_REUSED", message: "Use a new Idempotency-Key for a different cash collection." });
          return;
        }
        res.status(200).json({ id: duplicate.rows[0].id, orderId: duplicate.rows[0].order_id, amountPaisa: Number(duplicate.rows[0].amount_paisa), custodyStatus: "unremitted" });
        return;
      }
      const alreadyCollected = await client.query("SELECT id FROM cod_cash_ledger WHERE order_id=$1 AND entry_type='collected'", [parsed.data.orderId]);
      if (alreadyCollected.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "CASH_ALREADY_COLLECTED", message: "This order already has a cash collection." });
        return;
      }
      const authorization = await client.query<{ order_id: string }>("SELECT order_id FROM cod_order_authorizations WHERE order_id = $1 AND rider_id = $2 AND amount_paisa = $3 AND delivery_status = 'delivered' FOR SHARE", [parsed.data.orderId, session.sub, parsed.data.amountPaisa]);
      if (!authorization.rows[0]) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "COD_ORDER_NOT_AUTHORIZED", message: "Cash can only be recorded for the exact COD amount on an order delivered by this rider." });
        return;
      }
      const current = Number(custody.rows[0]?.outstanding_paisa ?? 0);
      const reserved = Number(custody.rows[0]?.reserved_paisa ?? 0);
      if ((parseCustodyPolicy(process.env.COD_CUSTODY_POLICY) === "projected_cash" && current + parsed.data.amountPaisa > limit) || reserved < parsed.data.amountPaisa) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: reserved < parsed.data.amountPaisa ? "COD_RESERVATION_MISSING" : "COD_CUSTODY_LIMIT", message: "The order cash reservation is missing or this collection would exceed the rider's configured custody limit.", outstandingPaisa: current, reservedPaisa: reserved, limitPaisa: limit });
        return;
      }
      const entryId = randomUUID();
      await client.query("INSERT INTO cod_cash_ledger (id, rider_id, order_id, entry_type, amount_paisa, idempotency_key, request_hash) VALUES ($1, $2, $3, 'collected', $4, $5, $6)", [entryId, session.sub, parsed.data.orderId, parsed.data.amountPaisa, key.data, hash]);
      await client.query("UPDATE cod_order_authorizations SET collected_at=now() WHERE order_id=$1", [parsed.data.orderId]);
      await client.query("UPDATE rider_cash_custody SET outstanding_paisa = outstanding_paisa + $2, reserved_paisa = reserved_paisa - $2, updated_at = now() WHERE rider_id = $1 AND reserved_paisa >= $2", [session.sub, parsed.data.amountPaisa]);
      await enqueueDomainEvent(client, newDomainEvent({ type: "cod.cash_collected", version: 1, producer: service, aggregateId: parsed.data.orderId, payload: { entryId, riderId: session.sub, orderId: parsed.data.orderId, amountPaisa: parsed.data.amountPaisa } }));
      await client.query("COMMIT");
      res.status(201).json({ id: entryId, orderId: parsed.data.orderId, amountPaisa: parsed.data.amountPaisa, custodyStatus: "unremitted", outstandingPaisa: current + parsed.data.amountPaisa, custodyLimitPaisa: limit });
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      res.status(503).json({ error: "CASH_LEDGER_UNAVAILABLE", message: "The cash collection was not recorded. Retry using the same Idempotency-Key." });
    } finally { client.release(); }
  }));

  router.get("/v1/cod/custody", requireSession, requireRole("rider"), asyncRoute(async (_req, res) => {
    const session = res.locals.session as { sub: string };
    try {
      const result = await pool.query<{ outstanding_paisa: string }>("SELECT outstanding_paisa FROM rider_cash_custody WHERE rider_id = $1", [session.sub]);
      res.json({ riderId: session.sub, outstandingPaisa: Number(result.rows[0]?.outstanding_paisa ?? 0), custodyLimitPaisa: custodyLimitPaisa() ?? null });
    } catch {
      res.status(503).json({ error: "CASH_LEDGER_UNAVAILABLE", message: "Cash custody could not be loaded." });
    }
  }));

  router.post("/v1/cod/remittances", requireSession, requireRole("rider"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const parsed = remittanceInput.safeParse(req.body);
    const key = idempotencyHeader.safeParse(req.header("idempotency-key"));
    if (!parsed.success || !key.success) {
      res.status(400).json({ error: "INVALID_REQUEST", message: "Provide a positive amount, receipt reference, and Idempotency-Key." });
      return;
    }
    const hash = requestHash(parsed.data);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO rider_cash_custody (rider_id) VALUES ($1) ON CONFLICT DO NOTHING", [session.sub]);
      const custody = await client.query<{ outstanding_paisa: string }>("SELECT outstanding_paisa FROM rider_cash_custody WHERE rider_id = $1 FOR UPDATE", [session.sub]);
      const duplicate = await client.query<{ id: string; request_hash: string; amount_paisa: string; status: string }>("SELECT id, request_hash, amount_paisa, status FROM cod_remittances WHERE rider_id = $1 AND idempotency_key = $2", [session.sub, key.data]);
      if (duplicate.rows[0]) {
        await client.query("COMMIT");
        if (duplicate.rows[0].request_hash !== hash) {
          res.status(409).json({ error: "IDEMPOTENCY_KEY_REUSED", message: "Use a new Idempotency-Key for a different remittance." });
          return;
        }
        res.status(200).json({ id: duplicate.rows[0].id, amountPaisa: Number(duplicate.rows[0].amount_paisa), status: duplicate.rows[0].status });
        return;
      }
      if (parsed.data.amountPaisa > Number(custody.rows[0]?.outstanding_paisa ?? 0)) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "REMITTANCE_EXCEEDS_CUSTODY", message: "A remittance cannot exceed the rider's outstanding cash custody." });
        return;
      }
      const id = randomUUID();
      await client.query("INSERT INTO cod_remittances (id, rider_id, amount_paisa, receipt_reference, idempotency_key, request_hash) VALUES ($1, $2, $3, $4, $5, $6)", [id, session.sub, parsed.data.amountPaisa, parsed.data.reference, key.data, hash]);
      await client.query("COMMIT");
      res.status(201).json({ id, amountPaisa: parsed.data.amountPaisa, status: "awaiting_verification" });
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      res.status(503).json({ error: "REMITTANCE_UNAVAILABLE", message: "The remittance was not recorded. Retry using the same Idempotency-Key." });
    } finally { client.release(); }
  }));

  router.post("/v1/cod/remittances/:remittanceId/verify", requireSession, requireRole("staff"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const id = orderId.safeParse(req.params.remittanceId);
    const allowedVerifiers = (process.env.COD_REMITTANCE_VERIFIER_SUBJECTS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    if (!id.success) {
      res.status(400).json({ error: "INVALID_REQUEST", message: "A valid remittance id is required." });
      return;
    }
    if (!allowedVerifiers.includes(session.sub)) {
      res.status(403).json({ error: "VERIFIER_NOT_APPROVED", message: "This staff account is not approved to verify cash remittances." });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ id: string; rider_id: string; amount_paisa: string; status: string }>("SELECT id, rider_id, amount_paisa, status FROM cod_remittances WHERE id = $1 FOR UPDATE", [id.data]);
      const remittance = result.rows[0];
      if (!remittance) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "REMITTANCE_NOT_FOUND", message: "The remittance could not be found." });
        return;
      }
      if (remittance.status === "verified") {
        await client.query("COMMIT");
        res.status(200).json({ id: remittance.id, status: remittance.status });
        return;
      }
      await client.query("INSERT INTO rider_cash_custody (rider_id) VALUES ($1) ON CONFLICT DO NOTHING", [remittance.rider_id]);
      const custody = await client.query<{ outstanding_paisa: string }>("SELECT outstanding_paisa FROM rider_cash_custody WHERE rider_id = $1 FOR UPDATE", [remittance.rider_id]);
      const amount = Number(remittance.amount_paisa);
      const outstanding = Number(custody.rows[0]?.outstanding_paisa ?? 0);
      if (amount > outstanding) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "REMITTANCE_RECONCILIATION_MISMATCH", message: "The remittance exceeds outstanding recorded cash and requires operations review." });
        return;
      }
      await client.query("UPDATE cod_remittances SET status = 'verified', verified_by = $2, verified_at = now() WHERE id = $1", [id.data, session.sub]);
      await client.query("UPDATE rider_cash_custody SET outstanding_paisa = outstanding_paisa - $2, updated_at = now() WHERE rider_id = $1", [remittance.rider_id, amount]);
      const entryId = randomUUID();
      await client.query("INSERT INTO cod_cash_ledger (id, rider_id, entry_type, amount_paisa, remittance_id, idempotency_key, request_hash) VALUES ($1, $2, 'remittance_verified', $3, $4, $5, $6)", [entryId, remittance.rider_id, amount, id.data, `verify:${id.data}`, requestHash({ verifier: session.sub, remittanceId: id.data })]);
      await client.query("INSERT INTO payment_audit_log (actor_id, action, subject_id, details) VALUES ($1, 'cod_remittance_verified', $2, $3::jsonb)", [session.sub, id.data, JSON.stringify({ riderId: remittance.rider_id, amountPaisa: amount })]);
      await enqueueDomainEvent(client, newDomainEvent({ type: "cod.remittance_verified", version: 1, producer: service, aggregateId: remittance.rider_id, payload: { remittanceId: id.data, riderId: remittance.rider_id, amountPaisa: amount, verifiedBy: session.sub } }));
      await client.query("COMMIT");
      res.status(200).json({ id: id.data, status: "verified", outstandingPaisa: outstanding - amount });
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      res.status(503).json({ error: "REMITTANCE_VERIFICATION_UNAVAILABLE", message: "The remittance could not be verified." });
    } finally { client.release(); }
  }));
} });

const brokerUrl = process.env.RABBITMQ_URL;
if (brokerUrl) startOutboxRelay(pool, brokerUrl, service);
await startService(app, parsePort(process.env.PORT, 3108), service);
