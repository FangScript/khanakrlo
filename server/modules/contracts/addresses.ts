import { z } from "zod";

export const customerAddressCreateInput = z.object({ label: z.string().trim().min(1).max(80), recipientName: z.string().trim().min(1).max(160), phoneE164: z.string().trim().regex(/^\+92\d{10}$/), addressLine1: z.string().trim().min(4).max(255), addressLine2: z.string().trim().max(255).optional(), city: z.string().trim().min(2).max(120), instructions: z.string().trim().max(500).optional(), latitudeE6: z.number().int().min(-90_000_000).max(90_000_000), longitudeE6: z.number().int().min(-180_000_000).max(180_000_000), geocodeSource: z.enum(["device", "manual"]).default("device"), makeDefault: z.boolean().default(false) }).strict();
export const customerAddressUpdateInput = customerAddressCreateInput.omit({ makeDefault: true }).extend({ addressId: z.number().int().positive() }).strict();
export const customerAddressIdInput = z.object({ addressId: z.number().int().positive() }).strict();
export type CustomerAddressCreateInput = z.infer<typeof customerAddressCreateInput>;
export type CustomerAddressUpdateInput = z.infer<typeof customerAddressUpdateInput>;
