import { z } from "zod";

import { BUSINESS_DOCUMENT_TYPES } from "../../../shared/business";
import { BUSINESS_TYPES } from "../../../shared/workspace";

export const businessDraftInput = z.object({
  legalName: z.string().max(180),
  displayName: z.string().max(160),
  supportPhone: z.string().max(20),
  city: z.string().max(120),
  addressLine1: z.string().max(255),
  description: z.string().max(2000).optional(),
  pickupInstructions: z.string().max(500).optional(),
  prepTimeMinutes: z.number().int(),
  openingTime: z.string().max(5),
  closingTime: z.string().max(5),
  serviceZone: z.object({ name: z.string().max(120), deliveryFeeMinor: z.number().int(), minimumOrderMinor: z.number().int() }),
  menu: z.array(z.object({ category: z.string().max(120), items: z.array(z.object({ name: z.string().max(160), description: z.string().max(1000).optional(), priceMinor: z.number().int(), prepTimeMinutes: z.number().int() })) })),
  businessType: z.enum(BUSINESS_TYPES),
  restaurant: z.object({ cuisine: z.string().max(120) }).optional(),
  cloudKitchen: z.object({ kitchenName: z.string().max(160), capacityLimit: z.number().int(), brands: z.array(z.object({ name: z.string().max(160), cuisine: z.string().max(120), description: z.string().max(1000).optional() })), stations: z.array(z.object({ name: z.string().max(120), capacity: z.number().int() })) }).optional(),
});

export const businessDocumentUploadInput = z.object({
  documentType: z.enum(BUSINESS_DOCUMENT_TYPES),
  originalName: z.string().min(1).max(255),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  dataBase64: z.string().min(1).max(7_000_000),
});

export const catalogueCategoryCreateInput = z.object({ name: z.string().trim().min(1).max(120), scopeId: z.number().int().positive().optional(), sortOrder: z.number().int().min(0).max(999).optional() });
export const catalogueCategoryUpdateInput = z.object({ categoryId: z.number().int().positive(), name: z.string().trim().min(1).max(120), sortOrder: z.number().int().min(0).max(999), isActive: z.boolean() });
export const catalogueItemCreateInput = z.object({ categoryId: z.number().int().positive(), name: z.string().trim().min(1).max(160), description: z.string().trim().max(1000).optional(), priceMinor: z.number().int().min(0), prepTimeMinutes: z.number().int().min(1).max(1440), isAvailable: z.boolean().default(true) });
export const catalogueItemUpdateInput = z.object({ itemId: z.number().int().positive(), name: z.string().trim().min(1).max(160), description: z.string().trim().max(1000).optional(), priceMinor: z.number().int().min(0), prepTimeMinutes: z.number().int().min(1).max(1440), isAvailable: z.boolean() });
export const catalogueModifierCreateInput = z.object({ menuItemId: z.number().int().positive(), name: z.string().trim().min(1).max(120), priceMinor: z.number().int().min(0), isRequired: z.boolean() });
export const catalogueModifierUpdateInput = z.object({ modifierId: z.number().int().positive(), name: z.string().trim().min(1).max(120), priceMinor: z.number().int().min(0), isRequired: z.boolean(), isAvailable: z.boolean() });
export const catalogueCategoryArchiveInput = z.object({ categoryId: z.number().int().positive() });
export const catalogueItemArchiveInput = z.object({ itemId: z.number().int().positive() });
export const catalogueModifierArchiveInput = z.object({ modifierId: z.number().int().positive() });
export const businessLiveStatusInput = z.object({ status: z.enum(["live", "paused"]) });
export const discoveryFilterInput = z.object({ businessType: z.enum(BUSINESS_TYPES).optional() }).optional();

export type BusinessDraftInput = z.infer<typeof businessDraftInput>;
