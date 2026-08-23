import { and, desc, eq } from "drizzle-orm";

import { adminAiTriageAssessments, adminOperationalCases, adminStaffRoleEvents, adminStaffRoles, auditEvents, businessOrganisations, domainOutboxEvents, orderReviews, orders, reviewPhotoReports, reviewPhotos, riderCashAccountEntries, riderCashSettlementReceipts, supportTickets, users, workspaceApplications } from "../drizzle/schema";
import { getDb } from "./db";
import { suspendBusinessWorkspace, restoreBusinessWorkspace } from "./business-service";
import { DomainError } from "./modules/gateway/domain-error";
import { storageGetSignedUrl } from "./storage";
import { invokeLLM } from "./_core/llm";

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
    await tx.insert(adminStaffRoles).values({ userId: input.userId, staffRole: input.staffRole, status: input.status, grantedByUserId: userId, createdAt: now, updatedAt: now }).onDuplicateKeyUpdate({ set: { staffRole: input.staffRole, status: input.status, grantedByUserId: userId, updatedAt: now } });
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
  const result = await db.insert(adminAiTriageAssessments).values({ subjectType: input.subjectType, subjectId: input.subjectId, requestedByUserId: userId, model: "gpt-5-mini", inputSummary, assessmentSummary: advisory.assessmentSummary, confidenceBps: advisory.confidenceBps, recommendedPriority: advisory.recommendedPriority, suggestedDisposition: advisory.suggestedDisposition, safetySignalsJson: JSON.stringify(advisory.safetySignals), reviewState: "pending_human_review", createdAt: now });
  const assessmentId = Number(result[0].insertId);
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
