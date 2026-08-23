import crypto from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, gte } from "drizzle-orm";
import { parse as parseCookie } from "cookie";

import { adminCredentialLoginAttempts, adminCredentialSessions, adminStaffCredentials, adminStaffRoles, users } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

export const ADMIN_CREDENTIAL_COOKIE = "kk_admin_credential";
const CREDENTIAL_SESSION_MS = 15 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
export class AdminCredentialError extends Error {}

export function getAdminCredentialBootstrapConfiguration() { return { bootstrapConfigured: Boolean(ENV.adminBootstrapUsername && ENV.adminBootstrapPassword) }; }

function hash(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }
function hashPassword(password: string) { const salt = crypto.randomBytes(16).toString("base64url"); const derived = crypto.scryptSync(password, salt, 64).toString("base64url"); return `scrypt$${salt}$${derived}`; }
function verifyPassword(password: string, stored: string) { const [kind, salt, expected] = stored.split("$"); if (kind !== "scrypt" || !salt || !expected) return false; const actual = crypto.scryptSync(password, salt, 64).toString("base64url"); return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected)); }
function requestMeta(req: Request) { const forwarded = req.headers["x-forwarded-for"]; const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]; return { ipAddress: (value?.trim() || req.ip || req.socket.remoteAddress || "unknown").replace(/^::ffff:/, "").slice(0, 64), host: (req.hostname || String(req.headers.host ?? "unknown").split(":")[0]).toLowerCase().slice(0,255) }; }
function tokenFrom(req: Request) { return parseCookie(req.headers.cookie || "")[ADMIN_CREDENTIAL_COOKIE] ?? null; }
async function requireDb() { const db = await getDb(); if (!db) throw new AdminCredentialError("Admin sign-in is temporarily unavailable."); return db; }

async function ensureBootstrapCredential(db: any) {
  if (!ENV.adminBootstrapUsername || !ENV.adminBootstrapPassword || !ENV.ownerOpenId) return;
  const owner = (await db.select().from(users).where(eq(users.openId, ENV.ownerOpenId)).limit(1))[0]; if (!owner) return;
  const existing = (await db.select().from(adminStaffCredentials).where(eq(adminStaffCredentials.userId, owner.id)).limit(1))[0];
  if (!existing) await db.insert(adminStaffCredentials).values({ userId: owner.id, username: ENV.adminBootstrapUsername.trim().toLowerCase(), passwordHash: hashPassword(ENV.adminBootstrapPassword), status: "active", passwordChangedAt: new Date(), createdByUserId: owner.id });
}

function setCookie(res: Response, req: Request, token: string, expiresAt: Date) { const secure = req.protocol === "https" || String(req.headers["x-forwarded-proto"] ?? "").split(",").some((value) => value.trim() === "https"); res.cookie(ADMIN_CREDENTIAL_COOKIE, token, { httpOnly:true, secure, sameSite:"strict", path:"/", maxAge: Math.max(1, expiresAt.getTime()-Date.now()) }); }

export async function signInAdminCredential(req: Request, res: Response, input: { username: string; password: string }) {
  const db = await requireDb(); await ensureBootstrapCredential(db); const meta = requestMeta(req); const username = input.username.trim().toLowerCase(); const since = new Date(Date.now()-ATTEMPT_WINDOW_MS);
  const failed = await db.select().from(adminCredentialLoginAttempts).where(and(eq(adminCredentialLoginAttempts.username, username), eq(adminCredentialLoginAttempts.success, false), gte(adminCredentialLoginAttempts.createdAt, since)));
  if (failed.length >= MAX_FAILED_ATTEMPTS) { const firstFailureAt = failed.reduce((earliest: Date, attempt: typeof adminCredentialLoginAttempts.$inferSelect) => attempt.createdAt < earliest ? attempt.createdAt : earliest, failed[0].createdAt); return { rateLimited: true as const, retryAfterSeconds: Math.max(1, Math.ceil((firstFailureAt.getTime() + ATTEMPT_WINDOW_MS - Date.now()) / 1000)) }; }
  const credential = (await db.select().from(adminStaffCredentials).where(eq(adminStaffCredentials.username, username)).limit(1))[0];
  const valid = Boolean(credential && credential.status === "active" && verifyPassword(input.password, credential.passwordHash));
  await db.insert(adminCredentialLoginAttempts).values({ username, ipAddress: meta.ipAddress, success: valid });
  if (!valid) throw new AdminCredentialError("Invalid username or password.");
  const staff = (await db.select().from(adminStaffRoles).where(eq(adminStaffRoles.userId, credential.userId)).limit(1))[0];
  const user = (await db.select().from(users).where(eq(users.id, credential.userId)).limit(1))[0];
  if (!user || user.role !== "admin" || staff?.status === "inactive") throw new AdminCredentialError("This staff account is not active.");
  const token = crypto.randomBytes(36).toString("base64url"); const expiresAt = new Date(Date.now()+CREDENTIAL_SESSION_MS);
  await db.insert(adminCredentialSessions).values({ userId:user.id, tokenHash:hash(token), ipAddress:meta.ipAddress, host:meta.host, expiresAt, revokedAt:null }); setCookie(res, req, token, expiresAt); return { rateLimited: false as const, expiresAt, user: { id:user.id, username:credential.username, name:user.name, staffRole:staff?.staffRole ?? "senior_operations" } };
}

export async function getAdminCredentialUser(req: Request) { const db = await requireDb(); const token = tokenFrom(req); if (!token) return null; const meta = requestMeta(req); const session = (await db.select().from(adminCredentialSessions).where(eq(adminCredentialSessions.tokenHash, hash(token))).limit(1))[0]; if (!session || session.revokedAt || session.expiresAt <= new Date() || session.ipAddress !== meta.ipAddress || session.host !== meta.host) return null; const credential = (await db.select().from(adminStaffCredentials).where(and(eq(adminStaffCredentials.userId, session.userId), eq(adminStaffCredentials.status, "active"))).limit(1))[0]; const user = (await db.select().from(users).where(eq(users.id, session.userId)).limit(1))[0]; if (!credential || !user || user.role !== "admin") return null; return user; }
export async function getAdminCredentialStatus(req: Request) { const user = await getAdminCredentialUser(req); return { authenticated: Boolean(user), user: user ? { id:user.id, name:user.name } : null, ...getAdminCredentialBootstrapConfiguration() }; }
export async function provisionAdminCredential(actorUserId: number, input: { userId: number; username: string; temporaryPassword: string }) { const db = await requireDb(); const actorRole = (await db.select().from(adminStaffRoles).where(eq(adminStaffRoles.userId, actorUserId)).limit(1))[0]; if (actorRole?.staffRole !== "senior_operations") throw new AdminCredentialError("Only senior operators can provision staff credentials."); const target = (await db.select().from(users).where(eq(users.id,input.userId)).limit(1))[0]; if (!target || target.role !== "admin") throw new AdminCredentialError("Credential targets must be internal Admin staff."); await db.insert(adminStaffCredentials).values({ userId:input.userId, username:input.username, passwordHash:hashPassword(input.temporaryPassword), status:"active", passwordChangedAt:new Date(), createdByUserId:actorUserId }).onDuplicateKeyUpdate({ set:{ username:input.username, passwordHash:hashPassword(input.temporaryPassword), status:"active", passwordChangedAt:new Date(), createdByUserId:actorUserId } }); return { userId: input.userId, username: input.username }; }
