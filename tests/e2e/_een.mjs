// End-to-end: de gebouwde demo in een echte browser doorklikken, op telefoonformaat.
// Faalt bij een JavaScript-fout op de pagina of als een stap niet lukt.
// Gebruik: npm run build && npm run build:v1 && npm run e2e
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const v1 = `file://${resolve(root, "preview/v1/index.html")}`;
const v2 = `file://${resolve(root, "preview/dist/index.html")}`;
const browser = await chromium.launch();
let fouten = 0;

async function scenario(naam, url, tijd, stappen) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "Europe/Amsterdam", locale: "nl-NL" });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.clock.setFixedTime(new Date(`2026-10-15T${tijd}:00+02:00`));
  try {
    await p.goto(url);
    await p.waitForSelector(".ff-nav", { timeout: 10000 });
    await stappen(p);
    assert.deepEqual(errs, [], "geen JavaScript-fouten");
    console.log(`✔ ${naam}`);
  } catch (e) {
    fouten++;
    console.log(`✖ ${naam}\n  ${String(e.message ?? e).split("\n").slice(0, 3).join("\n  ")}`);
  }
  await ctx.close();
}
const knop = (p, naam) => p.getByRole("button", { name: naam }).first();
const tab = (p, naam) => p.locator(".ff-nav").getByRole("button", { name: naam });
const wissel = (p, wie) => p.locator(".ff-demobar").getByRole("button", { name: wie }).click();

await scenario("v3.7: ouder plakt een oefentoets, kind oefent en ziet wat nog moet", v2, "16:00", async (p) => {
  await wissel(p, "Papa");
  await tab(p, /^Ik/).click();
  await knop(p, /Huiswerk en Somtoday van de kinderen/).click();
  const toetsen = p.getByRole("region", { name: "Oefentoetsen" });
  await toetsen.getByRole("button", { name: "+ Oefentoets plakken" }).click();
  const blad = p.getByRole("dialog");
  assert.match(await blad.innerText(), /Gebruik alleen wat er op de foto's staat/);
  await blad.getByPlaceholder("Bijv. Duits H4 woordjes").fill("Wiskunde H3");
  await blad.locator("textarea").fill("V: 2 + 2?\nA: 4\nO: 3 | 5 | 22\n\nV: Hoeveel graden in een driehoek?\nA: 180");
  assert.match(await blad.innerText(), /2 vragen gevonden/);
  await blad.getByRole("button", { name: "Vragen nakijken" }).click();
  await blad.getByRole("button", { name: "Klopt, opslaan" }).click();
  assert.match(await toetsen.innerText(), /Wiskunde H3/);
  await p.goto(v2); await p.waitForSelector(".ff-nav");
  await wissel(p, "Noah");
  await knop(p, /Oefentoets klaar: Duits H4 woordjes/).click();
  const t = p.getByRole("region", { name: "Oefentoetsen" });
  await t.locator(".v2-toets-rij", { hasText: "Duits H4 woordjes" }).getByRole("button", { name: "Oefenen" }).click();
  const oef = p.getByRole("region", { name: "Oefentoets" });
  await oef.getByRole("button", { name: "de kat" }).click();
  assert.match(await oef.innerText(), /Nog niet/);
  await oef.getByRole("button", { name: "Volgende" }).click();
  await oef.getByRole("button", { name: "de school" }).click();
  await oef.getByRole("button", { name: "Volgende" }).click();
  await oef.getByRole("textbox").fill("das buch");
  await oef.getByRole("button", { name: "Nakijken" }).click();
  assert.match(await oef.innerText(), /Goed!/);
  await oef.getByRole("button", { name: "Volgende" }).click();
  await oef.getByRole("button", { name: "snel" }).click();
  await oef.getByRole("button", { name: "Volgende" }).click();
  assert.match(await oef.innerText(), /nog een keer/, "foute vraag komt terug");
  await oef.getByRole("button", { name: "de hond" }).click();
  await oef.getByRole("button", { name: "Volgende" }).click();
  const uit = p.getByRole("region", { name: "Uitslag" });
  assert.match(await uit.innerText(), /3 van 4 meteen goed/);
  assert.match(await uit.innerText(), /geen cijfer/);
  await uit.getByRole("button", { name: "Klaar" }).click();
  await p.getByRole("button", { name: "Sluiten" }).first().click();
  // 3.13: papa ziet per keer wat goed en fout ging, en wat Noah antwoordde. Bekijken telt niet als poging.
  await wissel(p, "Papa");
  await tab(p, /^Ik/).click();
  await knop(p, /Huiswerk en Somtoday van de kinderen/).click();
  const lijst = p.getByRole("region", { name: "Oefentoetsen" });
  assert.match(await lijst.innerText(), /1× geoefend · laatst 3 van 4 goed/);
  assert.equal(await lijst.getByRole("button", { name: "Oefenen" }).count(), 0, "ouder oefent niet namens het kind");
  await lijst.getByRole("button", { name: "Resultaten van Duits H4 woordjes" }).click();
  const res = p.getByRole("region", { name: "Resultaten Duits H4 woordjes" });
  assert.match(await res.innerText(), /Noah: de kat/, "wat Noah antwoordde");
  assert.match(await res.innerText(), /Goed antwoord: de hond/);
  await res.getByRole("button", { name: /Terug naar de toetsen/ }).click();
  assert.match(await p.getByRole("region", { name: "Oefentoetsen" }).innerText(), /1× geoefend/, "bekijken voegt geen poging toe");
  await p.getByRole("region", { name: "Oefentoetsen" }).getByRole("button", { name: "Resultaten van Engels H2 woordjes" }).click();
  const en = p.getByRole("region", { name: "Resultaten Engels H2 woordjes" });
  assert.match(await en.innerText(), /Eerste keer 1 van 3 goed, laatste keer 2 van 3\. Noah gaat vooruit/);
  assert.match(await en.innerText(), /Gaat vaker fout[\s\S]*to borrow/);
  assert.match(await en.innerText(), /Noah: lijnen/);
  await en.locator("summary").nth(1).click();
  assert.match(await en.innerText(), /Noah: wist het niet/, "eerdere poging: Weet ik niet");
});

if (fouten) {
  console.log(`\n${fouten} scenario('s) mislukt`);
  process.exit(1);
}
console.log("\nAlle end-to-end scenario's geslaagd");
