import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["**/.next/**", "**/node_modules/**", "**/build/**", "**/dist/**", "**/next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { console: "readonly", process: "readonly", Buffer: "readonly", fetch: "readonly", URL: "readonly", setTimeout: "readonly", clearTimeout: "readonly", crypto: "readonly", AbortSignal: "readonly", TextEncoder: "readonly" } } },
];
