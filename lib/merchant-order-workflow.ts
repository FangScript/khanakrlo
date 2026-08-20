export type MerchantOrderStatus = "new" | "preparing" | "ready" | "outForDelivery" | "rejected";

const permittedTransitions: Record<MerchantOrderStatus, MerchantOrderStatus[]> = {
  new: ["preparing", "rejected"],
  preparing: ["ready"],
  ready: ["outForDelivery"],
  outForDelivery: [],
  rejected: [],
};

export function isMerchantStatusTransitionAllowed(from: MerchantOrderStatus, to: MerchantOrderStatus) {
  return permittedTransitions[from].includes(to);
}

export function getMerchantPrimaryAction(status: MerchantOrderStatus) {
  switch (status) {
    case "new":
      return { label: "Accept and start preparing", nextStatus: "preparing" as const, icon: "soup-kitchen" as const };
    case "preparing":
      return { label: "Mark ready for pickup", nextStatus: "ready" as const, icon: "check-circle" as const };
    case "ready":
      return { label: "Hand off to rider", nextStatus: "outForDelivery" as const, icon: "two-wheeler" as const };
    case "outForDelivery":
      return null;
    case "rejected":
      return null;
  }
}
