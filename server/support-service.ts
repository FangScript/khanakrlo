import { and, desc, eq, inArray } from "drizzle-orm";

import { domainOutboxEvents, notificationPreferences, orders, paymentLedgerEntries, refundRequests, supportTicketMessages, supportTickets } from "../drizzle/schema";
import { getDb } from "./db";
import { DomainError } from "./modules/gateway/domain-error";
import { createUserNotification } from "./notification-service";

const key = (type: string, id: number) => `${type}:${id}:${crypto.randomUUID()}`;
async function dbOrThrow() { const db = await getDb(); if (!db) throw new DomainError("UNAVAILABLE", "Support is temporarily unavailable."); return db; }

async function requireOwnedTicket(db: any, userId: number, ticketId: number) {
  const ticket = (await db.select().from(supportTickets).where(and(eq(supportTickets.id, ticketId), eq(supportTickets.customerUserId, userId))).limit(1))[0];
  if (!ticket) throw new DomainError("NOT_FOUND", "Support case not found.");
  return ticket;
}

export async function listSupportTickets(userId: number) { const db = await dbOrThrow(); return db.select().from(supportTickets).where(eq(supportTickets.customerUserId, userId)).orderBy(desc(supportTickets.updatedAt)); }

export async function getSupportTicket(userId: number, ticketId: number) {
  const db = await dbOrThrow();
  const ticket = await requireOwnedTicket(db, userId, ticketId);
  const [messages, refunds] = await Promise.all([
    db.select().from(supportTicketMessages).where(and(eq(supportTicketMessages.ticketId, ticketId), eq(supportTicketMessages.visibility, "customer_visible"))).orderBy(supportTicketMessages.createdAt),
    db.select().from(refundRequests).where(and(eq(refundRequests.supportTicketId, ticketId), eq(refundRequests.customerUserId, userId))).orderBy(desc(refundRequests.createdAt)),
  ]);
  return { ticket, messages, refunds };
}

export async function createSupportTicket(userId: number, input: { orderId?: number; category: "order" | "delivery" | "payment" | "account" | "other"; subject: string; message: string }) {
  const db = await dbOrThrow();
  return db.transaction(async (tx) => {
    if (input.orderId) {
      const order = (await tx.select().from(orders).where(and(eq(orders.id, input.orderId), eq(orders.customerUserId, userId))).limit(1))[0];
      if (!order) throw new DomainError("FORBIDDEN", "You can only request support for your own order.");
    }
    const result = await tx.insert(supportTickets).values({ customerUserId: userId, ...input });
    const ticketId = Number(result[0].insertId);
    const ticket = (await tx.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1))[0];
    if (!ticket) throw new DomainError("INTERNAL", "Support ticket could not be created.");
    await tx.insert(supportTicketMessages).values({ ticketId, authorUserId: userId, authorType: "customer", visibility: "customer_visible", body: input.message });
    await tx.insert(domainOutboxEvents).values({ domain: "support", eventType: "support.ticket_created", aggregateType: "support_ticket", aggregateId: String(ticket.id), payload: JSON.stringify({ ticketId: ticket.id, customerUserId: userId, orderId: input.orderId ?? null }), deduplicationKey: key("support.ticket_created", ticket.id) });
    return ticket;
  });
}

export async function addCustomerSupportMessage(userId: number, input: { ticketId: number; body: string }) {
  const db = await dbOrThrow();
  const ticket = await requireOwnedTicket(db, userId, input.ticketId);
  if (ticket.status === "closed") throw new DomainError("CONFLICT", "This support case is closed.");
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const messageResult = await tx.insert(supportTicketMessages).values({ ticketId: ticket.id, authorUserId: userId, authorType: "customer", visibility: "customer_visible", body: input.body });
    const messageId = Number(messageResult[0].insertId);
    await tx.update(supportTickets).set({ status: ticket.status === "resolved" ? "in_progress" : ticket.status, updatedAt: now }).where(eq(supportTickets.id, ticket.id));
    await tx.insert(domainOutboxEvents).values({ domain: "support", eventType: "support.customer_replied", aggregateType: "support_ticket", aggregateId: String(ticket.id), payload: JSON.stringify({ ticketId: ticket.id, customerUserId: userId, orderId: ticket.orderId }), deduplicationKey: key("support.customer_replied", messageId) });
    return (await tx.select().from(supportTicketMessages).where(eq(supportTicketMessages.id, messageId)).limit(1))[0];
  });
  if (!result) throw new DomainError("INTERNAL", "Support reply could not be recorded.");
  return result;
}

export async function createRefundRequest(userId: number, input: { ticketId: number; requestedMinor: number; reason: string }) {
  const db = await dbOrThrow();
  const ticket = await requireOwnedTicket(db, userId, input.ticketId);
  if (!ticket.orderId) throw new DomainError("VALIDATION", "A refund request must be linked to an order support case.");
  return db.transaction(async (tx) => {
    const order = (await tx.select().from(orders).where(and(eq(orders.id, ticket.orderId!), eq(orders.customerUserId, userId))).limit(1))[0];
    if (!order) throw new DomainError("FORBIDDEN", "This refund request is outside your order history.");
    if (order.paymentStatus !== "paid") throw new DomainError("CONFLICT", "A refund can be requested only after payment collection is confirmed.");
    if (input.requestedMinor > order.totalMinor) throw new DomainError("VALIDATION", "The requested refund cannot exceed the order total.");
    const active = await tx.select().from(refundRequests).where(and(eq(refundRequests.supportTicketId, ticket.id), inArray(refundRequests.status, ["requested", "approved"])));
    if (active.length) throw new DomainError("CONFLICT", "This support case already has an active refund request.");
    const refundResult = await tx.insert(refundRequests).values({ orderId: order.id, supportTicketId: ticket.id, customerUserId: userId, requestedMinor: input.requestedMinor, reason: input.reason, status: "requested" });
    const refundRequestId = Number(refundResult[0].insertId);
    await tx.insert(paymentLedgerEntries).values({ orderId: order.id, organisationId: order.organisationId, refundRequestId, partyType: "customer", entryType: "refund_requested", amountMinor: -input.requestedMinor, status: "pending", reference: `refund-requested:${refundRequestId}` });
    await tx.insert(supportTicketMessages).values({ ticketId: ticket.id, authorType: "system", visibility: "customer_visible", body: `Refund request received for PKR ${(input.requestedMinor / 100).toFixed(2)}. A finance operator will review it; no payment is issued automatically.` });
    await tx.update(supportTickets).set({ status: "in_progress", updatedAt: new Date() }).where(eq(supportTickets.id, ticket.id));
    await tx.insert(domainOutboxEvents).values({ domain: "finance", eventType: "refund.requested", aggregateType: "refund_request", aggregateId: String(refundRequestId), payload: JSON.stringify({ refundRequestId, orderId: order.id, customerUserId: userId, requestedMinor: input.requestedMinor, supportTicketId: ticket.id }), deduplicationKey: key("refund.requested", refundRequestId) });
    return (await tx.select().from(refundRequests).where(eq(refundRequests.id, refundRequestId)).limit(1))[0];
  });
}

export async function getNotificationPreferences(userId: number) { const db = await dbOrThrow(); return (await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1))[0] ?? { orderUpdatesEnabled: true, supportUpdatesEnabled: true, promotionsEnabled: false }; }
export async function updateNotificationPreferences(userId: number, input: { orderUpdatesEnabled: boolean; supportUpdatesEnabled: boolean; promotionsEnabled: boolean }) { const db = await dbOrThrow(); await db.insert(notificationPreferences).values({ userId, ...input }).onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } }); return getNotificationPreferences(userId); }

/** Shared by staff operations only after its credential/MFA gateway and role checks have succeeded. */
export async function notifyCustomerAboutSupport(actorUserId: number, ticketId: number, title: string, body: string) {
  const db = await dbOrThrow();
  const ticket = (await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1))[0];
  if (!ticket) return;
  await createUserNotification({ recipientUserId: ticket.customerUserId, category: "support", title, body, route: `/support/${ticket.id}`, orderId: ticket.orderId, supportTicketId: ticket.id, deduplicationKey: `support:${ticket.id}:${actorUserId}:${Date.now()}` });
}
