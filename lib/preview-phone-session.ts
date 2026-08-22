import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

type PreviewPhoneSessionResponse = {
  app_session_id: string;
  user: { id: number; openId: string; name: string | null; email: string | null; loginMethod: string | null; lastSignedIn: string };
};

/** Establishes the existing preview-only phone session used while real SMS OTP is deferred. */
export async function establishPreviewPhoneSession(phone: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/preview-phone-session`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const payload = await response.json() as PreviewPhoneSessionResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Could not complete phone verification.");
  await Auth.setSessionToken(payload.app_session_id);
  await Auth.setUserInfo({ ...payload.user, lastSignedIn: new Date(payload.user.lastSignedIn) });
  return payload.user;
}
