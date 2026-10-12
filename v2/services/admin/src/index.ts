import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { z } from "zod";
import { asyncRoute, createService, databaseUrlFor, getPool, HttpError, internalJson, parsePort, requireRole, requireSession, startEventConsumer, startService } from "@khana/service-kit";
import type { DomainEvent } from "@khana/service-kit";

const service="admin";
const databaseUrl=databaseUrlFor(service);
const pool=getPool(databaseUrl);
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>!Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)));
const codeSchema=z.string().regex(/^\d{6}$/);
const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(value:Buffer){let bits=0,buffer=0,out="";for(const byte of value){buffer=(buffer<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(buffer>>(bits-5))&31];bits-=5;}}if(bits)out+=alphabet[(buffer<<(5-bits))&31];return out;}
function base32Decode(value:string){let bits=0,buffer=0;const out:number[]=[];for(const char of value){const n=alphabet.indexOf(char);if(n<0)throw new Error("Invalid MFA secret.");buffer=(buffer<<5)|n;bits+=5;if(bits>=8){out.push((buffer>>(bits-8))&255);bits-=8;}}return Buffer.from(out);}
function encryptionKey(){const value=process.env.ADMIN_MFA_ENCRYPTION_KEY_HEX??"";if(!/^[0-9a-f]{64}$/i.test(value))throw new HttpError(503,"ADMIN_MFA_NOT_CONFIGURED","Admin MFA encryption is not configured.");return Buffer.from(value,"hex");}
function encryptSecret(secret:string){const nonce=randomBytes(12);const cipher=createCipheriv("aes-256-gcm",encryptionKey(),nonce);const ciphertext=Buffer.concat([cipher.update(secret,"utf8"),cipher.final()]);return {nonce,ciphertext,tag:cipher.getAuthTag()};}
function decryptSecret(row:{secret_nonce:Buffer;secret_ciphertext:Buffer;secret_tag:Buffer}){const decipher=createDecipheriv("aes-256-gcm",encryptionKey(),row.secret_nonce);decipher.setAuthTag(row.secret_tag);return Buffer.concat([decipher.update(row.secret_ciphertext),decipher.final()]).toString("utf8");}
function totpCounter(secret:string,step:number){const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(step));const digest=createHmac("sha1",base32Decode(secret)).update(counter).digest();const offset=digest[digest.length-1]!&15;const binary=((digest[offset]!&127)<<24)|((digest[offset+1]!&255)<<16)|((digest[offset+2]!&255)<<8)|(digest[offset+3]!&255);return String(binary%1_000_000).padStart(6,"0");}
function verifyTotp(secret:string,code:string){const current=Math.floor(Date.now()/30_000);for(const step of [current-1,current,current+1]){const expected=Buffer.from(totpCounter(secret,step));const supplied=Buffer.from(code);if(expected.length===supplied.length&&timingSafeEqual(expected,supplied))return true;}return false;}
function mfaTokenSecret(){const value=process.env.ADMIN_MFA_SESSION_SECRET??"";if(Buffer.byteLength(value)<32)throw new HttpError(503,"ADMIN_MFA_NOT_CONFIGURED","Admin MFA session signing is not configured.");return value;}
function issueMfaToken(user:{sub:string;sid:string}){const expiresAt=Date.now()+15*60_000;const payload=Buffer.from(JSON.stringify({sub:user.sub,sid:user.sid,exp:expiresAt})).toString("base64url");const sig=createHmac("sha256",mfaTokenSecret()).update(payload).digest("base64url");return {token:`${payload}.${sig}`,expiresAt:new Date(expiresAt).toISOString()};}
function validMfaToken(token:string|undefined,user:{sub:string;sid:string}){if(!token)return false;const [payload,provided,...rest]=token.split(".");if(!payload||!provided||rest.length)return false;const expected=createHmac("sha256",mfaTokenSecret()).update(payload).digest();let supplied:Buffer;try{supplied=Buffer.from(provided,"base64url");}catch{return false;}if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return false;try{const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8")) as {sub?:string;sid?:string;exp?:number};return data.sub===user.sub&&data.sid===user.sid&&typeof data.exp==="number"&&data.exp>Date.now();}catch{return false;}}
const requireMfa:RequestHandler=(req,res,next)=>{const session=res.locals.session as {sub:string;sid:string}|undefined;if(!session){res.status(401).json({error:"UNAUTHENTICATED"});return;}try{if(validMfaToken(req.header("x-admin-mfa-token"),session))next();else res.status(428).json({error:"ADMIN_MFA_REQUIRED",message:"Complete staff MFA and send the short-lived Admin MFA token."});}catch{res.status(503).json({error:"ADMIN_MFA_NOT_CONFIGURED"});}};
const app=createService({name:service,version:"0.2.0",databaseUrl,routes(router){
  router.post("/v1/mfa/enroll",requireSession,requireRole("staff"),asyncRoute(async(_req,res)=>{
    const session=res.locals.session as {sub:string};
    const secret=base32Encode(randomBytes(20));
    const encrypted=encryptSecret(secret);
    const saved=await pool.query("INSERT INTO admin_staff_mfa(user_id,secret_ciphertext,secret_nonce,secret_tag) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET secret_ciphertext=CASE WHEN admin_staff_mfa.active_at IS NULL THEN EXCLUDED.secret_ciphertext ELSE admin_staff_mfa.secret_ciphertext END,secret_nonce=CASE WHEN admin_staff_mfa.active_at IS NULL THEN EXCLUDED.secret_nonce ELSE admin_staff_mfa.secret_nonce END,secret_tag=CASE WHEN admin_staff_mfa.active_at IS NULL THEN EXCLUDED.secret_tag ELSE admin_staff_mfa.secret_tag END,failed_attempts=0,locked_until=NULL,updated_at=now() WHERE admin_staff_mfa.active_at IS NULL RETURNING user_id",[session.sub,encrypted.ciphertext,encrypted.nonce,encrypted.tag]);
    if(!saved.rows[0]) throw new HttpError(409,"ADMIN_MFA_ALREADY_ENROLLED","Admin MFA is already active for this account.");
    await pool.query("INSERT INTO admin_mfa_audit(user_id,action) VALUES($1,'enrolled')",[session.sub]);
    res.status(201).json({secret,otpauthUrl:`otpauth://totp/Khana%20KarLo:${session.sub}?secret=${secret}&issuer=Khana%20KarLo&algorithm=SHA1&digits=6&period=30`});
  }));
  router.post("/v1/mfa/verify",requireSession,requireRole("staff"),asyncRoute(async(req,res)=>{
    const session=res.locals.session as {sub:string;sid:string};
    const {code}=z.object({code:codeSchema}).strict().parse(req.body);
    const result=await pool.connect();
    let verified=false;
    try{
      await result.query("BEGIN");
      const found=await result.query<{secret_ciphertext:Buffer;secret_nonce:Buffer;secret_tag:Buffer;failed_attempts:number;locked_until:Date|null}>("SELECT secret_ciphertext,secret_nonce,secret_tag,failed_attempts,locked_until FROM admin_staff_mfa WHERE user_id=$1 FOR UPDATE",[session.sub]);
      const row=found.rows[0];
      if(!row) throw new HttpError(409,"ADMIN_MFA_NOT_ENROLLED","Enroll an authenticator before verifying MFA.");
      if(row.locked_until&&row.locked_until.getTime()>Date.now()) throw new HttpError(429,"ADMIN_MFA_LOCKED","Too many invalid codes. Try again after the lock period.");
      const secret=decryptSecret(row);
      if(!verifyTotp(secret,code)){
        const failures=row.locked_until&&row.locked_until.getTime()<=Date.now()?1:row.failed_attempts+1;
        await result.query("UPDATE admin_staff_mfa SET failed_attempts=LEAST($2,5),locked_until=CASE WHEN $2>=5 THEN now()+interval '15 minutes' ELSE NULL END,updated_at=now() WHERE user_id=$1",[session.sub,failures]);
      }else{
        await result.query("UPDATE admin_staff_mfa SET active_at=COALESCE(active_at,now()),failed_attempts=0,locked_until=NULL,updated_at=now() WHERE user_id=$1",[session.sub]);
        await result.query("INSERT INTO admin_mfa_audit(user_id,action) VALUES($1,'verified')",[session.sub]);
        verified=true;
      }
      await result.query("COMMIT");
    }catch(error){await result.query("ROLLBACK").catch(()=>undefined);throw error;}finally{result.release();}
    if(!verified) throw new HttpError(401,"INVALID_ADMIN_MFA_CODE","The authenticator code is invalid.");
    res.json(issueMfaToken(session));
  }));
  router.get("/v1/reviews/queue",requireSession,requireRole("staff"),requireMfa,asyncRoute(async(_req,res)=>{
    const queue=await internalJson<{items:unknown[]}>("REVIEW_URL","REVIEW_INTERNAL_TOKEN","/internal/v1/reviews/moderation-queue",{});
    res.setHeader("Cache-Control","no-store");
    res.json(queue);
  }));
  router.post("/v1/reviews/:reviewId/moderation",requireSession,requireRole("staff"),requireMfa,asyncRoute(async(req,res)=>{
    const session=res.locals.session as {sub:string};
    const id=z.string().uuid().parse(req.params.reviewId);
    const {action}=z.object({action:z.enum(["published","hidden"])}).strict().parse(req.body);
    const result=await internalJson<{id:string;status:string}>("REVIEW_URL","REVIEW_INTERNAL_TOKEN",`/internal/v1/reviews/${id}/moderation`,{actorId:session.sub,action});
    res.json(result);
  }));
  router.get("/v1/reports/event-counts",requireSession,requireRole("staff"),requireMfa,asyncRoute(async(req,res)=>{
    const end=day.parse(req.query.end??new Date().toISOString().slice(0,10));
    const start=day.parse(req.query.start??new Date(Date.parse(`${end}T00:00:00.000Z`)-6*86400000).toISOString().slice(0,10));
    if(start>end||Date.parse(`${end}T00:00:00.000Z`)-Date.parse(`${start}T00:00:00.000Z`)>90*86400000) throw new HttpError(400,"INVALID_DATE_RANGE","Choose a date range of at most 90 days.");
    const report=await internalJson<{start:string;end:string;items:unknown[]}>("ANALYTICS_URL","ANALYTICS_INTERNAL_TOKEN","/internal/v1/reports/event-counts",{start,end});
    res.setHeader("Cache-Control","no-store");
    res.json(report);
  }));
  router.get("/v1/audit/events",requireSession,requireRole("staff"),requireMfa,asyncRoute(async(req,res)=>{
    const end=day.parse(req.query.end??new Date().toISOString().slice(0,10));
    const start=day.parse(req.query.start??new Date(Date.parse(`${end}T00:00:00.000Z`)-6*86400000).toISOString().slice(0,10));
    if(start>end||Date.parse(`${end}T00:00:00.000Z`)-Date.parse(`${start}T00:00:00.000Z`)>30*86400000){res.status(400).json({error:"INVALID_DATE_RANGE",message:"Choose a date range of at most 31 days."});return;}
    const result=await pool.query("SELECT event_id AS \"eventId\",event_type AS \"eventType\",producer,aggregate_id AS \"aggregateId\",occurred_at AS \"occurredAt\",received_at AS \"receivedAt\" FROM admin_event_audit WHERE occurred_at >= $1::date AND occurred_at < ($2::date + interval '1 day') ORDER BY occurred_at DESC LIMIT 1000",[start,end]);
    res.setHeader("Cache-Control","no-store");
    res.json({start,end,items:result.rows});
  }));
}});

const brokerUrl=process.env.RABBITMQ_URL;
if(brokerUrl) startEventConsumer(pool,brokerUrl,service,["#"],async(client,event:DomainEvent)=>{
  await client.query("INSERT INTO admin_event_audit(event_id,event_type,producer,aggregate_id,occurred_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id) DO NOTHING",[event.eventId,event.type,event.producer,event.aggregateId,event.occurredAt]);
});
await startService(app,parsePort(process.env.PORT,3102),service);
