import { z } from "zod";

export const adminCredentialSignInInput = z.object({ username: z.string().trim().toLowerCase().min(3).max(80).regex(/^[a-z0-9._-]+$/), password: z.string().min(12).max(256) }).strict();
export const adminCredentialProvisionInput = z.object({ userId: z.number().int().positive(), username: z.string().trim().toLowerCase().min(3).max(80).regex(/^[a-z0-9._-]+$/), temporaryPassword: z.string().min(14).max(256) }).strict();
