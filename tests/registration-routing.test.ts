import { describe, expect, it } from "vitest";

import { getPhoneVerificationDestination, getPostGoogleRegistrationDestination, getPostOtpRegistrationDestination, parseAuthReturnDestination } from "../lib/registration-routing";

describe("customer registration routing", () => {
  it("continues from Google sign-in to phone registration", () => {
    expect(getPostGoogleRegistrationDestination()).toBe("/auth/phone");
  });

  it("continues from OTP verification to location setup with the encoded phone", () => {
    expect(getPostOtpRegistrationDestination("3012345678")).toBe("/auth/location?phone=3012345678");
  });

  it("preserves the requested Business onboarding destination through phone verification and location completion", () => {
    const returnTo = parseAuthReturnDestination("/business/onboarding");
    expect(returnTo).toBe("/business/onboarding");
    expect(getPhoneVerificationDestination("3012345678", returnTo)).toBe("/auth/verify?phone=3012345678&returnTo=%2Fbusiness%2Fonboarding");
    expect(getPostOtpRegistrationDestination("3012345678", returnTo)).toBe("/auth/location?phone=3012345678&returnTo=%2Fbusiness%2Fonboarding");
    expect(parseAuthReturnDestination("/(tabs)")).toBeNull();
  });
});
