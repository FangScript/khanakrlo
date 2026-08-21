import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  catalogueCategoryArchiveInput,
  catalogueItemArchiveInput,
  catalogueItemCreateInput,
  catalogueItemUpdateInput,
  catalogueModifierArchiveInput,
  catalogueModifierUpdateInput,
} from "../server/modules/contracts/business";

describe("production Restaurant catalogue CRUD contracts", () => {
  it("accepts an explicit initial dish availability state and defaults it to available", () => {
    const base = { categoryId: 5, name: "Chicken Karahi", description: "Slow-cooked", priceMinor: 95000, prepTimeMinutes: 25 };
    expect(catalogueItemCreateInput.parse(base).isAvailable).toBe(true);
    expect(catalogueItemCreateInput.parse({ ...base, isAvailable: false }).isAvailable).toBe(false);
  });

  it("requires non-negative integer PKR minor units and a real preparation time", () => {
    expect(() => catalogueItemCreateInput.parse({ categoryId: 5, name: "Chicken Karahi", priceMinor: -1, prepTimeMinutes: 25 })).toThrow();
    expect(() => catalogueItemUpdateInput.parse({ itemId: 8, name: "Chicken Karahi", priceMinor: 95000.5, prepTimeMinutes: 25, isAvailable: true })).toThrow();
    expect(() => catalogueItemUpdateInput.parse({ itemId: 8, name: "Chicken Karahi", priceMinor: 95000, prepTimeMinutes: 0, isAvailable: true })).toThrow();
    expect(() => catalogueModifierUpdateInput.parse({ modifierId: 4, name: "Extra cheese", priceMinor: -100, isRequired: false, isAvailable: true })).toThrow();
  });

  it("accepts only positive integer identifiers for safe archive commands", () => {
    expect(catalogueCategoryArchiveInput.parse({ categoryId: 1 })).toEqual({ categoryId: 1 });
    expect(catalogueItemArchiveInput.parse({ itemId: 3 })).toEqual({ itemId: 3 });
    expect(catalogueModifierArchiveInput.parse({ modifierId: 7 })).toEqual({ modifierId: 7 });
    expect(() => catalogueCategoryArchiveInput.parse({ categoryId: 0 })).toThrow();
    expect(() => catalogueItemArchiveInput.parse({ itemId: 1.5 })).toThrow();
    expect(() => catalogueModifierArchiveInput.parse({ modifierId: -2 })).toThrow();
  });

  it("removes local preview catalogue controls from the production Restaurant management route", () => {
    const source = readFileSync(resolve(process.cwd(), "app/business/catalogue.tsx"), "utf8");
    expect(source).not.toContain("PreviewCatalogue");
    expect(source).not.toContain("local menu controls");
    expect(source).toContain("archiveCategory");
    expect(source).toContain("archiveItem");
    expect(source).toContain("archiveModifier");
    expect(source).toContain("Approved Business access required");
  });
});
