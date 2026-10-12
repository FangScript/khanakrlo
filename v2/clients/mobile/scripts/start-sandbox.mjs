import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
const require = createRequire(import.meta.url);
const cli = resolve(dirname(require.resolve("expo/package.json")), "bin/cli");
const child = spawn(process.execPath, [cli,"start","--web","--localhost","--port","8087"], {
  env: { ...process.env, EXPO_PUBLIC_SANDBOX: "1" }, stdio: "inherit", windowsHide: true,
});
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
