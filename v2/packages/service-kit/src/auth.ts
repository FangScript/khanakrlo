import { jwtVerify } from "jose";
import type { RequestHandler } from "express";
import { internalJson } from "./http.js";

export type SessionClaims = { sub: string; sid: string; roles: string[] };

export async function verifyAccessToken(token: string): Promise<SessionClaims> {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new Error("Access signing is not configured.");
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    issuer: process.env.JWT_ISSUER ?? "https://identity.khanakarlo.com",
    audience: process.env.JWT_AUDIENCE ?? "khana-karlo", algorithms: ["HS256"],
  });
  if (typeof payload.sub !== "string" || typeof payload.sid !== "string" || !Array.isArray(payload.roles) || !payload.roles.every((role) => typeof role === "string")) throw new Error("Invalid session claims.");
  return { sub: payload.sub, sid: payload.sid, roles: payload.roles };
}

export const requireSession: RequestHandler = async (req, res, next) => {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!token || !secret || Buffer.byteLength(secret) < 32) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Sign in to continue." });
    return;
  }
  try {
    const claims = await verifyAccessToken(token);
    let current: { active: boolean; roles: string[] };
    try {
      current = await internalJson("IDENTITY_URL", "INTERNAL_IDENTITY_TOKEN", "/internal/v1/sessions/introspect", { token });
    } catch {
      res.status(503).json({ error: "IDENTITY_UNAVAILABLE", message: "Session validation is temporarily unavailable." });
      return;
    }
    if (!current.active || !Array.isArray(current.roles) || !current.roles.every((role) => typeof role === "string")) throw new Error("Inactive session.");
    res.locals.session = { ...claims, roles: current.roles } satisfies SessionClaims;
  } catch {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Sign in again to continue." });
    return;
  }
  next();
};

export function requireRole(...roles: string[]): RequestHandler {
  return (_req, res, next) => {
    const session = res.locals.session as SessionClaims | undefined;
    if (!session || !roles.some((role) => session.roles.includes(role))) {
      res.status(403).json({ error: "FORBIDDEN", message: "Your account does not have permission for this action." });
      return;
    }
    next();
  };
}
