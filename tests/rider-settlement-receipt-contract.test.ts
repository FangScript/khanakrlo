import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Rider settlement receipt contract", () => {
  it("validates bounded history filter inputs and exposes them through the typed orders API", () => {
    const contracts = source("server/modules/contracts/orders.ts");
    const router = source("server/routers.ts");
    expect(contracts).toContain("riderCashHistoryFilterInput");
    expect(contracts).toContain("RIDER_CASH_ENTRY_TYPES");
    expect(contracts).toContain("The end date must be on or after the start date.");
    expect(router).toContain("riderCashAccount: protectedProcedure.input(riderCashHistoryFilterInput.optional())");
  });

  it("filters only the authenticated Rider ledger and retains immutable receipt records during remittance", () => {
    const service = source("server/order-service.ts");
    expect(service).toContain("gte(riderCashAccountEntries.createdAt");
    expect(service).toContain("lte(riderCashAccountEntries.createdAt");
    expect(service).toContain("inArray(riderCashAccountEntries.entryType");
    expect(service).toContain("riderCashSettlementReceipts");
    expect(service).toContain("cashAccountEntryId");
    expect(service).toContain("receiptCode");
    expect(service).toContain("getRiderSettlementReceipt");
    expect(service).toContain("eq(riderCashSettlementReceipts.riderUserId, userId)");
  });

  it("uses a dedicated receipt table with unique entry linkage and Rider ownership indexing", () => {
    const schema = source("drizzle/schema.ts");
    expect(schema).toContain("riderCashSettlementReceipts");
    expect(schema).toContain("rider_cash_receipts_entry_unique");
    expect(schema).toContain("rider_cash_receipts_rider_issued_index");
  });
});
