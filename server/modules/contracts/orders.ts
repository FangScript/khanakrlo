import { z } from "zod";

import { ORDER_PAYMENT_METHODS, ORDER_STATUSES } from "../../../shared/order";

export const orderLineInput = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20),
  modifierIds: z.array(z.number().int().positive()).max(20).default([]),
}).strict();

export const orderQuoteInput = z.object({
  items: z.array(orderLineInput).min(1).max(30),
  deliveryAddressId: z.number().int().positive(),
  paymentMethod: z.enum(ORDER_PAYMENT_METHODS).default("cod"),
}).strict();

export const orderPlaceInput = orderQuoteInput.extend({
  idempotencyKey: z.string().trim().min(16).max(100),
}).strict();

export const orderByIdInput = z.object({ orderId: z.number().int().positive() });
export const orderTransitionInput = z.object({ orderId: z.number().int().positive(), toStatus: z.enum(ORDER_STATUSES), note: z.string().trim().max(500).optional() });
export const riderAssignmentInput = z.object({ orderId: z.number().int().positive(), riderUserId: z.number().int().positive() }).strict();
export const riderOrderTransitionInput = z.object({ orderId: z.number().int().positive(), toStatus: z.enum(["picked_up", "delivered"]), note: z.string().trim().max(500).optional() }).strict();
export const riderLocationUpdateInput = z.object({ orderId: z.number().int().positive(), latitudeE6: z.number().int().min(-90_000_000).max(90_000_000), longitudeE6: z.number().int().min(-180_000_000).max(180_000_000), accuracyMeters: z.number().int().min(0).max(10_000).optional() }).strict();

export type OrderQuoteInput = z.infer<typeof orderQuoteInput>;
export type OrderPlaceInput = z.infer<typeof orderPlaceInput>;
export type RiderAssignmentInput = z.infer<typeof riderAssignmentInput>;
