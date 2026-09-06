// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const bundleId = "com.app.khaanakarlomobile";
const scheme = "khanakarlo";

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "Khaana KarLo",
  appSlug: "khaana-karlo-mobile",
  logoUrl: "",
  scheme,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS", "ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION", "FOREGROUND_SERVICE", "FOREGROUND_SERVICE_LOCATION"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-notifications",
      {
        defaultChannel: "orders",
      },
    ],
    "expo-font",
    "expo-asset",
    "expo-web-browser",
    "expo-document-picker",
    [
      "expo-location",
      {
        "locationWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location to pin delivery addresses, verify Restaurant service zones, and share a Rider location during an active delivery.",
        "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to share your location only while you are completing an accepted delivery, including when the app is in the background.",
        "isIosBackgroundLocationEnabled": true,
        "isAndroidBackgroundLocationEnabled": true,
        "isAndroidForegroundServiceEnabled": true
      }
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#064B2C",
        dark: {
          backgroundColor: "#064B2C",
        },
      },
    ],
    "expo-image",
    "expo-secure-store",
    "expo-sharing",
    "expo-status-bar",
    [
      "expo-image-picker",
      {
        photosPermission: "Allow Khana KarLo Business to select dish photos for its customer menu.",
        cameraPermission: "Allow Khana KarLo Business to photograph dishes for its customer menu.",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
