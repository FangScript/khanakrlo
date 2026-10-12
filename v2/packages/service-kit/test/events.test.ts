import { describe, expect, it } from "vitest";
import { domainEventSchema, newDomainEvent, parsePort } from "../src/index.js";

describe("service runtime contracts", () => {
  it("creates valid versioned events and rejects malformed routing keys", () => {
    const event = newDomainEvent({ type: "order.created", version: 1, producer: "order", aggregateId: "00000000-0000-4000-8000-000000000001", payload: { amountPaisa: 100 } });
    expect(domainEventSchema.parse(event).type).toBe("order.created");
    expect(() => domainEventSchema.parse({ ...event, type: "Order Created" })).toThrow();
  });

  it("rejects invalid service ports", () => {
    expect(parsePort(undefined, 3105)).toBe(3105);
    expect(() => parsePort("70000", 3105)).toThrow("PORT must be a valid TCP port.");
  });
});
