import express, { type Express, type Request, type Response } from "express";
import dotenv from "dotenv";
import { resolve } from "node:path";
import { Pool } from "pg";
import { ZodError } from "zod";
import { HttpError } from "./http.js";
import { stopBackgroundWork } from "./events.js";
import { installHttpMetrics } from "./metrics.js";
export { asyncRoute, transaction, idempotent, internalAuth, internalJson, HttpError } from "./http.js";
export { beginEventConsumption, domainEventSchema, enqueueDomainEvent, newDomainEvent, registerShutdown, startEventConsumer, startOutboxRelay, stopBackgroundWork } from "./events.js";
export type { DomainEvent } from "./events.js";
export { requireRole, requireSession, verifyAccessToken } from "./auth.js";
export type { SessionClaims } from "./auth.js";

dotenv.config({ path: resolve(process.cwd(), "../../.env"), quiet: true });

export type ServiceOptions = {
  name: string;
  version?: string;
  databaseUrl?: string;
  routes?: (app: Express) => void;
};

export function createService(options: ServiceOptions) {
  const app = express();
  app.disable("x-powered-by");
  installHttpMetrics(app, options.name);
  app.use(express.json({ limit: "1mb", strict: true }));
  app.get("/health/live", (_req: Request, res: Response) => res.json({ status: "live", service: options.name }));
  app.get("/health/ready", async (_req: Request, res: Response) => {
    if (!options.databaseUrl) {
      res.json({ status: "ready", service: options.name, version: options.version ?? "0.1.0" });
      return;
    }
    const pool = getPool(options.databaseUrl);
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ready", service: options.name, version: options.version ?? "0.1.0" });
    } catch {
      res.status(503).json({ status: "not_ready", service: options.name, dependency: "database" });
    }
  });
  options.routes?.(app);
  app.use((error: unknown, _req: Request, res: Response, next: express.NextFunction) => {
    void next;
    if (error instanceof ZodError) { res.status(400).json({ error: "INVALID_REQUEST", message: "Check the request fields." }); return; }
    if (error instanceof HttpError) { res.status(error.status).json({ error: error.code, message: error.message }); return; }
    const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" ? error.status : 500;
    res.status(status).json({ error: status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR", message: status >= 500 ? "The request could not be completed." : error instanceof Error ? error.message : "Invalid request." });
  });
  return app;
}

const pools = new Map<string, Pool>();
export function getPool(connectionString: string) {
  let pool = pools.get(connectionString);
  if (!pool) {
    pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 1_000, statement_timeout: 5_000, lock_timeout: 2_000, idle_in_transaction_session_timeout: 10_000, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined });
    pool.on("error", () => process.stderr.write("An idle database connection failed; the pool will reconnect.\n"));
    pools.set(connectionString, pool);
  }
  return pool;
}

export async function startService(app: Express, port: number, serviceName: string) {
  const server = app.listen(port, "0.0.0.0", () => process.stdout.write(`${serviceName} listening on ${port}\n`));
  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    void stopBackgroundWork().finally(() => server.close(() => {
      Promise.all([...pools.values()].map((pool) => pool.end())).finally(() => process.exit(0));
    }));
  };
  process.once("SIGTERM", close);
  process.once("SIGINT", close);
}

export function parsePort(value: string | undefined, fallback: number) {
  const port = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port.");
  return port;
}

export function databaseUrlFor(service: string) {
  const key = `${service.toUpperCase().replaceAll("-", "_")}_DATABASE_URL`;
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required.`);
  return value;
}
