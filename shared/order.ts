export const ORDER_STATUSES = ["placed", "accepted", "preparing", "ready_for_pickup", "assigned", "picked_up", "delivered", "rejected", "cancelled"] as const;
export const ORDER_PAYMENT_METHODS = ["cod"] as const;
export const ORDER_PAYMENT_STATUSES = ["cash_due", "paid", "void"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number];
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  placed: ["accepted", "rejected", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["assigned", "cancelled"],
  assigned: ["picked_up", "cancelled"],
  picked_up: ["delivered"],
  delivered: [],
  rejected: [],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return ORDER_TRANSITIONS[from].includes(to);
}
