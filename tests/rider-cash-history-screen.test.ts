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

  it("connects the Rider profile Cash account row to the complete history route", () => {
    const profile = source("app/rider/profile.tsx");
    expect(profile).toContain('router.push("/rider/cash-account")');
  });
});
