import * as reviewDomain from "../../review-service";
import type { ReviewCreateInput } from "../contracts/reviews";

export const reviewService = {
  create: (userId: number, input: ReviewCreateInput) => reviewDomain.createReview(userId, input),
  mineForOrder: (userId: number, orderId: number) => reviewDomain.getReviewForCustomer(userId, orderId),
  publicByBusiness: (businessId: number) => reviewDomain.listPublicReviews(businessId),
  businessMine: (userId: number) => reviewDomain.listManagedReviews(userId),
  reply: (userId: number, reviewId: number, reply: string) => reviewDomain.replyToReview(userId, reviewId, reply),
  moderate: (adminUserId: number, reviewId: number, visibility: "published" | "hidden", note?: string) => reviewDomain.moderateReview(adminUserId, reviewId, visibility, note),
};
