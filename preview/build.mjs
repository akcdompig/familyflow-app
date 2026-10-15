// Bouwt een losse HTML-preview van de app met esbuild (zonder Next.js).
// Gebruik: node preview/build.mjs
import { build } from "esbuild";
import { cpSync, existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "preview/dist");
mkdirSync(out, { recursive: true });

const result = await build({
  entryPoints: [resolve(root, "preview/main.tsx")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  alias: { "@": resolve(root, "src") },
  nodePaths: [resolve(root, "node_modules"), ...(process.env.EXTRA_NODE_PATH ? [process.env.EXTRA_NODE_PATH] : [])],
  define: { "process.env.NODE_ENV": '"production"', "process.env.FF_UI": JSON.stringify(process.env.FF_UI ?? "v1") },
  logLevel: "warning",
  logOverride: { "unsupported-directive": "silent" },
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = readFileSync(resolve(root, "src/styles/tokens.css"), "utf8") + "\n" + readFileSync(resolve(root, "src/styles/app.css"), "utf8");
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">';

// Volledige pagina, voor lokaal testen.
writeFileSync(
  resolve(out, "index.html"),
  `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>FamilyFlow</title>${fonts}<style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`,
);

// Inhoud voor een Claude-artifact (die zet zelf het html/head/body-kader eromheen).
writeFileSync(
  resolve(out, "artifact.html"),
  `<title>${process.env.FF_UI === "v2" ? "FamilyFlow Acceptatie" : "FamilyFlow"}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${fonts}\n<style>${css}\n.ff-app{padding-top:12px}</style>\n<div id="root"></div>\n<script>${js}</script>\n`,
);

// Acceptatie (FF_UI=v2): alleen de preview bouwen, de echte app in dist/ blijft de pilot.
if (process.env.FF_UI === "v2" || process.env.FF_DEV) {
  console.log("Acceptatie gebouwd:", out, `(${Math.round(js.length / 1024)} kB JS). dist/ is niet aangeraakt.`);
  process.exit(0);
}
// Echte app (release): dist/ met config.js, manifest, iconen en service worker. Vercel serveert deze map.
const dist = resolve(root, "dist");
mkdirSync(dist, { recursive: true });
cpSync(resolve(root, "public"), dist, { recursive: true });
const cfgFile = resolve(dist, "config.js");
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  writeFileSync(cfgFile, `self.FF_CONFIG = ${JSON.stringify({ url: process.env.SUPABASE_URL, anonKey: process.env.SUPABASE_ANON_KEY })};\n`);
} else if (!existsSync(cfgFile)) {
  writeFileSync(cfgFile, `// Vul hier je Supabase-gegevens in (Project Settings › API). Leeg = demo.\nself.FF_CONFIG = { url: "", anonKey: "" };\n`);
}
const head = [
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  "<title>FamilyFlow</title>",
  '<meta name="theme-color" content="#fff6ee">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="FamilyFlow">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<link rel="manifest" href="/manifest.webmanifest">',
  '<link rel="icon" href="/favicon.png">',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
  fonts,
].join("");
// De JavaScript als los bestand met een hash in de naam: de telefoon bewaart hem tot er een nieuwe versie is.
const assets = resolve(dist, "assets");
mkdirSync(assets, { recursive: true });
for (const f of readdirSync(assets)) if (/^app-[0-9a-f]+\.js$/.test(f)) rmSync(resolve(assets, f));
const appJs = result.outputFiles[0].text;
const hash = createHash("sha256").update(appJs).digest("hex").slice(0, 12);
writeFileSync(resolve(assets, `app-${hash}.js`), appJs);
writeFileSync(
  resolve(dist, "index.html"),
  `<!doctype html><html lang="nl"><head>${head}<style>${css}</style></head><body><div id="root"></div><script src="/config.js"></script><script src="/assets/app-${hash}.js"></script><script>if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("/sw.js");</script></body></html>`,
);

console.log("Preview gebouwd:", out, `(${Math.round(js.length / 1024)} kB JS)`);
