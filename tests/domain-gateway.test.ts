import { describe, expect, it } from "vitest";

import { DomainError, mapDomainError } from "../server/modules/gateway/domain-error";

describe("gateway domain error mapping", () => {
  it("maps typed domain validation failures to a stable API code", () => {
    const error = mapDomainError(new DomainError("VALIDATION", "A category name is required."));
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toContain("category name");
  });

  it("maps an unavailable domain dependency without exposing implementation detail", () => {
    const error = mapDomainError(new DomainError("UNAVAILABLE", "Catalogue service is temporarily unavailable."));
    expect(error.code).toBe("SERVICE_UNAVAILABLE");
  });
});
