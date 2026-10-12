import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function asyncRoute(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req, res, next) => { void handler(req, res).catch(next); };
}
export async function transaction<T>(pool: Pool, operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}
export function internalAuth(variable: string): RequestHandler {
  return (req, res, next) => {
    const secret = process.env[variable] ?? "";
    const supplied = req.header("x-service-token") ?? "";
    if (Buffer.byteLength(secret) < 32) { res.status(503).json({ error: "SERVICE_AUTH_NOT_CONFIGURED" }); return; }
    const a = Buffer.from(secret); const b = Buffer.from(supplied);
    if (a.length !== b.length || !timingSafeEqual(a, b)) { res.status(401).json({ error: "SERVICE_UNAUTHENTICATED" }); return; }
    next();
  };
}
export async function internalJson<T>(baseVariable: string, tokenVariable: string, path: string, body?: unknown): Promise<T> {
  const base = process.env[baseVariable]; const token = process.env[tokenVariable];
  if (!base || !token || token.length < 32) throw new HttpError(503, "DEPENDENCY_NOT_CONFIGURED", "A required service is not configured.");
  const url = new URL(path, base);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new HttpError(503, "INSECURE_DEPENDENCY", "Service TLS is required.");
  let response: globalThis.Response;
  try {
    response = await fetch(url, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", "x-service-token": token }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(2000), redirect: "error" });
  } catch { throw new HttpError(503, "DEPENDENCY_UNAVAILABLE", "A required service is temporarily unavailable."); }
  if (!response.ok) throw new HttpError(response.status === 404 ? 404 : response.status === 409 ? 409 : 503, "DEPENDENCY_REJECTED", "A required service could not validate this operation.");
  return await response.json() as T;
}
export async function idempotent<T>(client: PoolClient, actor: string, scope: string, key: string | undefined, input: unknown, operation: () => Promise<T>): Promise<T> {
  if (!key || key.length < 16 || key.length > 128) throw new HttpError(400, "IDEMPOTENCY_KEY_REQUIRED", "Provide an Idempotency-Key of 16–128 characters.");
  const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`${actor}:${scope}:${key}`]);
  const old = await client.query<{ request_hash: string; response: T }>("SELECT request_hash, response FROM request_idempotency WHERE actor_id=$1 AND scope=$2 AND key=$3", [actor, scope, key]);
  if (old.rows[0]) {
    if (old.rows[0].request_hash !== hash) throw new HttpError(409, "IDEMPOTENCY_CONFLICT", "This key was already used for a different request.");
    return old.rows[0].response;
  }
  const result = await operation();
  await client.query("INSERT INTO request_idempotency (actor_id, scope, key, request_hash, response) VALUES ($1,$2,$3,$4,$5::jsonb)", [actor, scope, key, hash, JSON.stringify(result)]);
  return result;
}
