import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Admin case detail, delegation, and AI triage contract", () => {
  it("returns detail only through role-scoped, audit-logged access and excludes delivery contact/address fields", () => {
    const service = source("server/admin-service.ts");
    const contracts = source("server/modules/contracts/admin.ts");
    expect(contracts).toContain("adminCaseDetailInput");
    expect(service).toContain("getAdminCaseDetail");
    expect(service).toContain("admin_case_detail_viewed");
    expect(service).not.toContain("deliveryPhoneE164: orders.deliveryPhoneE164");
    expect(service).not.toContain("deliveryAddressLine1: orders.deliveryAddressLine1");
  });

  it("restricts staff delegation to senior operators, existing Admin identities, and retained delegation history", () => {
    const service = source("server/admin-service.ts");
    const schema = source("drizzle/schema.ts");
    expect(schema).toContain("adminStaffRoleEvents");
    expect(service).toContain("provisionAdminStaffRole");
    expect(service).toContain("Staff provisioning is limited to existing internal Admin identities.");
    expect(service).toContain("You cannot deactivate your own senior-operator access.");
    expect(service).toContain("admin.staff_role_");
    expect(service).toContain("adminStaffRoleEvents");
  });

  it("uses structured multimodal advisory triage and explicitly prohibits automatic enforcement", () => {
    const service = source("server/admin-service.ts");
    const schema = source("drizzle/schema.ts");
    expect(schema).toContain("adminAiTriageAssessments");
    expect(service).toContain("invokeLLM");
    expect(service).toContain("model: \"gpt-5-mini\"");
    expect(service).toContain("image_url");
    expect(service).toContain("Never direct automatic removal, suspension, refund, payout, status change, or enforcement.");
    expect(service).toContain("pending_human_review");
    expect(service).not.toContain("tx.update(reviewPhotoReports).set({ status: \"resolved\"");
    expect(service).not.toContain("tx.update(adminOperationalCases).set({ status: \"resolved\"");
  });

  it("connects protected Admin queues to detail, staff provisioning, and human review interfaces", () => {
    const index = source("app/admin/index.tsx");
    const detail = source("app/admin/case-detail.tsx");
    const staff = source("app/admin/staff.tsx");
    expect(index).toContain("/admin/case-detail");
    expect(index).toContain("/admin/staff");
    expect(detail).toContain("trpc.adminOperations.caseDetail.useQuery");
    expect(detail).toContain("trpc.adminOperations.runAiTriage.useMutation");
    expect(detail).toContain("A human must review every assessment.");
    expect(staff).toContain("trpc.adminOperations.staffDirectory.useQuery");
    expect(staff).toContain("trpc.adminOperations.provisionStaffRole.useMutation");
  });
});
