import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Business signup routing", () => {
  it("establishes a preview phone session before continuing from OTP", () => {
    const verify = source("app/auth/verify.tsx");
    const route = source("server/_core/previewPhoneAuth.ts");
    expect(verify).toContain("await establishPreviewPhoneSession(phone)");
    expect(verify).toContain("getPostOtpRegistrationDestination(phone, returnTo)");
    expect(route).toContain("/api/auth/preview-phone-session");
  });

  it("returns from phone authentication to Business onboarding rather than Customer Home", () => {
    const onboarding = source("app/business/onboarding.tsx");
    const location = source("app/auth/location.tsx");
    const workspaces = source("app/account/workspaces.tsx");
    expect(onboarding).toContain("/auth/login?returnTo=%2Fbusiness%2Fonboarding");
    expect(location).toContain("router.replace((returnTo ?? \"/(tabs)\") as never)");
    expect(workspaces).toContain("router.push(\"/business/onboarding\" as never)");
  });
});
