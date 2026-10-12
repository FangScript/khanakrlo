import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const spec = JSON.parse(await readFile("contracts/openapi/customer.json", "utf8"));
const named = (schema) => schema.$ref?.split("/").at(-1);
function type(schema) {
  if (schema.$ref) return named(schema);
  if (Array.isArray(schema.type)) return schema.type.map((value) => type({ ...schema,type:value })).join(" | ");
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.type === "array") return `Array<${type(schema.items)}>`;
  const scalar = { string:"string",integer:"number",number:"number",boolean:"boolean",null:"null" }[schema.type];
  if (!scalar) throw new Error(`Unsupported schema: ${JSON.stringify(schema)}`);
  return scalar;
}
const lines = ["// Generated from contracts/openapi/customer.json. Run pnpm clients:generate.", 'import type { Transport } from "../core/http";', ""];
for (const [name,schema] of Object.entries(spec.components.schemas)) {
  lines.push(`export interface ${name} {`);
  for (const [key,value] of Object.entries(schema.properties)) lines.push(`  ${key}${schema.required.includes(key) ? "" : "?"}: ${type(value)};`);
  lines.push("}", "");
}
lines.push("export function createCustomerClient(request: Transport) {", "  return {");
for (const [path,methods] of Object.entries(spec.paths)) {
  for (const [method,operation] of Object.entries(methods)) {
    const args = [], parameters = operation.parameters ?? [];
    for (const parameter of parameters.filter((value) => value.in === "path")) args.push(`${parameter.name}: string`);
    const body = operation.requestBody?.content["application/json"].schema;
    if (body) args.push(`body: ${named(body)}`);
    const hasKey = parameters.some((value) => value.name === "Idempotency-Key");
    if (hasKey) args.push("idempotencyKey: string");
    args.push("signal?: AbortSignal");
    const response = Object.entries(operation.responses).find(([code]) => code.startsWith("2"))[1].content?.["application/json"].schema;
    const route = path.replace(/\{([^}]+)\}/g, (_, name) => "${encodeURIComponent(" + name + ")}");
    lines.push(`    ${operation.operationId}: (${args.join(", ")}) => request<${response ? named(response) : "void"}>(\`/customer${route}\`, { method: "${method.toUpperCase()}"${body ? ", body" : ""}${hasKey ? ", idempotencyKey" : ""}, ...(signal ? { signal } : {}) }),`);
  }
}
lines.push("  };", "}", "");
const output = lines.join("\n");
const target = resolve("clients/mobile/src/generated/customer.ts");
if (process.argv.includes("--check")) {
  if ((await readFile(target,"utf8")) !== output) throw new Error("Generated TypeScript client is stale. Run pnpm clients:generate.");
} else { await mkdir(dirname(target),{ recursive:true }); await writeFile(target,output); }
console.log("React Native Customer contract client is current.");
