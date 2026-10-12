import { createHash } from "node:crypto";
import { z } from "zod";
import { asyncRoute, createService, databaseUrlFor, getPool, HttpError, parsePort, requireSession, startEventConsumer, startService } from "@khana/service-kit";
import type { DomainEvent } from "@khana/service-kit";

const service="notification";
const databaseUrl=databaseUrlFor(service);
const pool=getPool(databaseUrl);
const app=createService({name:service,version:"0.2.0",databaseUrl,routes(router){
  router.get("/v1/notifications/mine",requireSession,asyncRoute(async(req,res)=>{
    const session=res.locals.session as {sub:string};
    const limit=Math.min(100,Math.max(1,Number(req.query.limit)||50));
    const result=await pool.query("SELECT id,category,title,body,created_at AS \"createdAt\",read_at AS \"readAt\" FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2",[session.sub,limit]);
    res.json({items:result.rows});
  }));
  router.post("/v1/notifications/:notificationId/read",requireSession,asyncRoute(async(req,res)=>{
    const session=res.locals.session as {sub:string};
    const id=z.string().uuid().parse(req.params.notificationId);
    const result=await pool.query("UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING id,read_at AS \"readAt\"",[id,session.sub]);
    if(!result.rows[0]) throw new HttpError(404,"NOTIFICATION_NOT_FOUND","Notification not found.");
    res.json(result.rows[0]);
  }));
  router.put("/v1/notifications/device",requireSession,asyncRoute(async(req,res)=>{
    const session=res.locals.session as {sub:string};
    const data=z.object({token:z.string().min(32).max(4096),platform:z.enum(["android","ios"])}).strict().parse(req.body);
    const digest=createHash("sha256").update(data.token).digest("hex");
    await pool.query("INSERT INTO notification_devices(user_id,token_hash,platform) VALUES($1,$2,$3) ON CONFLICT(token_hash) DO UPDATE SET user_id=EXCLUDED.user_id,platform=EXCLUDED.platform,active=true,updated_at=now()",[session.sub,digest,data.platform]);
    res.status(204).end();
  }));
}});

async function onDomainEvent(client:import("pg").PoolClient,event:DomainEvent){
  if(event.type!=="order.status_changed") return;
  const p=z.object({orderId:z.string().uuid(),customerId:z.string().uuid(),toStatus:z.enum(["accepted","rejected","preparing","ready","assigned","picked_up","delivered","cancelled"])}).passthrough().parse(event.payload);
  const content:Record<string,{title:string;body:string}>={accepted:{title:"Order accepted",body:"The restaurant accepted your order."},rejected:{title:"Order update",body:"The restaurant could not fulfil this order."},preparing:{title:"Your food is being prepared",body:"The restaurant is preparing your order."},ready:{title:"Order ready",body:"Your order is ready for pickup."},assigned:{title:"Rider assigned",body:"A rider is on the way to the restaurant."},picked_up:{title:"Order picked up",body:"Your rider has picked up the order."},delivered:{title:"Order delivered",body:"Your order has been delivered."},cancelled:{title:"Order cancelled",body:"Your order has been cancelled."}};
  const message=content[p.toStatus];
  if(!message) return;
  await client.query("INSERT INTO notifications(user_id,source_event_id,category,title,body) VALUES($1,$2,'order',$3,$4) ON CONFLICT(source_event_id) DO NOTHING",[p.customerId,event.eventId,message.title,message.body]);
}
const brokerUrl=process.env.RABBITMQ_URL;
if(brokerUrl) startEventConsumer(pool,brokerUrl,"notification-order-events",["order.status_changed"],onDomainEvent);
await startService(app,parsePort(process.env.PORT,3110),service);
