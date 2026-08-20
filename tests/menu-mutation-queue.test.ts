import { describe, expect, it } from "vitest";

import { mergeQueuedMenuMutation, type QueuedMenuMutation } from "../lib/menu-mutation-queue";

describe("menu mutation retry queue", () => {
  it("coalesces repeated availability changes for the same item into the newest action", () => {
    const queue: QueuedMenuMutation[] = [{ id: "item:9", kind: "item", input: { itemId: 9, name: "Karahi", priceMinor: 95000, prepTimeMinutes: 25, isAvailable: false }, queuedAt: 1, attempts: 1 }];
    const merged = mergeQueuedMenuMutation(queue, { kind: "item", input: { itemId: 9, name: "Karahi", priceMinor: 95000, prepTimeMinutes: 25, isAvailable: true } });
    expect(merged).toHaveLength(1);
    expect(merged[0]?.input.isAvailable).toBe(true);
    expect(merged[0]?.attempts).toBe(0);
  });
});
