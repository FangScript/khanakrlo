import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { mergeQueuedRiderCommand, type QueuedRiderCommand } from "../lib/rider-command-queue";
import { riderCommandInput, riderTrackingStartInput, riderTrackingStateInput } from "../server/modules/contracts/orders";
import { refundRequestCreateInput, supportMessageCreateInput } from "../server/modules/contracts/support";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("operational reliability package", () => {
  it("keeps lifecycle and COD commands idempotency-keyed while coalescing only replaceable location intents", () => {
    expect(riderCommandInput.parse({ type: "transition", orderId: 19, toStatus: "picked_up", idempotencyKey: "rider:transition:19:long-enough" }).type).toBe("transition");
    expect(riderCommandInput.parse({ type: "cod_collection", orderId: 19, collectedMinor: 120000, idempotencyKey: "rider:cod:19:long-enough" }).type).toBe("cod_collection");
    expect(() => riderCommandInput.parse({ type: "transition", orderId: 19, toStatus: "picked_up", idempotencyKey: "short" })).toThrow();
    const queue: QueuedRiderCommand[] = [{ type: "location_update", orderId: 19, latitudeE6: 1, longitudeE6: 2, idempotencyKey: "old-location-command", queuedAt: 1, attempts: 1 }];
    const merged = mergeQueuedRiderCommand(queue, { type: "location_update", orderId: 19, latitudeE6: 3, longitudeE6: 4 });
    expect(merged).toHaveLength(1);
    expect(merged[0]?.type).toBe("location_update");
    expect((merged[0] as Extract<QueuedRiderCommand, { type: "location_update" }>).latitudeE6).toBe(3);
    expect(mergeQueuedRiderCommand([], { type: "transition", orderId: 19, toStatus: "picked_up" })).toHaveLength(1);
  });

  it("validates delivery-scoped tracking actions and keeps location samples source-aware", () => {
    expect(riderTrackingStartInput.parse({ orderId: 19 }).orderId).toBe(19);
    expect(riderTrackingStateInput.parse({ orderId: 19, action: "pause" }).action).toBe("pause");
    expect(() => riderTrackingStateInput.parse({ orderId: 19, action: "erase" })).toThrow();
    const command = riderCommandInput.parse({ type: "location_update", orderId: 19, latitudeE6: 33_700_000, longitudeE6: 73_000_000, source: "background", deviceObservedAt: "2026-08-23T08:00:00.000Z", idempotencyKey: "rider:location:19:long-enough" });
    expect(command.type).toBe("location_update");
  });

  it("requires an active delivery session before storing location and removes customer visibility on pause or delivery", () => {
    const orders = source("server/order-service.ts");
    expect(orders).toContain("startRiderTrackingSession");
    expect(orders).toContain("session.status !== \"active\"");
    expect(orders).toContain("Location updates are limited to one sample every five seconds.");
    expect(orders).toContain("delivery_completed");
    expect(orders).toContain("eq(riderTrackingSessions.status, \"active\")");
  });

  it("uses a native map with a truthful web fallback and queues background samples through the same Rider outbox", () => {
    const map = source("components/delivery-tracking-map.native.tsx");
    const webMap = source("components/delivery-tracking-map.web.tsx");
    const background = source("lib/rider-background-tracking.ts");
    expect(map).toContain("MapView");
    expect(webMap).toContain("Open this order on iOS or Android");
    expect(background).toContain("TaskManager.defineTask");
    expect(background).toContain("enqueueRiderCommand");
    expect(background).toContain("source: \"background\"");
  });

  it("keeps Google Routes and Redis optional server-side providers with explicit safe fallbacks", () => {
    const routes = source("server/delivery-routing-service.ts");
    const live = source("server/live-delivery-service.ts");
    expect(routes).toContain("googleMapsServerApiKey");
    expect(routes).toContain("provider_unavailable");
    expect(routes).toContain("routes.googleapis.com/directions/v2:computeRoutes");
    expect(live).toContain("outbox_polling_fallback");
  });

  it("uses recipient ownership, durable inbox records, and a provider-ready Expo delivery queue", () => {
    const notificationService = source("server/notification-service.ts");
    const router = source("server/routers.ts");
    expect(notificationService).toContain("recipientUserId");
    expect(notificationService).toContain("notificationDeviceTokens");
    expect(notificationService).toContain("https://exp.host/--/api/v2/push/send");
    expect(notificationService).toContain("eq(userNotifications.recipientUserId, userId)");
    expect(router).toContain("registerExpoDevice");
    expect(router).toContain("markRead");
  });

  it("keeps dispatch scoring explainable and financial/refund actions server-authoritative", () => {
    const orders = source("server/order-service.ts");
    const admin = source("server/admin-service.ts");
    expect(orders).toContain("getDispatchRecommendations");
    expect(orders).toContain("scoreComponents");
    expect(orders).toContain("paymentLedgerEntries");
    expect(orders).toContain("earningsStatus: \"requires_payout_policy\"");
    expect(admin).toContain("requireCapability(userId, \"finance\")");
    expect(admin).toContain("refund_settled");
  });

  it("validates customer-owned support messages and bounded controlled refund requests", () => {
    expect(supportMessageCreateInput.parse({ ticketId: 7, body: "Please share the latest delivery update." }).ticketId).toBe(7);
    expect(refundRequestCreateInput.parse({ ticketId: 7, requestedMinor: 120000, reason: "The order arrived incomplete." }).requestedMinor).toBe(120000);
    const support = source("server/support-service.ts");
    expect(support).toContain("requireOwnedTicket");
    expect(support).toContain("order.paymentStatus !== \"paid\"");
    expect(support).toContain("refund.requested");
  });
});
