import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

import { CartLine, MenuItem, type AddOn } from "@/lib/khana-data";

export type PlacedOrder = {
  id: string;
  restaurantName: string;
  items: CartLine[];
  total: number;
  eta: string;
  status: "confirmed" | "preparing" | "outForDelivery" | "delivered";
  createdAt: string;
};

export type CustomerProfile = {
  name: string;
  phone: string;
  deliveryAddress: string;
};

type KhanaState = {
  cart: CartLine[];
  lastOrder: PlacedOrder | null;
  customer: CustomerProfile | null;
  hasHydratedCustomer: boolean;
};

const CUSTOMER_STORAGE_KEY = "khana-karlo/customer-profile";

let state: KhanaState = { cart: [], lastOrder: null, customer: null, hasHydratedCustomer: false };
let hydrationPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: KhanaState) {
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

function addItem(item: MenuItem, spice: string, addOns: AddOn[]) {
  const lineId = `${item.id}-${spice}-${addOns.map((addOn) => addOn.id).sort().join("-")}`;
  const existing = state.cart.find((line) => line.id === lineId);

  if (existing) {
    setState({
      ...state,
      cart: state.cart.map((line) => (line.id === lineId ? { ...line, quantity: line.quantity + 1 } : line)),
    });
    return;
  }

  const nextLine: CartLine = {
    id: lineId,
    restaurantId: item.restaurantId,
    menuItemId: item.id,
    name: item.name,
    quantity: 1,
    unitPrice: item.price,
    image: item.image,
    spice,
    addOns,
  };

  setState({ ...state, cart: [...state.cart, nextLine] });
}

function changeQuantity(lineId: string, difference: number) {
  const updated = state.cart
    .map((line) => (line.id === lineId ? { ...line, quantity: line.quantity + difference } : line))
    .filter((line) => line.quantity > 0);
  setState({ ...state, cart: updated });
}

function clearCart() {
  setState({ ...state, cart: [] });
}

function placeOrder(restaurantName: string, total: number) {
  const nextOrder: PlacedOrder = {
    id: `KK-${Math.floor(10000 + Math.random() * 90000)}`,
    restaurantName,
    items: state.cart,
    total,
    eta: "28–35 min",
    status: "preparing",
    createdAt: "Just now",
  };
  setState({ ...state, cart: [], lastOrder: nextOrder });
  return nextOrder;
}

async function hydrateCustomerSession() {
  if (state.hasHydratedCustomer) return;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const persistedProfile = await AsyncStorage.getItem(CUSTOMER_STORAGE_KEY);
      const customer = persistedProfile ? (JSON.parse(persistedProfile) as CustomerProfile) : null;
      setState({ ...state, customer, hasHydratedCustomer: true });
    } catch {
      setState({ ...state, hasHydratedCustomer: true });
    } finally {
      hydrationPromise = null;
    }
  })();

  return hydrationPromise;
}

function completeCustomerOnboarding(customer: CustomerProfile) {
  setState({ ...state, customer, hasHydratedCustomer: true });
  void AsyncStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
}

function clearCustomerSession() {
  setState({ ...state, customer: null, hasHydratedCustomer: true });
  void AsyncStorage.removeItem(CUSTOMER_STORAGE_KEY);
}

export function useKhanaStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...snapshot,
    addItem,
    changeQuantity,
    clearCart,
    placeOrder,
    hydrateCustomerSession,
    completeCustomerOnboarding,
    clearCustomerSession,
  };
}
