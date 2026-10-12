import { describe, expect, it } from "vitest";
import { canAcceptCashOrder, parseCustodyPolicy } from "./custody-policy.js";

describe("explicit cash custody policy", () => {
  it("does not silently select an unapproved policy", () => {
    expect(() => parseCustodyPolicy(undefined)).toThrow();
    expect(() => parseCustodyPolicy("commission")).toThrow();
  });
  it("current cash permits the crossing order but blocks further work at the ceiling", () => {
    expect(canAcceptCashOrder("current_cash", 9000, 0, 2000, 10000)).toBe(true);
    expect(canAcceptCashOrder("current_cash", 10000, 0, 2000, 10000)).toBe(false);
    expect(canAcceptCashOrder("current_cash", 11000, 0, 2000, 10000)).toBe(false);
  });
  it("projected cash includes outstanding assignments without treating them as held cash", () => {
    expect(canAcceptCashOrder("projected_cash", 5000, 3000, 2000, 10000)).toBe(true);
    expect(canAcceptCashOrder("projected_cash", 5000, 3000, 2001, 10000)).toBe(false);
  });
  it("rejects invalid money inputs", () => {
    for (const amount of [0, -1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(canAcceptCashOrder("current_cash", 0, 0, amount, 10000)).toBe(false);
  });
});
