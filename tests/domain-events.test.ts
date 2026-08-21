import { describe, expect, it } from "vitest";

import { createDomainEvent } from "../server/modules/events/contracts";

describe("domain event contracts", () => {
  it("creates an idempotent Business approval envelope", () => {
    const event = createDomainEvent({ domain: "business-onboarding", eventType: "business.approved", aggregateType: "business_application", aggregateId: "42", payload: { organisationId: 7 }, deduplicationKey: "business.approved:42" });
    expect(event.deduplicationKey).toBe("business.approved:42");
  });

  it("rejects incomplete cross-domain event identity", () => {
    expect(() => createDomainEvent({ domain: "", eventType: "business.approved", aggregateType: "business_application", aggregateId: "42", payload: {}, deduplicationKey: "business.approved:42" })).toThrow("identity");
  });
});
