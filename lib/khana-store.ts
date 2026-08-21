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
  hasHydratedCart: boolean;
};

const CUSTOMER_STORAGE_KEY = "khana-karlo/customer-profile";
const CART_STORAGE_KEY = "khana-karlo/customer-cart-v1";

let state: KhanaState = { cart: [], lastOrder: null, customer: null, hasHydratedCustomer: false, hasHydratedCart: false };
let hydrationPromise: Promise<void> | null = null;
let cartHydrationPromise: Promise<void> | null = null;
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

function persistCart(cart: CartLine[]) {
  void AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function addItem(item: MenuItem, spice: string, addOns: AddOn[]) {
  const lineId = `${item.id}-${spice}-${addOns.map((addOn) => addOn.id).sort().join("-")}`;
  const existing = state.cart.find((line) => line.id === lineId);

  if (existing) {
    const next = {
      ...state,
      cart: state.cart.map((line) => (line.id === lineId ? { ...line, quantity: line.quantity + 1 } : line)),
    };
    setState(next);
    persistCart(next.cart);
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

  const next = { ...state, cart: [...state.cart, nextLine] };
  setState(next);
  persistCart(next.cart);
}

function addLiveItem(input: { businessId: number; businessName: string; menuItemId: number; name: string; priceMinor: number; imageUrl: string | null; modifiers: Array<{ id: number; name: string; priceMinor: number }>; selectedModifierIds: number[] }) {
  const modifierIds = [...new Set(input.selectedModifierIds)].sort((left, right) => left - right);
  const lineId = `live-${input.businessId}-${input.menuItemId}-${modifierIds.join("-")}`;
  const existing = state.cart.find((line) => line.id === lineId);
  if (existing) {
    const next = { ...state, cart: state.cart.map((line) => line.id === lineId ? { ...line, quantity: line.quantity + 1 } : line) };
    setState(next);
    persistCart(next.cart);
    return;
  }
  const selectedAddOns: AddOn[] = input.modifiers.filter((modifier) => modifierIds.includes(modifier.id)).map((modifier) => ({ id: String(modifier.id), name: modifier.name, price: modifier.priceMinor / 100 }));
  const nextLine: CartLine = { id: lineId, restaurantId: String(input.businessId), menuItemId: String(input.menuItemId), serverBusinessId: input.businessId, serverMenuItemId: input.menuItemId, serverModifierIds: modifierIds, restaurantName: input.businessName, name: input.name, quantity: 1, unitPrice: input.priceMinor / 100, imageUrl: input.imageUrl, spice: "", addOns: selectedAddOns };
  const next = { ...state, cart: [...state.cart, nextLine] };
  setState(next);
  persistCart(next.cart);
}

function changeQuantity(lineId: string, difference: number) {
  const updated = state.cart
    .map((line) => (line.id === lineId ? { ...line, quantity: line.quantity + difference } : line))
    .filter((line) => line.quantity > 0);
  const next = { ...state, cart: updated };
  setState(next);
  persistCart(next.cart);
}

function clearCart() {
  const next = { ...state, cart: [] };
  setState(next);
  persistCart(next.cart);
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
  const next = { ...state, cart: [], lastOrder: nextOrder };
  setState(next);
  persistCart(next.cart);
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

async function hydrateCart() {
  if (state.hasHydratedCart) return;
  if (cartHydrationPromise) return cartHydrationPromise;

  cartHydrationPromise = (async () => {
    try {
      const persistedCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
      const cart = persistedCart ? (JSON.parse(persistedCart) as CartLine[]) : [];
      setState({ ...state, cart: Array.isArray(cart) ? cart : [], hasHydratedCart: true });
    } catch {
      setState({ ...state, hasHydratedCart: true });
    } finally {
      cartHydrationPromise = null;
    }
  })();

  return cartHydrationPromise;
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
    addLiveItem,
    changeQuantity,
    clearCart,
    placeOrder,
    hydrateCart,
    hydrateCustomerSession,
    completeCustomerOnboarding,
    clearCustomerSession,
  };
}
