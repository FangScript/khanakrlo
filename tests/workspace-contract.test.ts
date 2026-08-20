import { describe, expect, it } from "vitest";

import { canEditWorkspaceApplication, canEnterWorkspace, canReviewWorkspaceApplication, resolveWorkspaceAvailability, validateWorkspaceApplication } from "../shared/workspace";

describe("workspace production contract", () => {
  it("keeps Customer active by default while gating Business and Rider without approval", () => {
    expect(resolveWorkspaceAvailability("active", undefined)).toBe("active");
    expect(resolveWorkspaceAvailability(undefined, undefined)).toBe("not_started");
    expect(resolveWorkspaceAvailability(undefined, "submitted")).toBe("submitted");
    expect(canEnterWorkspace("customer", "active")).toBe(true);
    expect(canEnterWorkspace("business", "submitted")).toBe(false);
    expect(canEnterWorkspace("rider", "approved")).toBe(false);
    expect(canEnterWorkspace("rider", "active")).toBe(true);
  });

  it("requires production-ready business and rider application information before submission", () => {
    expect(validateWorkspaceApplication({ workspaceType: "business", displayName: "Lahori Dera", phoneE164: "+923001234567", city: "Islamabad" })).toContain("Choose Restaurant or Cloud Kitchen.");
    expect(validateWorkspaceApplication({ workspaceType: "rider", displayName: "Saad Ahmed", phoneE164: "+923001234567", city: "Islamabad" })).toEqual([]);
    expect(validateWorkspaceApplication({ workspaceType: "rider", displayName: "Saad Ahmed", phoneE164: "03001234567", city: "Islamabad" })).toContain("A verified phone number in international format is required.");
  });

  it("allows only editable drafts and valid administrator review transitions", () => {
    expect(canEditWorkspaceApplication("draft")).toBe(true);
    expect(canEditWorkspaceApplication("changes_required")).toBe(true);
    expect(canEditWorkspaceApplication("submitted")).toBe(false);
    expect(canReviewWorkspaceApplication("submitted", "approved")).toBe(true);
    expect(canReviewWorkspaceApplication("draft", "approved")).toBe(false);
    expect(canReviewWorkspaceApplication("approved", "suspended")).toBe(false);
  });
});
