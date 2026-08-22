import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { isBusinessOpenAt, type BusinessHoursWindow } from "../shared/business-hours";
import { businessHoursUpdateInput } from "../server/modules/contracts/business";

const closedWeek: BusinessHoursWindow[] = Array.from({ length: 7 }, (_, weekday) => ({ weekday, opensAt: null, closesAt: null, isClosed: true }));

describe("Business operating-hours contracts", () => {
  it("requires one safe weekly schedule with valid time ranges for open days", () => {
    const hours = closedWeek.map((hour) => hour.weekday === 0 ? { ...hour, opensAt: "09:00", closesAt: "23:00", isClosed: false } : hour);
    expect(businessHoursUpdateInput.parse({ hours }).hours).toHaveLength(7);
    expect(() => businessHoursUpdateInput.parse({ hours: hours.slice(0, 6) })).toThrow();
    expect(() => businessHoursUpdateInput.parse({ hours: [...hours.slice(0, 6), { ...hours[6], weekday: 0 }] })).toThrow();
    expect(() => businessHoursUpdateInput.parse({ hours: hours.map((hour) => hour.weekday === 0 ? { ...hour, opensAt: "24:00" } : hour) })).toThrow();
  });

  it("uses Pakistan time and handles overnight service windows", () => {
    const sundayWindow = closedWeek.map((hour) => hour.weekday === 0 ? { ...hour, opensAt: "18:00", closesAt: "02:00", isClosed: false } : hour);
    expect(isBusinessOpenAt(sundayWindow, new Date("2026-08-23T15:00:00.000Z"))).toBe(true);
    expect(isBusinessOpenAt(sundayWindow, new Date("2026-08-23T20:00:00.000Z"))).toBe(true);
    expect(isBusinessOpenAt(sundayWindow, new Date("2026-08-23T22:00:00.000Z"))).toBe(false);
  });

  it("exposes tenant-scoped schedule controls through the approved Business workspace", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const service = readFileSync(resolve(process.cwd(), "server/business-service.ts"), "utf8");
    const screen = readFileSync(resolve(process.cwd(), "app/business/hours.tsx"), "utf8");
    expect(router).toContain("updateBusinessHours");
    expect(service).toContain("business_operating_hours_updated");
    expect(screen).toContain("Pakistan Standard Time (PKT)");
  });
});
