import crypto from "node:crypto";
import type { Request, Response } from "express";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { parse as parseCookie } from "cookie";

import { adminIpAllowlist, adminMfaEnrollments, adminMfaRecoveryCodes, adminStaffRoles, adminWebLoginAttempts, adminWebSecurityAlerts, adminWebSessions, users } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";

export const ADMIN_MFA_COOKIE = "kk_admin_mfa";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ALERT_WINDOW_MS = 15 * 60 * 1000;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
const ALERT_THRESHOLD = 3;

export class AdminWebSecurityError extends Error {}
type LoginEvent = typeof adminWebLoginAttempts.$inferInsert["eventType"];

function requestMeta(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  const ipAddress = (forwardedIp?.trim() || req.ip || req.socket.remoteAddress || "unknown").replace(/^::ffff:/, "").slice(0, 64);
  const host = (req.hostname || String(req.headers.host ?? "unknown").split(":")[0]).toLowerCase().slice(0, 255);
  const userAgent = (req.headers["user-agent"] || "").slice(0, 500);
  return { ipAddress, host, userAgent };
}

function getCipherKey() {
  if (!ENV.cookieSecret) throw new AdminWebSecurityError("Admin MFA is unavailable because the session encryption key is not configured.");
  return crypto.createHash("sha256").update(`${ENV.cookieSecret}:admin-mfa-v1`).digest();
}

function encryptSecret(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCipherKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

function decryptSecret(payload: string) {
  const [ivRaw, tagRaw, ciphertextRaw] = payload.split(".");
  if (!ivRaw || !tagRaw || !ciphertextRaw) throw new AdminWebSecurityError("Stored MFA enrollment cannot be decrypted.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getCipherKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, "base64url")), decipher.final()]).toString("utf8");
}

function base32Encode(input: Buffer) {
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of input) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) { output += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string) {
  let buffer = 0;
  let bits = 0;
  const output: number[] = [];
  for (const character of input.replace(/\s/g, "").toUpperCase()) {
    const value = BASE32_ALPHABET.indexOf(character);
    if (value === -1) throw new AdminWebSecurityError("Invalid authenticator secret.");
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) { output.push((buffer >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(output);
}

function totp(secret: string, counter = Math.floor(Date.now() / 30_000)) {
  const bytes = Buffer.alloc(8);
  bytes.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  bytes.writeUInt32BE(counter >>> 0, 4);
  const digest = crypto.createHmac("sha1", base32Decode(secret)).update(bytes).digest();
  const offset = digest[digest.length - 1] & 15;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, "0");
}

function verifyTotp(secret: string, code: string) {
  return [-1, 0, 1].some((delta) => crypto.timingSafeEqual(Buffer.from(totp(secret, Math.floor(Date.now() / 30_000) + delta)), Buffer.from(code)));
}

function hash(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }
function randomRecoveryCode() { return crypto.randomBytes(4).toString("hex").toUpperCase(); }
function randomSessionToken() { return crypto.randomBytes(36).toString("base64url"); }
function maskIp(ip: string) { const parts = ip.split("."); return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.×` : ip.length > 8 ? `${ip.slice(0, 8)}…` : ip; }

function ipv4ToNumber(ip: string) { const values = ip.split(".").map(Number); if (values.length !== 4 || values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return null; return (((values[0] << 24) >>> 0) + (values[1] << 16) + (values[2] << 8) + values[3]) >>> 0; }
function cidrMatches(ip: string, cidr: string) { const [network, prefixRaw] = cidr.split("/"); const base = ipv4ToNumber(network); const candidate = ipv4ToNumber(ip); const prefix = Number(prefixRaw); if (base === null || candidate === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false; const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0; return (base & mask) === (candidate & mask); }

async function requireDb() { const db = await getDb(); if (!db) throw new AdminWebSecurityError("Admin web security is temporarily unavailable."); return db; }
async function ensureAdminUser(userId: number) { const db = await requireDb(); const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0]; if (!user || user.role !== "admin") throw new AdminWebSecurityError("Administrator access is required."); const staff = (await db.select().from(adminStaffRoles).where(eq(adminStaffRoles.userId, userId)).limit(1))[0]; if (staff?.status === "inactive") throw new AdminWebSecurityError("Your internal staff access is inactive."); return { db, user, staffRole: staff?.staffRole ?? "senior_operations" as const }; }

async function recordAttempt(userId: number | null, req: Request, eventType: LoginEvent, success: boolean, reason?: string) {
  const db = await requireDb(); const meta = requestMeta(req);
  await db.insert(adminWebLoginAttempts).values({ userId, eventType, success, ipAddress: meta.ipAddress, host: meta.host, userAgent: meta.userAgent || null, reason: reason ?? null });
  if (!success && (eventType === "mfa_failed" || eventType === "ip_denied")) await alertOnRepeatedSecurityFailure(db, { userId, eventType, ipAddress: meta.ipAddress, host: meta.host });
}

async function deliverSecurityAlert(subject: string, body: string) {
  if (ENV.resendApiKey && ENV.securityAlertFrom && ENV.securityAlertTo) {
    try {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: ENV.securityAlertFrom, to: [ENV.securityAlertTo], subject, text: body }) });
      if (response.ok) return true;
    } catch (error) { console.warn("[AdminSecurity] Email delivery failed", error); }
  }
  return notifyOwner({ title: subject, content: body }).catch(() => false);
}

async function alertOnRepeatedSecurityFailure(db: any, input: { userId: number | null; eventType: "mfa_failed" | "ip_denied"; ipAddress: string; host: string }) {
  const now = new Date(); const since = new Date(now.getTime() - ALERT_WINDOW_MS);
  const alertType = input.eventType === "mfa_failed" ? "repeated_mfa_failures" as const : "repeated_ip_denials" as const;
  const scopeKey = input.eventType === "mfa_failed" ? `user:${input.userId ?? "unknown"}:ip:${input.ipAddress}` : `ip:${input.ipAddress}`;
  const attempts = await db.select().from(adminWebLoginAttempts).where(and(eq(adminWebLoginAttempts.eventType, input.eventType), eq(adminWebLoginAttempts.success, false), gte(adminWebLoginAttempts.createdAt, since)));
  const repeatedCount = attempts.filter((attempt: typeof adminWebLoginAttempts.$inferSelect) => input.eventType === "mfa_failed" ? attempt.userId === input.userId && attempt.ipAddress === input.ipAddress : attempt.ipAddress === input.ipAddress).length;
  if (repeatedCount < ALERT_THRESHOLD) return;
  const existing = (await db.select().from(adminWebSecurityAlerts).where(and(eq(adminWebSecurityAlerts.alertType, alertType), eq(adminWebSecurityAlerts.scopeKey, scopeKey))).limit(1))[0];
  if (existing && existing.lastDeliveredAt.getTime() > now.getTime() - ALERT_COOLDOWN_MS) return;
  const subject = input.eventType === "mfa_failed" ? "Khana KarLo Admin: repeated MFA failures" : "Khana KarLo Admin: repeated IP denials";
  const delivered = await deliverSecurityAlert(subject, `${repeatedCount} ${input.eventType.replace(/_/g, " ")} events were recorded within 15 minutes. Host: ${input.host}. Address: ${maskIp(input.ipAddress)}. Review the Admin security audit dashboard.`);
  if (!delivered) return;
  if (existing) await db.update(adminWebSecurityAlerts).set({ lastEventCount: repeatedCount, lastDeliveredAt: now }).where(eq(adminWebSecurityAlerts.id, existing.id));
  else await db.insert(adminWebSecurityAlerts).values({ alertType, scopeKey, lastEventCount: repeatedCount, lastDeliveredAt: now });
}

function isProductionCanonicalHostRequired() { return ENV.isProduction && Boolean(ENV.adminWebHost); }
function canonicalHostMatches(host: string) { return !isProductionCanonicalHostRequired() || host === ENV.adminWebHost.trim().toLowerCase(); }
function getMfaToken(req: Request) { return parseCookie(req.headers.cookie || "")[ADMIN_MFA_COOKIE] ?? null; }

export function getAdminWebConfiguration() { return { canonicalHost: ENV.adminWebHost.trim().toLowerCase(), canonicalHostConfigured: ENV.adminWebHost.trim().length > 0, enforcementMode: ENV.isProduction ? "production" : "preview" as const }; }

export async function getAdminSecurityStatus(userId: number, req: Request) {
  const { db, staffRole } = await ensureAdminUser(userId); const meta = requestMeta(req);
  await recordAttempt(userId, req, "oauth_authenticated", true);
  const [enrollment, activeRules] = await Promise.all([db.select().from(adminMfaEnrollments).where(eq(adminMfaEnrollments.userId, userId)).limit(1), db.select().from(adminIpAllowlist).where(eq(adminIpAllowlist.status, "active"))]);
  const sessionToken = getMfaToken(req); const session = sessionToken ? (await db.select().from(adminWebSessions).where(eq(adminWebSessions.tokenHash, hash(sessionToken))).limit(1))[0] : null;
  const sessionActive = Boolean(session && session.userId === userId && !session.revokedAt && session.expiresAt > new Date());
  return { staffRole, canonicalHost: getAdminWebConfiguration(), request: { host: meta.host, ipAddressMasked: maskIp(meta.ipAddress), hostAllowed: canonicalHostMatches(meta.host), ipAllowlistEnabled: activeRules.length > 0, ipAllowed: !activeRules.length || activeRules.some((rule) => cidrMatches(meta.ipAddress, rule.cidr)) }, mfa: { state: enrollment[0]?.status ?? "not_enrolled", sessionActive, expiresAt: sessionActive ? session!.expiresAt : null }, };
}

export async function beginAdminMfaEnrollment(userId: number, req: Request) {
  const { db } = await ensureAdminUser(userId); const secret = base32Encode(crypto.randomBytes(20)); const now = new Date();
  await db.insert(adminMfaEnrollments).values({ userId, secretCiphertext: encryptSecret(secret), status: "pending", createdAt: now, confirmedAt: null, disabledAt: null }).onDuplicateKeyUpdate({ set: { secretCiphertext: encryptSecret(secret), status: "pending", confirmedAt: null, disabledAt: null } });
  await recordAttempt(userId, req, "mfa_enrollment_started", true);
  return { secret, otpauthUri: `otpauth://totp/Khana%20KarLo%20Admin:${encodeURIComponent(String(userId))}?secret=${secret}&issuer=Khana%20KarLo%20Admin&algorithm=SHA1&digits=6&period=30` };
}

async function createMfaSession(userId: number, req: Request) {
  const db = await requireDb(); const meta = requestMeta(req); const token = randomSessionToken(); const now = new Date(); const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  await db.insert(adminWebSessions).values({ userId, tokenHash: hash(token), ipAddress: meta.ipAddress, host: meta.host, userAgent: meta.userAgent || null, mfaVerifiedAt: now, lastSeenAt: now, expiresAt, revokedAt: null, revokedByUserId: null, createdAt: now });
  return { token, expiresAt };
}

function recoveryHash(enrollmentId: number, code: string) { return hash(`${enrollmentId}:${code}`); }
export async function confirmAdminMfaEnrollment(userId: number, req: Request, code: string) {
  const { db } = await ensureAdminUser(userId); const enrollment = (await db.select().from(adminMfaEnrollments).where(eq(adminMfaEnrollments.userId, userId)).limit(1))[0];
  if (!enrollment || enrollment.status !== "pending" || !verifyTotp(decryptSecret(enrollment.secretCiphertext), code)) { await recordAttempt(userId, req, "mfa_failed", false, "Invalid enrollment confirmation code."); throw new AdminWebSecurityError("Invalid authenticator code."); }
  const recoveryCodes = Array.from({ length: 8 }, randomRecoveryCode); const now = new Date();
  await db.transaction(async (tx) => { await tx.update(adminMfaEnrollments).set({ status: "active", confirmedAt: now }).where(eq(adminMfaEnrollments.id, enrollment.id)); await tx.delete(adminMfaRecoveryCodes).where(eq(adminMfaRecoveryCodes.enrollmentId, enrollment.id)); await tx.insert(adminMfaRecoveryCodes).values(recoveryCodes.map((recoveryCode) => ({ enrollmentId: enrollment.id, codeHash: recoveryHash(enrollment.id, recoveryCode), usedAt: null, createdAt: now }))); });
  const session = await createMfaSession(userId, req); await recordAttempt(userId, req, "mfa_enrollment_confirmed", true); return { recoveryCodes, ...session };
}

export async function verifyAdminMfaChallenge(userId: number, req: Request, code: string) {
  const { db } = await ensureAdminUser(userId); const enrollment = (await db.select().from(adminMfaEnrollments).where(eq(adminMfaEnrollments.userId, userId)).limit(1))[0];
  if (!enrollment || enrollment.status !== "active") throw new AdminWebSecurityError("Enroll an authenticator application before signing in to the Admin console.");
  let recoveryUsed = false; let valid = false;
  if (/^\d{6}$/.test(code)) valid = verifyTotp(decryptSecret(enrollment.secretCiphertext), code); else { const recovery = (await db.select().from(adminMfaRecoveryCodes).where(and(eq(adminMfaRecoveryCodes.enrollmentId, enrollment.id), eq(adminMfaRecoveryCodes.codeHash, recoveryHash(enrollment.id, code)), isNull(adminMfaRecoveryCodes.usedAt))).limit(1))[0]; if (recovery) { valid = true; recoveryUsed = true; await db.update(adminMfaRecoveryCodes).set({ usedAt: new Date() }).where(eq(adminMfaRecoveryCodes.id, recovery.id)); } }
  if (!valid) { await recordAttempt(userId, req, "mfa_failed", false, "Invalid challenge code."); throw new AdminWebSecurityError("Invalid authenticator or recovery code."); }
  const session = await createMfaSession(userId, req); await recordAttempt(userId, req, recoveryUsed ? "recovery_code_used" : "mfa_succeeded", true); return session;
}

export function setAdminMfaCookie(res: Response, req: Request, token: string, expiresAt: Date) { const secure = req.protocol === "https" || String(req.headers["x-forwarded-proto"] ?? "").split(",").some((value) => value.trim() === "https"); res.cookie(ADMIN_MFA_COOKIE, token, { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: Math.max(1, expiresAt.getTime() - Date.now()) }); }
export function clearAdminMfaCookie(res: Response) { res.clearCookie(ADMIN_MFA_COOKIE, { httpOnly: true, sameSite: "strict", path: "/" }); }

export async function enforceAdminWebAccess(userId: number, req: Request) {
  const { db } = await ensureAdminUser(userId); const meta = requestMeta(req);
  if (!canonicalHostMatches(meta.host)) { await recordAttempt(userId, req, "host_denied", false, "Canonical Admin host required."); throw new AdminWebSecurityError("Use the dedicated Admin website to access internal operations."); }
  const rules = await db.select().from(adminIpAllowlist).where(eq(adminIpAllowlist.status, "active"));
  if (rules.length && !rules.some((rule) => cidrMatches(meta.ipAddress, rule.cidr))) { await recordAttempt(userId, req, "ip_denied", false, "Address is not allowlisted."); throw new AdminWebSecurityError("This network address is not authorized for the Admin console."); }
  const token = getMfaToken(req); if (!token) throw new AdminWebSecurityError("Complete multi-factor authentication to access the Admin console.");
  const session = (await db.select().from(adminWebSessions).where(eq(adminWebSessions.tokenHash, hash(token))).limit(1))[0];
  if (!session || session.userId !== userId || session.revokedAt || session.expiresAt <= new Date() || session.ipAddress !== meta.ipAddress || session.host !== meta.host) throw new AdminWebSecurityError("Your trusted Admin session is invalid or expired. Complete multi-factor authentication again.");
  await db.update(adminWebSessions).set({ lastSeenAt: new Date() }).where(eq(adminWebSessions.id, session.id));
}

export async function listAdminIpAllowlist(userId: number) { const { db, staffRole } = await ensureAdminUser(userId); if (staffRole !== "senior_operations") throw new AdminWebSecurityError("Only senior operators can manage network allowlisting."); return db.select().from(adminIpAllowlist).orderBy(desc(adminIpAllowlist.createdAt)); }
export async function createAdminIpAllowlistRule(userId: number, input: { cidr: string; label: string }) { const { db, staffRole } = await ensureAdminUser(userId); if (staffRole !== "senior_operations") throw new AdminWebSecurityError("Only senior operators can manage network allowlisting."); const result = await db.insert(adminIpAllowlist).values({ cidr: input.cidr, label: input.label, status: "active", createdByUserId: userId }); return { id: Number(result[0].insertId) }; }
export async function updateAdminIpAllowlistRule(userId: number, input: { ruleId: number; status: "active" | "disabled" }) { const { db, staffRole } = await ensureAdminUser(userId); if (staffRole !== "senior_operations") throw new AdminWebSecurityError("Only senior operators can manage network allowlisting."); await db.update(adminIpAllowlist).set({ status: input.status }).where(eq(adminIpAllowlist.id, input.ruleId)); return { id: input.ruleId, status: input.status }; }
export async function getAdminSessionAudit(userId: number, filters: { from?: string; to?: string; userId?: number; eventType?: LoginEvent } = {}) { const { db, staffRole } = await ensureAdminUser(userId); if (staffRole !== "senior_operations") throw new AdminWebSecurityError("Only senior operators can view session audit reports."); const sessionConditions = []; const attemptConditions = []; if (filters.from) { sessionConditions.push(gte(adminWebSessions.createdAt, new Date(filters.from))); attemptConditions.push(gte(adminWebLoginAttempts.createdAt, new Date(filters.from))); } if (filters.to) { sessionConditions.push(lte(adminWebSessions.createdAt, new Date(filters.to))); attemptConditions.push(lte(adminWebLoginAttempts.createdAt, new Date(filters.to))); } if (filters.userId) { sessionConditions.push(eq(adminWebSessions.userId, filters.userId)); attemptConditions.push(eq(adminWebLoginAttempts.userId, filters.userId)); } if (filters.eventType) attemptConditions.push(eq(adminWebLoginAttempts.eventType, filters.eventType)); const [sessions, attempts] = await Promise.all([db.select().from(adminWebSessions).where(sessionConditions.length ? and(...sessionConditions) : undefined).orderBy(desc(adminWebSessions.createdAt)).limit(100), db.select().from(adminWebLoginAttempts).where(attemptConditions.length ? and(...attemptConditions) : undefined).orderBy(desc(adminWebLoginAttempts.createdAt)).limit(200)]); const userIds = Array.from(new Set([...sessions.map((session) => session.userId), ...attempts.map((attempt) => attempt.userId).filter((id): id is number => typeof id === "number")])); const auditUsers = userIds.length ? await Promise.all(userIds.map(async (id) => (await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, id)).limit(1))[0])) : []; return { filters, users: auditUsers.filter(Boolean).map((user) => ({ id: user!.id, label: user!.name || user!.email || `Admin #${user!.id}` })), sessions: sessions.map((session) => ({ ...session, ipAddress: maskIp(session.ipAddress), tokenHash: undefined })), loginAttempts: attempts.map((attempt) => ({ ...attempt, ipAddress: maskIp(attempt.ipAddress), userAgent: attempt.userAgent ? attempt.userAgent.slice(0, 160) : null })), summary: { activeSessions: sessions.filter((session) => !session.revokedAt && session.expiresAt > new Date()).length, failedMfaAttempts: attempts.filter((attempt) => !attempt.success && attempt.eventType === "mfa_failed").length, deniedNetworks: attempts.filter((attempt) => attempt.eventType === "ip_denied").length } }; }
export async function revokeAdminWebSession(userId: number, sessionId: number) { const { db, staffRole } = await ensureAdminUser(userId); if (staffRole !== "senior_operations") throw new AdminWebSecurityError("Only senior operators can revoke Admin sessions."); await db.update(adminWebSessions).set({ revokedAt: new Date(), revokedByUserId: userId }).where(eq(adminWebSessions.id, sessionId)); return { id: sessionId }; }
