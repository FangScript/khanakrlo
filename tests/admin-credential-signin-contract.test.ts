import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Admin credential sign-in", () => {
  it("stores only salted password hashes and keeps credential sessions separate from MFA sessions", () => {
    const schema = source("drizzle/schema.ts");
    const service = source("server/admin-credentials.ts");
    expect(schema).toContain("adminStaffCredentials");
    expect(schema).toContain("passwordHash");
    expect(schema).toContain("adminCredentialSessions");
    expect(service).toContain("crypto.scryptSync");
    expect(service).toContain("ADMIN_CREDENTIAL_COOKIE");
    expect(service).toContain("const CREDENTIAL_SESSION_MS = 15 * 60 * 1000");
  });

  it("persists credential login attempts and enforces a bounded failed-login rate limit", () => {
    const schema = source("drizzle/schema.ts");
    const service = source("server/admin-credentials.ts");
    expect(schema).toContain("adminCredentialLoginAttempts");
    expect(service).toContain("const MAX_FAILED_ATTEMPTS = 5");
    expect(service).toContain("const ATTEMPT_WINDOW_MS = 15 * 60 * 1000");
    expect(service).toContain("Too many failed sign-in attempts");
  });

  it("requires a credential session before MFA and then requires the existing Admin web-MFA guard for operations", () => {
    const trpc = source("server/_core/trpc.ts");
    const router = source("server/routers.ts");
    expect(trpc).toContain("adminCredentialProcedure");
    expect(trpc).toContain("adminCredentialWebProcedure");
    expect(router).toContain("adminCredential: router");
    expect(router).toContain("signIn: publicProcedure.input(adminCredentialSignInInput)");
    expect(router).toContain("queue: adminCredentialWebProcedure");
    expect(router).toContain("beginMfaEnrollment: adminCredentialProcedure");
  });

  it("provides a web username-password form and senior-only credential provisioning without rendering password values", () => {
    const gate = source("app/admin/_layout.tsx");
    const staff = source("app/admin/staff.tsx");
    expect(gate).toContain("Admin staff sign-in");
    expect(gate).toContain("trpc.adminCredential.signIn");
    expect(staff).toContain("trpc.adminCredential.provision");
    expect(staff).toContain("Passwords are never shown");
  });
});
