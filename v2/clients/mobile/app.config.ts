import type { ExpoConfig } from "expo/config";

const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
const config: ExpoConfig = {
  name: "Khana KarLo",
  slug: "khana-karlo-v2",
  scheme: "khanakarlo-v2",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  platforms: ["android", "ios", "web"],
  web: { bundler: "metro" },
  ios: { bundleIdentifier: "pk.khanakarlo.mobile", supportsTablet: false },
  android: { package: "pk.khanakarlo.mobile" },
  plugins: ["expo-secure-store", ...(iosUrlScheme ? [["@react-native-google-signin/google-signin", { iosUrlScheme }] as [string, { iosUrlScheme: string }]] : [])],
};
export default config;
