import { describe, expect, it } from "vitest";

import { formatDeliveryAddress, isValidPakistaniMobile, normalizePakistaniMobile } from "../lib/customer-onboarding";

describe("customer onboarding helpers", () => {
  it("normalizes a Pakistan mobile number entered with punctuation or a country code", () => {
    expect(normalizePakistaniMobile("+92 301-234-5678")).toBe("3012345678");
  });

  it("accepts only an 03xx-style local mobile number after normalization", () => {
    expect(isValidPakistaniMobile("3012345678")).toBe(true);
    expect(isValidPakistaniMobile("2012345678")).toBe(false);
    expect(isValidPakistaniMobile("301234567")).toBe(false);
  });

  it("adds the launch city to a delivery area without duplicating it", () => {
    expect(formatDeliveryAddress("  F-10   Markaz ")).toBe("F-10 Markaz, Islamabad");
    expect(formatDeliveryAddress("F-10 Markaz, Islamabad")).toBe("F-10 Markaz, Islamabad");
  });
});
