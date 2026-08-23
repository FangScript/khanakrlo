import { z } from "zod";

export const supportTicketCreateInput = z.object({ orderId: z.number().int().positive().optional(), category: z.enum(["order", "delivery", "payment", "account", "other"]), subject: z.string().trim().min(3).max(140), message: z.string().trim().min(5).max(1500) }).strict();
export const notificationPreferenceUpdateInput = z.object({ orderUpdatesEnabled: z.boolean(), supportUpdatesEnabled: z.boolean(), promotionsEnabled: z.boolean() }).strict();
export const supportTicketIdInput = z.object({ ticketId: z.number().int().positive() }).strict();
export const supportMessageCreateInput = z.object({ ticketId: z.number().int().positive(), body: z.string().trim().min(1).max(2000) }).strict();
export const refundRequestCreateInput = z.object({ ticketId: z.number().int().positive(), requestedMinor: z.number().int().positive().max(10_000_000), reason: z.string().trim().min(5).max(1000) }).strict();
