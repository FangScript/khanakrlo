import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { businessEmergencyRestoreInput, businessEmergencySuspensionInput } from "../server/modules/contracts/business";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("fully self-service Business workspace contracts", () => {
  it("activates a completed Restaurant or Cloud Kitchen setup directly without document or Admin approval gates", () => {
    const service = projectFile("server/business-service.ts");
    const onboarding = projectFile("app/business/onboarding.tsx");

    expect(service).toContain("await activateBusinessWorkspace(userId, application.id)");
    expect(service).toContain("business_workspace_self_activated");
    expect(service).not.toContain("document is required.");
    expect(onboarding).toContain("Finish setup & open workspace");
    expect(onboarding).toContain("No Admin approval");
    expect(onboarding).not.toContain("Submit for review");
  });

  it("keeps customer publication self-service and server-authoritative", () => {
    const router = projectFile("server/routers.ts");
    const service = projectFile("server/business-service.ts");
    const dashboard = projectFile("app/business/home.tsx");

    expect(router).toContain("publicationReadiness");
    expect(service).toContain("getBusinessPublicationReadiness");
    expect(service).toContain("Finish these setup items before going live");
    expect(dashboard).toContain("Checking your self-service publication setup");
    expect(dashboard).toContain("Go live for customers");
  });

  it("limits Admin Business controls to an explicit emergency suspension and restoration", () => {
    const router = projectFile("server/routers.ts");
    const workspaceDb = projectFile("server/db.ts");
    const adminScreen = projectFile("app/admin/business-applications.tsx");
    const adminBlock = router.split("adminBusiness: router({")[1]?.split("rider: router")[0] ?? "";

    expect(businessEmergencySuspensionInput.parse({ applicationId: 7, reason: "Repeated safety and fraud reports require a temporary halt." }).reason).toContain("safety");
    expect(() => businessEmergencySuspensionInput.parse({ applicationId: 7, reason: "short" })).toThrow();
    expect(businessEmergencyRestoreInput.parse({ applicationId: 7 }).applicationId).toBe(7);
    expect(adminBlock).toContain("suspend:");
    expect(adminBlock).toContain("restore:");
    expect(adminBlock).not.toContain("reviewApplication:");
    expect(workspaceDb).toContain("Business workspaces activate directly for their owners and cannot be approved by Admin.");
    expect(adminScreen).toContain("Businesses activate and publish themselves");
    expect(adminScreen).not.toContain("Approve & activate");
  });
});
