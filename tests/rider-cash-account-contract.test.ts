import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Rider Cash Account", () => {
  it("reserves only the immutable COD platform commission when a Rider accepts an offer", () => {
    const service = source("server/order-service.ts");
    expect(service).toContain("reserveRiderCommission(tx, userId, order)");
    expect(service).toContain('order.paymentMethod === "cod" ? order.platformCommissionMinor : 0');
    expect(service).toContain('entryType: "commission_reserved"');
    expect(service).toContain("balanceMinor - commissionMinor");
    expect(service).toContain("riderCashThresholdMinor = 1_000_000");
    expect(service).toContain("exceeds the PKR 10,000 pilot limit");
  });

  it("reconciles confirmed COD cash and variance through immutable account entries", () => {
    const service = source("server/order-service.ts");
    expect(service).toContain('entryType: "cash_collected"');
    expect(service).toContain('entryType: "cash_variance"');
    expect(service).toContain("balanceAfterCollection");
    expect(service).toContain("Rider Cash Account was not reserved");
  });

  it("exposes only the active Rider’s account summary to the mobile workspace", () => {
    const router = source("server/routers.ts");
    const profile = source("app/rider/profile.tsx");
    expect(router).toContain("riderCashAccount");
    expect(profile).toContain("Rider Cash Account");
    expect(profile).toContain("Commission is reserved when you accept a COD job");
    expect(profile).toContain("Settle PKR");
    expect(router).toContain("remitRiderCash");
    expect(source("server/order-service.ts")).toContain("Remittance must match the server-calculated outstanding COD custody amount.");
  });
});
