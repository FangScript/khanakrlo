import { describe, expect, it } from "vitest";

import { getCustomerLaunchDestination } from "../lib/launch-routing";

describe("launch routing", () => {
  it("routes a new diner from splash to Google-first sign-in", () => {
    expect(getCustomerLaunchDestination(false)).toBe("/auth/login");
  });

  it("routes a returning diner from splash to the customer home tabs", () => {
    expect(getCustomerLaunchDestination(true)).toBe("/(tabs)");
  });
});
