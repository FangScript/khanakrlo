import { describe, expect, it } from "vitest";

import { getNextRiderStatus, isRiderStatusTransitionAllowed } from "../lib/rider-delivery-workflow";

describe("rider delivery workflow", () => {
  it("allows the rider delivery sequence from offer through delivery", () => {
    expect(isRiderStatusTransitionAllowed("offered", "accepted")).toBe(true);
    expect(isRiderStatusTransitionAllowed("accepted", "atPickup")).toBe(true);
    expect(isRiderStatusTransitionAllowed("atPickup", "pickedUp")).toBe(true);
    expect(isRiderStatusTransitionAllowed("pickedUp", "delivered")).toBe(true);
  });

  it("allows declining only an offered delivery and blocks skipped states", () => {
    expect(isRiderStatusTransitionAllowed("offered", "declined")).toBe(true);
    expect(isRiderStatusTransitionAllowed("accepted", "declined")).toBe(false);
    expect(isRiderStatusTransitionAllowed("offered", "pickedUp")).toBe(false);
    expect(isRiderStatusTransitionAllowed("delivered", "accepted")).toBe(false);
  });

  it("returns the correct primary progression for active delivery states", () => {
    expect(getNextRiderStatus("offered")).toBe("accepted");
    expect(getNextRiderStatus("atPickup")).toBe("pickedUp");
    expect(getNextRiderStatus("delivered")).toBeNull();
  });
});
