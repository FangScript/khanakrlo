import "@/global.css";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Network from "expo-network";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform, StyleSheet } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { useKhanaStore } from "@/lib/khana-store";
import { flushRiderCommandQueue } from "@/lib/rider-command-queue";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
}

export const unstable_settings = {
  initialRouteName: "index",
};

function CartHydrator() {
  const { hydrateCart } = useKhanaStore();
  useEffect(() => { void hydrateCart(); }, [hydrateCart]);
  return null;
}

function RiderCommandSynchronizer() {
  const network = Network.useNetworkState();
  const executeCommand = trpc.orders.executeRiderCommand.useMutation();
  const queryClient = useQueryClient();
  const isSyncing = useRef(false);
  useEffect(() => {
    if (network.isInternetReachable !== true || isSyncing.current) return;
    isSyncing.current = true;
    void flushRiderCommandQueue(async (command) => { await executeCommand.mutateAsync(command); })
      .then(async (result) => { if (result.completed || result.rejected) await queryClient.invalidateQueries(); })
      .finally(() => { isSyncing.current = false; });
  }, [executeCommand, network.isInternetReachable, queryClient]);
  return null;
}

function NotificationRuntime() {
  const registerDevice = trpc.notifications.registerExpoDevice.useMutation();
  useEffect(() => {
    if (Platform.OS === "web") return;
    let disposed = false;
    const redirect = (notification: Notifications.Notification) => {
      const candidate = notification.request.content.data?.url;
      if (typeof candidate === "string" && candidate.startsWith("/")) router.push(candidate as never);
    };
    const setup = async () => {
      try {
        if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("orders", { name: "Order updates", importance: Notifications.AndroidImportance.HIGH });
        const existing = await Notifications.getPermissionsAsync();
        const permission = existing.status === "granted" ? existing : await Notifications.requestPermissionsAsync();
        if (permission.status !== "granted") return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) return;
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        if (!disposed) await registerDevice.mutateAsync({ token, platform: Platform.OS === "ios" ? "ios" : "android" });
      } catch { /* Durable in-app inbox remains available if push registration is unavailable. */ }
    };
    void setup();
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) redirect(last.notification);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => redirect(response.notification));
    return () => { disposed = true; subscription.remove(); };
  }, [registerDevice]);
  return null;
}

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={styles.root}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <CartHydrator />
          <RiderCommandSynchronizer />
          <NotificationRuntime />
          {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
          {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
          {/* in order for ios apps tab switching to work properly, use presentation: "fullScreenModal" for login page, whenever you decide to use presentation: "modal*/}
          <Stack screenOptions={{ headerShown: false, contentStyle: styles.navigationSurface }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="oauth/callback" />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#064B2C" },
  navigationSurface: { backgroundColor: "#064B2C" },
});
