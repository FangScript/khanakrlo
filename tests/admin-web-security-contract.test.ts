import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Admin web security contract", () => {
  it("persists encrypted MFA enrollments, hashed recovery codes, opaque trusted sessions, allowlist rules, and security attempts", () => {
    const schema = source("drizzle/schema.ts");
    expect(schema).toContain("adminMfaEnrollments");
    expect(schema).toContain("secretCiphertext");
    expect(schema).toContain("adminMfaRecoveryCodes");
    expect(schema).toContain("codeHash");
    expect(schema).toContain("adminWebSessions");
    expect(schema).toContain("tokenHash");
    expect(schema).toContain("adminIpAllowlist");
    expect(schema).toContain("adminWebLoginAttempts");
  });

  it("uses standard time-based OTP verification and never persists plaintext recovery codes or browser session tokens", () => {
    const security = source("server/admin-security.ts");
    expect(security).toContain('crypto.createHmac("sha1"');
    expect(security).toContain("verifyTotp");
    expect(security).toContain("aes-256-gcm");
    expect(security).toContain("recoveryHash");
    expect(security).toContain("tokenHash: hash(token)");
    expect(security).toContain("ADMIN_MFA_COOKIE");
  });

  it("enforces canonical host, optional default-deny allowlisting, and an IP-bound unexpired MFA session before all Admin operations", () => {
    const security = source("server/admin-security.ts");
    const trpc = source("server/_core/trpc.ts");
    const router = source("server/routers.ts");
    expect(security).toContain("canonicalHostMatches");
    expect(security).toContain("cidrMatches");
    expect(security).toContain("This network address is not authorized for the Admin console.");
    expect(security).toContain("session.ipAddress !== meta.ipAddress || session.host !== meta.host");
    expect(trpc).toContain("adminWebProcedure");
    expect(router).toContain("queue: adminWebProcedure");
    expect(router).toContain("sessionAudit: adminWebProcedure");
  });

  it("offers a web-only staff MFA gate and a privacy-safe session audit surface", () => {
    const gate = source("app/admin/_layout.tsx");
    const screen = source("app/admin/security.tsx");
    const security = source("server/admin-security.ts");
    expect(gate).toContain("Staff sign-in required");
    expect(gate).toContain("Set up multi-factor authentication");
    expect(gate).toContain("Verify and continue");
    expect(screen).toContain("Sessions & access audit");
    expect(screen).toContain("IP allowlist");
    expect(security).toContain("maskIp(session.ipAddress)");
    expect(security).toContain("tokenHash: undefined");
  });
});
