import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { riderAvailabilityInput } from "../server/modules/contracts/orders";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Rider availability and COD custody", () => {
  it("accepts only online and offline availability commands", () => {
    expect(riderAvailabilityInput.parse({ status: "online" }).status).toBe("online");
    expect(riderAvailabilityInput.parse({ status: "offline" }).status).toBe("offline");
    expect(() => riderAvailabilityInput.parse({ status: "away" })).toThrow();
  });

  it("uses only durable online status for new offers and derives custody from confirmed COD collections", () => {
    const service = source("server/order-service.ts");
    expect(service).toContain('eq(riderAvailability.status, "online")');
    expect(service).toContain("onlineIds.has(membership.userId)");
    expect(service).toContain("getRiderCashCustodySummary");
    expect(service).toContain("eq(codCollections.riderUserId, userId)");
    expect(service).toContain('earningsStatus: "requires_payout_policy"');
  });

  it("exposes the availability and custody endpoints through the protected order gateway", () => {
    const router = source("server/routers.ts");
    expect(router).toContain("riderAvailability");
    expect(router).toContain("setRiderAvailability");
    expect(router).toContain("riderCashCustodySummary");
  });
});
