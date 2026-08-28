import { describe, expect, it } from "vitest";

import { getPostContactRegistrationDestination, getPostGoogleRegistrationDestination, parseAuthReturnDestination } from "../lib/registration-routing";

describe("customer registration routing", () => {
  it("continues from Google sign-in to optional protected contact capture", () => {
    expect(getPostGoogleRegistrationDestination()).toBe("/auth/contact");
  });

  it("continues from contact capture to location setup with the encoded phone", () => {
    expect(getPostContactRegistrationDestination("3012345678")).toBe("/auth/location?phone=3012345678");
  });

  it("preserves the requested Business onboarding destination after Google sign-in and contact capture", () => {
    const returnTo = parseAuthReturnDestination("/business/onboarding");
    expect(returnTo).toBe("/business/onboarding");
    expect(getPostGoogleRegistrationDestination(returnTo)).toBe("/auth/contact?returnTo=%2Fbusiness%2Fonboarding");
    expect(getPostContactRegistrationDestination("3012345678", returnTo)).toBe("/auth/location?phone=3012345678&returnTo=%2Fbusiness%2Fonboarding");
    expect(parseAuthReturnDestination("/(tabs)")).toBeNull();
  });
});
