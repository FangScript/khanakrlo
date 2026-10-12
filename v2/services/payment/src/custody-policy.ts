export type CustodyPolicy = "current_cash" | "projected_cash";

export function parseCustodyPolicy(value: string | undefined): CustodyPolicy {
  if (value !== "current_cash" && value !== "projected_cash") throw new Error("COD_CUSTODY_POLICY must explicitly select current_cash or projected_cash.");
  return value;
}

/** Commission reservations are separate from this delivery cash exposure check. */
export function canAcceptCashOrder(policy: CustodyPolicy, outstanding: number, reserved: number, amount: number, limit: number) {
  if (![outstanding, reserved, amount, limit].every(Number.isSafeInteger) || outstanding < 0 || reserved < 0 || amount <= 0 || limit <= 0) return false;
  return policy === "current_cash" ? outstanding < limit : outstanding + reserved + amount <= limit;
}
