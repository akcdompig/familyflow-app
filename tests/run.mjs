// Draait alle tests: bundelt elk *.test.ts met esbuild en start Node's eigen testrunner.
// Geen extra pakketten nodig. Gebruik: npm test
import { build } from "esbuild";
import { readdirSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "tests/.out");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const files = readdirSync(resolve(root, "tests")).filter((f) => f.endsWith(".test.ts"));
await build({
  entryPoints: files.map((f) => resolve(root, "tests", f)),
  outdir: out,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  alias: { "@": resolve(root, "src") },
  outExtension: { ".js": ".mjs" },
  logLevel: "error",
  external: ["node:*"],
});
const r = spawnSync(process.execPath, ["--test", "--test-reporter=spec", ...files.map((f) => resolve(out, f.replace(/\.ts$/, ".mjs")))], { stdio: "inherit", env: { ...process.env, TZ: "Europe/Amsterdam" } });
process.exit(r.status ?? 1);
