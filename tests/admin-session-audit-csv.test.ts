import { describe, expect, it } from "vitest";

import { buildAdminSessionAuditCsv } from "../lib/admin-session-audit-csv";

describe("Admin session-audit CSV export", () => {
  it("exports only supplied filtered, privacy-safe session and attempt fields", () => {
    const csv = buildAdminSessionAuditCsv({
      filters: { userId: 17, eventType: "mfa_failed" },
      sessions: [{ id: 2, userId: 17, ipAddress: "203.0.113.×", host: "admin.example.test", createdAt: "2026-08-23T10:00:00.000Z", expiresAt: "2026-08-23T18:00:00.000Z", revokedAt: null }],
      loginAttempts: [{ id: 4, userId: 17, eventType: "mfa_failed", success: false, ipAddress: "203.0.113.×", host: "admin.example.test", reason: "Invalid \"MFA\" code", createdAt: "2026-08-23T10:05:00.000Z" }],
    });
    expect(csv).toContain('"trusted_session"');
    expect(csv).toContain('"mfa_failed"');
    expect(csv).toContain('"Invalid ""MFA"" code"');
    expect(csv).toContain('"203.0.113.×"');
    expect(csv).not.toContain("tokenHash");
    expect(csv).not.toContain("kk_admin_mfa");
  });
});
