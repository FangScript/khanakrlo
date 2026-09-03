import { and, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";

import { notificationDeliveries, notificationDeviceTokens, notificationPreferences, userNotifications } from "../drizzle/schema";
import { getDb } from "./db";
import { DomainError } from "./modules/gateway/domain-error";

type NotificationCategory = "order" | "rider_offer" | "support" | "finance" | "system";
type NotificationInput = {
  recipientUserId: number;
  category: NotificationCategory;
  title: string;
  body: string;
  route?: string | null;
  orderId?: number | null;
  supportTicketId?: number | null;
  deduplicationKey: string;
};

type ExpoReceipt = { status?: "ok" | "error"; id?: string; message?: string; details?: { error?: string } };

async function requireDb() {
  const db = await getDb();
  if (!db) throw new DomainError("UNAVAILABLE", "Notifications are temporarily unavailable.");
  return db;
}

function preferenceAllows(preferences: typeof notificationPreferences.$inferSelect | undefined, category: NotificationCategory) {
  if (category === "order" || category === "rider_offer" || category === "finance") return preferences?.orderUpdatesEnabled ?? true;
  if (category === "support") return preferences?.supportUpdatesEnabled ?? true;
  return true;
}

/** Creates the durable in-app item first. Expo dispatch is best effort and retries retain queue state. */
export async function createUserNotification(input: NotificationInput) {
  const db = await requireDb();
  const notification = await db.transaction(async (tx) => {
    const existing = (await tx.select().from(userNotifications).where(eq(userNotifications.deduplicationKey, input.deduplicationKey)).limit(1))[0];
    if (existing) return existing;
    const preferences = (await tx.select().from(notificationPreferences).where(eq(notificationPreferences.userId, input.recipientUserId)).limit(1))[0];
    const allowed = preferenceAllows(preferences, input.category);
    const [createdRow] = await tx.insert(userNotifications).values({ ...input }).returning({ id: userNotifications.id });
    const notificationId = createdRow.id;
    const created = (await tx.select().from(userNotifications).where(eq(userNotifications.id, notificationId)).limit(1))[0];
    if (!created) throw new DomainError("INTERNAL", "The in-app notification could not be recorded.");
    await tx.insert(notificationDeliveries).values({ notificationId, channel: "in_app", status: "delivered", deliveredAt: new Date() });
    const tokens = await tx.select().from(notificationDeviceTokens).where(and(eq(notificationDeviceTokens.userId, input.recipientUserId), eq(notificationDeviceTokens.status, "active")));
    if (tokens.length) {
      await tx.insert(notificationDeliveries).values(tokens.map((token: typeof notificationDeviceTokens.$inferSelect) => ({ notificationId, deviceTokenId: token.id, channel: "expo_push" as const, status: allowed ? "queued" as const : "suppressed" as const, nextAttemptAt: allowed ? new Date() : null })));
    }
    return created;
  });
  void deliverPendingExpoNotifications(20).catch(() => undefined);
  return notification;
}

export async function registerExpoDeviceToken(userId: number, input: { token: string; platform: "ios" | "android" }) {
  const db = await requireDb();
  const now = new Date();
  await db.insert(notificationDeviceTokens).values({ userId, token: input.token, platform: input.platform, status: "active", lastSeenAt: now, disabledAt: null, failureReason: null }).onConflictDoUpdate({ target: notificationDeviceTokens.token, set: { userId, platform: input.platform, status: "active", lastSeenAt: now, disabledAt: null, failureReason: null, updatedAt: now } });
  return { registered: true as const, lastSeenAt: now };
}

export async function listMyNotifications(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(userNotifications).where(eq(userNotifications.recipientUserId, userId)).orderBy(desc(userNotifications.createdAt)).limit(100);
  return { notifications: rows, unreadCount: rows.filter((row: typeof userNotifications.$inferSelect) => !row.readAt).length };
}

export async function markMyNotificationRead(userId: number, notificationId: number) {
  const db = await requireDb();
  const notification = (await db.select().from(userNotifications).where(and(eq(userNotifications.id, notificationId), eq(userNotifications.recipientUserId, userId))).limit(1))[0];
  if (!notification) throw new DomainError("NOT_FOUND", "Notification not found.");
  if (!notification.readAt) await db.update(userNotifications).set({ readAt: new Date() }).where(eq(userNotifications.id, notificationId));
  return { id: notificationId, readAt: notification.readAt ?? new Date() };
}

function nextAttempt(attempts: number) {
  return new Date(Date.now() + Math.min(30 * 60_000, 30_000 * 2 ** Math.max(0, attempts - 1)));
}

/**
 * Best-effort Expo transport. It can be called by a future scheduled worker, but keeps reliable state now
 * without pretending a provider acknowledgement or gateway settlement exists.
 */
export async function deliverPendingExpoNotifications(limit = 25) {
  const db = await requireDb();
  const now = new Date();
  const pending = await db.select().from(notificationDeliveries).where(and(eq(notificationDeliveries.channel, "expo_push"), eq(notificationDeliveries.status, "queued"), or(isNull(notificationDeliveries.nextAttemptAt), lte(notificationDeliveries.nextAttemptAt, now)))).orderBy(notificationDeliveries.createdAt).limit(limit);
  let delivered = 0;
  for (const delivery of pending) {
    const [notification, device] = await Promise.all([
      db.select().from(userNotifications).where(eq(userNotifications.id, delivery.notificationId)).limit(1),
      delivery.deviceTokenId ? db.select().from(notificationDeviceTokens).where(eq(notificationDeviceTokens.id, delivery.deviceTokenId)).limit(1) : Promise.resolve([]),
    ]);
    const notificationRow = notification[0];
    const deviceRow = device[0];
    if (!notificationRow || !deviceRow || deviceRow.status !== "active") {
      await db.update(notificationDeliveries).set({ status: "suppressed", lastError: "Notification or active device token no longer available.", updatedAt: now }).where(eq(notificationDeliveries.id, delivery.id));
      continue;
    }
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json", ...(process.env.EXPO_PUSH_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}` } : {}) },
        body: JSON.stringify({ to: deviceRow.token, sound: "default", title: notificationRow.title, body: notificationRow.body, data: { url: notificationRow.route ?? undefined, notificationId: notificationRow.id } }),
      });
      const payload = await response.json().catch(() => null) as { data?: ExpoReceipt } | null;
      const receipt = payload?.data;
      if (!response.ok || receipt?.status === "error") throw new Error(receipt?.message ?? receipt?.details?.error ?? `Expo Push returned ${response.status}`);
      await db.update(notificationDeliveries).set({ status: "delivered", attempts: delivery.attempts + 1, providerMessageId: receipt?.id ?? null, lastError: null, nextAttemptAt: null, deliveredAt: now, updatedAt: now }).where(eq(notificationDeliveries.id, delivery.id));
      delivered += 1;
    } catch (error) {
      const attempts = delivery.attempts + 1;
      const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "Expo Push delivery failed.";
      const terminal = attempts >= 5;
      await db.update(notificationDeliveries).set({ status: terminal ? "failed" : "queued", attempts, lastError: errorMessage, nextAttemptAt: terminal ? null : nextAttempt(attempts), updatedAt: now }).where(eq(notificationDeliveries.id, delivery.id));
      if (/DeviceNotRegistered/i.test(errorMessage)) await db.update(notificationDeviceTokens).set({ status: "disabled", disabledAt: now, failureReason: errorMessage, updatedAt: now }).where(eq(notificationDeviceTokens.id, deviceRow.id));
    }
  }
  return { delivered, inspected: pending.length };
}
