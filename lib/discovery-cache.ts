import AsyncStorage from "@react-native-async-storage/async-storage";

export type DiscoveryFilter = "all" | "restaurant" | "cloud_kitchen";
export type CachedLiveBusiness = { id: number; businessType: "restaurant" | "cloud_kitchen"; displayName: string; city: string; cuisine: string; description: string | null; itemCount: number; isOpen: boolean; deliveryLabel: string };
export type DiscoveryCache = { savedAt: number; byFilter: Partial<Record<DiscoveryFilter, CachedLiveBusiness[]>> };

const DISCOVERY_CACHE_KEY = "khana-karlo/live-business-discovery-v1";

export async function readDiscoveryCache(): Promise<DiscoveryCache | null> {
  try { const raw = await AsyncStorage.getItem(DISCOVERY_CACHE_KEY); if (!raw) return null; const parsed = JSON.parse(raw) as DiscoveryCache; return parsed && typeof parsed.savedAt === "number" && parsed.byFilter ? parsed : null; } catch { return null; }
}

export async function writeDiscoveryCache(filter: DiscoveryFilter, records: CachedLiveBusiness[], current?: DiscoveryCache | null) {
  const source = current ?? await readDiscoveryCache();
  const next: DiscoveryCache = { savedAt: Date.now(), byFilter: { ...(source?.byFilter ?? {}), [filter]: records } };
  try { await AsyncStorage.setItem(DISCOVERY_CACHE_KEY, JSON.stringify(next)); } catch { /* Cache failures must not block discovery. */ }
  return next;
}

export function getCachedDiscovery(cache: DiscoveryCache | null, filter: DiscoveryFilter) {
  if (!cache) return [];
  const direct = cache.byFilter[filter];
  if (direct) return direct;
  const all = cache.byFilter.all ?? [];
  return filter === "all" ? all : all.filter((business) => business.businessType === filter);
}

export function discoveryCacheAgeLabel(savedAt: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - savedAt) / 60_000));
  return minutes < 1 ? "just now" : minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
}
