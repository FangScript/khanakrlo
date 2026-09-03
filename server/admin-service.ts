import { and, desc, eq, inArray } from "drizzle-orm";

import { adminAiTriageAssessments, adminAiTriageFeedback, adminCaseAssignments, adminCaseEscalations, adminOperationalCases, adminStaffRoleEvents, adminStaffRoles, auditEvents, businessOrganisations, domainOutboxEvents, orderReviews, orders, paymentLedgerEntries, refundRequests, reviewPhotoReports, reviewPhotos, riderCashAccountEntries, riderCashSettlementReceipts, supportTicketMessages, supportTickets, users, workspaceApplications } from "../drizzle/schema";
import { getDb } from "./db";
import { suspendBusinessWorkspace, restoreBusinessWorkspace } from "./business-service";
import { DomainError } from "./modules/gateway/domain-error";
import { storageGetSignedUrl } from "./storage";
import { invokeLLM } from "./_core/llm";
import { createUserNotification } from "./notification-service";

export type AdminStaffRole = "support_agent" | "moderation_agent" | "finance_operator" | "senior_operations";
type Capability = "support" | "moderation" | "finance" | "business_emergency";
const allowedRoles: Record<Capability, AdminStaffRole[]> = {
  support: ["support_agent", "senior_operations"],
  moderation: ["moderation_agent", "senior_operations"],
  finance: ["finance_operator", "senior_operations"],
  business_emergency: ["senior_operations"],
};
const eventKey = (type: string, id: number) => `${type}:${id}:${crypto.randomUUID()}`;
const SLA_MINUTES: Record<"normal" | "high" | "critical", number> = { normal: 24 * 60, high: 4 * 60, critical: 60 };
const caseCapability = (caseType: "business_emergency" | "rider_remittance"): Capability => caseType === "business_emergency" ? "business_emergency" : "finance";
const caseDueAt = (priority: "normal" | "high" | "critical", requestedDueAt?: string) => requestedDueAt ? new Date(requestedDueAt) : new Date(Date.now() + SLA_MINUTES[priority] * 60_000);
function slaSnapshot(caseRow: typeof adminOperationalCases.$inferSelect, now = new Date()) {
  if (!caseRow.reviewDueAt || caseRow.status === "resolved" || caseRow.status === "dismissed") return { dueAt: caseRow.reviewDueAt, state: "not_applicable" as const, minutesRemaining: null };
  const minutesRemaining = Math.floor((caseRow.reviewDueAt.getTime() - now.getTime()) / 60_000);
  return { dueAt: caseRow.reviewDueAt, state: minutesRemaining < 0 ? "breached" as const : minutesRemaining <= 60 ? "at_risk" as const : "on_track" as const, minutesRemaining };
}
async function materializeSlaEscalations(db: any, cases: (typeof adminOperationalCases.$inferSelect)[]) {
  const candidates = cases.filter((caseRow) => ["at_risk", "breached"].includes(slaSnapshot(caseRow).state));
  if (!candidates.length) return [];
  const existing = await db.select().from(adminCaseEscalations).where(inArray(adminCaseEscalations.caseId, candidates.map((caseRow) => caseRow.id)));
  const created: typeof adminCaseEscalations.$inferSelect[] = [];
  for (const caseRow of candidates) {
    const severity = slaSnapshot(caseRow).state as "at_risk" | "breached";
    if (existing.some((row: typeof adminCaseEscalations.$inferSelect) => row.caseId === caseRow.id && row.severity === severity)) continue;
    const result = await db.insert(adminCaseEscalations).values({ caseId: caseRow.id, severity, triggeredAt: new Date() });
    const escalationId = Number(result[0].insertId);
    const escalation = (await db.select().from(adminCaseEscalations).where(eq(adminCaseEscalations.id, escalationId)).limit(1))[0];
    if (escalation) created.push(escalation);
  }
  return created;
}

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
  const operationalCases = [...businessCases, ...financeCases].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  await materializeSlaEscalations(db, operationalCases);
  const caseIds = operationalCases.map((caseRow) => caseRow.id);
  const [assignments, escalations] = await Promise.all([
    caseIds.length ? db.select().from(adminCaseAssignments).where(inArray(adminCaseAssignments.caseId, caseIds)).orderBy(desc(adminCaseAssignments.createdAt)) : Promise.resolve([]),
    caseIds.length ? db.select().from(adminCaseEscalations).where(inArray(adminCaseEscalations.caseId, caseIds)).orderBy(desc(adminCaseEscalations.triggeredAt)) : Promise.resolve([]),
  ]);
  const activeEscalations = escalations.filter((escalation: typeof adminCaseEscalations.$inferSelect) => !escalation.acknowledgedAt);
  await audit(userId, "admin_operational_queue", userId, "admin_queue_viewed", { staffRole, sections: ["support", "moderation", "business_emergency", "rider_remittance"], activeEscalations: activeEscalations.length });
  return {
    staffRole,
    supportTickets: tickets.map((ticket) => ({ id: ticket.id, category: ticket.category, subject: ticket.subject, status: ticket.status, orderId: ticket.orderId, customerReference: `Customer #${ticket.customerUserId}`, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt })),
    photoReports: reports.map((report) => ({ id: report.id, photoId: report.photoId, reason: report.reason, status: report.status, createdAt: report.createdAt })),
    operationalCases: operationalCases.map((caseRow) => ({ ...caseRow, sla: slaSnapshot(caseRow), latestAssignment: assignments.find((assignment: typeof adminCaseAssignments.$inferSelect) => assignment.caseId === caseRow.id) ?? null })),
    escalationAlerts: activeEscalations.map((escalation: typeof adminCaseEscalations.$inferSelect) => ({ ...escalation, case: operationalCases.find((caseRow) => caseRow.id === escalation.caseId) ?? null })),
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
  await db.insert(adminOperationalCases).values({ caseType: "business_emergency", targetId: input.applicationId, status: "open", priority: input.priority, reason: input.reason, openedByUserId: userId, reviewDueAt: caseDueAt(input.priority, input.reviewDueAt), createdAt: now, updatedAt: now });
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
  const [createdCase] = await db.insert(adminOperationalCases).values({ caseType: "rider_remittance", targetId: receipt.id, status: "open", priority: input.priority, reason: input.reason, openedByUserId: userId, reviewDueAt: caseDueAt(input.priority, input.reviewDueAt), createdAt: now, updatedAt: now }).returning({ id: adminOperationalCases.id });
  const caseId = createdCase.id;
  await audit(userId, "rider_cash_settlement_receipt", receipt.id, "admin_remittance_review_opened", { caseId, receiptCode: receipt.receiptCode, reason: input.reason });
  return { caseId };
}

export async function updateAdminOperationalCase(userId: number, input: { caseId: number; status: "open" | "in_progress" | "resolved" | "dismissed"; internalNote?: string }) {
  const { db } = await requireAdminIdentity(userId);
  const caseRow = (await db.select().from(adminOperationalCases).where(eq(adminOperationalCases.id, input.caseId)).limit(1))[0];
  if (!caseRow) throw new DomainError("NOT_FOUND", "Operational case not found.");
  await requireCapability(userId, caseCapability(caseRow.caseType));
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(adminOperationalCases).set({ status: input.status, internalNote: input.internalNote ?? caseRow.internalNote, assignedAdminUserId: userId, resolvedByUserId: input.status === "resolved" || input.status === "dismissed" ? userId : null, updatedAt: now }).where(eq(adminOperationalCases.id, input.caseId));
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "admin_operational_case", entityId: String(input.caseId), action: "admin_case_updated", previousValue: JSON.stringify({ status: caseRow.status }), nextValue: JSON.stringify({ status: input.status, internalNote: input.internalNote ?? null }) });
  });
  return { id: input.caseId, status: input.status };
}

export async function assignAdminOperationalCase(userId: number, input: { caseId: number; assignedToUserId: number; note?: string }) {
  const { db } = await requireAdminIdentity(userId);
  const caseRow = (await db.select().from(adminOperationalCases).where(eq(adminOperationalCases.id, input.caseId)).limit(1))[0];
  if (!caseRow) throw new DomainError("NOT_FOUND", "Operational case not found.");
  const capability = caseCapability(caseRow.caseType);
  await requireCapability(userId, capability);
  const target = (await db.select().from(users).where(eq(users.id, input.assignedToUserId)).limit(1))[0];
  if (!target || target.role !== "admin") throw new DomainError("VALIDATION", "Cases can only be assigned to an existing internal Admin identity.");
  const targetAssignment = (await db.select().from(adminStaffRoles).where(eq(adminStaffRoles.userId, input.assignedToUserId)).limit(1))[0];
  const targetRole = (targetAssignment?.staffRole ?? "senior_operations") as AdminStaffRole;
  if (targetAssignment?.status === "inactive" || !allowedRoles[capability].includes(targetRole)) throw new DomainError("FORBIDDEN", "The selected staff member does not have the required active role for this case.");
  const now = new Date();
  const assignmentType = caseRow.assignedAdminUserId ? "reassigned" as const : "assigned" as const;
  await db.transaction(async (tx) => {
    await tx.update(adminOperationalCases).set({ assignedAdminUserId: input.assignedToUserId, status: caseRow.status === "open" ? "in_progress" : caseRow.status, updatedAt: now }).where(eq(adminOperationalCases.id, caseRow.id));
    await tx.insert(adminCaseAssignments).values({ caseId: caseRow.id, assignedByUserId: userId, assignedToUserId: input.assignedToUserId, assignmentType, note: input.note ?? null, createdAt: now });
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "admin_operational_case", entityId: String(caseRow.id), action: `admin_case_${assignmentType}`, previousValue: JSON.stringify({ assignedAdminUserId: caseRow.assignedAdminUserId }), nextValue: JSON.stringify({ assignedToUserId: input.assignedToUserId, note: input.note ?? null }) });
  });
  return { caseId: caseRow.id, assignedToUserId: input.assignedToUserId, assignmentType };
}

export async function acknowledgeAdminSlaEscalation(userId: number, escalationId: number) {
  const { db } = await requireAdminIdentity(userId);
  const escalation = (await db.select().from(adminCaseEscalations).where(eq(adminCaseEscalations.id, escalationId)).limit(1))[0];
  if (!escalation) throw new DomainError("NOT_FOUND", "SLA escalation not found.");
  const caseRow = (await db.select().from(adminOperationalCases).where(eq(adminOperationalCases.id, escalation.caseId)).limit(1))[0];
  if (!caseRow) throw new DomainError("NOT_FOUND", "Escalated case not found.");
  await requireCapability(userId, caseCapability(caseRow.caseType));
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(adminCaseEscalations).set({ acknowledgedByUserId: userId, acknowledgedAt: now }).where(eq(adminCaseEscalations.id, escalationId));
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "admin_case_escalation", entityId: String(escalationId), action: "admin_sla_escalation_acknowledged", nextValue: JSON.stringify({ caseId: caseRow.id, severity: escalation.severity }) });
  });
  return { id: escalationId, acknowledgedAt: now };
}

export async function bulkModerateAdminPhotoReports(userId: number, input: { reportIds: number[]; action: "resolved" | "dismissed"; confirmation: string; internalNote?: string }) {
  const { db } = await requireCapability(userId, "moderation");
  const expectedConfirmation = `CONFIRM ${input.reportIds.length} PHOTO REPORT${input.reportIds.length === 1 ? "" : "S"}`;
  if (input.confirmation !== expectedConfirmation) throw new DomainError("VALIDATION", `Type exactly “${expectedConfirmation}” to confirm this bulk moderation action.`);
  const [reports, assessments] = await Promise.all([
    db.select().from(reviewPhotoReports).where(inArray(reviewPhotoReports.id, input.reportIds)),
    db.select().from(adminAiTriageAssessments).where(and(eq(adminAiTriageAssessments.subjectType, "photo_report"), inArray(adminAiTriageAssessments.subjectId, input.reportIds))),
  ]);
  if (reports.length !== input.reportIds.length) throw new DomainError("NOT_FOUND", "One or more selected photo reports no longer exist.");
  const unassessedIds = input.reportIds.filter((reportId) => !assessments.some((assessment: typeof adminAiTriageAssessments.$inferSelect) => assessment.subjectId === reportId));
  if (unassessedIds.length) throw new DomainError("CONFLICT", "Bulk moderation is limited to photo reports with an existing AI advisory assessment.");
  if (reports.some((report: typeof reviewPhotoReports.$inferSelect) => report.status !== "open")) throw new DomainError("CONFLICT", "Bulk moderation can only include currently open photo reports.");
  const now = new Date();
  await db.transaction(async (tx) => {
    for (const report of reports) {
      await tx.update(reviewPhotoReports).set({ status: input.action, reviewedByUserId: userId, reviewedAt: now }).where(eq(reviewPhotoReports.id, report.id));
      await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "review_photo_report", entityId: String(report.id), action: "admin_photo_report_bulk_moderated", previousValue: JSON.stringify({ status: report.status }), nextValue: JSON.stringify({ status: input.action, internalNote: input.internalNote ?? null, confirmation: expectedConfirmation }) });
    }
    await tx.insert(domainOutboxEvents).values({ domain: "moderation", eventType: "review_photo_report.bulk_moderated", aggregateType: "review_photo_report_batch", aggregateId: input.reportIds.join(","), payload: JSON.stringify({ reportIds: input.reportIds, action: input.action, actorUserId: userId }), deduplicationKey: eventKey("review_photo_report.bulk_moderated", input.reportIds[0]) });
  });
  return { moderatedReportIds: input.reportIds, action: input.action, confirmation: expectedConfirmation };
}

export async function getAdminCaseDetail(userId: number, input: { subjectType: "support_ticket" | "photo_report" | "business_emergency" | "rider_remittance"; subjectId: number }) {
  const capability: Record<typeof input.subjectType, Capability> = { support_ticket: "support", photo_report: "moderation", business_emergency: "business_emergency", rider_remittance: "finance" };
  const { db, staffRole } = await requireCapability(userId, capability[input.subjectType]);
  let detail: Record<string, unknown>;
  let triageSubjectType: "photo_report" | "business_emergency" | null = null;

  if (input.subjectType === "support_ticket") {
    const ticket = (await db.select().from(supportTickets).where(eq(supportTickets.id, input.subjectId)).limit(1))[0];
    if (!ticket) throw new DomainError("NOT_FOUND", "Support ticket not found.");
    const order = ticket.orderId ? (await db.select({ id: orders.id, publicId: orders.publicId, status: orders.status, paymentMethod: orders.paymentMethod, paymentStatus: orders.paymentStatus, totalMinor: orders.totalMinor, settlementStatus: orders.settlementStatus, placedAt: orders.placedAt }).from(orders).where(eq(orders.id, ticket.orderId)).limit(1))[0] : null;
    detail = { type: "support_ticket", ticket: { id: ticket.id, category: ticket.category, subject: ticket.subject, message: ticket.message, status: ticket.status, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt, customerReference: `Customer #${ticket.customerUserId}` }, orderContext: order ?? null };
  } else if (input.subjectType === "photo_report") {
    const report = (await db.select().from(reviewPhotoReports).where(eq(reviewPhotoReports.id, input.subjectId)).limit(1))[0];
    if (!report) throw new DomainError("NOT_FOUND", "Photo report not found.");
    const photo = (await db.select().from(reviewPhotos).where(eq(reviewPhotos.id, report.photoId)).limit(1))[0];
    if (!photo) throw new DomainError("NOT_FOUND", "Reported photo not found.");
    const review = (await db.select({ id: orderReviews.id, orderId: orderReviews.orderId, organisationId: orderReviews.organisationId, rating: orderReviews.rating, visibility: orderReviews.visibility, publicComment: orderReviews.publicComment, createdAt: orderReviews.createdAt }).from(orderReviews).where(eq(orderReviews.id, photo.reviewId)).limit(1))[0];
    detail = { type: "photo_report", report: { id: report.id, photoId: report.photoId, reason: report.reason, details: report.details, status: report.status, createdAt: report.createdAt, reporterReference: `Customer #${report.reporterUserId}` }, photo: { id: photo.id, mimeType: photo.mimeType, privacy: photo.privacy, byteSize: photo.byteSize, url: await storageGetSignedUrl(photo.storageKey) }, review: review ?? null };
    triageSubjectType = "photo_report";
  } else if (input.subjectType === "business_emergency") {
    const caseRow = (await db.select().from(adminOperationalCases).where(and(eq(adminOperationalCases.id, input.subjectId), eq(adminOperationalCases.caseType, "business_emergency"))).limit(1))[0];
    if (!caseRow) throw new DomainError("NOT_FOUND", "Business emergency case not found.");
    const application = (await db.select({ id: workspaceApplications.id, displayName: workspaceApplications.displayName, city: workspaceApplications.city, status: workspaceApplications.status }).from(workspaceApplications).where(eq(workspaceApplications.id, caseRow.targetId)).limit(1))[0];
    const organisation = application ? (await db.select({ id: businessOrganisations.id, displayName: businessOrganisations.displayName, status: businessOrganisations.status }).from(businessOrganisations).where(eq(businessOrganisations.applicationId, application.id)).limit(1))[0] : null;
    detail = { type: "business_emergency", case: caseRow, business: application ? { applicationId: application.id, displayName: organisation?.displayName ?? application.displayName, city: application.city, applicationStatus: application.status, operationalStatus: organisation?.status ?? null } : null };
    triageSubjectType = "business_emergency";
  } else {
    const receipt = (await db.select().from(riderCashSettlementReceipts).where(eq(riderCashSettlementReceipts.id, input.subjectId)).limit(1))[0];
    if (!receipt) throw new DomainError("NOT_FOUND", "Rider remittance receipt not found.");
    const entry = (await db.select({ id: riderCashAccountEntries.id, entryType: riderCashAccountEntries.entryType, amountMinor: riderCashAccountEntries.amountMinor, balanceAfterMinor: riderCashAccountEntries.balanceAfterMinor, reference: riderCashAccountEntries.reference, createdAt: riderCashAccountEntries.createdAt }).from(riderCashAccountEntries).where(eq(riderCashAccountEntries.id, receipt.cashAccountEntryId)).limit(1))[0];
    const relatedCases = await db.select().from(adminOperationalCases).where(and(eq(adminOperationalCases.caseType, "rider_remittance"), eq(adminOperationalCases.targetId, receipt.id))).orderBy(desc(adminOperationalCases.updatedAt));
    let reconciledOrderIds: number[] = []; try { const parsed = JSON.parse(receipt.reconciledOrderIdsJson); reconciledOrderIds = Array.isArray(parsed) ? parsed.filter((value): value is number => typeof value === "number") : []; } catch { /* retain an empty safe summary */ }
    detail = { type: "rider_remittance", receipt: { id: receipt.id, receiptCode: receipt.receiptCode, riderReference: `Rider #${receipt.riderUserId}`, amountMinor: receipt.amountMinor, balanceAfterMinor: receipt.balanceAfterMinor, issuedAt: receipt.issuedAt, reconciledOrderIds }, ledgerEntry: entry ?? null, relatedCases };
  }
  const assessments = triageSubjectType ? await db.select().from(adminAiTriageAssessments).where(and(eq(adminAiTriageAssessments.subjectType, triageSubjectType), eq(adminAiTriageAssessments.subjectId, input.subjectId))).orderBy(desc(adminAiTriageAssessments.createdAt)) : [];
  await audit(userId, "admin_case_detail", input.subjectId, "admin_case_detail_viewed", { subjectType: input.subjectType, staffRole, triageAssessments: assessments.length });
  return { ...detail, assessments };
}

export async function listAdminStaffDirectory(userId: number) {
  const { db } = await requireCapability(userId, "business_emergency");
  const [staffUsers, assignments, events] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(eq(users.role, "admin")).orderBy(users.id),
    db.select().from(adminStaffRoles).orderBy(adminStaffRoles.updatedAt),
    db.select().from(adminStaffRoleEvents).orderBy(desc(adminStaffRoleEvents.createdAt)).limit(100),
  ]);
  await audit(userId, "admin_staff_directory", userId, "admin_staff_directory_viewed", { adminIdentityCount: staffUsers.length });
  return { staff: staffUsers.map((staffUser) => ({ ...staffUser, assignment: assignments.find((assignment) => assignment.userId === staffUser.id) ?? null })), events };
}

export async function provisionAdminStaffRole(userId: number, input: { userId: number; staffRole: AdminStaffRole; status: "active" | "inactive"; note?: string }) {
  const { db } = await requireCapability(userId, "business_emergency");
  if (input.userId === userId && input.status === "inactive") throw new DomainError("CONFLICT", "You cannot deactivate your own senior-operator access.");
  const target = (await db.select().from(users).where(eq(users.id, input.userId)).limit(1))[0];
  if (!target || target.role !== "admin") throw new DomainError("VALIDATION", "Staff provisioning is limited to existing internal Admin identities.");
  const previous = (await db.select().from(adminStaffRoles).where(eq(adminStaffRoles.userId, input.userId)).limit(1))[0];
  const action = !previous ? "provisioned" : input.status === "inactive" ? "deactivated" : previous.status === "inactive" ? "reactivated" : "delegated";
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(adminStaffRoles).values({ userId: input.userId, staffRole: input.staffRole, status: input.status, grantedByUserId: userId, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: adminStaffRoles.userId, set: { staffRole: input.staffRole, status: input.status, grantedByUserId: userId, updatedAt: now } });
    await tx.insert(adminStaffRoleEvents).values({ targetUserId: input.userId, actorUserId: userId, previousRole: previous?.staffRole ?? null, nextRole: input.staffRole, action, note: input.note ?? null, createdAt: now });
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "admin_staff_role", entityId: String(input.userId), action: `admin_staff_role_${action}`, previousValue: JSON.stringify(previous ? { staffRole: previous.staffRole, status: previous.status } : null), nextValue: JSON.stringify({ staffRole: input.staffRole, status: input.status, note: input.note ?? null }) });
    await tx.insert(domainOutboxEvents).values({ domain: "admin", eventType: `admin.staff_role_${action}`, aggregateType: "user", aggregateId: String(input.userId), payload: JSON.stringify({ targetUserId: input.userId, staffRole: input.staffRole, status: input.status }), deduplicationKey: eventKey(`admin.staff_role_${action}`, input.userId) });
  });
  return { userId: input.userId, staffRole: input.staffRole, status: input.status, action };
}

const triageOutputSchema = {
  name: "admin_advisory_triage",
  strict: true,
  schema: {
    type: "object",
    properties: {
      assessmentSummary: { type: "string" },
      confidenceBps: { type: "integer", minimum: 0, maximum: 10000 },
      recommendedPriority: { type: "string", enum: ["normal", "high", "critical"] },
      suggestedDisposition: { type: "string", enum: ["retain_for_human_review", "prioritize_review", "additional_evidence_needed"] },
      safetySignals: { type: "array", items: { type: "string" } },
    },
    required: ["assessmentSummary", "confidenceBps", "recommendedPriority", "suggestedDisposition", "safetySignals"],
    additionalProperties: false,
  },
} as const;

type AdvisoryTriage = { assessmentSummary: string; confidenceBps: number; recommendedPriority: "normal" | "high" | "critical"; suggestedDisposition: "retain_for_human_review" | "prioritize_review" | "additional_evidence_needed"; safetySignals: string[] };
function parseAdvisoryTriage(value: string): AdvisoryTriage {
  const parsed = JSON.parse(value) as Partial<AdvisoryTriage>;
  const confidenceBps = parsed.confidenceBps;
  const recommendedPriority = parsed.recommendedPriority;
  const suggestedDisposition = parsed.suggestedDisposition;
  if (typeof parsed.assessmentSummary !== "string" || typeof confidenceBps !== "number" || !Number.isInteger(confidenceBps) || !["normal", "high", "critical"].includes(recommendedPriority ?? "") || !["retain_for_human_review", "prioritize_review", "additional_evidence_needed"].includes(suggestedDisposition ?? "") || !Array.isArray(parsed.safetySignals) || !parsed.safetySignals.every((signal) => typeof signal === "string")) throw new DomainError("INTERNAL", "AI triage returned an invalid advisory response.");
  return { assessmentSummary: parsed.assessmentSummary.slice(0, 1000), confidenceBps: Math.max(0, Math.min(10000, confidenceBps)), recommendedPriority: recommendedPriority as AdvisoryTriage["recommendedPriority"], suggestedDisposition: suggestedDisposition as AdvisoryTriage["suggestedDisposition"], safetySignals: parsed.safetySignals.slice(0, 12).map((signal) => signal.slice(0, 180)) };
}

/** AI triage is deliberately advisory: it creates a pending human-review record and cannot write moderation, Business, order, or cash states. */
export async function runAdminAiTriage(userId: number, input: { subjectType: "photo_report" | "business_emergency"; subjectId: number }) {
  const capability: Record<typeof input.subjectType, Capability> = { photo_report: "moderation", business_emergency: "business_emergency" };
  const { db } = await requireCapability(userId, capability[input.subjectType]);
  let inputSummary: string;
  let userContent: { type: "text"; text: string }[] | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "low" } })[];

  if (input.subjectType === "photo_report") {
    const report = (await db.select().from(reviewPhotoReports).where(eq(reviewPhotoReports.id, input.subjectId)).limit(1))[0];
    if (!report) throw new DomainError("NOT_FOUND", "Photo report not found.");
    const photo = (await db.select().from(reviewPhotos).where(eq(reviewPhotos.id, report.photoId)).limit(1))[0];
    if (!photo) throw new DomainError("NOT_FOUND", "Reported photo not found.");
    inputSummary = `Photo report #${report.id}; reason=${report.reason}; reporter details=${report.details?.slice(0, 500) ?? "none"}; mime=${photo.mimeType}; privacy=${photo.privacy}.`;
    const signedUrl = await storageGetSignedUrl(photo.storageKey);
    userContent = [{ type: "text", text: inputSummary }, { type: "image_url", image_url: { url: signedUrl, detail: "low" } }];
  } else {
    const caseRow = (await db.select().from(adminOperationalCases).where(and(eq(adminOperationalCases.id, input.subjectId), eq(adminOperationalCases.caseType, "business_emergency"))).limit(1))[0];
    if (!caseRow) throw new DomainError("NOT_FOUND", "Business emergency case not found.");
    const application = (await db.select({ displayName: workspaceApplications.displayName, city: workspaceApplications.city, status: workspaceApplications.status }).from(workspaceApplications).where(eq(workspaceApplications.id, caseRow.targetId)).limit(1))[0];
    inputSummary = `Business emergency case #${caseRow.id}; priority=${caseRow.priority}; status=${caseRow.status}; reason=${caseRow.reason}; business=${application?.displayName ?? "unknown"}; city=${application?.city ?? "unknown"}; applicationStatus=${application?.status ?? "unknown"}.`;
    userContent = [{ type: "text", text: inputSummary }];
  }

  const response = await invokeLLM({
    model: "gpt-5-mini",
    outputSchema: triageOutputSchema,
    messages: [
      { role: "system", content: "You are Khana KarLo's internal triage assistant. Provide only an advisory assessment. Never direct automatic removal, suspension, refund, payout, status change, or enforcement. Respect the user-provided report reason, identify uncertainty, and recommend human review when in doubt." },
      { role: "user", content: userContent },
    ],
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new DomainError("INTERNAL", "AI triage did not return structured content.");
  const advisory = parseAdvisoryTriage(content);
  const now = new Date();
  const [createdAssessment] = await db.insert(adminAiTriageAssessments).values({ subjectType: input.subjectType, subjectId: input.subjectId, requestedByUserId: userId, model: "gpt-5-mini", inputSummary, assessmentSummary: advisory.assessmentSummary, confidenceBps: advisory.confidenceBps, recommendedPriority: advisory.recommendedPriority, suggestedDisposition: advisory.suggestedDisposition, safetySignalsJson: JSON.stringify(advisory.safetySignals), reviewState: "pending_human_review", createdAt: now }).returning({ id: adminAiTriageAssessments.id });
  const assessmentId = createdAssessment.id;
  await db.transaction(async (tx) => {
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "admin_ai_triage_assessment", entityId: String(assessmentId), action: "admin_ai_triage_requested", nextValue: JSON.stringify({ subjectType: input.subjectType, subjectId: input.subjectId, model: "gpt-5-mini", confidenceBps: advisory.confidenceBps, suggestedDisposition: advisory.suggestedDisposition, reviewState: "pending_human_review" }) });
    await tx.insert(domainOutboxEvents).values({ domain: "admin", eventType: "admin.ai_triage_completed", aggregateType: "admin_ai_triage_assessment", aggregateId: String(assessmentId), payload: JSON.stringify({ assessmentId, subjectType: input.subjectType, subjectId: input.subjectId, confidenceBps: advisory.confidenceBps, reviewState: "pending_human_review" }), deduplicationKey: eventKey("admin.ai_triage_completed", assessmentId) });
  });
  return { assessmentId, ...advisory, reviewState: "pending_human_review" as const };
}

export async function reviewAdminAiTriage(userId: number, input: { assessmentId: number; reviewState: "acknowledged" | "overridden" }) {
  const { db } = await requireAdminIdentity(userId);
  const assessment = (await db.select().from(adminAiTriageAssessments).where(eq(adminAiTriageAssessments.id, input.assessmentId)).limit(1))[0];
  if (!assessment) throw new DomainError("NOT_FOUND", "AI triage assessment not found.");
  const capability: Capability = assessment.subjectType === "photo_report" ? "moderation" : "business_emergency";
  await requireCapability(userId, capability);
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(adminAiTriageAssessments).set({ reviewState: input.reviewState, humanReviewedByUserId: userId, humanReviewedAt: now }).where(eq(adminAiTriageAssessments.id, input.assessmentId));
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "admin_ai_triage_assessment", entityId: String(input.assessmentId), action: "admin_ai_triage_human_reviewed", previousValue: JSON.stringify({ reviewState: assessment.reviewState }), nextValue: JSON.stringify({ reviewState: input.reviewState }) });
  });
  return { id: input.assessmentId, reviewState: input.reviewState };
}

export async function submitAdminAiTriageFeedback(userId: number, input: { assessmentId: number; outcome: "confirmed_accurate" | "false_positive" | "false_negative" | "needs_more_evidence"; note?: string }) {
  const { db } = await requireAdminIdentity(userId);
  const assessment = (await db.select().from(adminAiTriageAssessments).where(eq(adminAiTriageAssessments.id, input.assessmentId)).limit(1))[0];
  if (!assessment) throw new DomainError("NOT_FOUND", "AI triage assessment not found.");
  const capability: Capability = assessment.subjectType === "photo_report" ? "moderation" : "business_emergency";
  await requireCapability(userId, capability);
  if (assessment.reviewState === "pending_human_review") throw new DomainError("CONFLICT", "A human must acknowledge or override the AI assessment before recording quality feedback.");
  const now = new Date();
  const [createdFeedback] = await db.insert(adminAiTriageFeedback).values({ assessmentId: assessment.id, submittedByUserId: userId, outcome: input.outcome, note: input.note ?? null, createdAt: now }).returning({ id: adminAiTriageFeedback.id });
  const feedbackId = createdFeedback.id;
  await db.transaction(async (tx) => {
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "admin_ai_triage_feedback", entityId: String(feedbackId), action: "admin_ai_triage_feedback_recorded", nextValue: JSON.stringify({ assessmentId: assessment.id, outcome: input.outcome, note: input.note ?? null }) });
    await tx.insert(domainOutboxEvents).values({ domain: "admin", eventType: "admin.ai_triage_feedback_recorded", aggregateType: "admin_ai_triage_assessment", aggregateId: String(assessment.id), payload: JSON.stringify({ feedbackId, assessmentId: assessment.id, outcome: input.outcome }), deduplicationKey: eventKey("admin.ai_triage_feedback_recorded", feedbackId) });
  });
  return { feedbackId, assessmentId: assessment.id, outcome: input.outcome, createdAt: now };
}

export async function getAdminAiTriageQualityMetrics(userId: number) {
  const { db } = await requireCapability(userId, "business_emergency");
  const [assessments, feedback] = await Promise.all([
    db.select().from(adminAiTriageAssessments).orderBy(desc(adminAiTriageAssessments.createdAt)).limit(1000),
    db.select().from(adminAiTriageFeedback).orderBy(desc(adminAiTriageFeedback.createdAt)).limit(1000),
  ]);
  const latestFeedbackByAssessment = new Map<number, typeof adminAiTriageFeedback.$inferSelect>();
  for (const row of feedback) if (!latestFeedbackByAssessment.has(row.assessmentId)) latestFeedbackByAssessment.set(row.assessmentId, row);
  const latestFeedback = [...latestFeedbackByAssessment.values()];
  const feedbackCounts = { confirmed_accurate: 0, false_positive: 0, false_negative: 0, needs_more_evidence: 0 };
  for (const row of latestFeedback) feedbackCounts[row.outcome] += 1;
  const labeled = latestFeedback.length;
  const averageConfidenceBps = assessments.length ? Math.round(assessments.reduce((sum, assessment) => sum + assessment.confidenceBps, 0) / assessments.length) : null;
  const byModel = [...new Set(assessments.map((assessment) => assessment.model))].map((model) => {
    const modelAssessments = assessments.filter((assessment) => assessment.model === model);
    const modelIds = new Set(modelAssessments.map((assessment) => assessment.id));
    const modelFeedback = latestFeedback.filter((row) => modelIds.has(row.assessmentId));
    const falsePositives = modelFeedback.filter((row) => row.outcome === "false_positive").length;
    return { model, assessmentCount: modelAssessments.length, labeledCount: modelFeedback.length, averageConfidenceBps: modelAssessments.length ? Math.round(modelAssessments.reduce((sum, assessment) => sum + assessment.confidenceBps, 0) / modelAssessments.length) : null, falsePositiveRateBps: modelFeedback.length ? Math.round((falsePositives / modelFeedback.length) * 10_000) : null };
  });
  await audit(userId, "admin_ai_triage_quality", userId, "admin_ai_triage_quality_viewed", { assessmentCount: assessments.length, labeledCount: labeled });
  return { assessmentCount: assessments.length, labeledCount: labeled, feedbackCoverageBps: assessments.length ? Math.round((labeled / assessments.length) * 10_000) : 0, averageConfidenceBps, falsePositiveRateBps: labeled ? Math.round((feedbackCounts.false_positive / labeled) * 10_000) : null, falseNegativeRateBps: labeled ? Math.round((feedbackCounts.false_negative / labeled) * 10_000) : null, feedbackCounts, byModel };
}

/** Finance operators only: approval and settlement remain separate manual controls; no payment-provider call is made here. */
export async function decideRefundRequest(userId: number, input: { refundRequestId: number; decision: "approve" | "reject" | "settle"; decisionNote: string }) {
  const { db } = await requireCapability(userId, "finance");
  const request = (await db.select().from(refundRequests).where(eq(refundRequests.id, input.refundRequestId)).limit(1))[0];
  if (!request) throw new DomainError("NOT_FOUND", "Refund request not found.");
  const order = (await db.select().from(orders).where(eq(orders.id, request.orderId)).limit(1))[0];
  if (!order) throw new DomainError("NOT_FOUND", "Refund order not found.");
  if (input.decision === "approve" && request.status !== "requested") throw new DomainError("CONFLICT", "Only a requested refund can be approved.");
  if (input.decision === "reject" && request.status !== "requested") throw new DomainError("CONFLICT", "Only a requested refund can be rejected.");
  if (input.decision === "settle" && request.status !== "approved") throw new DomainError("CONFLICT", "Only an approved refund can be marked settled.");
  const now = new Date();
  const nextStatus = (input.decision === "approve" ? "approved" : input.decision === "reject" ? "rejected" : "settled") as "approved" | "rejected" | "settled";
  await db.transaction(async (tx) => {
    await tx.update(refundRequests).set({ status: nextStatus, reviewedByUserId: input.decision === "settle" ? request.reviewedByUserId : userId, reviewedAt: input.decision === "settle" ? request.reviewedAt : now, settledByUserId: input.decision === "settle" ? userId : null, settledAt: input.decision === "settle" ? now : null, decisionNote: input.decisionNote, updatedAt: now }).where(eq(refundRequests.id, request.id));
    await tx.insert(paymentLedgerEntries).values({ orderId: order.id, organisationId: order.organisationId, refundRequestId: request.id, partyType: "customer", entryType: input.decision === "approve" ? "refund_approved" : input.decision === "settle" ? "refund_settled" : "refund_rejected", amountMinor: input.decision === "reject" ? 0 : -request.requestedMinor, status: input.decision === "approve" ? "approved" : input.decision === "settle" ? "settled" : "void", reference: `refund-${input.decision}:${request.id}` });
    await tx.insert(supportTicketMessages).values({ ticketId: request.supportTicketId, authorUserId: userId, authorType: "admin", visibility: "customer_visible", body: input.decision === "approve" ? `Your refund request for PKR ${(request.requestedMinor / 100).toFixed(2)} was approved. Settlement will be recorded separately.` : input.decision === "settle" ? `Your approved refund for PKR ${(request.requestedMinor / 100).toFixed(2)} is recorded as settled through the controlled pilot process.` : `Your refund request was not approved. ${input.decisionNote}` });
    await tx.update(supportTickets).set({ status: input.decision === "approve" ? "in_progress" : "resolved", updatedAt: now }).where(eq(supportTickets.id, request.supportTicketId));
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "refund_request", entityId: String(request.id), action: `refund_${input.decision}`, previousValue: JSON.stringify({ status: request.status }), nextValue: JSON.stringify({ status: nextStatus, decisionNote: input.decisionNote, amountMinor: request.requestedMinor }) });
    await tx.insert(domainOutboxEvents).values({ domain: "finance", eventType: `refund.${nextStatus}`, aggregateType: "refund_request", aggregateId: String(request.id), payload: JSON.stringify({ refundRequestId: request.id, orderId: order.id, customerUserId: request.customerUserId, requestedMinor: request.requestedMinor, decision: input.decision }), deduplicationKey: eventKey(`refund.${nextStatus}`, request.id) });
  });
  await createUserNotification({ recipientUserId: request.customerUserId, category: "finance", title: "Refund request updated", body: input.decision === "approve" ? "Your refund request was approved for controlled settlement." : input.decision === "settle" ? "Your refund is recorded as settled." : "Your refund request was not approved. Open support for details.", route: `/support/${request.supportTicketId}`, orderId: order.id, supportTicketId: request.supportTicketId, deduplicationKey: `refund-notification:${request.id}:${nextStatus}` });
  return { id: request.id, status: nextStatus };
}
