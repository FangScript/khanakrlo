import { afterEach, describe, expect, it, vi } from "vitest";
import { once } from "node:events";
import type { Server } from "node:http";
import { createService, asyncRoute, HttpError } from "../src/index.js";

const servers: Server[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
async function serve() {
  const app = createService({ name: "test", routes(router) {
    router.get("/v1/orders/:id", asyncRoute(async (_req, res) => { res.json({ ready: true }); }));
    router.post("/v1/orders", asyncRoute(async () => { throw new HttpError(409,"STATE_CONFLICT","Reload the order."); }));
  } });
  const server = app.listen(0,"127.0.0.1"); servers.push(server); await once(server,"listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP listener.");
  return `http://127.0.0.1:${address.port}`;
}
describe("HTTP foundation", () => {
  it("forwards asynchronous failures without leaking internal details", async () => {
    const url = await serve();
    const response = await fetch(`${url}/v1/orders`,{ method:"POST" });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error:"STATE_CONFLICT",message:"Reload the order." });
  });
  it("protects metrics and records route templates instead of private paths", async () => {
    vi.stubEnv("METRICS_TOKEN","metrics-test-secret-32-characters-long");
    const url = await serve();
    await fetch(`${url}/v1/orders/private-order-id`);
    expect((await fetch(`${url}/metrics`)).status).toBe(401);
    const response = await fetch(`${url}/metrics`,{ headers:{ "x-service-token":"metrics-test-secret-32-characters-long" } });
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).toContain('route="/v1/orders/:id"');
    expect(text).not.toContain("private-order-id");
    expect(text).toContain("khana_http_duration_seconds_bucket");
  });
});
