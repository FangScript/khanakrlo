import { z } from "zod";
import { asyncRoute, createService, databaseUrlFor, getPool, HttpError, internalAuth, internalJson, parsePort, requireRole, requireSession, startService } from "@khana/service-kit";

const service = "menu";
const databaseUrl = databaseUrlFor(service);
const pool = getPool(databaseUrl);
const outletIdSchema = z.string().uuid();
const categorySchema = z.object({ name: z.string().trim().min(1).max(80), sortOrder: z.number().int().min(0).max(10000).default(0) }).strict();
const itemSchema = z.object({ categoryId: z.string().uuid(), name: z.string().trim().min(1).max(120), description: z.string().max(1000).default(""), pricePaisa: z.number().int().positive().max(100_000_000), imageUrl: z.string().url().max(2048).optional() }).strict();
const quoteInput = z.object({ items:z.array(z.object({menuItemId:z.string().uuid(),quantity:z.number().int().min(1).max(50),modifierIds:z.array(z.string().uuid()).max(30)}).strict()).min(1).max(50) }).strict();

async function assertOutlet(outletId: string, userId?: string) {
  return internalJson<{ id: string; organisationId: string; ownerUserId: string; acceptingOrders: boolean }>("RESTAURANT_URL", "RESTAURANT_INTERNAL_TOKEN", `/internal/v1/outlets/${outletId}/authorize`, userId ? { userId } : {});
}

const app = createService({ name: service, version: "0.1.0", databaseUrl, routes(router) {
  router.post("/internal/v1/outlets/:outletId/readiness", internalAuth("MENU_INTERNAL_TOKEN"), asyncRoute(async (req, res) => {
    const outletId = outletIdSchema.parse(req.params.outletId);
    const result = await pool.query("SELECT count(*)::int AS count FROM menu_items WHERE outlet_id=$1 AND available=true AND archived_at IS NULL",[outletId]);
    res.json({ isReady:result.rows[0].count>0 });
  }));

  router.post("/internal/v1/outlets/:outletId/quote", internalAuth("MENU_INTERNAL_TOKEN"), asyncRoute(async (req, res) => {
    const outletId = outletIdSchema.parse(req.params.outletId);
    const {items} = quoteInput.parse(req.body);
    const itemIds = [...new Set(items.map((line)=>line.menuItemId))];
    const itemRows = await pool.query<{id:string;name:string;price_paisa:string;available:boolean;archived_at:Date|null}>(
      "SELECT id,name,price_paisa::text,available,archived_at FROM menu_items WHERE outlet_id=$1 AND id=ANY($2::uuid[])",[outletId,itemIds]);
    const itemById = new Map(itemRows.rows.map((item)=>[item.id,item]));
    if (itemById.size !== itemIds.length || itemRows.rows.some((item)=>!item.available||item.archived_at)) throw new HttpError(409,"MENU_ITEM_UNAVAILABLE","A selected item is no longer available.");
    const modifierIds = [...new Set(items.flatMap((line)=>line.modifierIds))];
    const modifierRows = modifierIds.length ? await pool.query<{id:string;item_id:string;name:string;price_delta_paisa:string;available:boolean}>(
      "SELECT id,item_id,name,price_delta_paisa::text,available FROM menu_modifiers WHERE id=ANY($1::uuid[])",[modifierIds]) : {rows:[]};
    const modifierById = new Map(modifierRows.rows.map((modifier)=>[modifier.id,modifier]));
    const quotedItems = items.map((line)=>{
      const item = itemById.get(line.menuItemId)!;
      const selected = line.modifierIds.map((modifierId)=>{
        const modifier = modifierById.get(modifierId);
        if (!modifier || modifier.item_id!==item.id || !modifier.available) throw new HttpError(409,"MENU_MODIFIER_UNAVAILABLE","A selected option is no longer available for this item.");
        return {id:modifier.id,name:modifier.name,pricePaisa:Number(modifier.price_delta_paisa)};
      });
      if (new Set(line.modifierIds).size!==line.modifierIds.length) throw new HttpError(400,"DUPLICATE_MODIFIER","Choose each option only once.");
      const unitPricePaisa=Number(item.price_paisa)+selected.reduce((sum,modifier)=>sum+modifier.pricePaisa,0);
      return {menuItemId:item.id,name:item.name,quantity:line.quantity,unitPricePaisa,modifiers:selected,lineTotalPaisa:unitPricePaisa*line.quantity};
    });
    res.json({outletId,items:quotedItems,subtotalPaisa:quotedItems.reduce((sum,line)=>sum+line.lineTotalPaisa,0)});
  }));

  router.get("/v1/outlets/:outletId/menu", asyncRoute(async (req, res) => {
    const outletId = outletIdSchema.parse(req.params.outletId);
    await assertOutlet(outletId);
    const categories = await pool.query(
      `SELECT c.id,c.name,c.sort_order AS "sortOrder",
              COALESCE(jsonb_agg(jsonb_build_object('id',i.id,'name',i.name,'description',i.description,'pricePaisa',i.price_paisa::int,'imageUrl',i.image_url,'available',i.available,
                'modifiers',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'priceDeltaPaisa',m.price_delta_paisa::int) ORDER BY m.created_at) FROM menu_modifiers m WHERE m.item_id=i.id AND m.available),'[]'::jsonb)) ORDER BY i.created_at) FILTER (WHERE i.id IS NOT NULL),'[]'::jsonb) AS items
       FROM menu_categories c LEFT JOIN menu_items i ON i.category_id=c.id AND i.outlet_id=c.outlet_id AND i.archived_at IS NULL
       WHERE c.outlet_id=$1 AND c.archived_at IS NULL
       GROUP BY c.id ORDER BY c.sort_order,c.created_at`,
      [outletId],
    );
    res.json({ outletId, items: categories.rows });
  }));

  router.post("/v1/outlets/:outletId/categories", requireSession, requireRole("merchant"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const outletId = outletIdSchema.parse(req.params.outletId);
    const input = categorySchema.parse(req.body);
    await assertOutlet(outletId,session.sub);
    const category = await pool.query(
      "INSERT INTO menu_categories(outlet_id,name,sort_order) VALUES($1,$2,$3) ON CONFLICT(outlet_id,name) DO UPDATE SET sort_order=EXCLUDED.sort_order,archived_at=NULL,updated_at=now() RETURNING id,name,sort_order AS \"sortOrder\"",
      [outletId,input.name,input.sortOrder],
    );
    res.status(201).json(category.rows[0]);
  }));

  router.post("/v1/outlets/:outletId/items", requireSession, requireRole("merchant"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const outletId = outletIdSchema.parse(req.params.outletId);
    const input = itemSchema.parse(req.body);
    await assertOutlet(outletId,session.sub);
    const category = await pool.query("SELECT id FROM menu_categories WHERE id=$1 AND outlet_id=$2 AND archived_at IS NULL",[input.categoryId,outletId]);
    if (!category.rowCount) throw new HttpError(404,"CATEGORY_NOT_FOUND","Choose a category belonging to this outlet.");
    const item = await pool.query(
      `INSERT INTO menu_items(outlet_id,category_id,name,description,price_paisa,image_url)
       VALUES($1,$2,$3,$4,$5,$6)
       RETURNING id,category_id AS "categoryId",name,description,price_paisa::int AS "pricePaisa",image_url AS "imageUrl",available`,
      [outletId,input.categoryId,input.name,input.description,input.pricePaisa,input.imageUrl ?? null],
    );
    res.status(201).json(item.rows[0]);
  }));

  router.patch("/v1/items/:itemId", requireSession, requireRole("merchant"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const itemId = z.string().uuid().parse(req.params.itemId);
    const input = z.object({ name: z.string().trim().min(1).max(120).optional(), description: z.string().max(1000).optional(), pricePaisa: z.number().int().positive().max(100_000_000).optional(), available: z.boolean().optional(), imageUrl: z.string().url().max(2048).nullable().optional() }).strict().refine((value) => Object.keys(value).length > 0).parse(req.body);
    const old = await pool.query<{ outlet_id: string }>("SELECT outlet_id FROM menu_items WHERE id=$1 AND archived_at IS NULL",[itemId]);
    if (!old.rowCount) throw new HttpError(404,"ITEM_NOT_FOUND","Menu item not found.");
    await assertOutlet(old.rows[0]!.outlet_id,session.sub);
    const values = await pool.query(
      `UPDATE menu_items SET name=COALESCE($2,name),description=COALESCE($3,description),price_paisa=COALESCE($4,price_paisa),available=COALESCE($5,available),image_url=CASE WHEN $6 THEN $7 ELSE image_url END,updated_at=now()
       WHERE id=$1 AND archived_at IS NULL
       RETURNING id,category_id AS "categoryId",name,description,price_paisa::int AS "pricePaisa",image_url AS "imageUrl",available`,
      [itemId,input.name ?? null,input.description ?? null,input.pricePaisa ?? null,input.available ?? null,input.imageUrl !== undefined,input.imageUrl ?? null],
    );
    res.json(values.rows[0]);
  }));

  router.delete("/v1/items/:itemId", requireSession, requireRole("merchant"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const itemId = z.string().uuid().parse(req.params.itemId);
    const old = await pool.query<{ outlet_id: string }>("SELECT outlet_id FROM menu_items WHERE id=$1 AND archived_at IS NULL",[itemId]);
    if (!old.rowCount) { res.status(204).end(); return; }
    await assertOutlet(old.rows[0]!.outlet_id,session.sub);
    await pool.query("UPDATE menu_items SET archived_at=now(),updated_at=now() WHERE id=$1",[itemId]);
    res.status(204).end();
  }));

  router.post("/v1/items/:itemId/modifiers", requireSession, requireRole("merchant"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const itemId = z.string().uuid().parse(req.params.itemId);
    const input = z.object({ name: z.string().trim().min(1).max(80), priceDeltaPaisa: z.number().int().min(0).max(100_000_000) }).strict().parse(req.body);
    const item = await pool.query<{ outlet_id: string }>("SELECT outlet_id FROM menu_items WHERE id=$1 AND archived_at IS NULL",[itemId]);
    if (!item.rowCount) throw new HttpError(404,"ITEM_NOT_FOUND","Menu item not found.");
    await assertOutlet(item.rows[0]!.outlet_id,session.sub);
    const modifier = await pool.query(
      `INSERT INTO menu_modifiers(item_id,name,price_delta_paisa) VALUES($1,$2,$3)
       ON CONFLICT(item_id,name) DO UPDATE SET price_delta_paisa=EXCLUDED.price_delta_paisa,available=true
       RETURNING id,name,price_delta_paisa::int AS "priceDeltaPaisa",available`,
      [itemId,input.name,input.priceDeltaPaisa],
    );
    res.status(201).json(modifier.rows[0]);
  }));

  router.patch("/v1/modifiers/:modifierId", requireSession, requireRole("merchant"), asyncRoute(async (req, res) => {
    const session = res.locals.session as { sub: string };
    const modifierId = z.string().uuid().parse(req.params.modifierId);
    const input = z.object({ name: z.string().trim().min(1).max(80).optional(), priceDeltaPaisa: z.number().int().min(0).max(100_000_000).optional(), available: z.boolean().optional() }).strict().refine((value) => Object.keys(value).length > 0).parse(req.body);
    const old = await pool.query<{ outlet_id: string }>("SELECT i.outlet_id FROM menu_modifiers m JOIN menu_items i ON i.id=m.item_id WHERE m.id=$1 AND i.archived_at IS NULL",[modifierId]);
    if (!old.rowCount) throw new HttpError(404,"MODIFIER_NOT_FOUND","Modifier not found.");
    await assertOutlet(old.rows[0]!.outlet_id,session.sub);
    const updated = await pool.query(
      `UPDATE menu_modifiers SET name=COALESCE($2,name),price_delta_paisa=COALESCE($3,price_delta_paisa),available=COALESCE($4,available)
       WHERE id=$1 RETURNING id,name,price_delta_paisa::int AS "priceDeltaPaisa",available`,
      [modifierId,input.name ?? null,input.priceDeltaPaisa ?? null,input.available ?? null],
    );
    res.json(updated.rows[0]);
  }));
} });

await startService(app,parsePort(process.env.PORT,3104),service);
