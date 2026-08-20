export type DiscoveryBusinessType = "restaurant" | "cloud_kitchen";

export type DiscoveryRecord = {
  id: number;
  businessType: DiscoveryBusinessType;
  displayName: string;
  city: string;
  cuisine: string;
  description: string | null;
  itemCount: number;
  isOpen: boolean;
  deliveryLabel: string;
};

export function filterDiscovery(records: DiscoveryRecord[], type: DiscoveryBusinessType | "all", query = "") {
  const normalized = query.trim().toLowerCase();
  return records.filter((record) => (type === "all" || record.businessType === type) && (!normalized || [record.displayName, record.city, record.cuisine, record.description ?? ""].some((value) => value.toLowerCase().includes(normalized))));
}

export function toMinorUnits(value: string) {
  if (value.trim().startsWith("-")) return 0;
  const parsed = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
}

export function fromMinorUnits(value: number) {
  return (Math.max(0, value) / 100).toFixed(0);
}
