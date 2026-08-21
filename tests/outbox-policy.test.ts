import { describe, expect, it } from "vitest";

import { nextOutboxRetryAt, OUTBOX_BATCH_LIMIT } from "../server/modules/events/outbox";

describe("transactional outbox policy", () => {
  it("uses a bounded exponential retry delay", () => {
    const now = new Date("2026-08-21T00:00:00.000Z");
    expect(nextOutboxRetryAt(0, now).toISOString()).toBe("2026-08-21T00:00:30.000Z");
    expect(nextOutboxRetryAt(1, now).toISOString()).toBe("2026-08-21T00:01:00.000Z");
    expect(nextOutboxRetryAt(99, now).toISOString()).toBe("2026-08-21T00:30:00.000Z");
  });

  it("caps a consumer batch to protect the initial worker", () => {
    expect(OUTBOX_BATCH_LIMIT).toBe(100);
  });
});
