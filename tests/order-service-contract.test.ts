import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { catalogueItemImageUploadInput } from "../server/modules/contracts/business";
import { orderPlaceInput, orderQuoteInput, orderTransitionInput } from "../server/modules/contracts/orders";
import { canTransitionOrder } from "../shared/order";

const deliveryAddress = { recipientName: "Ayesha Khan", phoneE164: "+923001234567", addressLine1: "F-10 Markaz", city: "Islamabad" };

describe("persisted Order Service contracts", () => {
  it("accepts identifier-only checkout input and rejects untrusted client totals or invalid phone data", () => {
    const quote = orderQuoteInput.parse({ items: [{ menuItemId: 8, quantity: 2, modifierIds: [4] }], deliveryAddress, paymentMethod: "cod" });
    expect(quote.items[0]).toEqual({ menuItemId: 8, quantity: 2, modifierIds: [4] });
    expect(() => orderQuoteInput.parse({ items: [{ menuItemId: 8, quantity: 2, modifierIds: [], totalMinor: 1 }], deliveryAddress })).toThrow();
    expect(() => orderQuoteInput.parse({ items: [{ menuItemId: 8, quantity: 0, modifierIds: [] }], deliveryAddress })).toThrow();
    expect(() => orderQuoteInput.parse({ items: [{ menuItemId: 8, quantity: 1, modifierIds: [] }], deliveryAddress: { ...deliveryAddress, phoneE164: "03001234567" } })).toThrow();
  });

  it("requires a durable idempotency key before a persisted order can be created", () => {
    expect(orderPlaceInput.parse({ items: [{ menuItemId: 8, quantity: 1, modifierIds: [] }], deliveryAddress, paymentMethod: "cod", idempotencyKey: "customer-checkout-0001" }).idempotencyKey).toBe("customer-checkout-0001");
    expect(() => orderPlaceInput.parse({ items: [{ menuItemId: 8, quantity: 1, modifierIds: [] }], deliveryAddress, idempotencyKey: "short" })).toThrow();
  });

  it("enforces the order status transition policy", () => {
    expect(canTransitionOrder("placed", "accepted")).toBe(true);
    expect(canTransitionOrder("accepted", "preparing")).toBe(true);
    expect(canTransitionOrder("preparing", "delivered")).toBe(false);
    expect(canTransitionOrder("delivered", "cancelled")).toBe(false);
    expect(orderTransitionInput.parse({ orderId: 12, toStatus: "ready_for_pickup" })).toEqual({ orderId: 12, toStatus: "ready_for_pickup" });
  });

  it("allows only bounded JPEG, PNG, or WebP dish image payload declarations", () => {
    expect(catalogueItemImageUploadInput.parse({ menuItemId: 6, mimeType: "image/webp", dataBase64: "YWJj" })).toEqual({ menuItemId: 6, mimeType: "image/webp", dataBase64: "YWJj" });
    expect(() => catalogueItemImageUploadInput.parse({ menuItemId: 6, mimeType: "image/gif", dataBase64: "YWJj" })).toThrow();
    expect(() => catalogueItemImageUploadInput.parse({ menuItemId: 0, mimeType: "image/jpeg", dataBase64: "YWJj" })).toThrow();
  });

  it("routes customer menus and Restaurant operations through persisted server data rather than local sample orders", () => {
    const customerMenu = readFileSync(resolve(process.cwd(), "app/restaurant/[id].tsx"), "utf8");
    const checkout = readFileSync(resolve(process.cwd(), "app/checkout.tsx"), "utf8");
    const merchantQueue = readFileSync(resolve(process.cwd(), "app/merchant/orders.tsx"), "utf8");
    expect(customerMenu).toContain("liveBusinessMenu");
    expect(customerMenu).toContain("ExpoImage");
    expect(checkout).toContain("orders.quote");
    expect(checkout).toContain("orders.place");
    expect(checkout).not.toContain("placeOrder(");
    expect(merchantQueue).toContain("orders.businessQueue");
    expect(merchantQueue).toContain("orders.transition");
  });
});
