import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { z } from "zod";
import { asyncRoute, createService, databaseUrlFor, enqueueDomainEvent, getPool, HttpError, idempotent, internalAuth, internalJson, newDomainEvent, parsePort, requireRole, requireSession, startEventConsumer, startOutboxRelay, startService, transaction } from "@khana/service-kit";
import type { DomainEvent } from "@khana/service-kit";

const service="order";
const databaseUrl=databaseUrlFor(service);
const pool=getPool(databaseUrl);
const inputSchema=z.object({
  outletId:z.string().uuid(),
  addressId:z.string().uuid(),
  paymentMethod:z.literal("cod"),
  items:z.array(z.object({menuItemId:z.string().uuid(),quantity:z.number().int().min(1).max(50),modifierIds:z.array(z.string().uuid()).max(30)}).strict()).min(1).max(50),
}).strict();
type OrderInput=z.infer<typeof inputSchema>;
type MenuQuote={outletId:string;items:Array<{menuItemId:string;name:string;quantity:number;unitPricePaisa:number;modifiers:Array<{id:string;name:string;pricePaisa:number}>;lineTotalPaisa:number}>;subtotalPaisa:number};

function configuredPaisa(key:string) {
  const value=process.env[key]??"";
  if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))) throw new HttpError(503,"ORDER_FEES_NOT_CONFIGURED","Checkout fees have not been configured.");
  return Number(value);
}

async function quote(userId:string,input:OrderInput) {
  const [outlet,address,menu]=await Promise.all([
    internalJson<{id:string;acceptingOrders:boolean}>("RESTAURANT_URL","RESTAURANT_INTERNAL_TOKEN",`/internal/v1/outlets/${input.outletId}/authorize`,{}),
  internalJson<{id:string;addressLine:string;latitude:number;longitude:number}>("CUSTOMER_URL","INTERNAL_CUSTOMER_TOKEN","/internal/v1/addresses/validate",{userId,addressId:input.addressId}),
    internalJson<MenuQuote>("MENU_URL","MENU_INTERNAL_TOKEN",`/internal/v1/outlets/${input.outletId}/quote`,{items:input.items}),
  ]);
  if(!outlet.acceptingOrders) throw new HttpError(409,"OUTLET_CLOSED","This restaurant is not accepting orders.");
  if(!Number.isSafeInteger(menu.subtotalPaisa)||menu.subtotalPaisa<=0||menu.subtotalPaisa>1_000_000_000) throw new HttpError(422,"ORDER_TOTAL_INVALID","The selected items exceed the checkout limit.");
  const [deliveryFeePaisa,serviceFeePaisa,commission]=await Promise.all([
    Promise.resolve(configuredPaisa("DELIVERY_FEE_PAISE")),
    Promise.resolve(configuredPaisa("SERVICE_FEE_PAISE")),
    internalJson<{rateBps:number;commissionPaisa:number}>("PAYMENT_URL","PAYMENT_INTERNAL_TOKEN","/internal/v1/commission/quote",{outletId:input.outletId,subtotalPaisa:menu.subtotalPaisa}),
  ]);
  const totalPaisa=menu.subtotalPaisa+deliveryFeePaisa+serviceFeePaisa;
  if(!Number.isSafeInteger(totalPaisa)||totalPaisa<=0||totalPaisa>1_000_000_000) throw new HttpError(422,"ORDER_TOTAL_INVALID","The order total exceeds the checkout limit.");
  return {outletId:input.outletId,addressId:address.id,addressSnapshot:{addressLine:address.addressLine,latitude:address.latitude,longitude:address.longitude},items:menu.items,subtotalPaisa:menu.subtotalPaisa,deliveryFeePaisa,serviceFeePaisa,commissionRateBps:commission.rateBps,commissionPaisa:commission.commissionPaisa,totalPaisa,currency:"PKR" as const,paymentMethod:"cod" as const};
}

const app=createService({name:service,version:"0.1.0",databaseUrl,routes(router){
  router.post("/v1/orders/quote",requireSession,requireRole("customer"),asyncRoute(async(req,res)=>{
    const session=res.locals.session as {sub:string};
    res.json(await quote(session.sub,inputSchema.parse(req.body)));
  }));

  router.post("/v1/orders",requireSession,requireRole("customer"),asyncRoute(async(req,res)=>{
    const session=res.locals.session as {sub:string};
    const input=inputSchema.parse(req.body);
    const key=z.string().trim().min(16).max(128).parse(req.header("idempotency-key"));
    const requestHash=createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const existing=await pool.query<{request_hash:string;response:unknown}>("SELECT request_hash,response FROM request_idempotency WHERE actor_id=$1 AND scope='order.place' AND key=$2",[session.sub,key]);
    if(existing.rows[0]) {
      if(existing.rows[0].request_hash!==requestHash) throw new HttpError(409,"IDEMPOTENCY_CONFLICT","This key was already used for a different request.");
      res.status(201).json(existing.rows[0].response);
      return;
    }
    const pricing=await quote(session.sub,input);
    const order=await transaction(pool,(client)=>idempotent(client,session.sub,"order.place",key,input,async()=>{
      const id=randomUUID();
      await client.query(
        `INSERT INTO orders(id,customer_id,outlet_id,address_id,address_snapshot,payment_method,status,items_snapshot,subtotal_paisa,delivery_fee_paisa,service_fee_paisa,commission_rate_bps,commission_paisa,total_paisa)
         VALUES($1,$2,$3,$4,$5::jsonb,'cod','placed',$6::jsonb,$7,$8,$9,$10,$11,$12)`,
        [id,session.sub,input.outletId,pricing.addressId,JSON.stringify(pricing.addressSnapshot),JSON.stringify(pricing.items),pricing.subtotalPaisa,pricing.deliveryFeePaisa,pricing.serviceFeePaisa,pricing.commissionRateBps,pricing.commissionPaisa,pricing.totalPaisa],
      );
      await client.query("INSERT INTO order_status_history(order_id,actor_id,from_status,to_status) VALUES($1,$2,NULL,'placed')",[id,session.sub]);
      await enqueueDomainEvent(client,newDomainEvent({type:"order.placed",version:1,producer:service,aggregateId:id,payload:{orderId:id,customerId:session.sub,outletId:input.outletId,addressId:pricing.addressId,items:pricing.items,totalPaisa:pricing.totalPaisa,commissionPaisa:pricing.commissionPaisa,currency:"PKR",paymentMethod:"cod"}}));
      return {id,status:"placed",...pricing,createdAt:new Date().toISOString()};
    }));
    res.status(201).json(order);
  }));

  router.get("/v1/orders/mine",requireSession,requireRole("customer"),asyncRoute(async(_req,res)=>{
    const session=res.locals.session as {sub:string};
    const result=await pool.query(
      `SELECT id,outlet_id AS "outletId",address_id AS "addressId",status,items_snapshot AS items,
              subtotal_paisa::int AS "subtotalPaisa",delivery_fee_paisa::int AS "deliveryFeePaisa",service_fee_paisa::int AS "serviceFeePaisa",
              commission_rate_bps AS "commissionRateBps",commission_paisa::int AS "commissionPaisa",total_paisa::int AS "totalPaisa",created_at AS "createdAt"
       FROM orders WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 100`,[session.sub]);
    res.json({items:result.rows});
  }));

  router.get("/v1/merchant/orders",requireSession,requireRole("merchant"),asyncRoute(async(_req,res)=>{
    const session=res.locals.session as {sub:string};
    const owned=await internalJson<{items:Array<{outletId:string}>}>("RESTAURANT_URL","RESTAURANT_INTERNAL_TOKEN",`/internal/v1/users/${session.sub}/outlets`,{});
    const outletIds=owned.items.map((outlet)=>outlet.outletId);
    if(!outletIds.length){res.json({items:[]});return;}
    const result=await pool.query(
      `SELECT id,outlet_id AS "outletId",status,items_snapshot AS items,total_paisa::int AS "totalPaisa",created_at AS "createdAt"
       FROM orders WHERE outlet_id=ANY($1::uuid[]) AND status IN ('placed','accepted','preparing','ready') ORDER BY created_at LIMIT 100`,[outletIds]);
    res.json({items:result.rows});
  }));

  router.post("/internal/v1/orders/:orderId/review-eligibility",internalAuth("ORDER_INTERNAL_TOKEN"),asyncRoute(async(req,res)=>{
    const id=z.string().uuid().parse(req.params.orderId);
    const {customerId}=z.object({customerId:z.string().uuid()}).strict().parse(req.body);
    const result=await pool.query<{outlet_id:string}>("SELECT outlet_id FROM orders WHERE id=$1 AND customer_id=$2 AND status='delivered'",[id,customerId]);
    if(!result.rows[0]) throw new HttpError(404,"REVIEW_NOT_ELIGIBLE","Only the customer who received a delivered order may review it.");
    res.json({orderId:id,outletId:result.rows[0].outlet_id});
  }));

  router.post("/internal/v1/orders/:orderId/delivery-details",internalAuth("DELIVERY_INTERNAL_TOKEN"),asyncRoute(async(req,res)=>{
    const id=z.string().uuid().parse(req.params.orderId);
    const result=await pool.query<{customer_id:string;outlet_id:string;address_snapshot:unknown;total_paisa:string;status:string}>("SELECT customer_id,outlet_id,address_snapshot,total_paisa,status FROM orders WHERE id=$1",[id]);
    const order=result.rows[0];
    if(!order) throw new HttpError(404,"ORDER_NOT_FOUND","Order not found.");
    res.json({orderId:id,customerId:order.customer_id,outletId:order.outlet_id,totalPaisa:Number(order.total_paisa),status:order.status,dropoff:order.address_snapshot});
  }));

  router.post("/v1/orders/:orderId/transitions",requireSession,asyncRoute(async(req,res)=>{
    const session=res.locals.session as {sub:string;roles:string[]};
    const orderId=z.string().uuid().parse(req.params.orderId);
    const {toStatus}=z.object({toStatus:z.enum(["accepted","rejected","preparing","ready","cancelled"])}).strict().parse(req.body);
    const found=await pool.query<{customer_id:string;outlet_id:string;status:string}>("SELECT customer_id,outlet_id,status FROM orders WHERE id=$1",[orderId]);
    const current=found.rows[0];
    if(!current){res.status(404).json({error:"ORDER_NOT_FOUND",message:"Order not found."});return;}
    const customerCancel=toStatus==="cancelled"&&session.roles.includes("customer")&&current.customer_id===session.sub;
    const merchantAction=toStatus!=="cancelled"&&session.roles.includes("merchant");
    if(customerCancel&&current.status!=="placed") throw new HttpError(409,"CANCELLATION_UNAVAILABLE","This order can no longer be cancelled.");
    if(merchantAction) await internalJson("RESTAURANT_URL","RESTAURANT_INTERNAL_TOKEN",`/internal/v1/outlets/${current.outlet_id}/authorize`,{userId:session.sub});
    if(!customerCancel&&!merchantAction) throw new HttpError(403,"ORDER_ACTION_FORBIDDEN","You cannot change this order.");
    if(current.status===toStatus){res.json({id:orderId,status:toStatus});return;}
    const valid:Record<string,string[]>={placed:["accepted","rejected","cancelled"],accepted:["preparing"],preparing:["ready"]};
    if(!valid[current.status]?.includes(toStatus)) throw new HttpError(409,"INVALID_ORDER_TRANSITION","This order cannot move to the requested state.");
    const updated=await transaction(pool,async(client)=>{
      const locked=await client.query<{status:string}>("SELECT status FROM orders WHERE id=$1 FOR UPDATE",[orderId]);
      const from=locked.rows[0]?.status;
      if(!from||!valid[from]?.includes(toStatus)) throw new HttpError(409,"INVALID_ORDER_TRANSITION","The order changed before your update was saved.");
      await client.query("UPDATE orders SET status=$2,updated_at=now() WHERE id=$1",[orderId,toStatus]);
      await client.query("INSERT INTO order_status_history(order_id,actor_id,from_status,to_status) VALUES($1,$2,$3,$4)",[orderId,session.sub,from,toStatus]);
      await enqueueDomainEvent(client,newDomainEvent({type:"order.status_changed",version:1,producer:service,aggregateId:orderId,payload:{orderId,fromStatus:from,toStatus,actorId:session.sub,outletId:current.outlet_id,customerId:current.customer_id}}));
      return {id:orderId,status:toStatus};
    });
    res.json(updated);
  }));
}});

async function consumeDeliveryEvent(client: import("pg").PoolClient,event:DomainEvent) {
  const data=z.object({orderId:z.string().uuid(),riderId:z.string().uuid(),toStatus:z.string().optional()}).passthrough().parse(event.payload);
  const toStatus=event.type==="delivery.assigned"?"assigned":data.toStatus;
  if(!toStatus||!(["assigned","picked_up","delivered"] as string[]).includes(toStatus)) return;
  const order=await client.query<{status:string;customer_id:string;outlet_id:string}>("SELECT status,customer_id,outlet_id FROM orders WHERE id=$1 FOR UPDATE",[data.orderId]);
  const current=order.rows[0];
  if(!current) return;
  const allowed:Record<string,string[]>={ready:["assigned"],assigned:["picked_up"],picked_up:["delivered"]};
  if(current.status===toStatus) return;
  if(!allowed[current.status]?.includes(toStatus)) return;
  await client.query("UPDATE orders SET status=$2,updated_at=now() WHERE id=$1",[data.orderId,toStatus]);
  await client.query("INSERT INTO order_status_history(order_id,actor_id,from_status,to_status) VALUES($1,$2,$3,$4)",[data.orderId,data.riderId,current.status,toStatus]);
  await enqueueDomainEvent(client,newDomainEvent({type:"order.status_changed",version:1,producer:service,aggregateId:data.orderId,payload:{orderId:data.orderId,fromStatus:current.status,toStatus,actorId:data.riderId,outletId:current.outlet_id,customerId:current.customer_id}}));
}

const brokerUrl=process.env.RABBITMQ_URL;
if(brokerUrl) {
  startOutboxRelay(pool,brokerUrl,service);
  startEventConsumer(pool,brokerUrl,"order-delivery-state",["delivery.assigned","delivery.status_changed"],consumeDeliveryEvent);
}
await startService(app,parsePort(process.env.PORT,3105),service);
