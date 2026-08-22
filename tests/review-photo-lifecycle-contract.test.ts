import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { reviewPhotoPrivacyUpdateInput, reviewPhotoRemoveInput, reviewPhotoReportInput } from "../server/modules/contracts/reviews";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("review photo lifecycle contracts", () => {
  it("validates privacy updates, removal identifiers, and constrained public-report reasons", () => {
    expect(reviewPhotoPrivacyUpdateInput.parse({ photoId: 3, privacy: "platform_only" }).privacy).toBe("platform_only");
    expect(reviewPhotoRemoveInput.parse({ photoId: 3 }).photoId).toBe(3);
    expect(reviewPhotoReportInput.parse({ photoId: 3, reason: "spam" }).reason).toBe("spam");
    expect(() => reviewPhotoReportInput.parse({ photoId: 3, reason: "not_for_me" })).toThrow();
  });

  it("enforces photo-owner edits, soft removal filtering, and public-only reporting", () => {
    const service = source("server/review-service.ts");
    expect(service).toContain("eq(reviewPhotos.customerUserId, userId)");
    expect(service).toContain("isNull(reviewPhotos.removedAt)");
    expect(service).toContain("review_photo_privacy_updated");
    expect(service).toContain("review_photo_removed");
    expect(service).toContain('eq(reviewPhotos.privacy, "public")');
    expect(service).toContain('eq(orderReviews.visibility, "published")');
    expect(service).toContain('eventType: "review.photo_reported"');
  });

  it("provides camera capture, submitted-photo controls, and an in-context public report action", () => {
    const reviewForm = source("app/order-review.tsx");
    const menu = source("app/restaurant/[id].tsx");
    expect(reviewForm).toContain("requestCameraPermissionsAsync");
    expect(reviewForm).toContain("launchCameraAsync");
    expect(reviewForm).toContain("SubmittedPhotoManager");
    expect(reviewForm).toContain("removePhoto");
    expect(menu).toContain("reportPublicPhoto");
    expect(menu).toContain("Report public review photo");
  });
});
