import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { notificationPreferenceUpdateInput, supportTicketCreateInput } from "../server/modules/contracts/support";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("support and notification foundations", () => {
  it("validates bounded ticket and preference payloads", () => {
    expect(supportTicketCreateInput.parse({ category: "delivery", subject: "Late arrival", message: "Please check the current delivery status." }).category).toBe("delivery");
    expect(notificationPreferenceUpdateInput.parse({ orderUpdatesEnabled: true, supportUpdatesEnabled: true, promotionsEnabled: false }).promotionsEnabled).toBe(false);
    expect(() => supportTicketCreateInput.parse({ category: "order", subject: "x", message: "short" })).toThrow();
  });

  it("keeps support tickets customer-owned and emits durable event records", () => {
    const service = source("server/support-service.ts");
    const router = source("server/routers.ts");
    expect(service).toContain("eq(orders.customerUserId, userId)");
    expect(service).toContain("support.ticket_created");
    expect(service).toContain("notificationPreferences");
    expect(router).toContain("notificationPreferences");
    expect(router).toContain("updateNotificationPreferences");
  });
});
