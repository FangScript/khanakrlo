import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const secureStoreAdapter: SupportedStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const memoryStorage: SupportedStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

const canUseBrowserStorage = Platform.OS !== "web" || typeof window !== "undefined";
const authStorage = !canUseBrowserStorage ? memoryStorage : Platform.OS === "web" ? AsyncStorage : secureStoreAdapter;

let supabase = null;
if (projectUrl && publishableKey) {
  supabase = createClient(projectUrl, publishableKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: canUseBrowserStorage,
      persistSession: canUseBrowserStorage,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
} else {
  console.warn("Supabase client configuration is missing. Running in demo mode without backend.");
}

export { supabase };