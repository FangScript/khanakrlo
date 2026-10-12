import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createService, parsePort, startService } from "@khana/service-kit";

const service = "api-gateway";
const upstreams = new Map([
  ["identity", process.env.IDENTITY_URL], ["admin", process.env.ADMIN_URL],
  ["restaurant", process.env.RESTAURANT_URL], ["menu", process.env.MENU_URL],
  ["order", process.env.ORDER_URL], ["customer", process.env.CUSTOMER_URL],
  ["review", process.env.REVIEW_URL], ["payment", process.env.PAYMENT_URL],
  ["delivery", process.env.DELIVERY_URL], ["notification", process.env.NOTIFICATION_URL],
  ["analytics", process.env.ANALYTICS_URL],
]);
const corsOrigins = new Set((process.env.ALLOWED_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean));

function numericIp(value:string):{bits:32|128;value:bigint}|undefined {
  const raw=value.trim().replace(/^\[|\]$/g,"");
  if(raw.toLowerCase().startsWith("::ffff:")) return numericIp(raw.slice(7));
  const family=isIP(raw);
  if(family===4) return {bits:32,value:raw.split(".").reduce((acc,part)=>(acc<<8n)|BigInt(Number(part)),0n)};
  if(family!==6) return undefined;
  const pieces=raw.toLowerCase().split("::");
  const left=pieces[0]?pieces[0].split(":"):[];
  const right=pieces.length>1&&pieces[1]?pieces[1].split(":"):[];
  const groups=[...left,...Array(Math.max(0,8-left.length-right.length)).fill("0"),...right];
  if(groups.length!==8||groups.some(part=>!/^[0-9a-f]{1,4}$/.test(part))) return undefined;
  return {bits:128,value:groups.reduce((acc,part)=>(acc<<16n)|BigInt(`0x${part}`),0n)};
}
function ipAllowed(address:string|undefined,cidrs:string){
  const client=address?numericIp(address):undefined;
  if(!client) return false;
  return cidrs.split(",").some((entry)=>{
    const [networkRaw,prefixRaw]=entry.trim().split("/");
    const network=numericIp(networkRaw??"");
    const prefix=prefixRaw===undefined?network?.bits:Number(prefixRaw);
    if(!network||network.bits!==client.bits||!Number.isInteger(prefix)||prefix===undefined||prefix<0||prefix>client.bits) return false;
    const shift=BigInt(client.bits-prefix);
    return (client.value>>shift)===(network.value>>shift);
  });
}

const app = createService({ name: service, version: "0.1.0", routes(router) {
  router.use((req, res, next) => {
    const origin = req.header("origin");
    if (origin) {
      res.vary("Origin");
      if (!corsOrigins.has(origin)) {
        if (req.method === "OPTIONS") {
          res.status(403).json({ error: "ORIGIN_NOT_ALLOWED" });
          return;
        }
      } else {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key, X-Correlation-Id, X-Admin-Mfa-Token");
        res.setHeader("Access-Control-Max-Age", "600");
      }
    }
    const supplied = req.header("x-correlation-id");
    res.setHeader("X-Correlation-Id", supplied && /^[0-9a-f-]{36}$/i.test(supplied) ? supplied : randomUUID());
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  router.all("/v1/:service/*", async (req: Request, res: Response) => {
    const serviceName = req.params.service ?? "";
    if (!upstreams.has(serviceName)) {
      res.status(404).json({ error: "SERVICE_NOT_FOUND" });
      return;
    }
    if(serviceName==="admin") {
      const allowedHost=(process.env.ADMIN_ALLOWED_HOST??"").trim().toLowerCase();
      const allowedCidrs=process.env.ADMIN_ALLOWED_CIDRS??"";
      if(!allowedHost||req.hostname.toLowerCase()!==allowedHost||!ipAllowed(req.socket.remoteAddress,allowedCidrs)) {
        res.status(404).json({error:"ADMIN_CONSOLE_UNAVAILABLE"});
        return;
      }
    }
    const base = upstreams.get(serviceName);
    if (!base) {
      res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
      return;
    }
    const path = req.params[0] ?? "";
    const target = new URL(`/v1/${path}${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, base);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const headers = new Headers();
      for (const name of ["authorization", "content-type", "x-correlation-id", "idempotency-key"]) {
        const value = req.header(name);
        if (value) headers.set(name, value);
      }
      headers.set("x-correlation-id", String(res.getHeader("X-Correlation-Id")));
      const body = ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body ?? {});
      const init: RequestInit = { method: req.method, headers, signal: controller.signal, redirect: "manual" };
      if (body !== undefined) init.body = body;
      const response = await fetch(target, init);
      res.status(response.status);
      response.headers.forEach((value, name) => {
        if (["content-type", "retry-after", "etag"].includes(name.toLowerCase())) res.setHeader(name, value);
      });
      if (response.body && req.method !== "HEAD") {
        await pipeline(Readable.fromWeb(response.body as import("node:stream/web").ReadableStream<Uint8Array>), res);
      } else res.end();
    } catch (error) {
      const timeout = error instanceof Error && error.name === "AbortError";
      if (!res.headersSent && !res.destroyed) res.status(timeout ? 504 : 503).json({ error: timeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE" });
    } finally {
      clearTimeout(timer);
    }
  });
} });

await startService(app, parsePort(process.env.PORT, 3000), service);
