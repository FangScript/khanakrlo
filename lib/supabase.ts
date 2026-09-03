import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupportedStorage, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const memoryStorage: SupportedStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

const canUseStorage = Platform.OS !== "web" || typeof window !== "undefined";
const authStorage = canUseStorage ? AsyncStorage : memoryStorage;

let supabase: SupabaseClient | null = null;
if (projectUrl && publishableKey) {
  supabase = createClient(projectUrl, publishableKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: canUseStorage,
      persistSession: canUseStorage,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
} else {
  console.warn("Supabase client configuration is missing. Running in demo mode without backend.");
}

export { supabase };