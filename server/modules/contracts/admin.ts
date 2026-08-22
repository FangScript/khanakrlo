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
