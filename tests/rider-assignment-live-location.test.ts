import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { riderAssignmentInput, riderLocationUpdateInput, riderOrderTransitionInput } from "../server/modules/contracts/orders";
import { canTransitionOrder } from "../shared/order";

describe("Rider assignment and foreground live location", () => {
  it("requires positive assignment identities and only allows active-delivery Rider transitions", () => {
    expect(riderAssignmentInput.parse({ orderId: 17, riderUserId: 9 })).toEqual({ orderId: 17, riderUserId: 9 });
    expect(() => riderAssignmentInput.parse({ orderId: 0, riderUserId: 9 })).toThrow();
    expect(riderOrderTransitionInput.parse({ orderId: 17, toStatus: "picked_up" }).toStatus).toBe("picked_up");
    expect(() => riderOrderTransitionInput.parse({ orderId: 17, toStatus: "assigned" })).toThrow();
    expect(canTransitionOrder("ready_for_pickup", "assigned")).toBe(true);
    expect(canTransitionOrder("assigned", "picked_up")).toBe(true);
  });

  it("bounds location coordinates and accuracy before a Rider update reaches storage", () => {
    expect(riderLocationUpdateInput.parse({ orderId: 17, latitudeE6: 33_684_400, longitudeE6: 73_047_900, accuracyMeters: 18 }).accuracyMeters).toBe(18);
    expect(() => riderLocationUpdateInput.parse({ orderId: 17, latitudeE6: 91_000_000, longitudeE6: 73_047_900 })).toThrow();
    expect(() => riderLocationUpdateInput.parse({ orderId: 17, latitudeE6: 33_684_400, longitudeE6: 73_047_900, accuracyMeters: 10_001 })).toThrow();
  });

  it("uses protected persisted APIs for Restaurant dispatch, Rider updates, and customer freshness display", () => {
    const restaurant = readFileSync(resolve(process.cwd(), "app/merchant/orders.tsx"), "utf8");
    const rider = readFileSync(resolve(process.cwd(), "app/rider/delivery/[id].tsx"), "utf8");
    const customer = readFileSync(resolve(process.cwd(), "app/order-tracking.tsx"), "utf8");
    expect(restaurant).toContain("orders.assignRider");
    expect(restaurant).toContain("orders.availableRiders");
    expect(rider).toContain("orders.riderTransition");
    expect(rider).toContain("orders.updateRiderLocation");
    expect(rider).toContain("watchPositionAsync");
    expect(rider).not.toContain("useRiderStore");
    expect(customer).toContain("freshnessSeconds");
    expect(customer).toContain("View live Rider location");
  });
});
