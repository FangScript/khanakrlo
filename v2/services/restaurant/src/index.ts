import { z } from "zod";
import { asyncRoute, createService, databaseUrlFor, getPool, HttpError, idempotent, internalAuth, internalJson, parsePort, requireRole, requireSession, startService, transaction } from "@khana/service-kit";

const service = "restaurant";
const databaseUrl = databaseUrlFor(service);
const pool = getPool(databaseUrl);
const onboardingInput = z.object({
  businessName: z.string().trim().min(2).max(120),
  cuisine: z.string().trim().min(2).max(80),
  outletName: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80),
  addressLine: z.string().trim().min(5).max(500),
}).strict();
const idempotencyKey = z.string().trim().min(16).max(128);

const app = createService({ name: service, version: "0.1.0", databaseUrl, routes(router) {
  router.post("/internal/v1/outlets/:outletId/authorize", internalAuth("RESTAURANT_INTERNAL_TOKEN"), asyncRoute(async (req, res) => {
    const outletId = z.string().uuid().parse(req.params.outletId);
    const input = z.object({ userId: z.string().uuid().optional() }).strict().parse(req.body);
    const result = await pool.query(
      `SELECT x.id,o.id AS "organisationId",o.owner_user_id AS "ownerUserId",x.accepting_orders AS "acceptingOrders"
       FROM restaurant_outlets x JOIN restaurant_organisations o ON o.id=x.organisation_id
       WHERE x.id=$1 AND ($2::uuid IS NULL OR o.owner_user_id=$2)`,
      [outletId,input.userId ?? null],
    );
    if (!result.rowCount) { res.status(404).json({ error: "OUTLET_NOT_FOUND", message: "The outlet is unavailable." }); return; }
    res.json(result.rows[0]);
  }));

  router.post("/internal/v1/users/:userId/outlets", internalAuth("RESTAURANT_INTERNAL_TOKEN"), asyncRoute(async (req,res)=>{
    const userId=z.string().uuid().parse(req.params.userId);
    const result=await pool.query<{outletId:string;organisationId:string;acceptingOrders:boolean}>(
      `SELECT x.id AS "outletId",o.id AS "organisationId",x.accepting_orders AS "acceptingOrders"
       FROM restaurant_outlets x JOIN restaurant_organisations o ON o.id=x.organisation_id
       WHERE o.owner_user_id=$1 ORDER BY o.created_at,x.created_at`,[userId]);
    res.json({items:result.rows});
  }));

  router.post("/v1/onboarding", requireSession, asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string; roles: string[] };
    const input = onboardingInput.parse(req.body);
    const key = idempotencyKey.parse(req.header("idempotency-key"));

    // Persist the business and outlet first. A retry can then safely re-apply the
    // role grant if Identity was temporarily unavailable after the DB commit.
    const onboarding = await transaction(pool, (client) => idempotent(client, session.sub, "restaurant.onboarding", key, input, async () => {
      const organisation = await client.query<{ id: string }>(
        "INSERT INTO restaurant_organisations (owner_user_id,business_name,cuisine) VALUES ($1,$2,$3) ON CONFLICT (owner_user_id,business_name) DO UPDATE SET cuisine=EXCLUDED.cuisine,updated_at=now() RETURNING id",
        [session.sub,input.businessName,input.cuisine],
      );
      const organisationId = organisation.rows[0]!.id;
      const outlet = await client.query<{ id: string }>(
        "INSERT INTO restaurant_outlets (organisation_id,outlet_name,city,address_line) VALUES ($1,$2,$3,$4) ON CONFLICT (organisation_id,outlet_name) DO UPDATE SET city=EXCLUDED.city,address_line=EXCLUDED.address_line,updated_at=now() RETURNING id",
        [organisationId,input.outletName,input.city,input.addressLine],
      );
      return { organisationId, outletId: outlet.rows[0]!.id, status: "active" as const, acceptingOrders: false };
    }));

    if (!session.roles.includes("merchant")) {
      await internalJson<{ roles: string[] }>("IDENTITY_URL", "INTERNAL_RESTAURANT_IDENTITY_TOKEN", `/internal/v1/users/${encodeURIComponent(session.sub)}/merchant-role`, {});
    }
    res.status(201).json(onboarding);
  }));

  router.get("/v1/mine", requireSession, requireRole("merchant"), asyncRoute(async (_req, res) => {
    const session = res.locals.session as { sub: string };
    const result = await pool.query(
      `SELECT o.id AS "organisationId",o.business_name AS "businessName",o.cuisine,
              x.id AS "outletId",x.outlet_name AS "outletName",x.city,x.address_line AS "addressLine",
              x.accepting_orders AS "acceptingOrders"
       FROM restaurant_organisations o JOIN restaurant_outlets x ON x.organisation_id=o.id
       WHERE o.owner_user_id=$1 ORDER BY o.created_at,x.created_at`,
      [session.sub],
    );
    res.json({ items: result.rows });
  }));

  router.patch("/v1/outlets/:outletId/availability", requireSession, requireRole("merchant"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const outletId = z.string().uuid().parse(req.params.outletId);
    const { acceptingOrders } = z.object({ acceptingOrders: z.boolean() }).strict().parse(req.body);
    if (acceptingOrders) {
      const readiness = await internalJson<{isReady:boolean}>("MENU_URL","MENU_INTERNAL_TOKEN",`/internal/v1/outlets/${outletId}/readiness`,{});
      if (!readiness.isReady) throw new HttpError(409,"MENU_NOT_READY","Add at least one available menu item before accepting orders.");
    }
    const updated = await pool.query(
      `UPDATE restaurant_outlets x SET accepting_orders=$3,updated_at=now()
       FROM restaurant_organisations o
       WHERE x.id=$1 AND x.organisation_id=o.id AND o.owner_user_id=$2
       RETURNING x.id AS "outletId",x.accepting_orders AS "acceptingOrders"`,
      [outletId,session.sub,acceptingOrders],
    );
    if (!updated.rowCount) { res.status(404).json({ error: "OUTLET_NOT_FOUND", message: "The outlet was not found." }); return; }
    res.json(updated.rows[0]);
  }));
} });

await startService(app, parsePort(process.env.PORT, 3103), service);
