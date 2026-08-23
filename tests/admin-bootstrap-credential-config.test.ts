import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

describe("Admin bootstrap credential configuration", () => {
  it("validates configured bootstrap credentials through the lightweight Admin credential API without exposing secret values", async () => {
    const ctx = { user: null, req: { headers: {} }, res: {} } as TrpcContext;
    const result = await appRouter.createCaller(ctx).adminCredential.configuration();
    expect(result.bootstrapConfigured).toBe(true);
    expect(Object.keys(result)).toEqual(["bootstrapConfigured"]);
  });
});
