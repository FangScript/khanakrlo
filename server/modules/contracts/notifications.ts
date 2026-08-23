import { z } from "zod";

export const expoDeviceTokenRegistrationInput = z.object({
  token: z.string().trim().min(20).max(255),
  platform: z.enum(["ios", "android"]),
}).strict();

export const notificationIdInput = z.object({ notificationId: z.number().int().positive() }).strict();
