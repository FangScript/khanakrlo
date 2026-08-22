import { and, desc, eq } from "drizzle-orm";

import { adminOperationalCases, adminStaffRoles, auditEvents, domainOutboxEvents, reviewPhotoReports, riderCashSettlementReceipts, supportTickets, users } from "../drizzle/schema";
import { getDb } from "./db";
import { suspendBusinessWorkspace, restoreBusinessWorkspace } from "./business-service";
import { DomainError } from "./modules/gateway/domain-error";

export type AdminStaffRole = "support_agent" | "moderation_agent" | "finance_operator" | "senior_operations";
type Capability = "support" | "moderation" | "finance" | "business_emergency";
const allowedRoles: Record<Capability, AdminStaffRole[]> = {
  support: ["support_agent", "senior_operations"],
  moderation: ["moderation_agent", "senior_operations"],
  finance: ["finance_operator", "senior_operations"],
  business_emergency: ["senior_operations"],
};
const eventKey = (type: string, id: number) => `${type}:${id}:${crypto.randomUUID()}`;

async function requireDb() { const db = await getDb(); if (!db) throw new DomainError("UNAVAILABLE", "Admin operations are temporarily unavailable."); return db; }
async function requireAdminIdentity(userId: number) {
  const db = await requireDb();
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user || user.role !== "admin") throw new DomainError("FORBIDDEN", "Administrator access is required.");
  const staffAssignment = (await db.select().from(adminStaffRoles).where(eq(adminStaffRoles.userId, userId)).limit(1))[0];
  if (staffAssignment?.status === "inactive") throw new DomainError("FORBIDDEN", "Your internal staff access is inactive.");
  const staffRole = (staffAssignment?.staffRole ?? "senior_operations") as AdminStaffRole;
  return { db, staffRole };
}
async function requireCapability(userId: number, capability: Capability) {
  const { db, staffRole } = await requireAdminIdentity(userId);
  if (!allowedRoles[capability].includes(staffRole)) throw new DomainError("FORBIDDEN", "Your staff role cannot perform this operation.");
  return { db, staffRole };
}
async function audit(actorUserId: number, entityType: string, entityId: number, action: string, nextValue: unknown) {
  const db = await requireDb();
  await db.insert(auditEvents).values({ actorUserId, entityType, entityId: String(entityId), action, nextValue: JSON.stringify(nextValue) });
}

export async function getAdminOperationalQueue(userId: number) {
  const { db, staffRole } = await requireAdminIdentity(userId);
  const canSupport = allowedRoles.support.includes(staffRole);
  const canModerate = allowedRoles.moderation.includes(staffRole);
  const canFinance = allowedRoles.finance.includes(staffRole);
  const canEmergency = allowedRoles.business_emergency.includes(staffRole);
  const [tickets, reports, businessCases, financeCases, receipts] = await Promise.all([
    canSupport ? db.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt)).limit(100) : Promise.resolve([]),
    canModerate ? db.select().from(reviewPhotoReports).orderBy(desc(reviewPhotoReports.createdAt)).limit(100) : Promise.resolve([]),
    canEmergency ? db.select().from(adminOperationalCases).where(eq(adminOperationalCases.caseType, "business_emergency")).orderBy(desc(adminOperationalCases.updatedAt)).limit(100) : Promise.resolve([]),
    canFinance ? db.select().from(adminOperationalCases).where(eq(adminOperationalCases.caseType, "rider_remittance")).orderBy(desc(adminOperationalCases.updatedAt)).limit(100) : Promise.resolve([]),
    canFinance ? db.select().from(riderCashSettlementReceipts).orderBy(desc(riderCashSettlementReceipts.issuedAt)).limit(100) : Promise.resolve([]),
  ]);
  await audit(userId, "admin_operational_queue", userId, "admin_queue_viewed", { staffRole, sections: ["support", "moderation", "business_emergency", "rider_remittance"] });
  return {
    staffRole,
    supportTickets: tickets.map((ticket) => ({ id: ticket.id, category: ticket.category, subject: ticket.subject, status: ticket.status, orderId: ticket.orderId, customerReference: `Customer #${ticket.customerUserId}`, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt })),
    photoReports: reports.map((report) => ({ id: report.id, photoId: report.photoId, reason: report.reason, status: report.status, createdAt: report.createdAt })),
    operationalCases: [...businessCases, ...financeCases].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()),
    remittanceReceipts: receipts.map((receipt) => ({ id: receipt.id, riderUserId: receipt.riderUserId, receiptCode: receipt.receiptCode, amountMinor: receipt.amountMinor, balanceAfterMinor: receipt.balanceAfterMinor, issuedAt: receipt.issuedAt })),
  };
}

export async function updateAdminSupportTicket(userId: number, input: { ticketId: number; status: "open" | "in_progress" | "resolved" | "closed"; internalNote?: string }) {
  const { db } = await requireCapability(userId, "support");
  const ticket = (await db.select().from(supportTickets).where(eq(supportTickets.id, input.ticketId)).limit(1))[0];
  if (!ticket) throw new DomainError("NOT_FOUND", "Support ticket not found.");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(supportTickets).set({ status: input.status, updatedAt: now }).where(eq(supportTickets.id, input.ticketId));
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "support_ticket", entityId: String(input.ticketId), action: "admin_support_ticket_updated", previousValue: JSON.stringify({ status: ticket.status }), nextValue: JSON.stringify({ status: input.status, internalNote: input.internalNote ?? null }) });
    await tx.insert(domainOutboxEvents).values({ domain: "support", eventType: "support.ticket_admin_updated", aggregateType: "support_ticket", aggregateId: String(input.ticketId), payload: JSON.stringify({ ticketId: input.ticketId, status: input.status }), deduplicationKey: eventKey("support.ticket_admin_updated", input.ticketId) });
  });
  return { id: input.ticketId, status: input.status };
}

export async function updateAdminPhotoReport(userId: number, input: { reportId: number; status: "resolved" | "dismissed"; internalNote?: string }) {
  const { db } = await requireCapability(userId, "moderation");
  const report = (await db.select().from(reviewPhotoReports).where(eq(reviewPhotoReports.id, input.reportId)).limit(1))[0];
  if (!report) throw new DomainError("NOT_FOUND", "Photo report not found.");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(reviewPhotoReports).set({ status: input.status, reviewedByUserId: userId, reviewedAt: now }).where(eq(reviewPhotoReports.id, input.reportId));
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "review_photo_report", entityId: String(input.reportId), action: "admin_photo_report_updated", previousValue: JSON.stringify({ status: report.status }), nextValue: JSON.stringify({ status: input.status, internalNote: input.internalNote ?? null }) });
    await tx.insert(domainOutboxEvents).values({ domain: "moderation", eventType: "review_photo_report.updated", aggregateType: "review_photo_report", aggregateId: String(input.reportId), payload: JSON.stringify({ reportId: input.reportId, status: input.status }), deduplicationKey: eventKey("review_photo_report.updated", input.reportId) });
  });
  return { id: input.reportId, status: input.status };
}

export async function openBusinessEmergencyCase(userId: number, input: { applicationId: number; reason: string; priority: "normal" | "high" | "critical"; reviewDueAt?: string }) {
  const { db } = await requireCapability(userId, "business_emergency");
  await suspendBusinessWorkspace(userId, input.applicationId, input.reason);
  const now = new Date();
  await db.insert(adminOperationalCases).values({ caseType: "business_emergency", targetId: input.applicationId, status: "open", priority: input.priority, reason: input.reason, openedByUserId: userId, reviewDueAt: input.reviewDueAt ? new Date(input.reviewDueAt) : null, createdAt: now, updatedAt: now });
  return { success: true } as const;
}

export async function restoreBusinessEmergency(userId: number, applicationId: number) {
  const { db } = await requireCapability(userId, "business_emergency");
  await restoreBusinessWorkspace(userId, applicationId);
  const now = new Date();
  await db.update(adminOperationalCases).set({ status: "resolved", resolvedByUserId: userId, updatedAt: now }).where(and(eq(adminOperationalCases.caseType, "business_emergency"), eq(adminOperationalCases.targetId, applicationId), eq(adminOperationalCases.status, "open")));
  await audit(userId, "admin_operational_case", applicationId, "business_emergency_case_restored", { applicationId });
  return { success: true } as const;
}

export async function openRemittanceReviewCase(userId: number, input: { receiptId: number; reason: string; priority: "normal" | "high" | "critical"; reviewDueAt?: string }) {
  const { db } = await requireCapability(userId, "finance");
  const receipt = (await db.select().from(riderCashSettlementReceipts).where(eq(riderCashSettlementReceipts.id, input.receiptId)).limit(1))[0];
  if (!receipt) throw new DomainError("NOT_FOUND", "Rider settlement receipt not found.");
  const now = new Date();
  const result = await db.insert(adminOperationalCases).values({ caseType: "rider_remittance", targetId: receipt.id, status: "open", priority: input.priority, reason: input.reason, openedByUserId: userId, reviewDueAt: input.reviewDueAt ? new Date(input.reviewDueAt) : null, createdAt: now, updatedAt: now });
  const caseId = Number(result[0].insertId);
  await audit(userId, "rider_cash_settlement_receipt", receipt.id, "admin_remittance_review_opened", { caseId, receiptCode: receipt.receiptCode, reason: input.reason });
  return { caseId };
}

export async function updateAdminOperationalCase(userId: number, input: { caseId: number; status: "open" | "in_progress" | "resolved" | "dismissed"; internalNote?: string }) {
  const { db } = await requireCapability(userId, "support");
  const caseRow = (await db.select().from(adminOperationalCases).where(eq(adminOperationalCases.id, input.caseId)).limit(1))[0];
  if (!caseRow) throw new DomainError("NOT_FOUND", "Operational case not found.");
  const needsFinance = caseRow.caseType === "rider_remittance";
  if (needsFinance) await requireCapability(userId, "finance");
  if (caseRow.caseType === "business_emergency") await requireCapability(userId, "business_emergency");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(adminOperationalCases).set({ status: input.status, internalNote: input.internalNote ?? caseRow.internalNote, assignedAdminUserId: userId, resolvedByUserId: input.status === "resolved" || input.status === "dismissed" ? userId : null, updatedAt: now }).where(eq(adminOperationalCases.id, input.caseId));
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "admin_operational_case", entityId: String(input.caseId), action: "admin_case_updated", previousValue: JSON.stringify({ status: caseRow.status }), nextValue: JSON.stringify({ status: input.status, internalNote: input.internalNote ?? null }) });
  });
  return { id: input.caseId, status: input.status };
}
