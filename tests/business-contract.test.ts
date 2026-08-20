import { describe, expect, it } from "vitest";

import { requiredChecklistForBusinessType, validateBusinessApplicationDraft } from "../shared/business";

const restaurant = {
  legalName: "Khana KarLo Foods", displayName: "Lahori Dera", supportPhone: "+923001234567", city: "Islamabad", addressLine1: "F-7 Markaz", prepTimeMinutes: 25, openingTime: "09:00", closingTime: "23:00", serviceZone: { name: "F-7 core", deliveryFeeMinor: 10000, minimumOrderMinor: 50000 }, menu: [{ category: "Mains", items: [{ name: "Chicken Karahi", priceMinor: 95000, prepTimeMinutes: 25 }] }], businessType: "restaurant" as const, restaurant: { cuisine: "Pakistani" },
};

describe("Business onboarding production contract", () => {
  it("validates a complete Restaurant application and its required documents", () => {
    expect(validateBusinessApplicationDraft(restaurant)).toEqual([]);
    expect(requiredChecklistForBusinessType("restaurant")).toEqual(["owner_identity", "business_registration", "payout_evidence", "outlet_evidence", "menu_evidence"]);
  });

  it("requires Cloud Kitchen brands and production stations", () => {
    const invalidKitchen = { ...restaurant, businessType: "cloud_kitchen" as const, restaurant: undefined, cloudKitchen: { kitchenName: "Central Kitchen", capacityLimit: 0, brands: [], stations: [] } };
    expect(validateBusinessApplicationDraft(invalidKitchen)).toContain("At least one Cloud Kitchen brand is required.");
    expect(validateBusinessApplicationDraft(invalidKitchen)).toContain("At least one production station is required.");
  });

  it("rejects a malformed delivery setup before it can be submitted", () => {
    expect(validateBusinessApplicationDraft({ ...restaurant, supportPhone: "03001234567", serviceZone: { name: "", deliveryFeeMinor: -1, minimumOrderMinor: -1 }, menu: [] })).toContain("A valid international support phone is required.");
  });
});
