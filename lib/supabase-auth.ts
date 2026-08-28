import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

if (Platform.OS === "web" && typeof window !== "undefined") {
  WebBrowser.maybeCompleteAuthSession();
}

export type GoogleSignInResult = "authenticated" | "redirecting" | "cancelled";

export function getSupabaseRedirectUri() {
  return Linking.createURL("auth/supabase-callback");
}

export async function consumeSupabaseCallback(url: string) {
  const callback = new URL(url);
  const providerError = callback.searchParams.get("error_description") ?? callback.searchParams.get("error");
  if (providerError) throw new Error(providerError);
  const code = callback.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }
  const fragment = new URLSearchParams(callback.hash.replace(/^#/, ""));
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Google sign-in did not return a usable Supabase session.");
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const redirectTo = getSupabaseRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
  if (error) throw error;
  if (!data.url) throw new Error("Google sign-in is unavailable because Supabase did not return an authorization URL.");
  if (Platform.OS === "web") {
    if (typeof window === "undefined") throw new Error("Google sign-in must be opened in a browser.");
    window.location.assign(data.url);
    return "redirecting";
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return "cancelled";
  await consumeSupabaseCallback(result.url);
  return "authenticated";
}

export async function getSupabaseAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.access_token ?? null;
}

export async function signOutFromSupabase() {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
}
