import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import type { Request, Response } from "express";
import { requireSession } from "../src/auth.js";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

async function authorize(active: boolean, roles: string[] = ["customer"]) {
  vi.stubEnv("ACCESS_TOKEN_SECRET", "a".repeat(32));
  vi.stubEnv("INTERNAL_IDENTITY_TOKEN", "b".repeat(32));
  vi.stubEnv("IDENTITY_URL", "http://identity.local");
  vi.stubEnv("JWT_ISSUER", "https://identity.khanakarlo.com");
  vi.stubEnv("JWT_AUDIENCE", "khana-karlo");
  const token = await new SignJWT({ sid: "36948574-cbd0-447d-b72a-3865dfbe8455", roles: ["staff"] }).setSubject("1b1c6c60-6294-4834-947d-fb042a1f0a41").setProtectedHeader({ alg: "HS256" }).setIssuer("https://identity.khanakarlo.com").setAudience("khana-karlo").setExpirationTime("1m").sign(new TextEncoder().encode("a".repeat(32)));
  const req = { header: () => `Bearer ${token}` } as unknown as Request;
  const res = { locals: {}, status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  const fetcher = vi.fn().mockResolvedValue(new globalThis.Response(JSON.stringify({ active, roles }), { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  return { req, res, next, fetcher };
}

describe("live session authorization", () => {
  it("rejects a revoked session even with an unexpired signed token", async () => {
    const { req, res, next } = await authorize(false);
    await requireSession(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  it("uses current server roles instead of stale JWT roles", async () => {
    const { req, res, next } = await authorize(true);
    await requireSession(req, res, next);
    expect(res.locals.session.roles).toEqual(["customer"]);
    expect(next).toHaveBeenCalledOnce();
  });
  it("fails closed on an unavailable Identity service", async () => {
    const { req, res, next, fetcher } = await authorize(true);
    fetcher.mockRejectedValueOnce(new Error("offline"));
    await requireSession(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });
});
