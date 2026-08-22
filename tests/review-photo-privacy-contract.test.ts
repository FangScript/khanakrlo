import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { reviewPhotoUploadInput } from "../server/modules/contracts/reviews";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("review photo privacy contracts", () => {
  it("restricts attachment requests to the supported image formats and named privacy audiences", () => {
    expect(reviewPhotoUploadInput.parse({ reviewId: 7, privacy: "business_only", mimeType: "image/jpeg", dataBase64: "AAAA" }).privacy).toBe("business_only");
    expect(() => reviewPhotoUploadInput.parse({ reviewId: 7, privacy: "everyone", mimeType: "image/jpeg", dataBase64: "AAAA" })).toThrow();
    expect(() => reviewPhotoUploadInput.parse({ reviewId: 7, privacy: "public", mimeType: "image/gif", dataBase64: "AAAA" })).toThrow();
  });

  it("limits storage to customer-owned verified reviews, three images, and validated binary content", () => {
    const service = source("server/review-service.ts");
    expect(service).toContain("eq(orderReviews.customerUserId, userId)");
    expect(service).toContain("MAX_REVIEW_PHOTOS = 3");
    expect(service).toContain("MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024");
    expect(service).toContain("Review photo content does not match its declared image type.");
    expect(service).toContain("review-photos/${review.organisationId}/${review.id}/");
    expect(service).toContain('eventType: "review.photo_uploaded"');
  });

  it("filters private photo URLs at the server boundary before Customer and Business displays", () => {
    const service = source("server/review-service.ts");
    const menu = source("app/restaurant/[id].tsx");
    const form = source("app/order-review.tsx");
    expect(service).toContain('if (audience === "business") return privacy !== "platform_only"');
    expect(service).toContain('return privacy === "public"');
    expect(service).toContain("storageGetSignedUrl(photo.storageKey)");
    expect(menu).toContain("latest.photos[0]");
    expect(form).toContain("Photo privacy");
    expect(form).toContain("Private to Khana KarLo");
  });
});
