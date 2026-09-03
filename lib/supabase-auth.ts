import * as Linking from "expo-linking";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

if (Platform.OS === "web" && typeof window !== "undefined") {
  WebBrowser.maybeCompleteAuthSession();
}

export type GoogleSignInResult = "authenticated" | "redirecting" | "cancelled";

export function getRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: "khanakarlo",
    path: "auth/supabase-callback",
  });
}

function requireSupabase() {
  if (!supabase) throw new Error("Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env");
  return supabase;
}

export async function consumeSupabaseCallback(urlOrCode: string) {
  const sb = requireSupabase();

  // If already authenticated, no need to re-exchange
  const { data: existingSession } = await sb.auth.getSession();
  if (existingSession?.session) return;

  let code: string | null = null;
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let providerError: string | null = null;

  if (urlOrCode.includes("?") || urlOrCode.includes("#") || urlOrCode.includes("://")) {
    const normalized = urlOrCode.replace(/^[a-zA-Z0-9+.-]+:\/\//, "https://khana.auth/");
    try {
      const parsed = new URL(normalized);
      providerError = parsed.searchParams.get("error_description") ?? parsed.searchParams.get("error");
      code = parsed.searchParams.get("code");
      const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
      accessToken = hashParams.get("access_token");
      refreshToken = hashParams.get("refresh_token");
    } catch {
      const codeMatch = urlOrCode.match(/[?&]code=([^&#]+)/);
      if (codeMatch) code = decodeURIComponent(codeMatch[1]);
      const tokenMatch = urlOrCode.match(/[#&]access_token=([^&#]+)/);
      if (tokenMatch) accessToken = decodeURIComponent(tokenMatch[1]);
      const refreshMatch = urlOrCode.match(/[#&]refresh_token=([^&#]+)/);
      if (refreshMatch) refreshToken = decodeURIComponent(refreshMatch[1]);
    }
  } else {
    code = urlOrCode;
  }

  if (providerError) throw new Error(providerError);

  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      // If code was already exchanged in a parallel handler, verify if session exists
      const { data } = await sb.auth.getSession();
      if (data.session) return;
      throw error;
    }
    return;
  }

  if (accessToken && refreshToken) {
    const { error } = await sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    return;
  }

  const { data } = await sb.auth.getSession();
  if (!data.session) throw new Error("Google sign-in did not return a usable Supabase session.");
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const sb = requireSupabase();
  const redirectTo = getRedirectUri();
  console.log("[Auth] Starting Google sign-in with redirect URI:", redirectTo);
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    console.error("[Auth] Supabase signInWithOAuth error:", error);
    throw error;
  }
  if (!data.url) throw new Error("Google sign-in is unavailable because Supabase did not return an authorization URL.");

  if (Platform.OS === "web") {
    if (typeof window === "undefined") throw new Error("Google sign-in must be opened in a browser.");
    window.location.assign(data.url);
    return "redirecting";
  }

  console.log("[Auth] Opening browser auth session...");
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  console.log("[Auth] Browser auth session finished with type:", result.type);
  if (result.type !== "success" || !result.url) return "cancelled";
  console.log("[Auth] Browser auth session returned callback URL:", result.url);
  await consumeSupabaseCallback(result.url);
  return "authenticated";
}

export async function getSupabaseAccessToken() {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data.session?.access_token ?? null;
}

export async function signOutFromSupabase() {
  const sb = requireSupabase();
  const { error } = await sb.auth.signOut({ scope: "local" });
  if (error) throw error;
}
