export const BUSINESS_OPERATIONAL_STATUSES = ["draft", "pending_review", "approved", "live", "paused", "suspended"] as const;
export const BUSINESS_DOCUMENT_TYPES = ["owner_identity", "business_registration", "tax_record", "payout_evidence", "outlet_evidence", "food_safety", "menu_evidence"] as const;
export const BUSINESS_DOCUMENT_STATUSES = ["uploaded", "accepted", "changes_required", "rejected"] as const;
export const BUSINESS_CHECKLIST_STATUSES = ["missing", "complete", "changes_required", "accepted"] as const;
export const BUSINESS_STAFF_ROLES = ["owner", "manager", "counter", "kitchen_manager", "station_lead", "dispatcher", "finance_viewer"] as const;
export const BUSINESS_SCOPE_TYPES = ["organisation", "outlet", "cloud_kitchen", "brand"] as const;

export type BusinessOperationalStatus = (typeof BUSINESS_OPERATIONAL_STATUSES)[number];
export type BusinessDocumentType = (typeof BUSINESS_DOCUMENT_TYPES)[number];
export type BusinessDocumentStatus = (typeof BUSINESS_DOCUMENT_STATUSES)[number];
export type BusinessChecklistStatus = (typeof BUSINESS_CHECKLIST_STATUSES)[number];
export type BusinessStaffRole = (typeof BUSINESS_STAFF_ROLES)[number];
export type BusinessScopeType = (typeof BUSINESS_SCOPE_TYPES)[number];

export type BusinessApplicationDraft = {
  legalName: string;
  displayName: string;
  supportPhone: string;
  city: string;
  addressLine1: string;
  description?: string;
  pickupInstructions?: string;
  prepTimeMinutes: number;
  openingTime: string;
  closingTime: string;
  serviceZone: { name: string; deliveryFeeMinor: number; minimumOrderMinor: number };
  menu: Array<{ category: string; items: Array<{ name: string; description?: string; priceMinor: number; prepTimeMinutes: number }> }>;
  businessType: "restaurant" | "cloud_kitchen";
  restaurant?: { cuisine: string };
  cloudKitchen?: {
    kitchenName: string;
    capacityLimit: number;
    brands: Array<{ name: string; cuisine: string; description?: string }>;
    stations: Array<{ name: string; capacity: number }>;
  };
};

export function validateBusinessApplicationDraft(draft: BusinessApplicationDraft): string[] {
  const errors: string[] = [];
  if (!draft.legalName.trim()) errors.push("Legal business name is required.");
  if (!draft.displayName.trim()) errors.push("Public display name is required.");
  if (!draft.supportPhone.match(/^\+[1-9]\d{7,14}$/)) errors.push("A valid international support phone is required.");
  if (!draft.city.trim()) errors.push("Business city is required.");
  if (!draft.addressLine1.trim()) errors.push("Business address is required.");
  if (!Number.isInteger(draft.prepTimeMinutes) || draft.prepTimeMinutes < 5 || draft.prepTimeMinutes > 240) errors.push("Preparation time must be between 5 and 240 minutes.");
  if (!draft.openingTime.match(/^\d{2}:\d{2}$/) || !draft.closingTime.match(/^\d{2}:\d{2}$/)) errors.push("Opening and closing times are required.");
  if (!draft.serviceZone?.name.trim()) errors.push("A service zone is required.");
  if (!Number.isInteger(draft.serviceZone?.deliveryFeeMinor) || draft.serviceZone.deliveryFeeMinor < 0) errors.push("Delivery fee must be zero or greater.");
  if (!Number.isInteger(draft.serviceZone?.minimumOrderMinor) || draft.serviceZone.minimumOrderMinor < 0) errors.push("Minimum order must be zero or greater.");
  if (!draft.menu?.length || !draft.menu.some((category) => category.items.length > 0)) errors.push("Add at least one menu item.");
  if (draft.businessType === "restaurant" && !draft.restaurant?.cuisine.trim()) errors.push("Restaurant cuisine is required.");
  if (draft.businessType === "cloud_kitchen") {
    if (!draft.cloudKitchen?.kitchenName.trim()) errors.push("Cloud Kitchen name is required.");
    if (!draft.cloudKitchen?.brands.length) errors.push("At least one Cloud Kitchen brand is required.");
    if (!draft.cloudKitchen?.stations.length) errors.push("At least one production station is required.");
    if (!Number.isInteger(draft.cloudKitchen?.capacityLimit) || (draft.cloudKitchen?.capacityLimit ?? 0) < 1) errors.push("Cloud Kitchen capacity must be at least one order.");
  }
  return errors;
}

export function requiredChecklistForBusinessType(businessType: "restaurant" | "cloud_kitchen") {
  const base = ["owner_identity", "business_registration", "payout_evidence", "outlet_evidence"] as const;
  return businessType === "cloud_kitchen" ? [...base, "food_safety", "menu_evidence"] : [...base, "menu_evidence"];
}
