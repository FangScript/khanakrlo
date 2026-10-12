import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import type { PoolClient } from "pg";
import { asyncRoute, createService, databaseUrlFor, getPool, internalAuth, newDomainEvent, enqueueDomainEvent, parsePort, startOutboxRelay, startService, verifyAccessToken, transaction } from "@khana/service-kit";

const service = "identity";
const pool = getPool(databaseUrlFor(service));
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const clientTypes = ["android", "ios"] as const;
const googleExchangeInput = z.object({ idToken: z.string().min(20).max(8192), clientType: z.enum(clientTypes) }).strict();
const refreshInput = z.object({ refreshToken: z.string().min(48).max(128) }).strict();
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_ISSUER = process.env.JWT_ISSUER ?? "https://identity.khanakarlo.com";
const SESSION_AUDIENCE = process.env.JWT_AUDIENCE ?? "khana-karlo";

function accessSecret() {
  const raw = process.env.ACCESS_TOKEN_SECRET;
  if (!raw || Buffer.byteLength(raw) < 32) throw new Error("ACCESS_TOKEN_SECRET must be set to at least 32 bytes.");
  return new TextEncoder().encode(raw);
}

function allowedGoogleAudiences() {
  const values = [process.env.GOOGLE_ANDROID_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID, process.env.GOOGLE_WEB_CLIENT_ID].filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim());
  return [...new Set(values)];
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function createSession(user: { id: string; roles: string[] }, client: Pick<PoolClient, "query"> = pool) {
  const id = crypto.randomUUID();
  const refreshSecret = randomBytes(32).toString("base64url");
  const refreshToken = `${id}.${refreshSecret}`;
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await client.query("INSERT INTO identity_sessions (id, user_id, refresh_token_hash, refresh_expires_at) VALUES ($1, $2, $3, $4)", [id, user.id, tokenHash(refreshSecret), refreshExpiresAt]);
  const accessToken = await new SignJWT({ roles: user.roles, sid: id })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setSubject(user.id)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(accessSecret());
  return { accessToken, refreshToken, accessExpiresAt: new Date(Date.now() + ACCESS_TTL_SECONDS * 1000).toISOString(), user };
}

const app = createService({ name: service, version: "0.1.0", databaseUrl: databaseUrlFor(service), routes(router) {
  router.post("/v1/sessions/google", async (req, res) => {
    const parsed = googleExchangeInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "INVALID_REQUEST", message: "A valid Google ID token and Android client type are required." });
      return;
    }
    const audiences = allowedGoogleAudiences();
    if (!audiences.length) {
      res.status(503).json({ error: "IDENTITY_NOT_CONFIGURED", message: "Google sign-in is not configured for this environment." });
      return;
    }
    let identityVerified = false;
    try {
      const { payload } = await jwtVerify(parsed.data.idToken, googleKeys, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: audiences,
        algorithms: ["RS256"],
      });
      if (typeof payload.sub !== "string" || !payload.sub || payload.email_verified !== true) {
        res.status(401).json({ error: "INVALID_GOOGLE_IDENTITY", message: "Google must verify the account email before sign-in." });
        return;
      }
      identityVerified = true;
      const client = await pool.connect();
      let user: { id: string; roles: string[] };
      try {
        await client.query("BEGIN");
        const result = await client.query<{ id: string }>(
          "INSERT INTO identity_users (google_subject) VALUES ($1) ON CONFLICT (google_subject) DO UPDATE SET updated_at = now() WHERE identity_users.status = 'active' RETURNING id",
          [payload.sub],
        );
        if (!result.rows[0]) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "ACCOUNT_UNAVAILABLE", message: "This account is unavailable." });
          return;
        }
        const userId = result.rows[0].id;
        await client.query("INSERT INTO identity_user_roles (user_id, role) VALUES ($1, 'customer') ON CONFLICT DO NOTHING", [userId]);
        const roles = await client.query<{ role: string }>("SELECT role FROM identity_user_roles WHERE user_id = $1 ORDER BY role", [userId]);
        await client.query("COMMIT");
        user = { id: userId, roles: roles.rows.map((row) => row.role) };
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
      res.status(200).json(await createSession(user));
    } catch {
      res.status(identityVerified ? 503 : 401).json(identityVerified
        ? { error: "IDENTITY_UNAVAILABLE", message: "Sign-in is temporarily unavailable." }
        : { error: "INVALID_GOOGLE_ID_TOKEN", message: "Google sign-in could not be verified." });
    }
  });

  router.post("/v1/sessions/refresh", asyncRoute(async (req, res) => {
    const parsed = refreshInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "INVALID_REQUEST", message: "A valid refresh token is required." });
      return;
    }
    const [id, secret, extra] = parsed.data.refreshToken.split(".");
    if (!id || !secret || extra || !/^[0-9a-f-]{36}$/i.test(id)) {
      res.status(401).json({ error: "INVALID_REFRESH_TOKEN", message: "Sign in again to continue." });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query<{ id: string; user_id: string; revoked_at: Date | null; refresh_expires_at: Date }>("SELECT id, user_id, revoked_at, refresh_expires_at FROM identity_sessions WHERE id = $1 AND refresh_token_hash = $2 FOR UPDATE", [id, tokenHash(secret)]);
      const session = found.rows[0];
      if (!session || session.revoked_at || session.refresh_expires_at <= new Date()) {
        if (session?.revoked_at) await client.query("UPDATE identity_sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE user_id = $1", [session.user_id]);
        await client.query("COMMIT");
        res.status(401).json({ error: "INVALID_REFRESH_TOKEN", message: "Sign in again to continue." });
        return;
      }
      const account = await client.query("SELECT id FROM identity_users WHERE id=$1 AND status='active' FOR SHARE", [session.user_id]);
      if (!account.rowCount) {
        await client.query("ROLLBACK");
        res.status(401).json({ error: "ACCOUNT_UNAVAILABLE" });
        return;
      }
      await client.query("UPDATE identity_sessions SET revoked_at = now() WHERE id = $1", [session.id]);
      const roles = await client.query<{ role: string }>("SELECT role FROM identity_user_roles WHERE user_id = $1 ORDER BY role", [session.user_id]);
      const replacement = await createSession({ id: session.user_id, roles: roles.rows.map((row) => row.role) }, client);
      await client.query("COMMIT");
      res.status(200).json(replacement);
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      res.status(503).json({ error: "SESSION_REFRESH_UNAVAILABLE", message: "Session refresh is temporarily unavailable." });
    } finally {
      client.release();
    }
  }));

  router.post("/v1/sessions/logout", async (req, res) => {
    const authorization = req.header("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ error: "UNAUTHENTICATED", message: "A valid session is required." });
      return;
    }
    try {
      const { payload } = await jwtVerify(authorization.slice(7), accessSecret(), { issuer: SESSION_ISSUER, audience: SESSION_AUDIENCE, algorithms: ["HS256"] });
      if (typeof payload.sid !== "string" || typeof payload.sub !== "string") throw new Error("Invalid session claims.");
      await pool.query("UPDATE identity_sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE id = $1 AND user_id = $2", [payload.sid, payload.sub]);
      res.status(200).json({ revoked: true });
    } catch {
      res.status(401).json({ error: "UNAUTHENTICATED", message: "A valid session is required." });
    }
  });

  router.post("/internal/v1/sessions/introspect", internalAuth("INTERNAL_IDENTITY_TOKEN"), asyncRoute(async (req, res) => {
    const { token } = z.object({ token: z.string().min(20).max(8192) }).strict().parse(req.body);
    let claims;
    try { claims = await verifyAccessToken(token); }
    catch { res.json({ active: false, roles: [] }); return; }
    const current = await pool.query<{ role: string }>(
      "SELECT r.role FROM identity_sessions s JOIN identity_users u ON u.id=s.user_id JOIN identity_user_roles r ON r.user_id=u.id WHERE s.id=$1 AND s.user_id=$2 AND s.revoked_at IS NULL AND s.refresh_expires_at>now() AND u.status='active' ORDER BY r.role",
      [claims.sid, claims.sub],
    );
    res.setHeader("Cache-Control", "no-store");
    res.json({ active: current.rowCount !== 0, roles: current.rows.map((row) => row.role) });
  }));

  router.put("/v1/profile/phone-consent", (_req, res) => {
    res.status(410).json({ error: "PROFILE_MOVED", message: "Use the Customer service phone-consent endpoint." });
  });

  // Restaurant self-service onboarding can grant only the merchant workspace role.
  // Rider and staff roles remain outside this capability.
  router.post("/internal/v1/users/:userId/merchant-role", internalAuth("INTERNAL_RESTAURANT_IDENTITY_TOKEN"), asyncRoute(async (req, res) => {
    const userId = z.string().uuid().parse(req.params.userId);
    const result = await transaction(pool, async (client) => {
      const account = await client.query("SELECT id FROM identity_users WHERE id=$1 AND status='active' FOR SHARE", [userId]);
      if (!account.rowCount) { res.status(404).json({ error: "USER_NOT_FOUND" }); return null; }
      const assigned = await client.query("INSERT INTO identity_user_roles (user_id,role) VALUES ($1,'merchant') ON CONFLICT DO NOTHING RETURNING role", [userId]);
      if (assigned.rowCount) {
        await enqueueDomainEvent(client, newDomainEvent({ type: "identity.role_granted", version: 1, producer: service, aggregateId: userId, payload: { userId, role: "merchant", source: "restaurant_onboarding" } }));
      }
      const roles = await client.query("SELECT role FROM identity_user_roles WHERE user_id=$1 ORDER BY role", [userId]);
      return roles.rows.map((row) => row.role as string);
    });
    if (result) res.status(200).json({ userId, roles: result });
  }));
} });

const brokerUrl = process.env.RABBITMQ_URL;
if (brokerUrl) startOutboxRelay(pool, brokerUrl, service);
await startService(app, parsePort(process.env.PORT, 3101), service);
