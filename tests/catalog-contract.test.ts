import { describe, expect, it } from "vitest";

import { filterDiscovery, fromMinorUnits, toMinorUnits } from "../shared/catalog";

const records = [
  { id: 1, businessType: "restaurant" as const, displayName: "Lahori Dera", city: "Islamabad", cuisine: "Pakistani", description: "Karahi", itemCount: 8, isOpen: true, deliveryLabel: "Restaurant delivery" },
  { id: 2, businessType: "cloud_kitchen" as const, displayName: "Central Kitchen", city: "Lahore", cuisine: "Burgers", description: "Two virtual brands", itemCount: 12, isOpen: true, deliveryLabel: "2 kitchen brands" },
];

describe("live catalogue contracts", () => {
  it("converts business-entered PKR values to safe integer minor units", () => {
    expect(toMinorUnits("950.50")).toBe(95050);
    expect(toMinorUnits("-10")).toBe(0);
    expect(fromMinorUnits(95050)).toBe("951");
  });

  it("filters approved discovery records by workspace type and customer query", () => {
    expect(filterDiscovery(records, "restaurant")).toHaveLength(1);
    expect(filterDiscovery(records, "all", "lahore")[0]?.id).toBe(2);
    expect(filterDiscovery(records, "cloud_kitchen", "pakistani")).toEqual([]);
  });
});
