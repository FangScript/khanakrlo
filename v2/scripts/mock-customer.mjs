import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const spec = JSON.parse(await readFile(new URL("../contracts/openapi/customer.json", import.meta.url), "utf8"));
function example(schema) {
  if (schema.$ref) return example(spec.components.schemas[schema.$ref.split("/").at(-1)]);
  if (schema.example !== undefined) return schema.example;
  if (schema.const !== undefined) return schema.const;
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === "object") return Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, example(value)]));
  if (type === "array") return [];
  if (type === "boolean") return true;
  if (type === "integer" || type === "number") return schema.minimum ?? 0;
  if (schema.format === "uuid") return "11111111-1111-4111-8111-111111111111";
  if (schema.format === "date-time") return "2026-01-01T00:00:00.000Z";
  return "Mock customer";
}
if (process.env.NODE_ENV === "production") throw new Error("Contract mocks cannot run in production.");
createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname.replace(/^\/v1\/customer/, "");
  const match = Object.entries(spec.paths).find(([template]) => new RegExp(`^${template.replace(/\{[^}]+\}/g, "[^/]+")}$`).test(path));
  const operation = match?.[1][req.method.toLowerCase()];
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Khana-Mock", "static-contract-example");
  if (!operation) { res.writeHead(404); res.end(JSON.stringify({ error: "MOCK_ROUTE_NOT_FOUND" })); return; }
  const [status, response] = Object.entries(operation.responses).find(([code]) => code.startsWith("2"));
  res.writeHead(Number(status));
  res.end(response.content ? JSON.stringify(example(response.content["application/json"].schema)) : undefined);
}).listen(3206, "127.0.0.1", () => console.log("Customer static contract mock: http://127.0.0.1:3206/v1/customer (no authentication or persistence)"));
