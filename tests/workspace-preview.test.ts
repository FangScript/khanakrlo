import { describe, expect, it } from "vitest";

import { getPreviewWorkspaceDestination } from "../lib/workspace-preview";

describe("preview workspace destinations", () => {
  it("opens the distinct Customer, Business, and Rider operating areas", () => {
    expect(getPreviewWorkspaceDestination("customer")).toBe("/(tabs)");
    expect(getPreviewWorkspaceDestination("business")).toBe("/business/home");
    expect(getPreviewWorkspaceDestination("rider")).toBe("/rider");
  });
});
