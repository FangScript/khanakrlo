import { and, asc, eq, isNull, lte, or } from "drizzle-orm";

import { domainOutboxEvents } from "../../../drizzle/schema";
import { getDb } from "../../db";
import type { DomainEventEnvelope } from "./contracts";

export const OUTBOX_BATCH_LIMIT = 100;

export function nextOutboxRetryAt(attempts: number, now = new Date()): Date {
  const boundedAttempts = Math.max(0, Math.min(attempts, 8));
  const delaySeconds = Math.min(30 * 2 ** boundedAttempts, 30 * 60);
  return new Date(now.getTime() + delaySeconds * 1000);
}

export async function enqueueOutboxEvent(event: DomainEventEnvelope): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Event outbox is unavailable.");
  await db.insert(domainOutboxEvents).values({
    domain: event.domain,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: JSON.stringify(event.payload),
    deduplicationKey: event.deduplicationKey,
  }).onDuplicateKeyUpdate({ set: { processedAt: null, attempts: 0, lastError: null } });
}

export async function listPendingOutboxEvents(limit = OUTBOX_BATCH_LIMIT) {
  const db = await getDb();
  if (!db) throw new Error("Event outbox is unavailable.");
  return db.select().from(domainOutboxEvents)
    .where(and(isNull(domainOutboxEvents.processedAt), or(isNull(domainOutboxEvents.nextAttemptAt), lte(domainOutboxEvents.nextAttemptAt, new Date()))))
    .orderBy(asc(domainOutboxEvents.occurredAt))
    .limit(Math.max(1, Math.min(limit, OUTBOX_BATCH_LIMIT)));
}

export async function markOutboxEventProcessed(eventId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Event outbox is unavailable.");
  await db.update(domainOutboxEvents).set({ processedAt: new Date(), nextAttemptAt: null, lastError: null }).where(eq(domainOutboxEvents.id, eventId));
}

export async function markOutboxEventFailed(eventId: number, message: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Event outbox is unavailable.");
  const event = (await db.select().from(domainOutboxEvents).where(eq(domainOutboxEvents.id, eventId)).limit(1))[0];
  if (!event) throw new Error("Outbox event was not found.");
  const attempts = event.attempts + 1;
  await db.update(domainOutboxEvents).set({ attempts, nextAttemptAt: nextOutboxRetryAt(attempts), lastError: message.slice(0, 2000) }).where(eq(domainOutboxEvents.id, eventId));
}
