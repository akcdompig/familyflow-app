// Lokaal ontwikkelen: bouwt de demo bij elke wijziging opnieuw en serveert hem op http://localhost:3000
// Gebruik: npm run dev   (acceptatieversie: FF_UI=v2 npm run dev)
import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let bezig = false;
let nogEens = false;
function bouw() {
  if (bezig) return void (nogEens = true);
  bezig = true;
  const p = spawn(process.execPath, [resolve(root, "preview/build.mjs")], { stdio: "inherit", env: { ...process.env, FF_DEV: "1" } });
  p.on("exit", () => {
    bezig = false;
    if (nogEens) {
      nogEens = false;
      bouw();
    }
  });
}
bouw();
watch(resolve(root, "src"), { recursive: true }, () => bouw());
createServer((req, res) => {
  try {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(readFileSync(resolve(root, "preview/dist/index.html")));
  } catch {
    res.writeHead(503).end("Nog aan het bouwen…");
  }
}).listen(3000, () => console.log("FamilyFlow draait op http://localhost:3000 (demo)"));
