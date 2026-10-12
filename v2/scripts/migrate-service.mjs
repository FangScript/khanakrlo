import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { createHash } from "node:crypto";

const { Client } = pg;
const services = ["identity", "admin", "restaurant", "menu", "order", "customer", "review", "payment", "delivery", "notification", "analytics"];
const service = process.argv[2];
if (!service || !services.includes(service)) {
  console.error(`Choose one service database: ${services.join(", ")}`);
  process.exit(2);
}
const variable = `${service.toUpperCase().replaceAll("-", "_")}_DATABASE_URL`;
const databaseUrl = process.env[variable];
if (!databaseUrl) {
  console.error(`${variable} is required. Copy .env.example to .env and configure the local database URLs.`);
  process.exit(2);
}

const serviceDir = resolve("services", service, "migrations");
const commonDir = resolve("infrastructure", "db-migrations");
const files = [
  ...(await readdir(commonDir)).filter((file) => file.endsWith(".sql")).map((file) => resolve(commonDir, file)),
  ...(await readdir(serviceDir).catch(() => [])).filter((file) => file.endsWith(".sql")).map((file) => resolve(serviceDir, file)),
].sort();
const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined });
await client.connect();
try {
  await client.query("SELECT pg_advisory_lock(hashtextextended('khana-schema-migrations',0))");
  await client.query("CREATE TABLE IF NOT EXISTS service_schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  await client.query("ALTER TABLE service_schema_migrations ADD COLUMN IF NOT EXISTS checksum char(64)");
  for (const file of files) {
    const version = file.replaceAll("\\", "/").split("/").slice(-2).join("/");
    const sql = await readFile(file, "utf8");
    const checksum = createHash("sha256").update(sql.replaceAll("\r\n", "\n")).digest("hex");
    const exists = await client.query("SELECT checksum FROM service_schema_migrations WHERE version = $1", [version]);
    if (exists.rowCount) {
      if (exists.rows[0].checksum && exists.rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${version}`);
      if (!exists.rows[0].checksum) {
        if (process.env.ADOPT_MIGRATION_CHECKSUMS !== "true") throw new Error(`Review the applied SQL before setting ADOPT_MIGRATION_CHECKSUMS=true for ${version}`);
        await client.query("UPDATE service_schema_migrations SET checksum=$2 WHERE version=$1", [version, checksum]);
      }
      continue;
    }
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO service_schema_migrations (version,checksum) VALUES ($1,$2)", [version,checksum]);
      await client.query("COMMIT");
      console.log(`Applied ${service}: ${version}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}
