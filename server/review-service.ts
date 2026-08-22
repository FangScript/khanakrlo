import { and, desc, eq, inArray } from "drizzle-orm";

import { accountProfiles, auditEvents, businessOrganisations, domainOutboxEvents, orderReviews, orders, reviewPhotoReports, reviewPhotos, workspaceMemberships } from "../drizzle/schema";
import { isNull } from "drizzle-orm";
import type { ReviewCreateInput } from "./modules/contracts/reviews";
import { DomainError } from "./modules/gateway/domain-error";
import { getDb } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";

const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_REVIEW_PHOTOS = 3;
type PhotoAudience = "public" | "business" | "customer" | "admin";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new DomainError("UNAVAILABLE", "Review services are temporarily unavailable.");
  return db;
}

function eventKey(eventType: string, aggregateId: number) {
  return `${eventType}:${aggregateId}:${crypto.randomUUID()}`;
}

async function ownedOrganisationId(db: any, userId: number) {
  const membership = (await db.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.workspaceType, "business"), eq(workspaceMemberships.status, "active"))).limit(1))[0];
  if (!membership?.applicationId) throw new DomainError("FORBIDDEN", "An active Business workspace is required.");
  const organisation = (await db.select().from(businessOrganisations).where(and(eq(businessOrganisations.applicationId, membership.applicationId), eq(businessOrganisations.ownerUserId, userId))).limit(1))[0];
  if (!organisation) throw new DomainError("FORBIDDEN", "This review is outside your Business workspace.");
  return organisation.id;
}

function topics(value: string) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((topic): topic is string => typeof topic === "string") : []; } catch { return []; }
}

function decodeReviewPhoto(dataBase64: string, mimeType: "image/jpeg" | "image/png" | "image/webp") {
  const binary = Buffer.from(dataBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (!binary.length || binary.length > MAX_REVIEW_PHOTO_BYTES) throw new DomainError("VALIDATION", "Review photo must be a valid JPEG, PNG, or WebP smaller than 5 MB.");
  const isJpeg = binary.length >= 3 && binary[0] === 0xff && binary[1] === 0xd8 && binary[2] === 0xff;
  const isPng = binary.length >= 8 && binary.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = binary.length >= 12 && binary.subarray(0, 4).toString("ascii") === "RIFF" && binary.subarray(8, 12).toString("ascii") === "WEBP";
  const detectedMime = isJpeg ? "image/jpeg" : isPng ? "image/png" : isWebp ? "image/webp" : null;
  if (!detectedMime || detectedMime !== mimeType) throw new DomainError("VALIDATION", "Review photo content does not match its declared image type.");
  return { binary, extension: detectedMime === "image/jpeg" ? "jpg" : detectedMime === "image/png" ? "png" : "webp" };
}

function canViewPhoto(privacy: "public" | "business_only" | "platform_only", audience: PhotoAudience) {
  if (audience === "customer" || audience === "admin") return true;
  if (audience === "business") return privacy !== "platform_only";
  return privacy === "public";
}

async function serializeReview(db: any, review: typeof orderReviews.$inferSelect, audience: PhotoAudience = "public") {
  const profile = (await db.select().from(accountProfiles).where(eq(accountProfiles.userId, review.customerUserId)).limit(1))[0];
  const photos = (await db.select().from(reviewPhotos).where(and(eq(reviewPhotos.reviewId, review.id), isNull(reviewPhotos.removedAt)))).filter((photo: typeof reviewPhotos.$inferSelect) => canViewPhoto(photo.privacy, audience));
  const visiblePhotos = await Promise.all(photos.map(async (photo: typeof reviewPhotos.$inferSelect) => ({ id: photo.id, privacy: photo.privacy, url: await storageGetSignedUrl(photo.storageKey) })));
  return {
    id: review.id,
    orderId: review.orderId,
    businessId: review.organisationId,
    rating: review.rating,
    publicComment: review.publicComment,
    feedbackTopics: topics(review.feedbackTopicsJson),
    visibility: review.visibility,
    businessReply: review.businessReply,
    businessRepliedAt: review.businessRepliedAt,
    createdAt: review.createdAt,
    customerName: profile?.givenName ?? "Khana KarLo customer",
    photos: visiblePhotos,
    ...(audience !== "public" ? { privateFeedback: review.privateFeedback, moderationNote: review.moderationNote } : {}),
  };
}

export async function createReview(userId: number, input: ReviewCreateInput) {
  const db = await requireDb();
  const order = (await db.select().from(orders).where(and(eq(orders.id, input.orderId), eq(orders.customerUserId, userId))).limit(1))[0];
  if (!order) throw new DomainError("NOT_FOUND", "Order not found.");
  if (order.status !== "delivered") throw new DomainError("CONFLICT", "You can review an order after it has been delivered.");
  const existing = (await db.select().from(orderReviews).where(eq(orderReviews.orderId, order.id)).limit(1))[0];
  if (existing) throw new DomainError("CONFLICT", "You have already reviewed this delivered order.");
  return db.transaction(async (tx: any) => {
    await tx.insert(orderReviews).values({ orderId: order.id, organisationId: order.organisationId, customerUserId: userId, rating: input.rating, publicComment: input.publicComment ?? null, privateFeedback: input.privateFeedback ?? null, feedbackTopicsJson: JSON.stringify(input.feedbackTopics) });
    const review = (await tx.select().from(orderReviews).where(eq(orderReviews.orderId, order.id)).limit(1))[0];
    if (!review) throw new DomainError("INTERNAL", "Review could not be recorded.");
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "order_review", entityId: String(review.id), action: "order_review_created", nextValue: JSON.stringify({ orderId: order.id, organisationId: order.organisationId, rating: input.rating, feedbackTopics: input.feedbackTopics }) });
    await tx.insert(domainOutboxEvents).values({ domain: "reviews", eventType: "review.created", aggregateType: "order_review", aggregateId: String(review.id), payload: JSON.stringify({ reviewId: review.id, orderId: order.id, organisationId: order.organisationId, customerUserId: userId, rating: input.rating }), deduplicationKey: eventKey("review.created", review.id) });
    return serializeReview(tx, review, "customer");
  });
}

export async function getReviewForCustomer(userId: number, orderId: number) {
  const db = await requireDb();
  const review = (await db.select().from(orderReviews).where(and(eq(orderReviews.orderId, orderId), eq(orderReviews.customerUserId, userId))).limit(1))[0];
  return review ? serializeReview(db, review, "customer") : null;
}

export async function listPublicReviews(organisationId: number, limit = 12) {
  const db = await requireDb();
  const rows = (await db.select().from(orderReviews).where(and(eq(orderReviews.organisationId, organisationId), eq(orderReviews.visibility, "published"))).orderBy(desc(orderReviews.createdAt)).limit(limit));
  return Promise.all(rows.map((review: typeof orderReviews.$inferSelect) => serializeReview(db, review, "public")));
}

export async function getOrganisationReputations(organisationIds: number[]) {
  const db = await requireDb();
  type Reputation = { averageRatingMilli: number | null; reviewCount: number; rankingScoreMilli: number | null };
  if (!organisationIds.length) return new Map<number, Reputation>();
  const reviews = await db.select().from(orderReviews).where(and(inArray(orderReviews.organisationId, organisationIds), eq(orderReviews.visibility, "published")));
  const global = reviews.length ? reviews.reduce((sum: number, review: typeof orderReviews.$inferSelect) => sum + review.rating, 0) / reviews.length : 0;
  const reputations = new Map<number, Reputation>();
  for (const organisationId of organisationIds) {
    const own = reviews.filter((review: typeof orderReviews.$inferSelect) => review.organisationId === organisationId);
    if (!own.length) { reputations.set(organisationId, { averageRatingMilli: null, reviewCount: 0, rankingScoreMilli: null }); continue; }
    const average = own.reduce((sum: number, review: typeof orderReviews.$inferSelect) => sum + review.rating, 0) / own.length;
    const weighted = ((average * own.length) + (global * 3)) / (own.length + 3);
    reputations.set(organisationId, { averageRatingMilli: Math.round(average * 1000), reviewCount: own.length, rankingScoreMilli: Math.round(weighted * 1000) });
  }
  return reputations;
}

export async function listManagedReviews(userId: number) {
  const db = await requireDb();
  const organisationId = await ownedOrganisationId(db, userId);
  const rows = await db.select().from(orderReviews).where(eq(orderReviews.organisationId, organisationId)).orderBy(desc(orderReviews.createdAt));
  return Promise.all(rows.map((review: typeof orderReviews.$inferSelect) => serializeReview(db, review, "business")));
}

export async function uploadReviewPhoto(userId: number, input: { reviewId: number; privacy: "public" | "business_only" | "platform_only"; mimeType: "image/jpeg" | "image/png" | "image/webp"; dataBase64: string }) {
  const db = await requireDb();
  const review = (await db.select().from(orderReviews).where(and(eq(orderReviews.id, input.reviewId), eq(orderReviews.customerUserId, userId))).limit(1))[0];
  if (!review) throw new DomainError("NOT_FOUND", "Review not found for this customer.");
  const existing = await db.select().from(reviewPhotos).where(and(eq(reviewPhotos.reviewId, review.id), isNull(reviewPhotos.removedAt)));
  if (existing.length >= MAX_REVIEW_PHOTOS) throw new DomainError("CONFLICT", `A review can include up to ${MAX_REVIEW_PHOTOS} photos.`);
  const image = decodeReviewPhoto(input.dataBase64, input.mimeType);
  const storage = await storagePut(`review-photos/${review.organisationId}/${review.id}/${crypto.randomUUID()}.${image.extension}`, image.binary, input.mimeType);
  return db.transaction(async (tx: any) => {
    await tx.insert(reviewPhotos).values({ reviewId: review.id, customerUserId: userId, storageKey: storage.key, mimeType: input.mimeType, byteSize: image.binary.length, privacy: input.privacy });
    const photo = (await tx.select().from(reviewPhotos).where(eq(reviewPhotos.storageKey, storage.key)).limit(1))[0];
    if (!photo) throw new DomainError("INTERNAL", "Review photo could not be recorded.");
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "review_photo", entityId: String(photo.id), action: "review_photo_uploaded", nextValue: JSON.stringify({ reviewId: review.id, privacy: input.privacy, mimeType: input.mimeType, byteSize: image.binary.length }) });
    await tx.insert(domainOutboxEvents).values({ domain: "reviews", eventType: "review.photo_uploaded", aggregateType: "order_review", aggregateId: String(review.id), payload: JSON.stringify({ reviewId: review.id, photoId: photo.id, privacy: input.privacy }), deduplicationKey: eventKey("review.photo_uploaded", photo.id) });
    return { id: photo.id, privacy: photo.privacy, url: await storageGetSignedUrl(photo.storageKey) };
  });
}

async function ownedActiveReviewPhoto(db: any, userId: number, photoId: number) {
  const photo = (await db.select().from(reviewPhotos).where(and(eq(reviewPhotos.id, photoId), eq(reviewPhotos.customerUserId, userId), isNull(reviewPhotos.removedAt))).limit(1))[0];
  if (!photo) throw new DomainError("NOT_FOUND", "Review photo not found for this customer.");
  return photo;
}

export async function updateReviewPhotoPrivacy(userId: number, photoId: number, privacy: "public" | "business_only" | "platform_only") {
  const db = await requireDb(); const photo = await ownedActiveReviewPhoto(db, userId, photoId);
  await db.transaction(async (tx: any) => { await tx.update(reviewPhotos).set({ privacy }).where(eq(reviewPhotos.id, photo.id)); await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "review_photo", entityId: String(photo.id), action: "review_photo_privacy_updated", previousValue: JSON.stringify({ privacy: photo.privacy }), nextValue: JSON.stringify({ privacy }) }); await tx.insert(domainOutboxEvents).values({ domain: "reviews", eventType: "review.photo_privacy_updated", aggregateType: "order_review", aggregateId: String(photo.reviewId), payload: JSON.stringify({ reviewId: photo.reviewId, photoId: photo.id, privacy }), deduplicationKey: eventKey("review.photo_privacy_updated", photo.id) }); });
  return { success: true } as const;
}

export async function removeReviewPhoto(userId: number, photoId: number) {
  const db = await requireDb(); const photo = await ownedActiveReviewPhoto(db, userId, photoId); const removedAt = new Date();
  await db.transaction(async (tx: any) => { await tx.update(reviewPhotos).set({ removedAt, removedByUserId: userId }).where(eq(reviewPhotos.id, photo.id)); await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "review_photo", entityId: String(photo.id), action: "review_photo_removed", previousValue: JSON.stringify({ privacy: photo.privacy, storageKey: photo.storageKey }), nextValue: JSON.stringify({ removedAt: removedAt.toISOString() }) }); await tx.insert(domainOutboxEvents).values({ domain: "reviews", eventType: "review.photo_removed", aggregateType: "order_review", aggregateId: String(photo.reviewId), payload: JSON.stringify({ reviewId: photo.reviewId, photoId: photo.id }), deduplicationKey: eventKey("review.photo_removed", photo.id) }); });
  return { success: true } as const;
}

export async function reportPublicReviewPhoto(userId: number, input: { photoId: number; reason: "nudity" | "hate_or_harassment" | "violence" | "spam" | "other"; details?: string }) {
  const db = await requireDb(); const photo = (await db.select().from(reviewPhotos).where(and(eq(reviewPhotos.id, input.photoId), eq(reviewPhotos.privacy, "public"), isNull(reviewPhotos.removedAt))).limit(1))[0];
  if (!photo) throw new DomainError("NOT_FOUND", "Only an active public review photo can be reported.");
  const review = (await db.select().from(orderReviews).where(and(eq(orderReviews.id, photo.reviewId), eq(orderReviews.visibility, "published"))).limit(1))[0];
  if (!review) throw new DomainError("NOT_FOUND", "This public review photo is unavailable.");
  const existing = (await db.select().from(reviewPhotoReports).where(and(eq(reviewPhotoReports.photoId, photo.id), eq(reviewPhotoReports.reporterUserId, userId), eq(reviewPhotoReports.status, "open"))).limit(1))[0];
  if (existing) throw new DomainError("CONFLICT", "You have already reported this photo.");
  await db.transaction(async (tx: any) => { await tx.insert(reviewPhotoReports).values({ photoId: photo.id, reporterUserId: userId, reason: input.reason, details: input.details ?? null }); const report = (await tx.select().from(reviewPhotoReports).where(and(eq(reviewPhotoReports.photoId, photo.id), eq(reviewPhotoReports.reporterUserId, userId), eq(reviewPhotoReports.status, "open"))).limit(1))[0]; if (!report) throw new DomainError("INTERNAL", "Photo report could not be recorded."); await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "review_photo_report", entityId: String(report.id), action: "review_photo_reported", nextValue: JSON.stringify({ photoId: photo.id, reviewId: review.id, reason: input.reason }) }); await tx.insert(domainOutboxEvents).values({ domain: "reviews", eventType: "review.photo_reported", aggregateType: "order_review", aggregateId: String(review.id), payload: JSON.stringify({ reportId: report.id, photoId: photo.id, reason: input.reason }), deduplicationKey: eventKey("review.photo_reported", report.id) }); });
  return { success: true } as const;
}

export async function replyToReview(userId: number, reviewId: number, reply: string) {
  const db = await requireDb();
  const organisationId = await ownedOrganisationId(db, userId);
  const review = (await db.select().from(orderReviews).where(and(eq(orderReviews.id, reviewId), eq(orderReviews.organisationId, organisationId))).limit(1))[0];
  if (!review) throw new DomainError("NOT_FOUND", "Review not found in your Business workspace.");
  const now = new Date();
  await db.transaction(async (tx: any) => {
    await tx.update(orderReviews).set({ businessReply: reply, businessRepliedAt: now, updatedAt: now }).where(eq(orderReviews.id, review.id));
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "order_review", entityId: String(review.id), action: "order_review_replied", nextValue: JSON.stringify({ organisationId, reply }) });
    await tx.insert(domainOutboxEvents).values({ domain: "reviews", eventType: "review.replied", aggregateType: "order_review", aggregateId: String(review.id), payload: JSON.stringify({ reviewId: review.id, organisationId, reply }), deduplicationKey: eventKey("review.replied", review.id) });
  });
  return { success: true } as const;
}

export async function moderateReview(adminUserId: number, reviewId: number, visibility: "published" | "hidden", note?: string) {
  const db = await requireDb();
  const review = (await db.select().from(orderReviews).where(eq(orderReviews.id, reviewId)).limit(1))[0];
  if (!review) throw new DomainError("NOT_FOUND", "Review not found.");
  const now = new Date();
  await db.transaction(async (tx: any) => {
    await tx.update(orderReviews).set({ visibility, moderationNote: note ?? null, moderatedAt: now, moderatedByUserId: adminUserId, updatedAt: now }).where(eq(orderReviews.id, review.id));
    await tx.insert(auditEvents).values({ actorUserId: adminUserId, entityType: "order_review", entityId: String(review.id), action: `order_review_${visibility}`, nextValue: JSON.stringify({ visibility, note: note ?? null }) });
    await tx.insert(domainOutboxEvents).values({ domain: "reviews", eventType: "review.visibility_updated", aggregateType: "order_review", aggregateId: String(review.id), payload: JSON.stringify({ reviewId: review.id, organisationId: review.organisationId, visibility }), deduplicationKey: eventKey("review.visibility_updated", review.id) });
  });
  return { success: true } as const;
}
