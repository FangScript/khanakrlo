import type { RiderDeliveryStatus } from "@/lib/rider-store";

const allowedTransitions: Record<RiderDeliveryStatus, RiderDeliveryStatus[]> = {
  offered: ["accepted", "declined"],
  accepted: ["atPickup"],
  atPickup: ["pickedUp"],
  pickedUp: ["delivered"],
  delivered: [],
  declined: [],
};

export function isRiderStatusTransitionAllowed(current: RiderDeliveryStatus, next: RiderDeliveryStatus) {
  return allowedTransitions[current].includes(next);
}

export function getNextRiderStatus(status: RiderDeliveryStatus): RiderDeliveryStatus | null {
  const progression: Partial<Record<RiderDeliveryStatus, RiderDeliveryStatus>> = {
    offered: "accepted",
    accepted: "atPickup",
    atPickup: "pickedUp",
    pickedUp: "delivered",
  };
  return progression[status] ?? null;
}
