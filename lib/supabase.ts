import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupportedStorage } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!projectUrl || !publishableKey) {
  throw new Error("Supabase client configuration is missing. Set the public project URL and publishable key before starting the app.");
}

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

export const supabase = createClient(projectUrl, publishableKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: canUseBrowserStorage,
    persistSession: canUseBrowserStorage,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});
