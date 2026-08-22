import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Pakistan phone-entry layout", () => {
  it("groups the +92 selector, label, number input, and helper as one phone field", () => {
    const welcome = readFileSync(resolve(process.cwd(), "app/auth/welcome.tsx"), "utf8");
    const styles = readFileSync(resolve(process.cwd(), "components/onboarding-ui.tsx"), "utf8");
    expect(welcome).toContain("onboardingStyles.phoneField");
    expect(welcome).toContain("onboardingStyles.phoneLabel");
    expect(welcome).toContain("onboardingStyles.phoneHelper");
    expect(welcome).not.toContain("AuthInput");
    expect(styles).toContain('phoneRow: { flexDirection: "row", gap: 8, alignItems: "center" }');
    expect(styles).toContain('countryCode: { height: 54, width: 70');
  });
});
