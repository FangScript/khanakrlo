import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Customer live discovery search", () => {
  it("searches approved live Businesses instead of the static sample catalogue", () => {
    const screen = readFileSync(resolve(process.cwd(), "app/search.tsx"), "utf8");
    expect(screen).toContain("trpc.discovery.liveBusinesses");
    expect(screen).toContain("business.displayName");
    expect(screen).not.toContain("@/lib/khana-data");
  });
});
