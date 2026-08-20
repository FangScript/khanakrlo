import { describe, expect, it } from "vitest";

import { formatPKR, getCartItemCount, getCartSubtotal } from "../lib/cart-pricing";

describe("Khana KarLo cart pricing", () => {
  const cart = [
    { quantity: 2, unitPrice: 520, addOns: [{ price: 90 }, { price: 140 }] },
    { quantity: 1, unitPrice: 760, addOns: [] },
  ];

  it("includes selected add-ons for every quantity in the subtotal", () => {
    expect(getCartSubtotal(cart)).toBe(2260);
  });

  it("sums all food quantities for the compact cart indicator", () => {
    expect(getCartItemCount(cart)).toBe(3);
  });

  it("formats Pakistani rupee totals consistently", () => {
    expect(formatPKR(2260)).toBe("Rs. 2,260");
  });
});
