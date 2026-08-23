import { describe, expect, it } from "vitest";

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

describe("Admin web hostname configuration", () => {
  it("returns the configured canonical Admin host from the staff-only lightweight API endpoint", async () => {
    const user = { id: 7, openId: "admin-host-test", name: "Admin", email: "admin@example.com", loginMethod: "manus", role: "admin" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    const ctx = { user, req: { headers: {}, hostname: "admin-ops-7f3c9a.khanakarlo.pk" }, res: {} } as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    const result = await caller.adminSecurity.webConfiguration();
    expect(result.canonicalHostConfigured).toBe(true);
    expect(result.canonicalHost).toBe("admin-ops-7f3c9a.khanakarlo.pk");
  });
});
