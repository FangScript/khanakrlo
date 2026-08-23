import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("web-only Admin console separation", () => {
  it("blocks the entire Admin route family on native while preserving the protected web route tree", () => {
    const layout = source("app/admin/_layout.tsx");
    expect(layout).toContain('Platform.OS !== "web"');
    expect(layout).toContain("Admin console is web-only");
    expect(layout).toContain("Authorized Khana KarLo staff must use the protected Admin website.");
    expect(layout).toContain("return <Slot />");
  });

  it("keeps the unified mobile workspace hub limited to Customer, Business, and Rider roles", () => {
    const workspaces = source("app/account/workspaces.tsx");
    expect(workspaces).toContain('workspace: "customer" | "business" | "rider"');
    expect(workspaces).toContain('workspace: "customer", icon: "restaurant"');
    expect(workspaces).toContain('workspace: "business", icon: "storefront"');
    expect(workspaces).toContain('workspace: "rider", icon: "directions-bike"');
    expect(workspaces).not.toContain('workspace: "admin"');
    expect(workspaces).not.toContain('router.push("/admin');
  });

  it("labels the web console as protected and continues to rely on protected server procedures", () => {
    const consoleSource = source("app/admin/index.tsx");
    const router = source("server/routers.ts");
    expect(consoleSource).toContain("PROTECTED WEB CONSOLE");
    expect(consoleSource).toContain("Web-only · Role:");
    expect(router).toContain("adminOperations: router");
    expect(router).toContain("protectedProcedure");
  });
});
