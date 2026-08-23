import { z } from "zod";

export const adminMfaCodeInput = z.object({ code: z.string().trim().regex(/^[0-9]{6}$|^[A-Z0-9]{8}$/, "Enter a six-digit authenticator code or an eight-character recovery code.") }).strict();
export const adminIpAllowlistCreateInput = z.object({ cidr: z.string().trim().regex(/^\d{1,3}(?:\.\d{1,3}){3}\/(?:[0-9]|[12][0-9]|3[0-2])$/, "Enter a valid IPv4 CIDR, such as 203.0.113.0/24."), label: z.string().trim().min(3).max(120) }).strict();
export const adminIpAllowlistStatusInput = z.object({ ruleId: z.number().int().positive(), status: z.enum(["active", "disabled"]) }).strict();
export const adminWebSessionRevokeInput = z.object({ sessionId: z.number().int().positive() }).strict();
const adminSecurityEventType = z.enum(["oauth_authenticated", "mfa_enrollment_started", "mfa_enrollment_confirmed", "mfa_succeeded", "mfa_failed", "recovery_code_used", "ip_denied", "host_denied", "session_revoked"]);
export const adminSessionAuditFilterInput = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  userId: z.number().int().positive().optional(),
  eventType: adminSecurityEventType.optional(),
}).strict().refine((value) => !value.from || !value.to || new Date(value.from) <= new Date(value.to), { message: "The start time must be before the end time." });
