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

// ---------- Oude versie (1.x) ----------
await scenario("v1: alle tabbladen openen zonder fouten", v1, "10:00", async (p) => {
  for (const t of [/Taken/, /Thuis/, /Gezin/, /^Ik/, /Huiskamer/]) {
    await tab(p, t).click();
    await p.waitForTimeout(150);
  }
});
await scenario("v1: klus → achievement → viering → claimen", v1, "18:00", async (p) => {
  await tab(p, /Thuis/).click();
  await p.getByRole("tab", { name: /Klussen/ }).click();
  await knop(p, /Ramen lappen/).click();
  await knop(p, /Ik heb het gedaan/).click();
  await p.waitForSelector(".ff-viering-titel");
  assert.match(await p.locator(".ff-viering-titel").innerText(), /Altijd shinen/);
  await knop(p, /Yes!/).click();
  await tab(p, /Huiskamer/).click();
  await knop(p, /^Claim$/).click();
  await p.waitForSelector(".ff-viering-teller");
});
await scenario("v1: ochtendroutine afvinken geeft punten en Net gedaan", v1, "08:30", async (p) => {
  await knop(p, /Ochtendroutine afvinken|Mijn dag bijwerken/).click();
  for (const r of ["Douchen", "Tanden poetsen", "Deodorant", "Haar doen", "Bodylotion"]) await p.locator(".ff-dag-tegel", { hasText: r }).click();
  await knop(p, /^Klaar$/).click();
  assert.ok(await p.locator(".ff-feed-rij", { hasText: "ochtendroutine" }).count() > 0);
});
await scenario("v1: koken plannen haalt de honger weg", v1, "18:40", async (p) => {
  assert.ok(await p.locator(".ff-av-honger").count() > 0, "eerst honger");
  await tab(p, /Thuis/).click();
  await p.locator(".ff-chip", { hasText: /^Ik$/ }).first().click();
  await tab(p, /Huiskamer/).click();
  assert.equal(await p.locator(".ff-av-honger").count(), 0);
});
await scenario("v1: privacy-scherm", v1, "10:00", async (p) => {
  await tab(p, /^Ik/).click();
  await knop(p, /Privacy en gegevens/).click();
  await p.getByRole("heading", { name: "Privacy en gegevens" }).waitFor();
});

/** Toegankelijkheid op elk tabblad: elke knop heeft een naam, elk tikdoel is minstens 32×32 px, de pagina scrollt niet opzij. */
async function toegankelijk(p, tabs) {
  for (const t of tabs) {
    await tab(p, t).click();
    await p.waitForTimeout(150);
    const r = await p.evaluate(() => {
      const zichtbaar = (x) => { const b = x.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const el = [...document.querySelectorAll("button, a[href], input, select, textarea")].filter(zichtbaar);
      return {
        zonderNaam: el.filter((x) => !(x.getAttribute("aria-label") || x.textContent.trim() || x.getAttribute("placeholder") || x.labels?.length)).map((x) => x.outerHTML.slice(0, 80)),
        klein: el.filter((x) => { const b = x.getBoundingClientRect(); return b.height < 32 || b.width < 32; }).map((x) => (x.textContent || x.getAttribute("aria-label") || "").trim().slice(0, 30)),
        breed: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    assert.deepEqual(r.zonderNaam, [], `knoppen zonder naam op ${t}`);
    assert.deepEqual(r.klein, [], `te kleine tikdoelen op ${t}`);
    assert.equal(r.breed, false, `pagina scrollt opzij op ${t}`);
  }
}
await scenario("v1: toegankelijkheid op alle tabbladen", v1, "10:00", (p) => toegankelijk(p, [/Huiskamer/, /Thuis/, /Taken/, /Gezin/, /^Ik/]));

// ---------- Live (versie 2) ----------
await scenario("v2: toegankelijkheid op alle tabbladen", v2, "10:00", (p) => toegankelijk(p, [/Vandaag/, /Gezin/, /Hulp/, /^Ik/]));
await scenario("v2: alle tabbladen openen zonder fouten", v2, "10:00", async (p) => {
  for (const t of [/Gezin/, /Hulp/, /^Ik/, /Vandaag/]) {
    await tab(p, t).click();
    await p.waitForTimeout(150);
  }
});
await scenario("v2: Nu doen werkt de ochtend stap voor stap af", v2, "08:15", async (p) => {
  await wissel(p, "Lina");
  const eerst = await p.locator(".v2-nu-titel").innerText();
  await p.locator(".v2-check.is-groot").click();
  await p.waitForTimeout(200);
  assert.notEqual(await p.locator(".v2-nu-titel").innerText(), eerst, "volgende stap verschijnt");
});
await scenario("v2: meekijken als school (demo)", v2, "10:00", async (p) => {
  await p.locator(".ff-demobar").getByRole("button", { name: /Mentor|School/ }).first().click();
  await p.waitForTimeout(400);
  assert.ok(await p.locator(".ff-theme-pro").count() > 0, "school-scherm zichtbaar");
});
await scenario("v2: water tellen met één tik", v2, "10:00", async (p) => {
  const voor = await p.locator(".v2-teller").first().innerText();
  await p.locator(".v2-teller").first().click();
  assert.notEqual(await p.locator(".v2-teller").first().innerText(), voor);
});

await browser.close();
if (fouten) {
  console.log(`\n${fouten} scenario('s) mislukt`);
  process.exit(1);
}
console.log("\nAlle end-to-end scenario's geslaagd");
