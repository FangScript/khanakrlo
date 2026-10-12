import { z } from "zod";
import { asyncRoute, createService, databaseUrlFor, getPool, HttpError, internalAuth, internalJson, parsePort, requireRole, requireSession, startService, transaction } from "@khana/service-kit";

const service="review";
const databaseUrl=databaseUrlFor(service);
const pool=getPool(databaseUrl);
const app=createService({name:service,version:"0.2.0",databaseUrl,routes(router){
  router.post("/v1/reviews",requireSession,requireRole("customer"),asyncRoute(async(req,res)=>{
    const session=res.locals.session as {sub:string};
    const input=z.object({orderId:z.string().uuid(),rating:z.number().int().min(1).max(5),body:z.string().trim().max(2000).default("")}).strict().parse(req.body);
    const eligibility=await internalJson<{orderId:string;outletId:string}>("ORDER_URL","ORDER_INTERNAL_TOKEN",`/internal/v1/orders/${input.orderId}/review-eligibility`,{customerId:session.sub});
    const result=await pool.query("INSERT INTO reviews(order_id,customer_id,outlet_id,rating,body) VALUES($1,$2,$3,$4,$5) ON CONFLICT(order_id) DO NOTHING RETURNING id,status,created_at AS \"createdAt\"",[input.orderId,session.sub,eligibility.outletId,input.rating,input.body]);
    if(!result.rows[0]) throw new HttpError(409,"REVIEW_ALREADY_EXISTS","Each delivered order can have one review.");
    res.status(201).json(result.rows[0]);
  }));
  router.get("/v1/outlets/:outletId/reviews",asyncRoute(async(req,res)=>{
    const outletId=z.string().uuid().parse(req.params.outletId);
    const result=await pool.query("SELECT id,rating,body,created_at AS \"createdAt\" FROM reviews WHERE outlet_id=$1 AND status='published' ORDER BY created_at DESC LIMIT 100",[outletId]);
    res.json({items:result.rows});
  }));
  router.get("/v1/reviews/mine",requireSession,requireRole("customer"),asyncRoute(async(_req,res)=>{
    const session=res.locals.session as {sub:string};
    const result=await pool.query("SELECT id,order_id AS \"orderId\",outlet_id AS \"outletId\",rating,body,status,created_at AS \"createdAt\" FROM reviews WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 100",[session.sub]);
    res.json({items:result.rows});
  }));
  router.post("/internal/v1/reviews/moderation-queue",internalAuth("REVIEW_INTERNAL_TOKEN"),asyncRoute(async(_req,res)=>{
    const result=await pool.query("SELECT id,order_id AS \"orderId\",outlet_id AS \"outletId\",customer_id AS \"customerId\",rating,body,photo_object_key AS \"photoObjectKey\",created_at AS \"createdAt\" FROM reviews WHERE status='pending' ORDER BY created_at LIMIT 100");
    res.json({items:result.rows});
  }));
  router.post("/internal/v1/reviews/:reviewId/moderation",internalAuth("REVIEW_INTERNAL_TOKEN"),asyncRoute(async(req,res)=>{
    const id=z.string().uuid().parse(req.params.reviewId);
    const {actorId,action}=z.object({actorId:z.string().uuid(),action:z.enum(["published","hidden"])}).strict().parse(req.body);
    const result=await transaction(pool,async(client)=>{
      const review=await client.query("UPDATE reviews SET status=$2,updated_at=now() WHERE id=$1 RETURNING id,status",[id,action]);
      if(!review.rows[0]) throw new HttpError(404,"REVIEW_NOT_FOUND","Review not found.");
      await client.query("INSERT INTO review_moderation_audit(review_id,actor_id,action) VALUES($1,$2,$3)",[id,actorId,action]);
      return review.rows[0];
    });
    res.json(result);
  }));
  router.post("/v1/reviews/:reviewId/moderation",requireSession,requireRole("staff"),asyncRoute(async(req,res)=>{
    const session=res.locals.session as {sub:string};
    const id=z.string().uuid().parse(req.params.reviewId);
    const {action}=z.object({action:z.enum(["published","hidden"])}).strict().parse(req.body);
    const result=await transaction(pool,async(client)=>{
      const review=await client.query("UPDATE reviews SET status=$2,updated_at=now() WHERE id=$1 RETURNING id,status",[id,action]);
      if(!review.rows[0]) throw new HttpError(404,"REVIEW_NOT_FOUND","Review not found.");
      await client.query("INSERT INTO review_moderation_audit(review_id,actor_id,action) VALUES($1,$2,$3)",[id,session.sub,action]);
      return review.rows[0];
    });
    res.json(result);
  }));
}});
await startService(app,parsePort(process.env.PORT,3107),service);
