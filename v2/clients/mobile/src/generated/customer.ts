// Generated from contracts/openapi/customer.json. Run pnpm clients:generate.
import type { Transport } from "../core/http";

export interface Profile {
  id: string;
  displayName: string;
  phone: string | null;
  phoneConsentAt: string | null;
}

export interface ProfileUpdate {
  displayName: string;
}

export interface PhoneConsent {
  phone: string;
  consent: true;
}

export interface MaskedPhone {
  phone: string;
  phoneConsentAt: string;
}

export interface AddressInput {
  label: string;
  addressLine: string;
  latitude: number;
  longitude: number;
}

export interface CartItem {
  menuItemId: string;
  quantity: number;
  modifierIds: Array<string>;
}

export interface CartUpdate {
  outletId: string;
  version: number;
  items: Array<CartItem>;
}

export interface Cart {
  outletId: string | null;
  version: number;
  items: Array<CartItem>;
}

export interface Error {
  error: string;
  message?: string;
}

export interface Address {
  id: string;
  label: string;
  addressLine: string;
  latitude: number;
  longitude: number;
}

export interface Addresses {
  items: Array<Address>;
}

export function createCustomerClient(request: Transport) {
  return {
    getProfile: (signal?: AbortSignal) => request<Profile>(`/customer/profile`, { method: "GET", ...(signal ? { signal } : {}) }),
    updateProfile: (body: ProfileUpdate, signal?: AbortSignal) => request<ProfileUpdate>(`/customer/profile`, { method: "PATCH", body, ...(signal ? { signal } : {}) }),
    capturePhoneConsent: (body: PhoneConsent, signal?: AbortSignal) => request<MaskedPhone>(`/customer/profile/phone-consent`, { method: "PUT", body, ...(signal ? { signal } : {}) }),
    listAddresses: (signal?: AbortSignal) => request<Addresses>(`/customer/addresses`, { method: "GET", ...(signal ? { signal } : {}) }),
    createAddress: (body: AddressInput, idempotencyKey: string, signal?: AbortSignal) => request<Address>(`/customer/addresses`, { method: "POST", body, idempotencyKey, ...(signal ? { signal } : {}) }),
    updateAddress: (id: string, body: AddressInput, signal?: AbortSignal) => request<Address>(`/customer/addresses/${encodeURIComponent(id)}`, { method: "PATCH", body, ...(signal ? { signal } : {}) }),
    deleteAddress: (id: string, signal?: AbortSignal) => request<void>(`/customer/addresses/${encodeURIComponent(id)}`, { method: "DELETE", ...(signal ? { signal } : {}) }),
    getCart: (signal?: AbortSignal) => request<Cart>(`/customer/cart`, { method: "GET", ...(signal ? { signal } : {}) }),
    updateCart: (body: CartUpdate, signal?: AbortSignal) => request<Cart>(`/customer/cart`, { method: "PUT", body, ...(signal ? { signal } : {}) }),
  };
}
