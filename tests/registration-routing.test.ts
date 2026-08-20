import { describe, expect, it } from "vitest";

import { getPostGoogleRegistrationDestination, getPostOtpRegistrationDestination } from "../lib/registration-routing";

describe("customer registration routing", () => {
  it("continues from Google sign-in to phone registration", () => {
    expect(getPostGoogleRegistrationDestination()).toBe("/auth/phone");
  });

  it("continues from OTP verification to location setup with the encoded phone", () => {
    expect(getPostOtpRegistrationDestination("3012345678")).toBe("/auth/location?phone=3012345678");
  });
});
