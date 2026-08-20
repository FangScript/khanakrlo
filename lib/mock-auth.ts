import type { User } from "@/lib/_core/auth";

export const MOCK_GOOGLE_LOGIN_METHOD = "mock-google-preview";

export function createMockGoogleUser(): User {
  return {
    id: -1,
    openId: "khana-karlo-preview-user",
    name: "Ayesha Khan",
    email: "ayesha.preview@khanakarlo.test",
    loginMethod: MOCK_GOOGLE_LOGIN_METHOD,
    lastSignedIn: new Date(),
  };
}

export function isMockGoogleUser(user: User | null) {
  return user?.loginMethod === MOCK_GOOGLE_LOGIN_METHOD;
}
