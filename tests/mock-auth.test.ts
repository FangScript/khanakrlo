import { describe, expect, it } from "vitest";

import { createMockGoogleUser, isMockGoogleUser, MOCK_GOOGLE_LOGIN_METHOD } from "../lib/mock-auth";

describe("preview mock Google sign-in", () => {
  it("creates a clearly marked local preview identity", () => {
    const user = createMockGoogleUser();
    expect(user.loginMethod).toBe(MOCK_GOOGLE_LOGIN_METHOD);
    expect(isMockGoogleUser(user)).toBe(true);
    expect(isMockGoogleUser(null)).toBe(false);
  });
});
