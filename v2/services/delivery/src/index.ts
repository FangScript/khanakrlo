import { z } from "zod";
import { asyncRoute, createService, databaseUrlFor, enqueueDomainEvent, getPool, HttpError, internalJson, newDomainEvent, parsePort, requireRole, requireSession, startEventConsumer, startOutboxRelay, startService, transaction } from "@khana/service-kit";
import type { DomainEvent } from "@khana/service-kit";

const service = "delivery";
const databaseUrl = databaseUrlFor(service);
const pool = getPool(databaseUrl);
const uuid = z.string().uuid();
const point = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict();

async function paymentAuthorization(orderId: string, riderId: string, amountPaisa: number, status: "assigned" | "delivered" | "cancelled") {
  const base = process.env.PAYMENT_URL;
  const token = process.env.PAYMENT_INTERNAL_TOKEN;
  if (!base || !token || token.length < 32) throw new HttpError(503, "PAYMENT_NOT_CONFIGURED", "Cash authorization is unavailable.");
  let response: Response;
  try {
    response = await fetch(new URL(`/internal/v1/cod/order-authorizations/${orderId}`, base), {
      method: "PUT", headers: { "content-type": "application/json", "x-service-token": token },
      body: JSON.stringify({ orderId, riderId, amountPaisa, status }), signal: AbortSignal.timeout(2500), redirect: "error",
    });
  } catch { throw new HttpError(503, "PAYMENT_UNAVAILABLE", "Cash authorization is temporarily unavailable."); }
  if (!response.ok) throw new HttpError(response.status === 409 ? 409 : 503, "CASH_AUTHORIZATION_REJECTED", "The payment service did not authorize this delivery.");
}

async function collected(orderId: string, riderId: string) {
  const base = process.env.PAYMENT_URL;
  const token = process.env.PAYMENT_INTERNAL_TOKEN;
  if (!base || !token || token.length < 32) throw new HttpError(503, "PAYMENT_NOT_CONFIGURED", "Cash collection could not be verified.");
  let response: Response;
  try {
    response = await fetch(new URL(`/internal/v1/cod/orders/${orderId}/collection`, base), { method: "POST", headers: { "content-type": "application/json", "x-service-token": token }, body: JSON.stringify({ riderId }), signal: AbortSignal.timeout(2500), redirect: "error" });
  } catch { throw new HttpError(503, "PAYMENT_UNAVAILABLE", "Cash collection verification is temporarily unavailable."); }
  if (!response.ok) throw new HttpError(response.status === 409 ? 409 : 503, "CASH_NOT_COLLECTED", "Record the exact COD collection before completing this delivery.");
}

async function consumeOrderEvent(client: import("pg").PoolClient, event: DomainEvent) {
  if (event.type === "order.placed") {
    const p = z.object({ orderId: uuid }).passthrough().parse(event.payload);
    const details=await internalJson<{customerId:string;outletId:string;totalPaisa:number;dropoff:{addressLine:string;latitude:number;longitude:number}}>("ORDER_URL","DELIVERY_INTERNAL_TOKEN",`/internal/v1/orders/${p.orderId}/delivery-details`,{});
    await client.query("INSERT INTO deliveries(order_id,customer_id,outlet_id,total_paisa,dropoff,status) VALUES($1,$2,$3,$4,$5::jsonb,'awaiting_merchant') ON CONFLICT(order_id) DO NOTHING", [p.orderId, details.customerId, details.outletId, details.totalPaisa, JSON.stringify(details.dropoff)]);
    return;
  }
  const p = z.object({ orderId: uuid, toStatus: z.string() }).passthrough().parse(event.payload);
  if (p.toStatus === "ready") await client.query("UPDATE deliveries SET status='queued',updated_at=now() WHERE order_id=$1 AND status='awaiting_merchant'", [p.orderId]);
  if (["cancelled", "rejected"].includes(p.toStatus)) await client.query("UPDATE deliveries SET status='cancelled',updated_at=now() WHERE order_id=$1 AND status IN ('awaiting_merchant','queued')", [p.orderId]);
}

const app = createService({ name: service, version: "0.2.0", databaseUrl, routes(router) {
  router.put("/v1/rider/availability", requireSession, requireRole("rider"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const { available } = z.object({ available: z.boolean() }).strict().parse(req.body);
    const active = await pool.query("SELECT 1 FROM deliveries WHERE rider_id=$1 AND status IN ('assigning','assigned','picked_up')", [session.sub]);
    if (available && active.rowCount) throw new HttpError(409, "ACTIVE_DELIVERY", "Finish the active delivery before going available.");
    await pool.query("INSERT INTO rider_presence(rider_id,available,updated_at) VALUES($1,$2,now()) ON CONFLICT(rider_id) DO UPDATE SET available=EXCLUDED.available,updated_at=now()", [session.sub, available]);
    res.json({ riderId: session.sub, available });
  }));

  router.put("/v1/rider/location", requireSession, requireRole("rider"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const location = point.parse(req.body);
    const active = await pool.query("SELECT 1 FROM deliveries WHERE rider_id=$1 AND status IN ('assigned','picked_up')", [session.sub]);
    if (!active.rowCount) throw new HttpError(403, "TRACKING_NOT_ALLOWED", "Location is accepted only during an active delivery.");
    await pool.query("UPDATE rider_presence SET latitude=$2,longitude=$3,location_at=now(),updated_at=now() WHERE rider_id=$1", [session.sub, location.latitude, location.longitude]);
    res.status(204).end();
  }));

  router.get("/v1/rider/offers", requireSession, requireRole("rider"), asyncRoute(async (_req, res) => {
    const session = res.locals.session as { sub: string };
    const presence = await pool.query<{ available: boolean }>("SELECT available FROM rider_presence WHERE rider_id=$1", [session.sub]);
    if (!presence.rows[0]?.available) throw new HttpError(409, "RIDER_UNAVAILABLE", "Set yourself available to receive delivery offers.");
    const offers = await pool.query("SELECT order_id AS \"orderId\",outlet_id AS \"outletId\",dropoff,total_paisa::int AS \"codAmountPaisa\",created_at AS \"createdAt\" FROM deliveries WHERE status='queued' ORDER BY created_at LIMIT 20");
    res.json({ items: offers.rows });
  }));

  router.post("/v1/rider/deliveries/:orderId/accept", requireSession, requireRole("rider"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const id = uuid.parse(req.params.orderId);
    const row = await transaction(pool, async (client) => {
      const result = await client.query<{ customer_id: string; outlet_id: string; total_paisa: string; dropoff: unknown; status: string; rider_id: string | null }>("SELECT customer_id,outlet_id,total_paisa,dropoff,status,rider_id FROM deliveries WHERE order_id=$1 FOR UPDATE", [id]);
      const delivery = result.rows[0];
      if (!delivery) throw new HttpError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
      if ((delivery.status === "assigning" || delivery.status === "assigned") && delivery.rider_id === session.sub) return delivery;
      if (delivery.status !== "queued") throw new HttpError(409, "OFFER_UNAVAILABLE", "Another rider accepted this delivery or it is not ready.");
      const available = await client.query("SELECT 1 FROM rider_presence WHERE rider_id=$1 AND available=true FOR UPDATE", [session.sub]);
      if (!available.rowCount) throw new HttpError(409, "RIDER_UNAVAILABLE", "Set yourself available before accepting an offer.");
      const active = await client.query("SELECT 1 FROM deliveries WHERE rider_id=$1 AND status IN ('assigning','assigned','picked_up')", [session.sub]);
      if (active.rowCount) throw new HttpError(409, "RIDER_HAS_ACTIVE_DELIVERY", "Complete the active delivery before accepting another offer.");
      await client.query("UPDATE deliveries SET status='assigning',rider_id=$2,updated_at=now() WHERE order_id=$1", [id, session.sub]);
      return delivery;
    });
    try {
      await paymentAuthorization(id, session.sub, Number(row.total_paisa), "assigned");
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        await paymentAuthorization(id, session.sub, Number(row.total_paisa), "cancelled").catch(() => undefined);
        await pool.query("UPDATE deliveries SET status='queued',rider_id=NULL,updated_at=now() WHERE order_id=$1 AND rider_id=$2 AND status='assigning'", [id, session.sub]);
      }
      throw error;
    }
    await transaction(pool, async (client) => {
      const result = await client.query("UPDATE deliveries SET status='assigned',assigned_at=COALESCE(assigned_at,now()),updated_at=now() WHERE order_id=$1 AND rider_id=$2 AND status IN ('assigning','assigned')", [id, session.sub]);
      if (!result.rowCount) throw new HttpError(409, "ASSIGNMENT_CHANGED", "The delivery assignment changed. Refresh your offers.");
      await client.query("UPDATE rider_presence SET available=false,updated_at=now() WHERE rider_id=$1", [session.sub]);
      await client.query("INSERT INTO delivery_audit(order_id,actor_id,action) VALUES($1,$2,'assigned')", [id, session.sub]);
      await enqueueDomainEvent(client, newDomainEvent({ type: "delivery.assigned", version: 1, producer: service, aggregateId: id, payload: { orderId: id, riderId: session.sub } }));
    });
    res.status(200).json({ orderId: id, status: "assigned" });
  }));

  router.post("/v1/rider/deliveries/:orderId/transitions", requireSession, requireRole("rider"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const id = uuid.parse(req.params.orderId);
    const { toStatus } = z.object({ toStatus: z.enum(["picked_up", "delivered"]) }).strict().parse(req.body);
    const found = await pool.query<{ status: string; rider_id: string; total_paisa: string }>("SELECT status,rider_id,total_paisa FROM deliveries WHERE order_id=$1", [id]);
    const delivery = found.rows[0];
    if (!delivery || delivery.rider_id !== session.sub) throw new HttpError(404, "DELIVERY_NOT_FOUND", "This delivery is not assigned to you.");
    if (toStatus === "picked_up" && delivery.status !== "assigned") throw new HttpError(409, "INVALID_DELIVERY_TRANSITION", "Only an assigned order can be marked picked up.");
    if (toStatus === "delivered") {
      if (delivery.status !== "picked_up") throw new HttpError(409, "INVALID_DELIVERY_TRANSITION", "Pick up the order before completing delivery.");
      await collected(id, session.sub);
      await paymentAuthorization(id, session.sub, Number(delivery.total_paisa), "delivered");
    }
    await transaction(pool, async (client) => {
      const updated = await client.query("UPDATE deliveries SET status=$3, picked_up_at=CASE WHEN $3='picked_up' THEN now() ELSE picked_up_at END, delivered_at=CASE WHEN $3='delivered' THEN now() ELSE delivered_at END, updated_at=now() WHERE order_id=$1 AND rider_id=$2 AND status=$4", [id, session.sub, toStatus, toStatus === "picked_up" ? "assigned" : "picked_up"]);
      if (!updated.rowCount) throw new HttpError(409, "DELIVERY_CHANGED", "The delivery state changed. Refresh and retry.");
      await client.query("INSERT INTO delivery_audit(order_id,actor_id,action) VALUES($1,$2,$3)", [id, session.sub, toStatus]);
      await enqueueDomainEvent(client, newDomainEvent({ type: "delivery.status_changed", version: 1, producer: service, aggregateId: id, payload: { orderId: id, riderId: session.sub, toStatus } }));
    });
    res.json({ orderId: id, status: toStatus });
  }));

  router.get("/v1/orders/:orderId/tracking", requireSession, asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string; roles: string[] };
    const id = uuid.parse(req.params.orderId);
    const result = await pool.query<{ customer_id: string; rider_id: string | null; status: string; latitude: number | null; longitude: number | null; location_at: Date | null }>("SELECT d.customer_id,d.rider_id,d.status,p.latitude,p.longitude,p.location_at FROM deliveries d LEFT JOIN rider_presence p ON p.rider_id=d.rider_id WHERE d.order_id=$1", [id]);
    const d = result.rows[0];
    if (!d || (d.customer_id !== session.sub && d.rider_id !== session.sub && !session.roles.includes("staff"))) throw new HttpError(404, "DELIVERY_NOT_FOUND", "Delivery not found.");
    const trackingAllowed = ["assigned", "picked_up"].includes(d.status);
    const fresh = d.location_at ? Date.now() - d.location_at.getTime() <= 30_000 : false;
    res.json({ orderId: id, status: d.status, location: trackingAllowed && fresh && d.latitude !== null && d.longitude !== null ? { latitude: d.latitude, longitude: d.longitude, updatedAt: d.location_at?.toISOString() } : null, locationStale: trackingAllowed && !fresh });
  }));

}});

const brokerUrl = process.env.RABBITMQ_URL;
if (brokerUrl) {
  startOutboxRelay(pool, brokerUrl, service);
  startEventConsumer(pool, brokerUrl, `${service}-orders`, ["order.placed", "order.status_changed"], consumeOrderEvent);
}
await startService(app, parsePort(process.env.PORT, 3109), service);
