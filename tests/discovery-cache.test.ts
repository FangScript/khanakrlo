import { describe, expect, it } from "vitest";

import { getCachedDiscovery, type DiscoveryCache } from "../lib/discovery-cache";

const cache: DiscoveryCache = { savedAt: 1, byFilter: { all: [
  { id: 1, businessType: "restaurant", displayName: "Lahori Dera", city: "Islamabad", cuisine: "Pakistani", description: null, itemCount: 6, isOpen: true, deliveryLabel: "Restaurant delivery" },
  { id: 2, businessType: "cloud_kitchen", displayName: "Central Kitchen", city: "Rawalpindi", cuisine: "Burgers", description: null, itemCount: 8, isOpen: true, deliveryLabel: "2 kitchen brands" },
] } };

describe("discovery cache", () => {
  it("filters a complete cached discovery list when a filtered cache has not been saved", () => {
    expect(getCachedDiscovery(cache, "restaurant").map((business) => business.id)).toEqual([1]);
    expect(getCachedDiscovery(cache, "cloud_kitchen").map((business) => business.id)).toEqual([2]);
  });

  it("returns a directly cached filter when it exists", () => {
    const filtered: DiscoveryCache = { ...cache, byFilter: { ...cache.byFilter, restaurant: [] } };
    expect(getCachedDiscovery(filtered, "restaurant")).toEqual([]);
  });
});
