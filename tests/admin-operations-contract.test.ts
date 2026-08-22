import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Admin operations workspace contract", () => {
  it("defines internal staff roles and server-enforced capability boundaries", () => {
    const schema = source("drizzle/schema.ts");
    const service = source("server/admin-service.ts");
    const contracts = source("server/modules/contracts/admin.ts");
    expect(schema).toContain("adminStaffRoles");
    expect(schema).toContain("adminOperationalCases");
    expect(contracts).toContain("support_agent");
    expect(contracts).toContain("finance_operator");
    expect(contracts).toContain("senior_operations");
    expect(service).toContain("requireAdminIdentity");
    expect(service).toContain("requireCapability");
    expect(service).toContain("Your staff role cannot perform this operation.");
  });

  it("keeps queue payloads privacy-safe and writes audit records for privileged Admin operations", () => {
    const service = source("server/admin-service.ts");
    expect(service).toContain("customerReference");
    expect(service).not.toContain("message: ticket.message");
    expect(service).not.toContain("addressLine1");
    expect(service).toContain("admin_queue_viewed");
    expect(service).toContain("admin_support_ticket_updated");
    expect(service).toContain("admin_photo_report_updated");
  });

  it("creates structured emergency and remittance cases without restoring Business approval gates or mutating receipts", () => {
    const service = source("server/admin-service.ts");
    const router = source("server/routers.ts");
    const emergencyScreen = source("app/admin/business-applications.tsx");
    expect(service).toContain("suspendBusinessWorkspace");
    expect(service).toContain("restoreBusinessWorkspace");
    expect(service).toContain("caseType: \"business_emergency\"");
    expect(service).toContain("caseType: \"rider_remittance\"");
    expect(service).not.toContain("update(riderCashSettlementReceipts)");
    expect(router).toContain("adminOperations: router");
    expect(emergencyScreen).toContain("trpc.adminOperations.suspendBusiness");
    expect(emergencyScreen).toContain("not an approval decision");
  });

  it("keeps provider-dependent AI, payment, fiscal, and configuration work inactive while exposing a protected Admin UI", () => {
    const deferred = source("server/modules/admin/deferred-integrations.ts");
    const screen = source("app/admin/index.tsx");
    expect(deferred).toContain("DEFERRED_ADMIN_INTEGRATIONS");
    expect(deferred).toContain("requires WhatsApp ingestion");
    expect(deferred).toContain("requires payment-provider credentials");
    expect(deferred).toContain("requires Pakistan tax and FBR validation");
    expect(screen).toContain("trpc.adminOperations.queue.useQuery");
    expect(screen).toContain("Queue cards intentionally mask customer contact and address data");
    expect(screen).toContain("Rider remittance receipts");
  });
});
