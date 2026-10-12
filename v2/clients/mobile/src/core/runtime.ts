import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createTransport, type Transport } from "./http";
import { SessionManager } from "./session";
import { createCustomerClient } from "../generated/customer";

const base = process.env.EXPO_PUBLIC_API_BASE_URL || (__DEV__ ? (Platform.OS === "android" ? "http://10.0.2.2:3100" : "http://localhost:3100") : "https://api.khanakarlo.com");
export const isSandbox = __DEV__ && Platform.OS === "web" && process.env.EXPO_PUBLIC_SANDBOX === "1";
const transport: Transport = isSandbox
  ? async (path, options) => (await import("./sandbox")).sandboxTransport(path, options)
  : createTransport(base,__DEV__);
const key = "khana-v2-refresh";
let previewRefresh: string | null = null;
export const sessions = new SessionManager(transport, {
  read: () => isSandbox ? Promise.resolve(previewRefresh) : SecureStore.getItemAsync(key),
  write: (value) => isSandbox ? Promise.resolve(void (previewRefresh = value)) : SecureStore.setItemAsync(key,value,{ keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  clear: () => isSandbox ? Promise.resolve(void (previewRefresh = null)) : SecureStore.deleteItemAsync(key),
});
export const authenticated: Transport = async (path,options) => transport(path,{ ...options,token:await sessions.accessToken() });
export const customer = createCustomerClient(authenticated);

export async function enterSandbox() {
  if (!isSandbox) throw new Error("The sandbox is only available in a local browser development build.");
  await sessions.signIn("sandbox-only-identity", "android");
}

export async function googleSignIn() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!webClientId || (Platform.OS === "ios" && !iosClientId)) throw new Error("Google sign-in is not configured for this build.");
  const { GoogleSignin, isSuccessResponse } = await import("@react-native-google-signin/google-signin");
  GoogleSignin.configure({ webClientId,...(iosClientId ? { iosClientId } : {}) });
  if (Platform.OS === "android") await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog:true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return;
  if (!response.data.idToken) throw new Error("Google did not return a verified identity token.");
  await sessions.signIn(response.data.idToken,Platform.OS === "ios" ? "ios" : "android");
}
