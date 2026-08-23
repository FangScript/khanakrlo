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
export const kitchenOrderAcknowledgementInput = z.object({ orderId: z.number().int().positive() }).strict();
export const riderOfferDecisionInput = z.object({ orderId: z.number().int().positive(), decision: z.enum(["accept", "decline"]), note: z.string().trim().max(300).optional() }).strict();
export const riderAvailabilityInput = z.object({ status: z.enum(["online", "offline"]) }).strict();
export const riderCashRemittanceInput = z.object({ amountMinor: z.number().int().positive().max(10_000_000) }).strict();
export const RIDER_CASH_ENTRY_TYPES = ["commission_reserved", "commission_released", "cash_collected", "cash_variance", "settlement_adjustment"] as const;
export const riderCashHistoryFilterInput = z.object({
  fromDate: z.string().datetime({ offset: true }).optional(),
  toDate: z.string().datetime({ offset: true }).optional(),
  entryTypes: z.array(z.enum(RIDER_CASH_ENTRY_TYPES)).max(RIDER_CASH_ENTRY_TYPES.length).optional(),
}).strict().superRefine((input, context) => {
  if (input.fromDate && input.toDate && new Date(input.fromDate) > new Date(input.toDate)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["toDate"], message: "The end date must be on or after the start date." });
});
export const riderSettlementReceiptInput = z.object({ receiptId: z.number().int().positive() }).strict();
export const riderOrderTransitionInput = z.object({ orderId: z.number().int().positive(), toStatus: z.enum(["picked_up", "delivered"]), note: z.string().trim().max(500).optional() }).strict();
export const codCollectionConfirmInput = z.object({
  orderId: z.number().int().positive(),
  collectedMinor: z.number().int().min(0).max(10_000_000),
  varianceReason: z.string().trim().min(3).max(500).optional(),
}).strict().superRefine((input, context) => {
  if (input.varianceReason !== undefined && input.varianceReason.length < 3) context.addIssue({ code: z.ZodIssueCode.custom, path: ["varianceReason"], message: "Provide a meaningful variance reason." });
});
export const riderLocationUpdateInput = z.object({ orderId: z.number().int().positive(), latitudeE6: z.number().int().min(-90_000_000).max(90_000_000), longitudeE6: z.number().int().min(-180_000_000).max(180_000_000), accuracyMeters: z.number().int().min(0).max(10_000).optional() }).strict();
const riderCommandKey = z.string().trim().min(16).max(120);
const riderCodCollectionCommandInput = z.object({
  type: z.literal("cod_collection"),
  idempotencyKey: riderCommandKey,
  orderId: z.number().int().positive(),
  collectedMinor: z.number().int().min(0).max(10_000_000),
  varianceReason: z.string().trim().min(3).max(500).optional(),
}).strict().superRefine((input, context) => {
  if (input.varianceReason !== undefined && input.varianceReason.length < 3) context.addIssue({ code: z.ZodIssueCode.custom, path: ["varianceReason"], message: "Provide a meaningful variance reason." });
});
export const riderCommandInput = z.union([
  riderOfferDecisionInput.extend({ type: z.literal("offer_decision"), idempotencyKey: riderCommandKey }),
  riderOrderTransitionInput.extend({ type: z.literal("transition"), idempotencyKey: riderCommandKey }),
  riderCodCollectionCommandInput,
  riderLocationUpdateInput.extend({ type: z.literal("location_update"), idempotencyKey: riderCommandKey }),
  riderAvailabilityInput.extend({ type: z.literal("availability"), idempotencyKey: riderCommandKey }),
]);
export const dispatchRecommendationInput = z.object({ orderId: z.number().int().positive() }).strict();

export type OrderQuoteInput = z.infer<typeof orderQuoteInput>;
export type OrderPlaceInput = z.infer<typeof orderPlaceInput>;
export type RiderAssignmentInput = z.infer<typeof riderAssignmentInput>;
export type RiderCashHistoryFilterInput = z.infer<typeof riderCashHistoryFilterInput>;
export type RiderCommandInput = z.infer<typeof riderCommandInput>;
