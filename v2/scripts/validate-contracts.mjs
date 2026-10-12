import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const specPath = resolve("contracts/openapi/pilot.yaml");
await SwaggerParser.validate(specPath);
for (const file of (await readdir(resolve("contracts/openapi"))).filter((name) => name.endsWith(".json"))) {
  await SwaggerParser.validate(resolve("contracts/openapi", file));
  console.log(`Validated ${file}`);
}
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const schemaDirectory = resolve("contracts/events");
const files = (await readdir(schemaDirectory)).filter((name) => name.endsWith(".schema.json"));
const schemas = await Promise.all(files.map(async (filename) => ({ filename, schema: JSON.parse(await readFile(resolve(schemaDirectory, filename), "utf8")) })));
for (const { schema } of schemas) ajv.addSchema(schema);
for (const { filename, schema } of schemas) {
  if (!ajv.getSchema(schema.$id)) ajv.compile(schema);
  console.log(`Validated ${filename}`);
}
console.log(`Validated OpenAPI and ${files.length} event schemas.`);
