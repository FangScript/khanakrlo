import { z } from "zod";

export const REVIEW_TOPICS = ["food_quality", "delivery", "value", "packaging", "other"] as const;

const optionalCopy = z.string().trim().max(1000).optional().transform((value) => value || undefined);

export const reviewCreateInput = z.object({
  orderId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  publicComment: optionalCopy,
  privateFeedback: optionalCopy,
  feedbackTopics: z.array(z.enum(REVIEW_TOPICS)).max(3).default([]),
}).refine((value) => Boolean(value.publicComment || value.privateFeedback || value.feedbackTopics.length), { message: "Add a comment, feedback topic, or private note with your rating." });

export const reviewOrderInput = z.object({ orderId: z.number().int().positive() });
export const reviewBusinessInput = z.object({ businessId: z.number().int().positive() });
export const reviewReplyInput = z.object({ reviewId: z.number().int().positive(), reply: z.string().trim().min(1).max(1000) });
export const reviewModerationInput = z.object({ reviewId: z.number().int().positive(), visibility: z.enum(["published", "hidden"]), note: z.string().trim().max(500).optional().transform((value) => value || undefined) });
export const reviewPhotoUploadInput = z.object({
  reviewId: z.number().int().positive(),
  privacy: z.enum(["public", "business_only", "platform_only"]),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  dataBase64: z.string().min(4).max(7_000_000),
});

export type ReviewCreateInput = z.infer<typeof reviewCreateInput>;
