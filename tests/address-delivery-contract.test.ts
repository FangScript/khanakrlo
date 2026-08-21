import { describe, expect, it } from "vitest";

import { customerAddressCreateInput } from "../server/modules/contracts/addresses";
import { orderQuoteInput } from "../server/modules/contracts/orders";
import { deliveryZoneUpdateInput } from "../server/modules/contracts/business";
import { distanceMeters, estimateCourierMinutes } from "../shared/delivery";

describe("customer address and delivery estimate contracts", () => {
  it("calculates a deterministic zero-distance and configured courier estimate", () => {
    expect(distanceMeters({ latitudeE6: 33_684_400, longitudeE6: 73_047_900 }, { latitudeE6: 33_684_400, longitudeE6: 73_047_900 })).toBe(0);
    expect(estimateCourierMinutes(4_200, 8, 3)).toBe(21);
  });

  it("accepts a bounded, device-geocoded Pakistan address", () => {
    const parsed = customerAddressCreateInput.parse({ label: "Home", recipientName: "Ayesha Khan", phoneE164: "+923001234567", addressLine1: "House 12, Street 8", city: "Islamabad", latitudeE6: 33_684_400, longitudeE6: 73_047_900, geocodeSource: "device", makeDefault: true });
    expect(parsed.latitudeE6).toBe(33_684_400);
    expect(parsed.makeDefault).toBe(true);
  });

  it("rejects invalid coordinates and raw address data in a server quote", () => {
    expect(() => customerAddressCreateInput.parse({ label: "Home", recipientName: "Ayesha", phoneE164: "+923001234567", addressLine1: "House 12", city: "Islamabad", latitudeE6: 100_000_000, longitudeE6: 73_000_000 })).toThrow();
    expect(() => orderQuoteInput.parse({ items: [{ menuItemId: 3, quantity: 1 }], deliveryAddress: { city: "Islamabad" }, paymentMethod: "cod" })).toThrow();
  });

  it("requires a non-trivial Business delivery radius and bounded timing controls", () => {
    expect(deliveryZoneUpdateInput.parse({ name: "Islamabad core", centerLatitudeE6: 33_684_400, centerLongitudeE6: 73_047_900, radiusMeters: 5_000, courierBaseMinutes: 8, courierMinutesPerKm: 3 }).radiusMeters).toBe(5_000);
    expect(() => deliveryZoneUpdateInput.parse({ name: "Too small", centerLatitudeE6: 0, centerLongitudeE6: 0, radiusMeters: 10, courierBaseMinutes: 8, courierMinutesPerKm: 3 })).toThrow();
  });
});
