/**
 * Provider-ready, deliberately inactive contracts. They encode future Admin
 * review payloads without sending messages, invoking AI, processing payments,
 * issuing refunds, or producing fiscal documents.
 */
export type AiLowConfidenceReviewEvent = { source: "whatsapp" | "voice_note"; externalMessageId: string; confidenceBps: number; proposedOrderPayload: string; receivedAt: string };
export type PaymentRefundReviewRequest = { orderId: number; amountMinor: number; currency: "PKR"; reason: string; requestedByUserId: number };
export type FiscalReportingRequest = { periodStart: string; periodEnd: string; jurisdiction: "PK"; reportKind: "commission_summary" | "tax_invoice" };
export type GlobalConfigurationChangeRequest = { key: "delivery_fee_policy" | "payment_gateway" | "promotional_banner"; proposedValue: string; requestedByUserId: number };

export const DEFERRED_ADMIN_INTEGRATIONS = {
  aiReview: "requires WhatsApp ingestion, menu grounding, confidence policy, and retention approval",
  refunds: "requires payment-provider credentials, refund authorization matrix, and reconciliation policy",
  fiscalReporting: "requires Pakistan tax and FBR validation before export generation",
  globalConfiguration: "requires change-control ownership and an audited approval policy",
} as const;
