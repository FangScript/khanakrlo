import * as Linking from "expo-linking";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

if (Platform.OS === "web" && typeof window !== "undefined") {
  WebBrowser.maybeCompleteAuthSession();
}

export type GoogleSignInResult = "authenticated" | "redirecting" | "cancelled";

function getRedirectUri() {
  return AuthSession.makeRedirectUri({
    path: "auth/supabase-callback",
  });
}

function requireSupabase() {
  if (!supabase) throw new Error("Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env");
  return supabase;
}

export async function consumeSupabaseCallback(url: string) {
  const sb = requireSupabase();
  const callback = new URL(url);
  const providerError = callback.searchParams.get("error_description") ?? callback.searchParams.get("error");
  if (providerError) throw new Error(providerError);
  const code = callback.searchParams.get("code");
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }
  const fragment = new URLSearchParams(callback.hash.replace(/^#/, ""));
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
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
  const { data, error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
  if (error) throw error;
  if (!data.url) throw new Error("Google sign-in is unavailable because Supabase did not return an authorization URL.");

  if (Platform.OS === "web") {
    if (typeof window === "undefined") throw new Error("Google sign-in must be opened in a browser.");
    window.location.assign(data.url);
    return "redirecting";
  }

  if (Platform.OS === "android") {
    await Linking.openURL(data.url);
    return new Promise((resolve, reject) => {
      const sub = Linking.addEventListener("url", async (event) => {
        sub.remove();
        try {
          await consumeSupabaseCallback(event.url);
          resolve("authenticated");
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return "cancelled";
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
