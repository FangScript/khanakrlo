import { getApiBaseUrl } from "@/constants/oauth";

/** Converts a server-owned storage key into a resolvable image URL without accepting arbitrary client URLs. */
export function menuImageUrl(imageKey: string | null | undefined) {
  if (!imageKey) return null;
  const base = getApiBaseUrl();
  return `${base}/manus-storage/${imageKey}`;
}
