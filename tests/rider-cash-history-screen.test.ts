import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Rider Cash Account history screen", () => {
  it("binds the dedicated screen to the authenticated Rider Cash Account ledger", () => {
    const screen = source("app/rider/cash-account.tsx");
    expect(screen).toContain("trpc.orders.riderCashAccount.useQuery");
    expect(screen).toContain("Account history");
    expect(screen).toContain("balanceAfterMinor");
    expect(screen).toContain("labelByType");
  });

  it("provides date and transaction-type filters plus a resettable empty state", () => {
    const screen = source("app/rider/cash-account.tsx");
    expect(screen).toContain("fromDate");
    expect(screen).toContain("toDate");
    expect(screen).toContain("entryTypes");
    expect(screen).toContain("Apply filters");
    expect(screen).toContain("Clear filters");
    expect(screen).toContain("appliedFilter");
  });

  it("offers protected settlement receipt PDF downloads from the Rider-owned receipt list", () => {
    const screen = source("app/rider/cash-account.tsx");
    const receiptUtility = source("lib/rider-settlement-receipt.ts");
    expect(screen).toContain("riderSettlementReceipt.fetch");
    expect(screen).toContain("Settlement receipts");
    expect(screen).toContain("handleReceiptDownload");
    expect(receiptUtility).toContain("Print.printToFileAsync");
    expect(receiptUtility).toContain("Sharing.shareAsync");
    expect(receiptUtility).toContain("buildSettlementReceiptHtml");
  });

  it("connects the Rider profile Cash account row to the complete history route", () => {
    const profile = source("app/rider/profile.tsx");
    expect(profile).toContain('router.push("/rider/cash-account")');
  });
});
