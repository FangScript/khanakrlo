import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { isMerchantStatusTransitionAllowed, type MerchantOrderStatus } from "@/lib/merchant-order-workflow";

export type { MerchantOrderStatus } from "@/lib/merchant-order-workflow";

export type MerchantOrder = {
  id: string;
  customerName: string;
  status: MerchantOrderStatus;
  items: string[];
  total: number;
  payment: "COD" | "JazzCash";
  receivedAt: string;
  prepTime: string;
  notes?: string;
};

export type MerchantProfile = {
  name: string;
  outletName: string;
  phone: string;
};

type MerchantState = {
  profile: MerchantProfile | null;
  hasHydrated: boolean;
  orders: MerchantOrder[];
};

const MERCHANT_STORAGE_KEY = "khana-karlo/merchant-profile";

const seededOrders: MerchantOrder[] = [
  {
    id: "KK-10428",
    customerName: "Ayesha Khan",
    status: "new",
    items: ["Chicken Karahi", "Roghni Naan × 2", "Mint raita"],
    total: 1680,
    payment: "COD",
    receivedAt: "2 min ago",
    prepTime: "25 min",
    notes: "Less oil, please pack naan separately.",
  },
  {
    id: "KK-10427",
    customerName: "Hamza Ali",
    status: "new",
    items: ["Mutton Karahi", "Kashmiri chai"],
    total: 2450,
    payment: "JazzCash",
    receivedAt: "5 min ago",
    prepTime: "35 min",
  },
  {
    id: "KK-10424",
    customerName: "Zara Ahmed",
    status: "preparing",
    items: ["Chicken Biryani × 2", "Kheer"],
    total: 1420,
    payment: "COD",
    receivedAt: "13 min ago",
    prepTime: "12 min left",
  },
  {
    id: "KK-10420",
    customerName: "Bilal Sheikh",
    status: "ready",
    items: ["Beef Seekh Kebab", "Paratha × 2"],
    total: 1180,
    payment: "JazzCash",
    receivedAt: "26 min ago",
    prepTime: "Rider arriving",
  },
];

let state: MerchantState = { profile: null, hasHydrated: false, orders: seededOrders };
let hydrationPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: MerchantState) {
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

async function hydrateMerchantSession() {
  if (state.hasHydrated) return;
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    try {
      const stored = await AsyncStorage.getItem(MERCHANT_STORAGE_KEY);
      const profile = stored ? (JSON.parse(stored) as MerchantProfile) : null;
      setState({ ...state, profile, hasHydrated: true });
    } catch {
      setState({ ...state, hasHydrated: true });
    } finally {
      hydrationPromise = null;
    }
  })();
  return hydrationPromise;
}

function completeMerchantSignIn(phone: string) {
  const profile: MerchantProfile = { name: "Restaurant Manager", outletName: "Lahori Dera", phone };
  setState({ ...state, profile, hasHydrated: true });
  void AsyncStorage.setItem(MERCHANT_STORAGE_KEY, JSON.stringify(profile));
}

function updateOrderStatus(orderId: string, status: MerchantOrderStatus) {
  const existingOrder = state.orders.find((order) => order.id === orderId);
  if (!existingOrder || !isMerchantStatusTransitionAllowed(existingOrder.status, status)) return;
  setState({ ...state, orders: state.orders.map((order) => (order.id === orderId ? { ...order, status } : order)) });
}

function getOrder(orderId: string) {
  return state.orders.find((order) => order.id === orderId) ?? null;
}

export function useMerchantStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...snapshot,
    hydrateMerchantSession,
    completeMerchantSignIn,
    updateOrderStatus,
    getOrder,
  };
}
