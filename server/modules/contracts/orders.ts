import { z } from "zod";

import { ORDER_PAYMENT_METHODS, ORDER_STATUSES } from "../../../shared/order";

export const orderLineInput = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20),
  modifierIds: z.array(z.number().int().positive()).max(20).default([]),
}).strict();

export const orderDeliveryAddressInput = z.object({
  recipientName: z.string().trim().min(1).max(160),
  phoneE164: z.string().trim().regex(/^\+92\d{10}$/),
  addressLine1: z.string().trim().min(4).max(255),
  addressLine2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(2).max(120),
  instructions: z.string().trim().max(500).optional(),
}).strict();

export const orderQuoteInput = z.object({
  items: z.array(orderLineInput).min(1).max(30),
  deliveryAddress: orderDeliveryAddressInput,
  paymentMethod: z.enum(ORDER_PAYMENT_METHODS).default("cod"),
}).strict();

export const orderPlaceInput = orderQuoteInput.extend({
  idempotencyKey: z.string().trim().min(16).max(100),
}).strict();

export const orderByIdInput = z.object({ orderId: z.number().int().positive() });
export const orderTransitionInput = z.object({ orderId: z.number().int().positive(), toStatus: z.enum(ORDER_STATUSES), note: z.string().trim().max(500).optional() });

export type OrderQuoteInput = z.infer<typeof orderQuoteInput>;
export type OrderPlaceInput = z.infer<typeof orderPlaceInput>;
