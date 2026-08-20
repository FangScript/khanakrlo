import { describe, expect, it } from "vitest";

import { getMerchantPrimaryAction, isMerchantStatusTransitionAllowed } from "../lib/merchant-order-workflow";

describe("merchant order workflow", () => {
  it("permits the operational fulfilment sequence", () => {
    expect(isMerchantStatusTransitionAllowed("new", "preparing")).toBe(true);
    expect(isMerchantStatusTransitionAllowed("preparing", "ready")).toBe(true);
    expect(isMerchantStatusTransitionAllowed("ready", "outForDelivery")).toBe(true);
  });

  it("permits rejecting only a new incoming order", () => {
    expect(isMerchantStatusTransitionAllowed("new", "rejected")).toBe(true);
    expect(isMerchantStatusTransitionAllowed("preparing", "rejected")).toBe(false);
  });

  it("exposes the correct next primary action for each active stage", () => {
    expect(getMerchantPrimaryAction("new")?.nextStatus).toBe("preparing");
    expect(getMerchantPrimaryAction("preparing")?.nextStatus).toBe("ready");
    expect(getMerchantPrimaryAction("outForDelivery")).toBeNull();
  });
});
