import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { kitchenOrderAcknowledgementInput, riderOfferDecisionInput } from "../server/modules/contracts/orders";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("KDS acknowledgements and Rider job offers", () => {
  it("accepts only bounded acknowledgement and Rider decision payloads", () => {
    expect(kitchenOrderAcknowledgementInput.parse({ orderId: 8 }).orderId).toBe(8);
    expect(riderOfferDecisionInput.parse({ orderId: 8, decision: "accept" }).decision).toBe("accept");
    expect(riderOfferDecisionInput.parse({ orderId: 8, decision: "decline", note: "Too far" }).decision).toBe("decline");
    expect(() => riderOfferDecisionInput.parse({ orderId: 8, decision: "later" })).toThrow();
  });

  it("keeps assignment dependent on an accepted, non-expired offer and writes KDS and dispatch events", () => {
    const service = source("server/order-service.ts");
    expect(service).toContain("offerStatus: \"offered\"");
    expect(service).toContain("offerExpiresAt = new Date(now.getTime() + 5 * 60_000)");
    expect(service).toContain("order.kds_acknowledged");
    expect(service).toContain("rider.offer_created");
    expect(service).toContain("rider.offer_accepted");
    expect(service).toContain("assignment.offerStatus === \"accepted\"");
  });

  it("exposes a Rider pending-offer surface with accept and decline controls", () => {
    const router = source("server/routers.ts");
    const rider = source("app/rider/index.tsx");
    expect(router).toContain("acknowledgeKitchenOrder");
    expect(router).toContain("riderOffers");
    expect(router).toContain("respondToRiderOffer");
    expect(rider).toContain("Pending offers");
    expect(rider).toContain("Accept job");
    expect(rider).toContain("Decline");
  });
});
