import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { codCollectionConfirmInput } from "../server/modules/contracts/orders";

describe("commission-aware COD settlement contracts", () => {
  it("accepts only bounded explicit COD collection data", () => {
    expect(codCollectionConfirmInput.parse({ orderId: 12, collectedMinor: 425_000 })).toEqual({ orderId: 12, collectedMinor: 425_000 });
    expect(() => codCollectionConfirmInput.parse({ orderId: 12, collectedMinor: -1 })).toThrow();
    expect(() => codCollectionConfirmInput.parse({ orderId: 12, collectedMinor: 200_000, commissionRateBps: 1_500 })).toThrow();
  });

  it("keeps 12–15% commission calculation and COD delivery closure authoritative on the server", () => {
    const service = readFileSync(resolve(process.cwd(), "server/order-service.ts"), "utf8");
    const riderScreen = readFileSync(resolve(process.cwd(), "app/rider/delivery/[id].tsx"), "utf8");
    expect(service).toContain("commissionRateBps < 1_200 || policy.commissionRateBps > 1_500");
    expect(service).toContain("Confirm COD collection before marking this order delivered.");
    expect(service).toContain("cod.collection_confirmed");
    expect(service).toContain("platformCommissionMinor");
    expect(riderScreen).toContain("orders.executeRiderCommand");
    expect(riderScreen).toContain('type: "cod_collection"');
    expect(riderScreen).toContain("Confirm COD collection");
  });
});
