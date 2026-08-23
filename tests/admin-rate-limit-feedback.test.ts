import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { formatAdminRetryCountdown } from "../lib/admin-rate-limit";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Admin credential rate-limit feedback", () => {
  it("formats server-derived countdowns predictably for staff", () => {
    expect(formatAdminRetryCountdown(0)).toBe("00:00");
    expect(formatAdminRetryCountdown(9)).toBe("00:09");
    expect(formatAdminRetryCountdown(61)).toBe("01:01");
    expect(formatAdminRetryCountdown(901)).toBe("15:01");
  });

  it("returns a safe retry duration instead of allowing another credential attempt", () => {
    const service = source("server/admin-credentials.ts");
    expect(service).toContain("rateLimited: true as const");
    expect(service).toContain("retryAfterSeconds");
    expect(service).toContain("firstFailureAt.getTime() + ATTEMPT_WINDOW_MS");
  });

  it("shows live retry guidance and disables sign-in inputs while the server window remains active", () => {
    const gate = source("app/admin/_layout.tsx");
    expect(gate).toContain("Sign-in temporarily paused");
    expect(gate).toContain("Too many attempts. Try again in");
    expect(gate).toContain("formatAdminRetryCountdown(retrySeconds)");
    expect(gate).toContain("editable={!retrySeconds}");
    expect(gate).toContain("Try again in ${formatAdminRetryCountdown(retrySeconds)}");
  });
});
