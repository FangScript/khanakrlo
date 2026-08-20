import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { isRiderStatusTransitionAllowed } from "@/lib/rider-delivery-workflow";

export type RiderDeliveryStatus = "offered" | "accepted" | "atPickup" | "pickedUp" | "delivered" | "declined";

export type RiderDelivery = {
  id: string;
  orderNumber: string;
  status: RiderDeliveryStatus;
  restaurant: string;
  pickupAddress: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  totalDistanceKm: number;
  pickupEta: string;
  estimatedEarning: number;
  cashToCollect: number;
  items: string[];
  note?: string;
};

export type RiderProfile = {
  name: string;
  initials: string;
  phone: string;
  city: string;
  vehicle: string;
};

type RiderState = {
  profile: RiderProfile;
  isAvailable: boolean;
  deliveries: RiderDelivery[];
  hasHydrated: boolean;
};

const RIDER_STORAGE_KEY = "khana-karlo/rider-session";

const riderProfile: RiderProfile = {
  name: "Saad Ahmed",
  initials: "SA",
  phone: "3128765432",
  city: "Islamabad",
  vehicle: "Honda CD 70 · LEB-7421",
};

const seededDeliveries: RiderDelivery[] = [
  {
    id: "RD-6018",
    orderNumber: "KK-10420",
    status: "offered",
    restaurant: "Lahori Dera",
    pickupAddress: "F-7 Markaz, Jinnah Super, Islamabad",
    customerName: "Bilal Sheikh",
    customerPhone: "3009871234",
    deliveryAddress: "House 18, Street 12, F-8/3, Islamabad",
    totalDistanceKm: 3.7,
    pickupEta: "4 min away",
    estimatedEarning: 180,
    cashToCollect: 0,
    items: ["Beef Seekh Kebab", "Paratha × 2"],
  },
  {
    id: "RD-6017",
    orderNumber: "KK-10416",
    status: "offered",
    restaurant: "Biryani Junction",
    pickupAddress: "G-9 Markaz, Islamabad",
    customerName: "Mariam Iqbal",
    customerPhone: "3334412098",
    deliveryAddress: "Flat 12B, G-10/2, Islamabad",
    totalDistanceKm: 5.1,
    pickupEta: "7 min away",
    estimatedEarning: 235,
    cashToCollect: 1240,
    items: ["Chicken Biryani × 2", "Raita"],
    note: "Please call on arrival.",
  },
  {
    id: "RD-6014",
    orderNumber: "KK-10407",
    status: "accepted",
    restaurant: "Chai Khana",
    pickupAddress: "Blue Area, Jinnah Avenue, Islamabad",
    customerName: "Omar Farooq",
    customerPhone: "3012081145",
    deliveryAddress: "Office 5, ISE Tower, Blue Area, Islamabad",
    totalDistanceKm: 2.4,
    pickupEta: "Pickup by 12:40 PM",
    estimatedEarning: 140,
    cashToCollect: 690,
    items: ["Zinger Burger", "Karak Chai"],
  },
];

let state: RiderState = { profile: riderProfile, isAvailable: false, deliveries: seededDeliveries, hasHydrated: false };
let hydrationPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: RiderState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

async function persist() {
  await AsyncStorage.setItem(RIDER_STORAGE_KEY, JSON.stringify({ isAvailable: state.isAvailable, deliveries: state.deliveries }));
}

async function hydrateRiderSession() {
  if (state.hasHydrated) return;
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    try {
      const stored = await AsyncStorage.getItem(RIDER_STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as Partial<RiderState>) : null;
      setState({ ...state, isAvailable: parsed?.isAvailable ?? state.isAvailable, deliveries: parsed?.deliveries ?? state.deliveries, hasHydrated: true });
    } catch {
      setState({ ...state, hasHydrated: true });
    } finally {
      hydrationPromise = null;
    }
  })();
  return hydrationPromise;
}

function setRiderAvailability(isAvailable: boolean) {
  setState({ ...state, isAvailable });
  void persist();
}

function getDelivery(deliveryId: string) {
  return state.deliveries.find((delivery) => delivery.id === deliveryId) ?? null;
}

function updateDeliveryStatus(deliveryId: string, status: RiderDeliveryStatus) {
  const existing = getDelivery(deliveryId);
  if (!existing || !isRiderStatusTransitionAllowed(existing.status, status)) return;
  setState({ ...state, deliveries: state.deliveries.map((delivery) => delivery.id === deliveryId ? { ...delivery, status } : delivery) });
  void persist();
}

export function useRiderStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...snapshot, hydrateRiderSession, setRiderAvailability, getDelivery, updateDeliveryStatus };
}
