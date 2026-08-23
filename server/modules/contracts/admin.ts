import { z } from "zod";

export const ADMIN_STAFF_ROLES = ["support_agent", "moderation_agent", "finance_operator", "senior_operations"] as const;
export const ADMIN_CASE_STATUSES = ["open", "in_progress", "resolved", "dismissed"] as const;

export const adminOperationalCaseUpdateInput = z.object({
  caseId: z.number().int().positive(),
  status: z.enum(ADMIN_CASE_STATUSES),
  internalNote: z.string().trim().min(3).max(2000).optional(),
}).strict();
export const adminSupportTicketStatusInput = z.object({
  ticketId: z.number().int().positive(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  internalNote: z.string().trim().min(3).max(1000).optional(),
}).strict();
export const adminPhotoReportStatusInput = z.object({
  reportId: z.number().int().positive(),
  status: z.enum(["resolved", "dismissed"]),
  internalNote: z.string().trim().min(3).max(1000).optional(),
}).strict();
export const adminRemittanceCaseInput = z.object({
  receiptId: z.number().int().positive(),
  reason: z.string().trim().min(10).max(500),
  priority: z.enum(["normal", "high", "critical"]).default("normal"),
  reviewDueAt: z.string().datetime({ offset: true }).optional(),
}).strict();
export const adminBusinessEmergencyInput = z.object({
  applicationId: z.number().int().positive(),
  reason: z.string().trim().min(10).max(500),
  priority: z.enum(["normal", "high", "critical"]).default("high"),
  reviewDueAt: z.string().datetime({ offset: true }).optional(),
}).strict();

export const adminCaseDetailInput = z.object({
  subjectType: z.enum(["support_ticket", "photo_report", "business_emergency", "rider_remittance"]),
  subjectId: z.number().int().positive(),
}).strict();
export const adminStaffRoleProvisionInput = z.object({
  userId: z.number().int().positive(),
  staffRole: z.enum(ADMIN_STAFF_ROLES),
  status: z.enum(["active", "inactive"]),
  note: z.string().trim().min(3).max(500).optional(),
}).strict();
export const adminAiTriageInput = z.object({
  subjectType: z.enum(["photo_report", "business_emergency"]),
  subjectId: z.number().int().positive(),
}).strict();
export const adminAiTriageReviewInput = z.object({
  assessmentId: z.number().int().positive(),
  reviewState: z.enum(["acknowledged", "overridden"]),
}).strict();
export const adminCaseAssignmentInput = z.object({
  caseId: z.number().int().positive(),
  assignedToUserId: z.number().int().positive(),
  note: z.string().trim().min(3).max(500).optional(),
}).strict();
export const adminBulkPhotoModerationInput = z.object({
  reportIds: z.array(z.number().int().positive()).min(1).max(50).refine((ids) => new Set(ids).size === ids.length, "Report IDs must be unique."),
  action: z.enum(["resolved", "dismissed"]),
  confirmation: z.string().trim().min(1).max(80),
  internalNote: z.string().trim().min(3).max(1000).optional(),
}).strict();
export const adminSlaEscalationAcknowledgeInput = z.object({
  escalationId: z.number().int().positive(),
}).strict();
export const adminAiTriageFeedbackInput = z.object({
  assessmentId: z.number().int().positive(),
  outcome: z.enum(["confirmed_accurate", "false_positive", "false_negative", "needs_more_evidence"]),
  note: z.string().trim().min(3).max(1000).optional(),
}).strict();
