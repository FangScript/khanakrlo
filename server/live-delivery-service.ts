import { ENV } from "./_core/env";

/**
 * Boundary for a future Redis-backed delivery stream. Until REDIS_URL and a
 * persistent compatible host are configured, the transactional outbox plus
 * customer polling remain the authoritative, safe fallback.
 */
export function liveDeliveryTransportStatus() {
  return ENV.redisUrl ? { mode: "redis_ready" as const, providerConfigured: true } : { mode: "outbox_polling_fallback" as const, providerConfigured: false };
}
