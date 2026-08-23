export type AuditExportPayload = {
  filters?: { from?: string; to?: string; userId?: number; eventType?: string };
  sessions: Array<{ id: number; userId: number; ipAddress: string; host: string; createdAt: Date | string; expiresAt: Date | string; revokedAt?: Date | string | null }>;
  loginAttempts: Array<{ id: number; userId?: number | null; eventType: string; success: boolean; ipAddress: string; host: string; reason?: string | null; createdAt: Date | string }>;
};

const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const iso = (value: Date | string | null | undefined) => value ? new Date(value).toISOString() : "";

/** Exports only masked IPs and public audit fields; opaque session tokens are never accepted by this type. */
export function buildAdminSessionAuditCsv(payload: AuditExportPayload) {
  const rows: unknown[][] = [["timestamp", "record_type", "admin_user_id", "event_type", "outcome", "masked_ip", "host", "expires_at", "revoked_at", "reason"]];
  payload.sessions.forEach((session) => rows.push([iso(session.createdAt), "trusted_session", session.userId, "mfa_session", session.revokedAt ? "revoked" : "active", session.ipAddress, session.host, iso(session.expiresAt), iso(session.revokedAt), ""]));
  payload.loginAttempts.forEach((attempt) => rows.push([iso(attempt.createdAt), "login_attempt", attempt.userId ?? "", attempt.eventType, attempt.success ? "allowed" : "denied", attempt.ipAddress, attempt.host, "", "", attempt.reason ?? ""]));
  return `\uFEFF${rows.map((row) => row.map(quote).join(",")).join("\r\n")}\r\n`;
}

export function downloadAdminSessionAuditCsv(payload: AuditExportPayload) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const blob = new Blob([buildAdminSessionAuditCsv(payload)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `khana-karlo-admin-session-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}
