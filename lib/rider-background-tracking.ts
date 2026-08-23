import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { enqueueRiderCommand } from "@/lib/rider-command-queue";

export const RIDER_DELIVERY_LOCATION_TASK = "khana-karlo/rider-delivery-location-v1";
const ACTIVE_DELIVERY_KEY = "khana-karlo/rider-active-background-delivery-v1";

type ActiveDelivery = { orderId: number; startedAt: number };

async function activeDelivery() {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_DELIVERY_KEY);
    const parsed = raw ? JSON.parse(raw) as ActiveDelivery : null;
    return parsed && Number.isInteger(parsed.orderId) ? parsed : null;
  } catch {
    return null;
  }
}

if (!TaskManager.isTaskDefined(RIDER_DELIVERY_LOCATION_TASK)) {
  TaskManager.defineTask(RIDER_DELIVERY_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const delivery = await activeDelivery();
    const locations = (data as { locations?: Location.LocationObject[] }).locations ?? [];
    const latest = locations.at(-1);
    if (!delivery || !latest) return;
    await enqueueRiderCommand({
      type: "location_update",
      orderId: delivery.orderId,
      latitudeE6: Math.round(latest.coords.latitude * 1_000_000),
      longitudeE6: Math.round(latest.coords.longitude * 1_000_000),
      accuracyMeters: latest.coords.accuracy ? Math.round(latest.coords.accuracy) : undefined,
      source: "background",
      deviceObservedAt: new Date(latest.timestamp).toISOString(),
    });
  });
}

export async function enableRiderBackgroundTracking(orderId: number) {
  if (Platform.OS === "web") throw new Error("Background delivery tracking is available only in the installed mobile app.");
  if (!(await TaskManager.isAvailableAsync())) throw new Error("Background location needs a native development or production build, not Expo Go.");
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== "granted") throw new Error("Allow location while using the app before enabling background delivery tracking.");
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") throw new Error("Background location permission was not granted. You can still share while this delivery screen stays open.");
  await AsyncStorage.setItem(ACTIVE_DELIVERY_KEY, JSON.stringify({ orderId, startedAt: Date.now() } satisfies ActiveDelivery));
  const registered = await TaskManager.isTaskRegisteredAsync(RIDER_DELIVERY_LOCATION_TASK);
  if (!registered) await Location.startLocationUpdatesAsync(RIDER_DELIVERY_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30_000,
    distanceInterval: 50,
    pausesUpdatesAutomatically: true,
    foregroundService: {
      notificationTitle: "Khana KarLo delivery tracking",
      notificationBody: "Your location is shared only while you complete this accepted delivery.",
      notificationColor: "#168A4A",
    },
  });
}

export async function disableRiderBackgroundTracking() {
  if (Platform.OS !== "web" && await TaskManager.isTaskRegisteredAsync(RIDER_DELIVERY_LOCATION_TASK)) await Location.stopLocationUpdatesAsync(RIDER_DELIVERY_LOCATION_TASK);
  await AsyncStorage.removeItem(ACTIVE_DELIVERY_KEY);
}
