import { and, desc, eq, inArray } from "drizzle-orm";

import { accountProfiles, auditEvents, businessOrganisations, domainOutboxEvents, orderReviews, orders, workspaceMemberships } from "../drizzle/schema";
import type { ReviewCreateInput } from "./modules/contracts/reviews";
import { DomainError } from "./modules/gateway/domain-error";
import { getDb } from "./db";

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

async function serializeReview(db: any, review: typeof orderReviews.$inferSelect, includePrivate = false) {
  const profile = (await db.select().from(accountProfiles).where(eq(accountProfiles.userId, review.customerUserId)).limit(1))[0];
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
    ...(includePrivate ? { privateFeedback: review.privateFeedback, moderationNote: review.moderationNote } : {}),
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
    return serializeReview(tx, review, true);
  });
}

export async function getReviewForCustomer(userId: number, orderId: number) {
  const db = await requireDb();
  const review = (await db.select().from(orderReviews).where(and(eq(orderReviews.orderId, orderId), eq(orderReviews.customerUserId, userId))).limit(1))[0];
  return review ? serializeReview(db, review, true) : null;
}

export async function listPublicReviews(organisationId: number, limit = 12) {
  const db = await requireDb();
  const rows = (await db.select().from(orderReviews).where(and(eq(orderReviews.organisationId, organisationId), eq(orderReviews.visibility, "published"))).orderBy(desc(orderReviews.createdAt)).limit(limit));
  return Promise.all(rows.map((review: typeof orderReviews.$inferSelect) => serializeReview(db, review)));
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
  return Promise.all(rows.map((review: typeof orderReviews.$inferSelect) => serializeReview(db, review, true)));
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
