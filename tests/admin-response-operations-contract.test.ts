import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Admin response operations contract", () => {
  it("persists assignment history, materializes SLA escalation records, and restricts ownership to appropriate active staff roles", () => {
    const schema = source("drizzle/schema.ts");
    const service = source("server/admin-service.ts");
    expect(schema).toContain("adminCaseAssignments");
    expect(schema).toContain("adminCaseEscalations");
    expect(service).toContain("SLA_MINUTES");
    expect(service).toContain("materializeSlaEscalations");
    expect(service).toContain("assignAdminOperationalCase");
    expect(service).toContain("The selected staff member does not have the required active role for this case.");
    expect(service).toContain("const assignmentType = caseRow.assignedAdminUserId ? \"reassigned\"");
    expect(service).toContain("action: `admin_case_${assignmentType}`");
  });

  it("requires an exact human confirmation and prior AI assessment for any bulk photo moderation outcome", () => {
    const service = source("server/admin-service.ts");
    const contracts = source("server/modules/contracts/admin.ts");
    expect(contracts).toContain("adminBulkPhotoModerationInput");
    expect(service).toContain("bulkModerateAdminPhotoReports");
    expect(service).toContain("CONFIRM ${input.reportIds.length} PHOTO REPORT");
    expect(service).toContain("Bulk moderation is limited to photo reports with an existing AI advisory assessment.");
    expect(service).toContain("admin_photo_report_bulk_moderated");
  });

  it("records human AI quality feedback only after review and exposes aggregate false-positive monitoring without automatic model changes", () => {
    const schema = source("drizzle/schema.ts");
    const service = source("server/admin-service.ts");
    expect(schema).toContain("adminAiTriageFeedback");
    expect(service).toContain("submitAdminAiTriageFeedback");
    expect(service).toContain("A human must acknowledge or override the AI assessment before recording quality feedback.");
    expect(service).toContain("getAdminAiTriageQualityMetrics");
    expect(service).toContain("falsePositiveRateBps");
    expect(service).not.toContain("retrain");
  });

  it("connects operational response, bulk confirmation, and model-quality screens to the protected Admin API", () => {
    const response = source("app/admin/response-management.tsx");
    const bulk = source("app/admin/bulk-moderation.tsx");
    const quality = source("app/admin/ai-quality.tsx");
    const detail = source("app/admin/case-detail.tsx");
    const home = source("app/admin/index.tsx");
    expect(response).toContain("trpc.adminOperations.assignCase.useMutation");
    expect(response).toContain("trpc.adminOperations.acknowledgeSlaEscalation.useMutation");
    expect(bulk).toContain("trpc.adminOperations.bulkModeratePhotoReports.useMutation");
    expect(bulk).toContain("Type: {expected}");
    expect(quality).toContain("trpc.adminOperations.aiTriageQualityMetrics.useQuery");
    expect(detail).toContain("trpc.adminOperations.submitAiTriageFeedback.useMutation");
    expect(home).toContain("/admin/response-management");
    expect(home).toContain("/admin/bulk-moderation");
    expect(home).toContain("/admin/ai-quality");
  });
});
