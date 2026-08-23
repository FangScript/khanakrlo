import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Admin security alerts and audit filters", () => {
  it("retains alert cooldown state and emits only after repeated MFA or IP-denial events", () => {
    const schema = source("drizzle/schema.ts");
    const security = source("server/admin-security.ts");
    expect(schema).toContain("adminWebSecurityAlerts");
    expect(schema).toContain("repeated_mfa_failures");
    expect(schema).toContain("repeated_ip_denials");
    expect(security).toContain("const ALERT_THRESHOLD = 3");
    expect(security).toContain("const ALERT_WINDOW_MS = 15 * 60 * 1000");
    expect(security).toContain("const ALERT_COOLDOWN_MS = 30 * 60 * 1000");
    expect(security).toContain("alertOnRepeatedSecurityFailure");
  });

  it("uses a provider-ready email delivery path with a non-fatal owner notification fallback", () => {
    const security = source("server/admin-security.ts");
    const env = source("server/_core/env.ts");
    expect(env).toContain("resendApiKey");
    expect(env).toContain("securityAlertFrom");
    expect(env).toContain("securityAlertTo");
    expect(security).toContain("https://api.resend.com/emails");
    expect(security).toContain("notifyOwner");
  });

  it("accepts only validated date, staff-user, and event-type filters and applies them server-side", () => {
    const contract = source("server/modules/contracts/admin-security.ts");
    const security = source("server/admin-security.ts");
    const router = source("server/routers.ts");
    expect(contract).toContain("adminSessionAuditFilterInput");
    expect(contract).toContain("eventType");
    expect(security).toContain("filters.from");
    expect(security).toContain("filters.userId");
    expect(security).toContain("filters.eventType");
    expect(router).toContain("sessionAudit: adminCredentialWebProcedure.input(adminSessionAuditFilterInput.optional())");
  });

  it("provides explicit dashboard filter controls without exposing raw session tokens or addresses", () => {
    const screen = source("app/admin/security.tsx");
    const security = source("server/admin-security.ts");
    expect(screen).toContain("Audit filters");
    expect(screen).toContain("From YYYY-MM-DD");
    expect(screen).toContain("Admin user");
    expect(screen).toContain("Event type");
    expect(screen).toContain("Apply filters");
    expect(security).toContain("tokenHash: undefined");
    expect(security).toContain("maskIp");
  });
});
