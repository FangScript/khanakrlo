import { z } from "zod";

export const supportTicketCreateInput = z.object({ orderId: z.number().int().positive().optional(), category: z.enum(["order", "delivery", "payment", "account", "other"]), subject: z.string().trim().min(3).max(140), message: z.string().trim().min(5).max(1500) }).strict();
export const notificationPreferenceUpdateInput = z.object({ orderUpdatesEnabled: z.boolean(), supportUpdatesEnabled: z.boolean(), promotionsEnabled: z.boolean() }).strict();
