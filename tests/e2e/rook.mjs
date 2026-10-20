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
      // Inhoud van een dichte lade telt niet: die is niet te zien (nieuwere Chrome geeft er wel een maat aan).
      const inDichteLade = (x) => { const d = x.closest("details:not([open])"); return !!d && !x.closest("summary"); };
      const zichtbaar = (x) => { const b = x.getBoundingClientRect(); return b.width > 0 && b.height > 0 && !inDichteLade(x); };
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
await scenario("v2: toegankelijkheid op alle tabbladen", v2, "10:00", (p) => toegankelijk(p, [/Vandaag/, /^Week/, /Gezin/, /^Ik/]));
await scenario("v2: alle tabbladen openen zonder fouten", v2, "10:00", async (p) => {
  for (const t of [/^Week/, /Gezin/, /^Ik/, /Vandaag/]) {
    await tab(p, t).click();
    await p.waitForTimeout(150);
  }
});
await scenario("v2/3.11: ring van het kind telt hetzelfde als de kinderrij bij de ouder", v2, "16:00", async (p) => {
  await wissel(p, "Lina");
  const ring = (await p.locator(".v2-ring").getAttribute("aria-label")).match(/(\d+) van (\d+)/).slice(1).join("/");
  await wissel(p, "Papa");
  const kop = (await p.getByRole("region", { name: "De kinderen vandaag" }).getByRole("button", { name: /^Lina/ }).innerText()).match(/(\d+) van (\d+)/).slice(1).join("/");
  assert.equal(kop, ring);
});

await scenario("v2: Nu doen werkt de ochtend stap voor stap af (3.8: in de lijst)", v2, "08:15", async (p) => {
  await wissel(p, "Lina");
  // Het volgende ding om te doen heeft een rand in de lijst. Bij de ochtendroutine: het eerstvolgende stapje.
  const eerst = await p.locator(".v2-sub-knop.is-volgende").innerText();
  await p.locator(".v2-sub-knop.is-volgende").click();
  await p.waitForTimeout(200);
  assert.notEqual(await p.locator(".v2-sub-knop.is-volgende").innerText(), eerst, "volgende stap verschijnt");
});
await scenario("v2: meekijken als school (demo)", v2, "10:00", async (p) => {
  await p.locator(".ff-demobar").getByRole("button", { name: /Mentor|School/ }).first().click();
  await p.waitForTimeout(400);
  assert.ok(await p.locator(".ff-theme-pro").count() > 0, "school-scherm zichtbaar");
});
await scenario("v3.5: water in glazen: altijd zichtbaar, tik = zoveel glazen, nog een keer = één terug", v2, "10:00", async (p) => {
  const blok = p.getByRole("region", { name: "Water en fruit" });
  assert.match(await blok.innerText(), /1,5 liter/);
  await blok.getByRole("button", { name: "3 glazen water" }).click();
  assert.match(await blok.innerText(), /3 van 6 glazen/);
  await blok.getByRole("button", { name: /^3 glazen water, tik om er één af te halen/ }).click();
  assert.match(await blok.innerText(), /2 van 6 glazen/);
  await blok.getByRole("button", { name: "Nog een glas water" }).click();
  assert.match(await blok.innerText(), /3 van 6 glazen/);
});

await scenario("v3.8: tip van vandaag staat bij Ik (niet meer tussen de taken op Vandaag)", v2, "10:00", async (p) => {
  await wissel(p, "Noah");
  assert.ok(!/Tip van vandaag/.test(await p.locator("body").innerText()), "niet op Vandaag");
  await tab(p, /^Ik/).click();
  assert.match(await p.locator("body").innerText(), /Tip van vandaag · (gezond eten en drinken|praten en ruzie oplossen)/);
});

await scenario("v2: kind geeft snoep aan, ouder ziet het in het overzicht", v2, "16:00", async (p) => {
  await wissel(p, "Lina");
  await p.getByRole("button", { name: /Ongezond vandaag/ }).click();
  assert.match(await p.getByRole("dialog").innerText(), /Light of zero telt niet mee/);
  await p.getByRole("button", { name: "Drinken met suiker plus één" }).click();
  await p.getByRole("button", { name: "Snoep of snack plus één" }).click();
  await knop(p, /^Klaar$/).click();
  assert.match(await p.getByRole("button", { name: /Ongezond vandaag/ }).innerText(), /2/);
  await wissel(p, "Papa");
  await tab(p, /Gezin/).click();
  const rij = p.getByRole("region", { name: "Eten en drinken van de kinderen" }).locator(".v2-voeding-kind", { hasText: "Lina" });
  assert.match(await rij.innerText(), /2× ongezond/);
  await rij.click();
  assert.match(await p.locator(".v2-voeding").innerText(), /drinken met suiker/i);
  await p.locator(".v2-voeding").scrollIntoViewIfNeeded();
});

// Nieuwere Chrome (Android): scrollTo geeft een Promise terug. Een effect mag dat niet teruggeven (fout bij Kimberly, 15 okt).
await scenario("v2: tabbladen wisselen als scrollTo een Promise teruggeeft (Chrome Android)", v2, "18:00", async (p) => {
  await p.evaluate(() => { const o = window.scrollTo.bind(window); window.scrollTo = (...a) => { o(...a); return Promise.resolve(); }; });
  for (const wie of ["Mama", "Lina"]) {
    await wissel(p, wie);
    for (const t of [/Gezin/, /^Week/, /^Ik/, /Vandaag/, /Gezin/]) {
      await tab(p, t).click();
      await p.waitForTimeout(100);
    }
    assert.equal(await p.locator("text=Oeps").count(), 0, `geen foutscherm bij ${wie}`);
  }
});

// ---------- Samenwerken en eerlijk verdelen ----------
// 3.9: Gezin heeft geen subtabbladen meer. Week is een eigen tabblad; klussen en samen zitten dichtgeklapt bij Gezin.
const gezinTab = async (p, naam) => {
  const s = String(naam);
  if (/Week/.test(s)) return tab(p, /^Week/).click();
  await tab(p, /Gezin/).click();
  if (/Taken/.test(s)) { await p.locator("#gezin-klussen > summary").click(); await p.locator("#gezin-klussen[open] .ff-card, #gezin-klussen[open] section").first().waitFor(); }
  else if (/Samen/.test(s)) await p.locator(".v2-meer-details > summary", { hasText: "Samen iets doen" }).click();
};
const rust = (p) => p.getByRole("button", { name: /^Rust: hulp/ }).click();

await scenario("v2: eerlijke verdeling met minuten en waarom", v2, "16:00", async (p) => {
  await wissel(p, "Lina");
  await gezinTab(p, /^Taken/);
  const vandaag = p.getByRole("region", { name: "Wie doet wat vandaag" });
  assert.match(await vandaag.innerText(), /min/);
  assert.match(await p.locator(".ff-afspraak-banner").innerText(), /Voorstel/);
  await vandaag.locator(".ff-verdeling-rij", { hasText: "Jij" }).locator(".ff-mini-klus").first().click();
  assert.match(await p.locator(".ff-klus-info").innerText(), /minuten/);
  assert.match(await p.locator(".ff-klus-info").innerText(), /Jij/);
});

await scenario("v2: samen beslissen met steen-papier-schaar, de ander doet het", v2, "16:00", async (p) => {
  await wissel(p, "Lina");
  await gezinTab(p, /^Taken/);
  const rij = p.getByRole("region", { name: "Wie doet wat vandaag" }).locator(".ff-verdeling-rij", { hasText: "Jij" });
  const klus = rij.locator(".ff-mini-klus").filter({ hasNotText: "kamer" }).first();
  const label = (await klus.innerText()).trim();
  await klus.click();
  await knop(p, /Samen beslissen/).click();
  await p.locator(".ff-keuze-rij", { hasText: "Noah" }).click();
  await knop(p, /Ik doe mee/).click();
  await knop(p, /Steen-papier-schaar/).click();
  for (let r = 0; r < 2; r++) {
    await p.getByRole("button", { name: "Steen" }).click();
    await knop(p, /Ik ben Noah/).click();
    await p.getByRole("button", { name: "Schaar" }).click();
  }
  await p.waitForSelector(".ff-uitslag", { timeout: 5000 });
  assert.match(await p.locator(".ff-uitslag").innerText(), /Noah doet/);
  await knop(p, /^Oké$/).click();
  const noah = p.getByRole("region", { name: "Wie doet wat vandaag" }).locator(".ff-verdeling-rij", { hasText: "Noah" });
  assert.ok((await noah.innerText()).includes(label.split(" ")[1] ?? label), `${label} staat nu bij Noah`);
  // Neutraal in Net gedaan: geen winnaar of verliezer.
  await tab(p, /Gezin/).click();
  const feed = await p.locator("body").innerText();
  assert.ok(!/verloor|verloren|won /i.test(feed), "geen winnaar/verliezer in Net gedaan");
});

await scenario("v2: lukt me niet → ouder zegt oké → klus gaat naar een ander", v2, "16:00", async (p) => {
  await wissel(p, "Lina");
  await gezinTab(p, /^Taken/);
  const lina = () => p.getByRole("region", { name: "Wie doet wat vandaag" }).locator(".ff-verdeling-rij", { hasText: "Jij" });
  const klus = lina().locator(".ff-mini-klus").filter({ hasNotText: "kamer" }).first();
  const label = (await klus.innerText()).trim();
  await klus.click();
  await knop(p, /lukt me vandaag niet/).click();
  await knop(p, /Toets of veel huiswerk/).click();
  await knop(p, /Vraag het aan papa of mama/).click();
  assert.equal(await p.getByRole("region", { name: "Vragen van de kinderen" }).count(), 0, "kind ziet geen vragenlijst van ouders");
  await wissel(p, "Papa");
  await tab(p, /Gezin/).click();
  const vraag = p.getByRole("region", { name: "Vragen van de kinderen" });
  assert.match(await vraag.innerText(), /Lina/);
  assert.match(await vraag.innerText(), /Toets/);
  await vraag.getByRole("button", { name: "Oké, vandaag niet" }).click();
  assert.equal(await p.getByRole("region", { name: "Vragen van de kinderen" }).count(), 0, "vraag is beantwoord");
  await wissel(p, "Lina");
  await gezinTab(p, /^Taken/);
  assert.ok(!(await lina().innerText()).includes(label), `${label} is niet meer van Lina`);
});

await scenario("v2: samen iets plannen, doen en terugkijken", v2, "16:00", async (p) => {
  await wissel(p, "Papa");
  await gezinTab(p, /Samen/);
  await p.locator(".v2-idee", { hasText: "Samen koken" }).click();
  await p.getByLabel("Samen iets plannen").getByRole("button", { name: "Lina" }).click();
  await p.getByRole("button", { name: /^Plannen$/ }).last().click();
  const gepland = p.getByRole("region", { name: "Gepland" });
  assert.match(await gepland.innerText(), /Samen koken/);
  await gepland.getByRole("button", { name: "Gedaan" }).first().click();
  await gepland.getByRole("button", { name: "Klopt, gedaan" }).click();
  const hoe = p.getByRole("region", { name: "Hoe was het?" });
  await hoe.getByRole("button", { name: /😍/ }).first().click();
  assert.match(await p.getByRole("region", { name: "Jouw band" }).innerText(), /Lina/);
});

await scenario("v2: ouder legt klusafspraken vast", v2, "10:00", async (p) => {
  await wissel(p, "Papa");
  await gezinTab(p, /^Taken/);
  await p.locator(".ff-afspraak-banner").click();
  await p.getByRole("switch", { name: /Ramen lappen/ }).click();
  assert.equal(await p.getByRole("switch", { name: /Ramen lappen/ }).getAttribute("aria-checked"), "false");
  await knop(p, /Afspraken vastleggen/).click();
  assert.match(await p.locator(".ff-afspraak-banner").innerText(), /Afgesproken/);
  assert.equal(await p.locator(".ff-klus", { hasText: "Ramen lappen" }).count(), 0, "uitgezette klus staat niet meer in de lijst");
  // Alleen ouders zien de eerlijkheid over 2 weken.
  assert.equal(await p.getByRole("region", { name: "Eerlijk verdeeld" }).count(), 1);
  await wissel(p, "Lina");
  assert.equal(await p.getByRole("region", { name: "Eerlijk verdeeld" }).count(), 0);
});

await scenario("v2: groeidoelen kiezen en terugblikken", v2, "18:00", async (p) => {
  await wissel(p, "Lina");
  await tab(p, /^Week/).click();
  await p.locator(".v2-meer-details > summary", { hasText: "Doelen en wensen" }).click();
  assert.equal(await p.locator(".v2-groei-tegel").count(), 0, "niet meteen 10 tegels");
  await knop(p, /Kies een groeidoel/).click();
  await p.locator(".v2-groei-tegel", { hasText: "Samenwerken" }).click();
  await p.locator(".v2-groei-tegel", { hasText: "Plannen en organiseren" }).click();
  assert.equal(await p.locator(".v2-groei-tegel", { hasText: "Conflicten oplossen" }).isDisabled(), true, "hooguit 2");
  await knop(p, /^Klaar$/).click();
  const groei = p.getByRole("region", { name: "Groeidoelen" });
  assert.match(await groei.innerText(), /Samenwerken/);
  await groei.getByRole("button", { name: /Nog lastig/ }).first().click();
  assert.equal(await groei.getByRole("button", { name: /Nog lastig/ }).first().getAttribute("aria-pressed"), "true");
});

await scenario("v2: schermtijd — kind ziet 'eerst je dag', ouder vult in en ziet de week", v2, "16:00", async (p) => {
  await wissel(p, "Lina");
  assert.match(await p.getByRole("region", { name: "Schermtijd" }).innerText(), /Eerst je dag|Je dag is af/);
  await wissel(p, "Papa");
  await tab(p, /Gezin/).click();
  const ov = p.getByRole("region", { name: "Schermtijd van de kinderen" });
  assert.match(await ov.innerText(), /nog niet ingevuld/);
  await ov.locator(".v2-voeding-kind", { hasText: "Lina" }).click();
  await p.getByLabel("Totaal uren").fill("4");
  await p.getByLabel("Totaal minuten").fill("36");
  await p.getByLabel("Sociaal in minuten").fill("233");
  await knop(p, /^Opslaan$/).click();
  assert.equal(await p.locator(".v2-scherm-staaf i.is-over").count(), 1, "boven de afspraak is rood");
  await p.keyboard.press("Escape");
  assert.match(await ov.innerText(), /Vandaag 4 u 36 m/);
});

// ---------- Simpel voor kinderen ----------
await scenario("v2/3.9: kind ziet een rustige app — 4 tabbladen, geen subtabbladen, korte lijsten", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  assert.deepEqual((await p.locator(".ff-nav button").allInnerTexts()).map((t) => t.trim()), ["Vandaag", "Week", "Rust", "Gezin", "Ik"]);
  await tab(p, /Gezin/).click();
  assert.equal(await p.locator(".v2-seg [role=tab]").count(), 0, "geen subtabbladen meer");
  await p.locator(".v2-meer-details > summary", { hasText: "Samen iets doen" }).click();
  assert.ok((await p.locator(".v2-idee").count()) <= 6, "hooguit 5 ideeën + iets anders");
  assert.equal(await p.getByRole("button", { name: "gratis", exact: true }).count(), 0, "filters zitten achter Meer ideeën");
  await knop(p, /Meer ideeën/).click();
  assert.equal(await p.getByRole("button", { name: "gratis", exact: true }).count(), 1);
  await wissel(p, "Papa");
  await tab(p, /Gezin/).click();
  assert.equal(await p.locator(".v2-meer-details > summary", { hasText: "Eten deze week" }).count(), 1, "ouders: ook eten plannen");
});

// ---------- Week en groei ----------
await scenario("v2: week — morgen samen trainen staat klaar, en zelf iets plannen voor overmorgen", v2, "18:00", async (p) => {
  await wissel(p, "Papa");
  await gezinTab(p, /^Week$/);
  await p.getByRole("tab", { name: /^Vrijdag/ }).click();
  assert.match(await p.getByRole("region", { name: "Samen op deze dag" }).innerText(), /Trainen met Lina en Noah/);
  await p.getByRole("tab", { name: /^Zaterdag/ }).click();
  await knop(p, /Iets samen plannen op deze dag/).click();
  await p.getByPlaceholder("Wat gaan jullie doen?").fill("Naar de stad");
  await p.getByLabel("Samen iets plannen").getByRole("button", { name: "Mama" }).click();
  await p.getByRole("dialog").getByRole("button", { name: /^Plannen$/ }).last().click();
  assert.match(await p.getByRole("region", { name: "Samen op deze dag" }).innerText(), /Naar de stad/);
  await p.getByRole("tab", { name: /^Dinsdag/ }).click();
  assert.equal(await p.locator(".v2-week-lid").count(), 4, "ouder ziet hoe de dag ging voor iedereen");
  // Tik op iemand: precies zien wat er gedaan is, met dezelfde telling.
  const rij = p.locator(".v2-dagrij", { hasText: "Mama" });
  const kop = await rij.locator(".v2-week-lid b").innerText();
  const [af, totaal] = kop.match(/(\d+) van (\d+)/).slice(1).map(Number);
  await rij.locator(".v2-week-lid").click();
  assert.equal(await rij.locator(".v2-dagitem").count(), totaal, "evenveel items als de telling");
  assert.equal(await rij.locator(".v2-dagitem.is-klaar").count(), af, "evenveel vinkjes als gedaan");
  assert.match(await rij.innerText(), /routine/i);
});

await scenario("v2: groei — weekverhaal, gepland vs gedaan, en kind ziet alleen zichzelf", v2, "18:00", async (p) => {
  await wissel(p, "Papa");
  await tab(p, /^Week/).click();
  await p.locator(".v2-meer-details > summary", { hasText: "Terugkijken op de week" }).click();
  assert.ok((await p.getByRole("region", { name: "Het verhaal van de week" }).innerText()).length > 20);
  const samen = p.getByRole("region", { name: "Samen ondernomen" });
  assert.match(await samen.innerText(), /Trainen met Lina en Noah/);
  assert.match(await samen.innerText(), /gepland/, "morgen trainen staat als gepland, niet als gedaan");
  assert.ok(await p.getByRole("region", { name: "Volgende week" }).isVisible());
  assert.equal(await p.locator(".v2-weekgrid-naam").first().isVisible(), false, "details staan standaard dicht");
  await p.locator(".v2-meer-details summary", { hasText: "Meer bekijken" }).click();
  assert.equal(await p.locator(".v2-weekgrid-naam").count(), 4);
  // Terug naar vorige week.
  await p.locator(".v2-rapport-nav").getByRole("button", { name: "Vorige week" }).click();
  assert.match(await p.locator(".v2-rapport-nav").innerText(), /Vorige week/);
  assert.match(await p.getByRole("region", { name: "Samen ondernomen" }).innerText(), /gedaan/);
  await p.locator(".v2-comp-kop", { hasText: "Samenwerken" }).click();
  assert.match(await p.locator(".v2-comp-open").innerText(), /geoefend/);
  await wissel(p, "Noah");
  await tab(p, /^Week/).click();
  await p.locator(".v2-meer-details > summary", { hasText: "Terugkijken op de week" }).click();
  await p.locator(".v2-meer-details summary", { hasText: "Meer bekijken" }).click();
  assert.equal(await p.locator(".v2-weekgrid-naam").count(), 1, "kind ziet alleen zijn eigen week");
  assert.match(await p.getByRole("region", { name: "Competenties" }).innerText(), /Waar groei jij in/);
  assert.equal(await p.getByRole("region", { name: "Competenties" }).locator(".ff-chip").count(), 0, "kind kan anderen niet bekijken");
});

// ---------- 3.0 Samen verder: de afsprakenlus ----------
await scenario("v3: huisregel van 8 dagen oud → hielp het? → nee → andere aanpak met de coach (staat bij Week)", v2, "18:00", async (p) => {
  await wissel(p, "Papa");
  await tab(p, /^Week/).click();
  const vraag = p.getByRole("region", { name: "Hielp de huisregel?" });
  assert.match(await vraag.innerText(), /Een seintje 10 minuten/);
  await vraag.getByRole("button", { name: /Nee, nog niet/ }).click();
  assert.match(await vraag.innerText(), /Een andere aanpak kiezen/);
  await vraag.getByRole("button", { name: /Een andere aanpak kiezen/ }).click();
  assert.ok(await p.getByText("Eerst even checken").isVisible(), "coach opent bij de veiligheidscheck van dezelfde situatie");
});

await scenario("v3: herhaling wordt opgemerkt (Week) en huisregels staan op één plek (Gezin)", v2, "18:00", async (p) => {
  await wissel(p, "Papa");
  await tab(p, /^Week/).click();
  assert.match(await p.getByRole("region", { name: "Komt vaker terug" }).innerText(), /Stoppen met gamen\s*3× in 4 weken/);
  await tab(p, /Gezin/).click();
  const lijst = p.getByRole("region", { name: "Huisregels" });
  assert.match(await lijst.innerText(), /Kloppen voordat je/);
  await lijst.getByRole("button", { name: "+ Huisregel toevoegen" }).click();
  await lijst.getByLabel("Nieuwe huisregel").fill("Telefoon om 21.00 aan de lader");
  await lijst.getByRole("button", { name: "Toevoegen" }).click();
  assert.match(await lijst.innerText(), /Telefoon om 21.00 aan de lader/);
  await wissel(p, "Noah");
  assert.equal(await p.getByRole("region", { name: "Komt vaker terug" }).count(), 0, "kinderen krijgen geen herhalingsmelding");
});

await scenario("v3.8: 'Hielp de huisregel?' staat op één plek: Week, niet op Vandaag", v2, "18:00", async (p) => {
  await wissel(p, "Noah");
  assert.equal(await p.getByRole("region", { name: "Hielp de huisregel?" }).count(), 0, "niet op Vandaag");
  await tab(p, /^Week/).click();
  const kaart = p.getByRole("region", { name: "Hielp de huisregel?" });
  await kaart.getByRole("button", { name: /Ja, het helpt/ }).click();
  assert.equal(await p.getByRole("region", { name: "Hielp de huisregel?" }).count(), 0);
});

await scenario("v3: kind en ouder praten een ruzie samen uit, en maken een afspraak", v2, "18:00", async (p) => {
  await wissel(p, "Noah");
  await rust(p);
  await knop(p, /Ruzie of gedoe/).click();
  await p.locator(".ff-choice", { hasText: "vader of moeder" }).click();
  await p.locator(".ff-choice", { hasText: "Samen uitpraten" }).click();
  await p.getByRole("button", { name: "Papa", exact: true }).click();
  await p.getByRole("button", { name: "Gamen of schermtijd" }).click();
  await knop(p, /^Verder$/).click();
  await p.locator(".ff-licht-groen").click();
  await p.getByRole("button", { name: "Oneerlijk behandeld" }).click();
  await p.getByRole("button", { name: "Een huisregel maken" }).click();
  await knop(p, /Versturen naar Papa/).click();
  await wissel(p, "Papa");
  await tab(p, /Gezin/).click();
  await p.locator(".ff-card", { hasText: "Noah wil een ruzie uitpraten" }).getByRole("button", { name: "Bekijken" }).click();
  assert.match(await p.locator(".ff-quote").innerText(), /Oneerlijk behandeld/, "ouder leest eerst de kant van het kind");
  await knop(p, /Mijn kant vertellen/).click();
  await p.locator(".ff-licht-groen").click();
  await p.getByRole("button", { name: "Boos" }).click();
  await p.getByRole("button", { name: "Een huisregel maken" }).click();
  await knop(p, /^Verder$/).click();
  assert.equal(await p.getByRole("button", { name: "Een ouder helpt ons" }).count(), 0, "geen 'ouder helpt' als een ouder meedoet");
  await knop(p, /We spreken een regel af/).click();
  await p.getByPlaceholder(/Bijv. we vragen eerst/).fill("Gamen tot 20.00, dan een seintje");
  await knop(p, /Huisregel bewaren/).click();
  await tab(p, /Gezin/).click();
  assert.match(await p.getByRole("region", { name: "Huisregels" }).innerText(), /Gamen tot 20.00[\s\S]*na een ruzie over gamen of schermtijd/);
});

await scenario("v3: ouder met een opvoedvraag, en een rustiger huiskamer", v2, "17:30", async (p) => {
  await wissel(p, "Papa");
  await rust(p);
  await knop(p, /Ik heb een opvoedvraag/).click();
  const tekst = await p.locator("body").innerText();
  assert.match(tekst, /Huiswerk wordt steeds uitgesteld/);
  assert.match(tekst, /Samen schermregels afspreken/);
  await p.locator(".ff-choice", { hasText: "Huiswerk wordt steeds uitgesteld" }).click();
  assert.ok(await p.getByText("Eerst even checken").isVisible());
  await p.goto(v2); await p.waitForSelector(".ff-nav");
  await wissel(p, "Noah");
  assert.equal(await p.locator(".v2-sub-knop.is-volgende", { hasText: "Douchen" }).count(), 0, "om 17.30 is douchen niet meer 'Nu doen'");
  await tab(p, /Gezin/).click();
  const gezin = await p.locator("body").innerText();
  assert.ok(!/pfoe/i.test(gezin), "niemand wordt aangesproken op douchen");
  assert.ok(!/Klassement/.test(gezin), "geen ranglijst");
  assert.ok(await p.getByRole("region", { name: "Samen vandaag" }).isVisible());
});

// ---------- 3.1 Huishoudelijke taken: verdeel de taken ----------
await scenario("v3.1: ouder verdeelt de taken voor volgende week, wisselt er één en bevestigt", v2, "18:00", async (p) => {
  await wissel(p, "Papa");
  await gezinTab(p, /^Taken/);
  await knop(p, /Verdeel de taken/).click();
  await p.getByRole("button", { name: "Volgende week" }).click();
  assert.match(await p.getByRole("region", { name: "Minuten per persoon" }).innerText(), /Noah[\s\S]*min[\s\S]*Lina[\s\S]*min/);
  const maandag = p.getByRole("region", { name: /^ma / });
  const rij = maandag.locator(".v2-verdeel-rij", { hasText: "Vaatwasser uitruimen" });
  const voor = (await rij.locator(".v2-verdeel-wie").innerText()).trim();
  await rij.locator(".v2-verdeel-taak").click();
  const ander = voor === "Noah" ? "Lina" : "Noah";
  await rij.getByRole("button", { name: ander, exact: true }).click();
  assert.equal((await rij.locator(".v2-verdeel-wie").innerText()).trim(), ander);
  assert.match(await rij.innerText(), /aangepast door papa/);
  await knop(p, /^Bevestigen$/).click();
  assert.match(await p.locator("#gezin-klussen .v2-meer-details summary").first().innerText(), /Planning bevestigd t\/m/);
  // Opnieuw verdelen: eerst zien wat er verandert aan wat al bevestigd was.
  await knop(p, /Verdeel de taken/).click();
  await p.getByRole("button", { name: "Volgende week" }).click();
  await knop(p, /^Bevestigen$/).click();
  const check = p.getByRole("region", { name: "Dit verandert" });
  assert.match(await check.innerText(), /vaatwasser uitruimen/);
  await knop(p, /Ja, doorvoeren/).click();
  await p.locator(".v2-meer-details summary", { hasText: "Planning bevestigd" }).click();
  assert.match(await p.locator(".v2-meer-details", { hasText: "Planning bevestigd" }).last().innerText(), /heeft de taken verdeeld/);
});

await scenario("v3.1: kind ziet zijn week, de uitleg van een taak en geeft aan wat het wil leren", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  await gezinTab(p, /^Taken/);
  assert.equal(await p.getByRole("button", { name: /Verdeel de taken/ }).count(), 0, "alleen ouders verdelen");
  const week = p.getByRole("region", { name: "Mijn week" });
  assert.match(await week.innerText(), /voorstel/);
  await p.getByRole("region", { name: "Wie doet wat vandaag" }).locator(".ff-verdeling-rij", { hasText: "Jij" }).locator(".ff-mini-klus").filter({ hasNotText: "kamer" }).first().click();
  assert.match(await p.locator(".ff-klus-uitleg").innerText(), /Zo doe je het/i);
  await p.getByRole("button", { name: "🌱 Wil ik leren" }).click();
  assert.equal(await p.getByRole("button", { name: "🌱 Wil ik leren" }).getAttribute("aria-pressed"), "true");
});

await scenario("v3.1: ouder zet een taak uit de bibliotheek aan en voegt een eigen taak toe", v2, "10:00", async (p) => {
  await wissel(p, "Papa");
  await gezinTab(p, /^Taken/);
  await p.locator(".ff-afspraak-banner").click();
  await p.getByRole("switch", { name: /Tafel dekken uit/ }).click();
  assert.equal(await p.getByRole("switch", { name: /Tafel dekken/ }).getAttribute("aria-checked"), "true");
  await knop(p, /Eigen taak toevoegen/).click();
  await p.getByPlaceholder("Bijv. hond uitlaten").fill("Hond uitlaten");
  await p.getByRole("button", { name: "Elke dag", exact: true }).click();
  await p.getByPlaceholder(/rondje park/).fill("Rondje park en water bijvullen");
  await p.getByLabel("Eigen taak").getByRole("button", { name: "Toevoegen", exact: true }).click();
  assert.ok(await p.locator(".ff-afspraak-klus", { hasText: "Rondje park" }).isVisible());
  assert.match(await p.locator(".ff-afspraak-klus", { hasText: "Rondje park" }).innerText(), /Hond uitlaten/);
});

// ---------- 3.2 Duidelijk ----------
async function langeNamen(p) {
  // Demo slaat pas op na een eerste wijziging: tik één glas water aan.
  await p.getByRole("button", { name: "Nog een glas water" }).click();
  await p.waitForFunction(() => localStorage.getItem("familyflow:v1"));
  await p.evaluate(() => {
    const k = "familyflow:v1";
    const s = JSON.parse(localStorage.getItem(k));
    s.werk.p1[0].naam = "ING Bank (engineer)";
    s.werk.p2[0].naam = "Gemeente Almere (beleidsadviseur)";
    s.members.find((m) => m.id === "p2").name = "Kimberly mama";
    localStorage.setItem(k, JSON.stringify(s));
  });
  await p.reload(); await p.waitForSelector(".ff-nav");
}
for (const breed of [360, 390, 1280]) {
  await scenario(`v3.2: lange werknamen overlappen niet in de huiskamer (${breed}px)`, v2, "14:00", async (p) => {
    await p.setViewportSize({ width: breed, height: 900 });
    await langeNamen(p);
    await tab(p, /Gezin/).click();
    await p.waitForSelector(".ff-tag");
    const r = await p.evaluate(() => {
      const kamer = document.querySelector(".ff-room").getBoundingClientRect();
      const tags = [...document.querySelectorAll(".ff-slot-achter .ff-tag, .ff-slot-voor .ff-tag")].map((t) => ({ b: t.getBoundingClientRect(), rij: t.closest(".ff-slot").className }));
      let overlap = 0, buiten = 0;
      for (const [i, a] of tags.entries()) {
        if (a.b.left < kamer.left - 1 || a.b.right > kamer.right + 1) buiten++;
        for (const b of tags.slice(i + 1)) if (a.rij === b.rij && a.b.left < b.b.right - 1 && b.b.left < a.b.right - 1 && a.b.top < b.b.bottom && b.b.top < a.b.bottom) overlap++;
      }
      const label = document.querySelector(".ff-slot-achter").getAttribute("aria-label");
      return { overlap, buiten, label };
    });
    assert.equal(r.overlap, 0, "labels overlappen");
    assert.equal(r.buiten, 0, "labels buiten de kamer");
    assert.match(r.label, /ING Bank \(engineer\)/, "volledige tekst voor schermlezers");
  });
}

await scenario("v3.2: knoppen en links in koraal halen WCAG-contrast 4,5:1", v2, "10:00", async (p) => {
  const kleur = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ff-koraal-knop").trim());
  const L = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
  const cr = (a, b) => { const [x, y] = [L(a), L(b)].sort(); return (y + 0.05) / (x + 0.05); };
  assert.ok(cr(kleur, "#ffffff") >= 4.5, `koraal op wit ${cr(kleur, "#ffffff").toFixed(2)}`);
  assert.ok(cr(kleur, "#ffe9e4") >= 4.5, `koraal op zacht ${cr(kleur, "#ffe9e4").toFixed(2)}`);
});

await scenario("v3.2: ademhalen in de coach: in/uit-hulp en altijd een stopknop", v2, "18:00", async (p) => {
  await wissel(p, "Noah");
  await rust(p);
  await p.locator(".ff-aanrader").first().click();
  await knop(p, /^Verder/).click();
  await p.locator(".ff-licht-rood").click();
  await knop(p, "Ademhalen met de app").click();
  assert.ok(await p.getByText("Adem in…").isVisible());
  await knop(p, "Stoppen met ademhalen").click();
  assert.equal(await p.locator(".ff-adem").count(), 0, "ademoefening is gestopt");
  assert.ok(await knop(p, "Ademhalen met de app").isVisible(), "optie blijft staan");
});

await scenario("v3.2: ouder opent huiswerk en Somtoday van een kind via Ik", v2, "10:00", async (p) => {
  await wissel(p, "Papa");
  await tab(p, /^Ik/).click();
  await knop(p, /Huiswerk en Somtoday van de kinderen/).click();
  assert.match(await p.locator(".ff-eyebrow").first().innerText(), /Leerplanner · (Noah|Lina)/i);
  assert.ok(await p.getByRole("heading", { name: /Leerweek van (Noah|Lina)/ }).isVisible());
  assert.match(await p.locator("body").innerText(), /Somtoday/);
});

// ---------- 3.2: claimen met uitleg, losse afspraken, inzet ----------
await scenario("v3.2: claimen laat zien waarvoor de punten zijn, één voor één, en dubbelklik geeft niks extra", v2, "18:00", async (p) => {
  await wissel(p, "Noah");
  await tab(p, /^Ik/).click();
  const claim = p.getByRole("button", { name: "Ophalen", exact: true });
  await claim.dblclick();
  const dialoog = p.getByRole("alertdialog");
  await dialoog.getByText("Je hebt in totaal 45 punten verdiend").waitFor({ timeout: 5000 });
  const regels = await dialoog.locator(".ff-claim-regel").allInnerTexts();
  assert.ok(regels.some((r) => /Huiswerk maken\s*\+15/.test(r)), regels.join(" | "));
  assert.equal(regels.length, 4);
  await dialoog.getByRole("button", { name: "Top!" }).click();
  assert.equal(await p.getByRole("button", { name: "Ophalen", exact: true }).count(), 0, "schatkist is leeg");
  await p.reload(); await p.waitForSelector(".ff-nav");
  await wissel(p, "Noah"); await tab(p, /^Ik/).click();
  assert.equal(await p.getByRole("button", { name: "Ophalen", exact: true }).count(), 0, "na herladen nog steeds leeg");
  await p.getByText("Waar komen mijn punten vandaan?").click();
  assert.match(await p.locator(".ff-punten-historie").innerText(), /Huiswerk maken/);
  assert.match(await p.locator(".ff-punten-historie").innerText(), /Korte oefening gedaan/);
});

await scenario("v3.2: claimen met één beloning, en lege schatkist", v2, "18:00", async (p) => {
  await wissel(p, "Mama");
  await tab(p, /^Ik/).click();
  assert.equal(await p.getByRole("button", { name: "Ophalen", exact: true }).count(), 0, "niks te claimen: geen knop");
  await p.getByText("Waar komen mijn punten vandaan?").click();
  assert.match(await p.locator(".ff-punten-historie").innerText(), /Nog niks te zien/);
  // Eén beloning: inchecken.
  await tab(p, /Vandaag/).click();
  // 3.9: gevoel staat na de ochtend als klein knopje onder je naam; dat opent het inchecken.
  await p.locator(".v2-gevoel-chip").click();
  await p.getByRole("dialog").locator(".ff-mood").nth(3).click();
  await p.getByRole("dialog").getByRole("button", { name: "Klaar" }).click();
  await tab(p, /^Ik/).click();
  await p.getByRole("button", { name: "Ophalen", exact: true }).click();
  const dialoog = p.getByRole("alertdialog");
  await dialoog.getByText(/Je hebt in totaal \d+ punten verdiend/).waitFor({ timeout: 5000 });
  const regels = await dialoog.locator(".ff-claim-regel").allInnerTexts();
  assert.equal(regels.length, 1, regels.join(" | "));
  assert.match(regels[0], /Ingecheckt/);
});

await scenario("v3.2: losse afspraak toevoegen zonder werkdag, aanpassen met 'dit verandert'", v2, "10:00", async (p) => {
  await wissel(p, "Mama");
  await tab(p, /^Week/).click();
  await p.getByRole("button", { name: "+ Afspraak toevoegen" }).click();
  await p.getByRole("button", { name: "Afspraak opslaan" }).click();
  assert.match(await p.getByRole("alert").innerText(), /naam/);
  await p.getByRole("textbox", { name: "Wat" }).fill("Lunch met Sanne");
  await p.getByRole("dialog").getByLabel(/^Van/).fill("12:30");
  await p.getByRole("dialog").getByLabel(/^Tot/).fill("13:30");
  await p.getByRole("button", { name: /Sociaal/ }).click();
  const opslaan = p.getByRole("button", { name: "Afspraak opslaan" });
  // Twee keer snel achter elkaar op opslaan (zelfde knop, voordat het blad dicht is).
  await opslaan.evaluate((b) => { b.click(); b.click(); });
  const lijst = p.getByRole("region", { name: "Afspraken" });
  await lijst.getByText("Lunch met Sanne").waitFor();
  assert.equal(await lijst.getByText("Lunch met Sanne").count(), 1, "één afspraak, ook na dubbelklik");
  assert.ok(await lijst.getByText("Ontbijten met Akram").isVisible(), "afspraak van papa blijft staan");
  await lijst.getByRole("button", { name: /Lunch met Sanne/ }).click();
  await p.getByRole("dialog").getByLabel(/^Tot/).fill("14:00");
  await p.getByRole("button", { name: "Opslaan", exact: true }).click();
  const check = p.getByRole("region", { name: "Dit verandert" });
  assert.match(await check.innerText(), /Eind:\s*13\.30\s*→\s*14\.00/);
  await check.getByRole("button", { name: "Ja, opslaan" }).click();
  assert.match(await lijst.innerText(), /12\.30–14\.00/);
  assert.match(await lijst.innerText(), /11\.00–12\.00/, "andere afspraak ongewijzigd");
});

await scenario("v3.2: zakelijke afspraak geeft geen punten; inzet staat bij Ik zonder punten", v2, "18:00", async (p) => {
  await wissel(p, "Papa");
  await tab(p, /^Ik/).click();
  const punten = await p.locator(".v2-ik-kop").innerText();
  await tab(p, /^Week/).click();
  await p.getByRole("button", { name: "+ Afspraak toevoegen" }).click();
  await p.getByRole("textbox", { name: "Wat" }).fill("Pitch bij klant");
  await p.getByRole("dialog").getByLabel(/^Van/).fill("09:00");
  await p.getByRole("dialog").getByLabel(/^Tot/).fill("10:00");
  await p.getByRole("button", { name: /Zakelijk/ }).click();
  await p.getByRole("button", { name: "Afspraak opslaan" }).click();
  await tab(p, /^Ik/).click();
  assert.equal(await p.locator(".v2-ik-kop").innerText(), punten, "zelfde punten");
  const inzet = p.getByRole("region", { name: "Wat je deed deze week" });
  assert.match(await inzet.innerText(), /Zakelijke afspraak: Pitch bij klant/);
  assert.match(await inzet.innerText(), /zakelijke afspraak: Pitch bij klant\./i);
  await inzet.getByRole("button", { name: "+ Iets wat je deed" }).click();
  await inzet.getByRole("button", { name: /Rust en herstel/ }).click();
  await inzet.getByRole("button", { name: "Erbij zetten" }).click();
  assert.match(await inzet.innerText(), /ruimte gemaakt voor rust en herstel/);
  assert.equal(await p.locator(".v2-ik-kop").innerText(), punten, "inzet geeft geen punten");
});

for (const breed of [390, 1280]) {
  await scenario(`v3.2: afspraak met plaatje past op het scherm (${breed}px)`, v2, "10:00", async (p) => {
    await p.setViewportSize({ width: breed, height: 900 });
    await wissel(p, "Papa");
    const kaart = p.getByRole("region", { name: "Afspraken" });
    await kaart.waitFor();
    assert.equal(await kaart.locator(".ff-afspraak-beeld").count(), 1, "plaatje bij ontbijten met Akram");
    const breedte = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    assert.ok(breedte, "geen horizontaal scrollen");
  });
}

// ---------- 3.3: uitleg op het juiste moment ----------
await scenario("v3.3: uitleg bij de eerste keer, sluiten, en via Hulp opnieuw bekijken", v2, "10:00", async (p) => {
  const kaart = p.getByRole("region", { name: /^Uitleg: Dit is je dag/ });
  assert.ok(await kaart.isVisible(), "eerste keer op Vandaag: korte uitleg");
  await kaart.getByRole("button", { name: "Snap ik" }).click();
  assert.equal(await p.getByRole("region", { name: /^Uitleg: Dit is je dag/ }).count(), 0);
  await p.reload(); await p.waitForSelector(".ff-nav");
  assert.equal(await p.getByRole("region", { name: /^Uitleg: Dit is je dag/ }).count(), 0, "na herladen niet opnieuw");
  await tab(p, /^Ik/).click();
  await p.getByRole("button", { name: /Hoe werkt de app\?/ }).click();
  assert.ok(await p.getByRole("heading", { name: "Hoe werkt de app?" }).isVisible());
  await p.getByRole("button", { name: /Een afspraak toevoegen/ }).click();
  assert.match(await p.locator("body").innerText(), /ontbijten met Akram/);
  await p.getByRole("button", { name: "Laat de uitleg per scherm opnieuw zien" }).click();
  await tab(p, /Vandaag/).click();
  assert.ok(await p.getByRole("region", { name: /^Uitleg: Dit is je dag/ }).isVisible(), "uitleg komt terug");
});

await scenario("v3.3: afspraak en week altijd vanaf Vandaag, info-knopje toont één zin", v2, "10:00", async (p) => {
  await wissel(p, "Mama");
  await p.getByRole("button", { name: /^Toevoegen: taak/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: /^Afspraak Iets op een/ }).click();
  const blad = p.getByRole("dialog");
  assert.match(await blad.innerText(), /Nodig: wat, datum en hoe laat/);
  await blad.getByRole("textbox", { name: /Wat/ }).fill("Huisarts");
  await blad.getByLabel(/^Van/).fill("15:00");
  await blad.getByLabel(/^Tot/).fill("15:15");
  await blad.getByRole("button", { name: "Afspraak opslaan" }).click();
  assert.ok(await p.getByText("Afspraak gezet 📅").isVisible());
  assert.ok(await p.getByRole("region", { name: "Afspraken" }).getByText("Huisarts").isVisible());
  const info = p.getByRole("button", { name: "Wat betekent dit getal?" });
  await info.click();
  assert.match(await p.getByRole("note").innerText(), /routine, eten, taken en klussen/);
  await tab(p, /^Week/).click();
  assert.ok(await p.getByRole("tablist", { name: "Dagen van de week" }).isVisible(), "week staat open");
});

await scenario("v3.3: kind vindt hulp en uitleg zonder ouder", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  await tab(p, /^Ik/).click();
  await knop(p, /Hoe werkt de app\?/).click();
  await p.getByRole("button", { name: /Een taak afronden/ }).click();
  assert.match(await p.locator("body").innerText(), /Tik op het rondje/);
  await p.getByRole("button", { name: "‹ Terug" }).click();
  await tab(p, /^Ik/).click();
  assert.match(await p.locator(".v2-ik-kop").innerText(), /niveau/);
  assert.ok(!/\blevel\b/i.test(await p.locator(".v2-ik-kop").innerText()), "geen 'level' meer");
});

// ---------- 3.4: samen-momenten terugdraaien en aanpassen ----------
await scenario("v3.4: samen trainen per ongeluk gedaan → terugzetten → gedaan zonder wie niet meeging", v2, "18:00", async (p) => {
  await wissel(p, "Papa");
  const xpNoah = async () => { await wissel(p, "Noah"); await tab(p, /^Ik/).click(); const t = await p.locator(".ff-schatkist").innerText(); await wissel(p, "Papa"); return t; };
  const noahVoor = await xpNoah();
  await gezinTab(p, /Week/);
  await p.getByRole("tablist", { name: "Dagen van de week" }).getByRole("button", { name: "Vorige week" }).click();
  await p.getByRole("tab", { name: /Vrijdag 9/ }).click();
  const samen = p.getByRole("region", { name: "Samen op deze dag" });
  await samen.getByText("Samen trainen ✓").waitFor();
  await samen.getByRole("button", { name: "Klopt niet? Terugzetten" }).click();
  assert.match(await samen.innerText(), /punten gaan er weer af bij jij, Noah, Lina/);
  await samen.getByRole("button", { name: "Ja, terugzetten" }).click();
  await samen.getByRole("button", { name: "Gedaan", exact: true }).click();
  await samen.getByRole("button", { name: /Noah/ }).click();
  await samen.getByRole("button", { name: "Klopt, gedaan" }).click();
  assert.ok(await p.getByText(/\+10 punten voor jij, Lina/).isVisible());
  assert.doesNotMatch(await samen.innerText(), /Noah/, "Noah staat er niet meer bij");
  const noahNa = await xpNoah();
  assert.notEqual(noahNa, noahVoor, "Noah heeft 10 punten minder");
});

await scenario("v3.4: gepland moment aanpassen: wie gaat mee en hoe laat", v2, "10:00", async (p) => {
  await wissel(p, "Papa");
  await gezinTab(p, /Samen/);
  const gepland = p.getByRole("region", { name: "Gepland" });
  await gepland.getByRole("button", { name: "Aanpassen" }).click();
  await gepland.getByRole("button", { name: /Noah/ }).click();
  await gepland.getByLabel(/Hoe laat/).fill("18:30");
  await gepland.getByRole("button", { name: "Opslaan" }).click();
  const tekst = await gepland.innerText();
  assert.match(tekst, /18\.30|18:30/);
  assert.doesNotMatch(tekst, /Noah,|, Noah/);
});

// ---------- 3.6: één bron van waarheid, oefening van vandaag ----------
await scenario("v3.6: oefening van vandaag: doen, telt één keer, en ongedaan maken", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  const kaart = p.getByRole("region", { name: "Oefening van vandaag" });
  assert.match(await kaart.innerText(), /Oefening · \d van 3 deze week · ± 2 minuten/i);
  const kist = async () => (await p.locator(".v2-ophalen").count()) ? await p.locator(".v2-ophalen").innerText() : "0";
  const voor = await kist();
  await kaart.getByRole("button", { name: "Start oefening" }).click();
  assert.match(await p.locator(".ff-eyebrow").first().innerText(), /oefening van vandaag/i);
  await p.locator(".ff-licht-oranje").click();
  await p.locator(".ff-choice").first().click();
  await knop(p, /^Verder$/).click();
  await p.locator(".ff-chip-l").first().click();
  await knop(p, "Oefening klaar").click();
  await p.waitForSelector(".ff-nav");
  assert.match(await kaart.innerText(), /Oefening van vandaag gedaan/);
  const na = await kist();
  assert.notEqual(na, voor, "punten in de schatkist");
  await kaart.getByRole("button", { name: /Ongedaan maken/ }).click();
  await kaart.getByRole("button", { name: "Ja" }).click();
  assert.ok(await kaart.getByRole("button", { name: "Start oefening" }).isVisible(), "staat weer klaar");
  assert.equal(await kist(), voor, "punten weer terug zoals het was");
});

await scenario("v3.6: gezinslid openen toont de dag (taken én huistaken), gelijk aan Vandaag", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  const titel = (await p.locator(".v2-stap.is-volgende .v2-stap-titel").innerText()).trim();
  await wissel(p, "Papa");
  await tab(p, /Vandaag/).click();
  await p.getByRole("region", { name: "De kinderen vandaag" }).getByRole("button", { name: /^Noah/ }).click();
  const dag = p.getByRole("region", { name: "Vandaag van Noah" });
  await dag.waitFor();
  const tekst = await dag.innerText();
  assert.match(tekst, /huistaak/);
  assert.match(tekst, /taak/);
  assert.ok(tekst.includes(titel.replace(" (alvast)", "")), `wat Noah nu moet doen (${titel}) staat er ook`);
});

await scenario("v3.6: teller 'x van y gedaan' is uit te klappen (kind, bij Gezin)", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  await tab(p, /Gezin/).click();
  const samen = p.getByRole("region", { name: "Samen vandaag" });
  await samen.getByText("Wat telt er mee?").click();
  const t = await samen.innerText();
  assert.match(t, /Lina: \d+ van \d+/);
  assert.match(t, /Werk, school en afspraken tellen niet/);
});

await scenario("v3.6/3.12: een huistaak kan niet nog een keer als losse taak", v2, "10:00", async (p) => {
  await wissel(p, "Papa");
  await p.getByRole("button", { name: /^Toevoegen: taak/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: /^Taak Iets wat je/ }).click();
  await p.getByRole("dialog").getByLabel("Wat moet er gebeuren?").fill("Vaatwasser uitruimen");
  assert.match(await p.getByRole("dialog").innerText(), /Dit is een klus voor het huis/);
  assert.ok(await p.getByRole("dialog").getByRole("button", { name: "Taak toevoegen" }).isDisabled());
});

// ---------- 3.7: meekijken, de week afsluiten, scherm vrij, oefentoets ----------
await scenario("v3.7: ouder helpt: wel gedaan, ging niet door, en de telling past zich overal aan", v2, "16:00", async (p) => {
  await wissel(p, "Papa");
  await tab(p, /Vandaag/).click();
  await p.getByRole("region", { name: "De kinderen vandaag" }).getByRole("button", { name: /^Noah/ }).click();
  const dag = p.getByRole("region", { name: "Vandaag van Noah" });
  const telling = async () => (await dag.locator(".ff-row .ff-small").innerText()).trim();
  const voor = await telling();
  const open = dag.locator("li.is-helpen:not(.is-af)", { hasText: "huistaak" }).filter({ hasNotText: /kamer/i }).first();
  const titel = (await open.locator(".ff-lijst-titel").innerText()).trim();
  await open.locator(".v2-lid-item").click();
  await dag.getByRole("button", { name: "Wel gedaan" }).click();
  assert.ok(await p.getByText(/Afgevinkt voor Noah/).isVisible());
  assert.match(await dag.locator("li", { hasText: titel }).innerText(), /gedaan/);
  const tweede = dag.locator("li.is-helpen:not(.is-af):not(.is-status)").first();
  await tweede.locator(".v2-lid-item").click();
  await dag.getByRole("button", { name: "Ging niet door" }).click();
  assert.notEqual(await telling(), voor, "telling veranderd");
  assert.match(await dag.innerText(), /ging niet door/);
  await p.keyboard.press("Escape");
  await gezinTab(p, /^Taken/);
  const takenTekst = await p.locator("body").innerText();
  assert.ok(takenTekst.includes(titel.split(" (")[0]), `ook bij Taken (${titel})\n${takenTekst.slice(0, 600)}`);
});

await scenario("v3.7: weekafspraak en week afsluiten op zondag; daarna staat het vast", v2, "20:00", async (p) => {
  await p.clock.setFixedTime(new Date("2026-10-18T20:00:00+02:00"));
  await p.reload(); await p.waitForSelector(".ff-nav");
  await wissel(p, "Noah");
  await tab(p, /^Week/).click();
  const mijn = p.getByRole("region", { name: "Mijn week" });
  assert.match(await mijn.innerText(), /% gedaan/);
  assert.match(await mijn.innerText(), /Zakgeld € 5: krijg je altijd/);
  await wissel(p, "Papa");
  await tab(p, /Vandaag/).click();
  await p.getByRole("region", { name: "De kinderen vandaag" }).getByRole("button", { name: /^Noah/ }).click();
  const week = p.getByRole("region", { name: "Week van Noah" });
  await week.getByRole("button", { name: /Weekbonus: 70% → € 2,50 · 85% → € 5/ }).click();
  await week.getByRole("button", { name: "75%" }).click();
  await week.getByRole("button", { name: "Opslaan" }).click();
  assert.match(await week.innerText(), /Weekbonus: 75% → € 2,50/);
  await week.getByRole("button", { name: "Week afsluiten" }).last().click();
  await week.getByRole("button", { name: "Ja, afsluiten" }).click();
  assert.match(await week.innerText(), /Afgesloten op/);
  assert.equal(await p.getByRole("region", { name: "Vandaag van Noah" }).locator(".v2-lid-item").count(), 0, "na afsluiten niks meer af te vinken voor deze week");
});

await scenario("v3.7: 's ochtends 'Ben je op?', en scherm vrij als de ochtend af is", v2, "07:30", async (p) => {
  // In de demo is Noah al ingecheckt; voor deze test nog niet.
  await p.getByRole("button", { name: "Nog een glas water" }).click();
  await p.waitForFunction(() => localStorage.getItem("familyflow:v1"));
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem("familyflow:v1")); delete s.checkins.k1; localStorage.setItem("familyflow:v1", JSON.stringify(s)); });
  await p.reload(); await p.waitForSelector(".ff-nav");
  await wissel(p, "Noah");
  assert.match(await p.locator("body").innerText(), /Goedemorgen! Ben je op\?/);
  await wissel(p, "Papa");
  await tab(p, /Vandaag/).click();
  await p.getByRole("region", { name: "De kinderen vandaag" }).getByRole("button", { name: /^Noah/ }).click();
  const dag = p.getByRole("region", { name: "Vandaag van Noah" });
  for (const naam of ["Ochtendroutine", "Ontbijt"]) {
    await dag.locator("li", { hasText: naam }).locator(".v2-lid-item").click();
    await dag.getByRole("button", { name: "Overgeslagen", exact: true }).click();
  }
  await p.keyboard.press("Escape");
  await wissel(p, "Noah");
  const scherm = p.getByRole("region", { name: "Schermtijd" });
  if (await scherm.getByRole("button", { name: "Laat zien: scherm vrij" }).count()) {
    await scherm.getByRole("button", { name: "Laat zien: scherm vrij" }).click();
    assert.ok(await p.getByRole("dialog", { name: "Scherm vrij" }).isVisible());
    assert.match(await p.getByRole("dialog", { name: "Scherm vrij" }).innerText(), /Noah · je dag is af/);
  } else {
    assert.match(await scherm.innerText(), /Eerst je dag, dan je scherm/);
  }
});

await scenario("v3.7: 's avonds welterusten in één tik", v2, "20:30", async (p) => {
  await wissel(p, "Noah");
  const avond = p.getByRole("region", { name: "Welterusten" });
  assert.match(await avond.innerText(), /Bijna bedtijd/);
  await avond.getByRole("button", { name: "Welterusten" }).click();
  assert.match(await p.getByRole("region", { name: "Welterusten" }).innerText(), /Slaap lekker/);
});

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

// ---------- 3.14: Turven en sterren ----------
await scenario("v3.14: ouder zet turven en sterren aan, geeft een turf; kind ziet alleen de eigen", v2, "20:10", async (p) => {
  await wissel(p, "Papa");
  await tab(p, /Week/).click();
  await p.getByRole("button", { name: /^Noah: / }).click();
  const blad = p.getByRole("dialog");
  const inst = blad.getByRole("region", { name: "Turven en sterren instellen voor Noah" });
  assert.match(await inst.innerText(), /Gelogen[\s\S]*2 turven/);
  await inst.getByRole("button", { name: "Aanzetten" }).click();
  const g = blad.getByRole("region", { name: "Turven en sterren van Noah" });
  await g.getByRole("button", { name: "＋ Turf geven" }).click();
  await g.getByRole("button", { name: "Niet gedoucht" }).click();
  await g.getByRole("button", { name: "Turf geven" }).click();
  assert.match(await p.locator(".ff-toast").innerText(), /Turf voor Noah: Niet gedoucht\. Morgen 15 minuten minder scherm/);
  assert.match(await g.innerText(), /Niet gedoucht/);
  assert.match(await g.innerText(), /1 turf \(−5%\)/);
  await g.getByRole("button", { name: "Goedgemaakt" }).click();
  assert.match(await g.innerText(), /goedgemaakt ✓/);
  assert.match(await g.innerText(), /0 turven \(−0%\)/);
  await g.getByRole("button", { name: "＋ Turf geven" }).click();
  await g.getByRole("button", { name: "Gelogen (×2)" }).click();
  await g.getByRole("button", { name: "Turf geven" }).click();
  assert.equal(await g.getByRole("button", { name: "Goedgemaakt" }).count(), 0, "maar één per week goedmaken");
  await p.keyboard.press("Escape");
  // Noah ziet zijn eigen turven en de avondregels
  await wissel(p, "Noah");
  const avond = p.getByRole("region", { name: "Avondregels" });
  assert.match(await avond.innerText(), /20:30 telefoon aan de lader/);
  assert.match(await avond.innerText(), /Turf: gelogen/);
  await tab(p, /Week/).click();
  const mijn = p.getByRole("region", { name: "Mijn sterren en turven" });
  assert.match(await mijn.innerText(), /Gelogen \(telt dubbel\)/);
  // Lina ziet die van Noah niet
  await wissel(p, "Lina");
  await tab(p, /Week/).click();
  assert.equal(await p.getByRole("region", { name: "Mijn sterren en turven" }).count(), 0, "bij Lina staat het (nog) niet aan");
  await p.locator(".ff-toast").waitFor({ state: "detached" }).catch(() => {});
  assert.ok(!(await p.locator("body").innerText()).includes("Gelogen"), "Lina ziet de turven van Noah niet");
});

// ---------- 3.17: zoeken bij taak toevoegen ----------
await scenario("v3.17: taak toevoegen: zoeken in alle soorten, kiezen, of zelf typen", v2, "16:00", async (p) => {
  await wissel(p, "Papa");
  await p.getByRole("button", { name: /^Toevoegen: taak/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: /^Taak Iets wat je/ }).click();
  const dlg = p.getByRole("dialog");
  await dlg.getByLabel("Wat moet er gebeuren?").fill("gym");
  const gevonden = dlg.getByLabel("Gevonden taken");
  assert.ok(await gevonden.count(), "er staan gevonden taken");
  assert.equal(await dlg.getByRole("tablist", { name: "Soort taak" }).count(), 0, "tijdens zoeken geen tabbladen");
  const eerste = gevonden.getByRole("button").first();
  const naam = (await eerste.innerText()).replace(/^\+\s*/, "");
  await eerste.click();
  assert.equal(await dlg.getByLabel("Wat moet er gebeuren?").inputValue(), naam);
  assert.ok(await dlg.getByRole("button", { name: `✓ ${naam}` }).count(), "gekozen taak staat aangevinkt in zijn soort");
  await dlg.getByLabel("Wat moet er gebeuren?").fill("Fiets van oma ophalen");
  assert.match(await dlg.innerText(), /Je voegt "Fiets van oma ophalen" toe als eigen taak/);
  assert.ok(!(await dlg.getByRole("button", { name: "Taak toevoegen" }).isDisabled()));
});

// ---------- 3.8: Vandaag met de lijst bovenaan ----------
await scenario("v3.8: kind ziet de lijst van nu bovenaan, zonder te scrollen; geen losse Nu doen-kaart en geen +2-labels", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  const uitleg = p.getByRole("region", { name: /^Uitleg: Dit is je dag/ });
  if (await uitleg.count()) await uitleg.getByRole("button", { name: "Snap ik" }).click();
  const eerste = p.locator(".v2-deel.is-nu .v2-stap").first();
  const box = await eerste.boundingBox();
  assert.ok(box && box.y + box.height < 756, `eerste vinkje in beeld zonder scrollen (y=${box && Math.round(box.y)})`);
  assert.equal(await p.locator(".v2-nu:not(.is-bezig)").count(), 0, "geen aparte Nu doen-kaart");
  assert.equal(await p.locator(".v2-punten").count(), 0, "geen +2 achter elk item");
  assert.equal(await p.locator(".v2-stap.is-volgende").count(), 1, "één item is 'Nu doen'");
  assert.ok(!/Lunch/.test(await p.locator(".v2-stap.is-volgende").innerText()), "om 16.00 is lunch niet meer 'Nu doen'");
});

await scenario("v3.8: ouder ziet de kinderen bovenaan Vandaag en opent met één tik hun dag", v2, "16:00", async (p) => {
  await wissel(p, "Papa");
  const rij = p.getByRole("region", { name: "De kinderen vandaag" });
  assert.match(await rij.innerText(), /Noah[\s\S]*\d+ van \d+/);
  await rij.getByRole("button", { name: /^Noah/ }).click();
  const dag = p.getByRole("region", { name: "Vandaag van Noah" });
  await dag.waitFor();
  assert.ok(await dag.isVisible());
});

await scenario("v3.8: kind ziet bij een ander geen 'heeft honger', en Hulp heeft geen dubbele uitleg", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  await tab(p, /Gezin/).click();
  const huis = await p.locator(".ff-slot", { hasText: "Lina" }).first().innerText();
  assert.ok(!/honger/.test(huis), "honger van een ander alleen voor ouders");
  await rust(p);
  assert.equal(await p.getByRole("button", { name: /Hoe werkt de app\?/ }).count(), 0, "uitleg staat bij Ik, niet bij Rust");
});

// ---------- 3.9: vier tabbladen, Rust-knop, huisregels ----------
await scenario("v3.9: Rust-knop staat op elk tabblad en opent Ik word boos / Ruzie of gedoe", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  for (const t of [/Vandaag/, /^Week/, /Gezin/, /^Ik/]) {
    await tab(p, t).click();
    assert.equal(await p.getByRole("button", { name: /^Rust: hulp/ }).count(), 1, `Rust op ${t}`);
  }
  await rust(p);
  assert.ok(await p.getByRole("button", { name: /Ik word boos/ }).isVisible());
  assert.ok(await p.getByRole("button", { name: /Ruzie of gedoe/ }).isVisible());
  await p.getByRole("button", { name: "‹ Terug" }).click();
  assert.equal(await p.getByRole("button", { name: /^Rust: hulp/ }).count(), 1);
});

await scenario("v3.9: ouder ziet bij Week elk kind met zijn weekdoel, tik = afsluiten en details", v2, "16:00", async (p) => {
  await wissel(p, "Papa");
  await tab(p, /^Week/).click();
  const rijen = p.getByRole("region", { name: "Weekkaart per kind" });
  assert.match(await rijen.innerText(), /Noah[\s\S]*\d+%[\s\S]*Lina/);
  await rijen.getByRole("button", { name: /^Noah/ }).click();
  assert.ok(await p.getByRole("region", { name: "Week van Noah" }).isVisible(), "weekkaart met afsluiten opent");
});

await scenario("v3.9: 'afspraak' is alleen nog de agenda; gezinsregels heten huisregels", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  await tab(p, /Gezin/).click();
  assert.ok(await p.getByRole("region", { name: "Huisregels" }).isVisible());
  assert.equal(await p.getByRole("region", { name: "Onze afspraken" }).count(), 0);
  await tab(p, /Vandaag/).click();
  await p.getByRole("button", { name: /^Toevoegen: taak/ }).click();
  assert.ok(await p.getByRole("dialog").getByRole("button", { name: /^Afspraak Iets op een/ }).isVisible(), "agenda-afspraak blijft afspraak heten");
  await p.keyboard.press("Escape");
});

await scenario("v3.9: kind ziet de week positief ('nog x vinkjes'), gevoel als knopje, en één uitlegkaart", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  await tab(p, /^Week/).click();
  const week = p.getByRole("region", { name: "Mijn week" });
  assert.match(await week.innerText(), /nog \d+ vinkjes? tot/i);
  assert.ok(!/0 van \d+ dagen goed/.test(await week.innerText()), "geen '0 van 4 dagen goed'");
  assert.equal(await p.getByRole("region", { name: /^Uitleg:/ }).count(), 0, "geen uitlegkaart op Week");
  await tab(p, /Gezin/).click();
  assert.equal(await p.getByRole("region", { name: /^Uitleg:/ }).count(), 0, "geen uitlegkaart op Gezin");
  await tab(p, /Vandaag/).click();
  assert.match(await p.locator(".v2-gevoel-chip").innerText(), /Je voelt je|Hoe voel je je/);
  await p.locator(".v2-gevoel-chip").click();
  assert.ok(await p.getByRole("dialog").getByRole("group", { name: "Kies hoe je je voelt" }).isVisible());
});

// ---------- 3.10: weekbonus ----------
await scenario("v3.10: kind ziet zakgeld (altijd) en hoeveel vinkjes tot de volgende bonustrede", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  await tab(p, /^Week/).click();
  const mijn = p.getByRole("region", { name: "Mijn week" });
  await mijn.locator(".v2-mijnweek-knop").click();
  const t = await mijn.innerText();
  assert.match(t, /Nog \d+ vinkjes? tot € 2,50|€ 2,50 binnen! Nog \d+ vinkjes? tot € 5|€ 5 gehaald/);
  assert.match(t, /Zakgeld € 5: krijg je altijd/);
  assert.match(t, /vanaf 70%[\s\S]*€ 2,50[\s\S]*vanaf 85%[\s\S]*€ 5/);
  assert.match(t, /Eerdere weken[\s\S]*87%[\s\S]*€ 5/, "eerdere week met bonus staat erbij");
});

await scenario("v3.10: ouder stelt twee treden in met een snelknop, sluit af en vinkt 'uitbetaald' aan", v2, "20:00", async (p) => {
  await p.clock.setFixedTime(new Date("2026-10-18T20:00:00+02:00"));
  await p.reload(); await p.waitForSelector(".ff-nav");
  await wissel(p, "Papa");
  await tab(p, /^Week/).click();
  await p.getByRole("region", { name: "Weekkaart per kind" }).getByRole("button", { name: /^Lina/ }).click();
  const week = p.getByRole("region", { name: "Week van Lina" });
  await week.getByRole("button", { name: /^Weekbonus:/ }).click();
  await week.getByRole("button", { name: "Film kiezen" }).first().click();
  await week.getByRole("button", { name: "Opslaan" }).click();
  assert.match(await week.innerText(), /Weekbonus: 70% → Film kiezen · 85% → € 7,50 · zakgeld € 10/);
  await week.getByRole("button", { name: "Week afsluiten" }).last().click();
  assert.match(await week.getByRole("group", { name: "Week afsluiten" }).innerText(), /Lina haalde \d+%/);
  await week.getByRole("button", { name: "Ja, afsluiten" }).click();
  assert.match(await week.innerText(), /Afgesloten op/);
  const betaald = week.getByRole("button", { name: /Uitbetaald/ });
  if (await betaald.count()) {
    await betaald.first().click();
    assert.match(await week.innerText(), /Uitbetaald ✓/);
  }
});

await scenario("v3.10: ouder haalt een huisregel weg (na bevestigen); kind ziet geen weghaalknop", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  await tab(p, /Gezin/).click();
  assert.equal(await p.getByRole("region", { name: "Huisregels" }).getByRole("button", { name: /^Huisregel weghalen/ }).count(), 0, "kind kan niet weghalen");
  await wissel(p, "Papa");
  await tab(p, /Gezin/).click();
  const regels = p.getByRole("region", { name: "Huisregels" });
  assert.match(await regels.innerText(), /Kloppen voordat je/);
  await regels.getByRole("button", { name: /^Huisregel weghalen: Kloppen/ }).click();
  await regels.getByRole("group", { name: "Weghalen?" }).getByRole("button", { name: "Nee" }).click();
  assert.match(await regels.innerText(), /Kloppen voordat je/, "nee = blijft staan");
  await regels.getByRole("button", { name: /^Huisregel weghalen: Kloppen/ }).click();
  await regels.getByRole("group", { name: "Weghalen?" }).getByRole("button", { name: "Ja" }).click();
  assert.ok(!/Kloppen voordat je/.test(await regels.innerText()), "weg");
});

// ---------- 3.11: één lijn ----------
await scenario("v3.11: klussen kiezen: zoeken, aanzetten, zelf toevoegen en weer weghalen", v2, "16:00", async (p) => {
  await wissel(p, "Papa");
  await gezinTab(p, /^Taken/);
  await p.getByRole("button", { name: "🧹 Klussen kiezen" }).click();
  const blad = p.getByRole("dialog");
  await blad.getByLabel("Klus zoeken").fill("hond");
  const hond = blad.getByRole("switch", { name: /^Hond uitlaten/ });
  assert.equal(await hond.getAttribute("aria-checked"), "false");
  await hond.click();
  assert.equal(await blad.getByRole("switch", { name: /^Hond uitlaten/ }).getAttribute("aria-checked"), "true");
  await blad.getByLabel("Klus zoeken").fill("");
  assert.ok(await blad.getByRole("region", { name: "Badkamer en wc" }).isVisible(), "groepen");
  assert.ok((await blad.getByRole("switch").count()) >= 40, "grote bibliotheek");
  await blad.getByLabel("Naam van de klus").fill("Vissen voeren");
  await blad.getByRole("button", { name: "Om de dag" }).click();
  await blad.getByRole("region", { name: "Zelf een klus toevoegen" }).getByRole("button", { name: "Toevoegen" }).click();
  const eigen = blad.getByRole("region", { name: "Zelf toegevoegd" });
  assert.match(await eigen.innerText(), /Vissen voeren[\s\S]*om de dag/);
  await eigen.getByRole("button", { name: "Weghalen" }).click();
  assert.equal(await blad.getByRole("region", { name: "Zelf toegevoegd" }).count(), 0);
});

await scenario("v3.11: kind stelt een huisregel voor uit de lijst; ouder keurt goed", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  await tab(p, /Gezin/).click();
  const regels = p.getByRole("region", { name: "Huisregels" });
  await regels.getByRole("button", { name: "+ Een huisregel voorstellen" }).click();
  await regels.getByRole("button", { name: "+ Niet slaan, schoppen of duwen" }).click();
  assert.match(await regels.getByRole("region", { name: "Voorstellen" }).innerText(), /Niet slaan[\s\S]*wacht op papa of mama/);
  await wissel(p, "Papa");
  await tab(p, /Gezin/).click();
  const r2 = p.getByRole("region", { name: "Huisregels" });
  assert.match(await r2.getByRole("region", { name: "Voorstellen" }).innerText(), /voorstel van Noah/);
  await r2.getByRole("button", { name: "Goedkeuren" }).click();
  assert.equal(await r2.getByRole("region", { name: "Voorstellen" }).count(), 0);
  assert.ok(await r2.getByRole("button", { name: /^Huisregel weghalen: Niet slaan/ }).isVisible(), "nu een echte huisregel");
});

await scenario("v3.11: één beloningssysteem: geen niveaubeloning bij Ik, 'Ophalen' i.p.v. Claim; Rust zit in het menu", v2, "18:00", async (p) => {
  await wissel(p, "Noah");
  assert.equal(await p.locator(".ff-nav").getByRole("button", { name: /^Rust: hulp/ }).count(), 1, "Rust in het menu");
  assert.ok(await p.getByRole("button", { name: /Bekijk de week/ }).isVisible(), "weekregel op Vandaag");
  await tab(p, /^Ik/).click();
  const ik = await p.locator("body").innerText();
  assert.ok(!/Niveau \d+: Pizza/.test(ik), "geen niveaubeloning");
  assert.equal(await p.getByRole("button", { name: "Claim", exact: true }).count(), 0);
  assert.equal(await p.getByRole("button", { name: "Ophalen", exact: true }).count(), 1);
  await wissel(p, "Papa");
  await tab(p, /^Ik/).click();
  await knop(p, /Gezin instellen/).click();
  assert.match(await p.locator("body").innerText(), /Eén systeem voor echte beloningen: de weekbonus/);
});

// ---------- 3.12: één plek om toe te voegen ----------
await scenario("v3.12: ouder voegt 'Boodschappen doen' toe voor morgen, zonder tijd; staat morgen op Vandaag", v2, "10:00", async (p) => {
  await wissel(p, "Papa");
  for (const t of [/Vandaag/, /^Week/, /Gezin/]) {
    await tab(p, t).click();
    assert.equal(await p.getByRole("button", { name: /^Toevoegen: taak/ }).count(), 1, `plusje op ${t}`);
  }
  await tab(p, /Vandaag/).click();
  await p.getByRole("button", { name: /^Toevoegen: taak/ }).click();
  const blad = p.getByRole("dialog");
  assert.match(await blad.innerText(), /Taak[\s\S]*Afspraak[\s\S]*Samen iets doen[\s\S]*Klus voor het huis/);
  await blad.getByRole("button", { name: /^Taak Iets wat je/ }).click();
  await blad.getByRole("button", { name: "+ Boodschappen doen" }).click();
  await blad.getByRole("button", { name: "Morgen", exact: true }).click();
  await blad.getByRole("button", { name: "Taak toevoegen" }).click();
  assert.ok(await p.getByText(/Boodschappen doen: morgen ✓/).isVisible());
  assert.equal(await p.locator(".v2-stap", { hasText: "Boodschappen doen" }).count(), 0, "niet vandaag");
  await p.clock.setFixedTime(new Date("2026-10-16T10:00:00+02:00"));
  await p.reload(); await p.waitForSelector(".ff-nav");
  await wissel(p, "Papa");
  await p.locator(".v2-deel-kop", { hasText: "Middag" }).click();
  assert.ok(await p.locator(".v2-stap", { hasText: "Boodschappen doen" }).first().isVisible(), "morgen staat hij in de lijst");
});

await scenario("v3.12: kind voegt zelf een taak toe met een tijd; geen klus-keuze voor kinderen", v2, "15:00", async (p) => {
  await wissel(p, "Noah");
  await p.getByRole("button", { name: /^Toevoegen: taak/ }).click();
  const blad = p.getByRole("dialog");
  assert.equal(await blad.getByRole("button", { name: /Klus voor het huis/ }).count(), 0);
  await blad.getByRole("button", { name: /^Taak Iets wat je/ }).click();
  assert.equal(await blad.getByText("Voor wie?").count(), 0, "kind voegt alleen voor zichzelf toe");
  await blad.getByRole("button", { name: "+ Gymtas inpakken" }).click();
  await blad.getByLabel("Hoe laat (hoeft niet)").fill("19:30");
  await blad.getByRole("button", { name: "Taak toevoegen" }).click();
  await p.locator(".v2-deel-kop", { hasText: "Avond" }).click();
  const rij = p.locator(".v2-stap", { hasText: "Gymtas inpakken" });
  assert.match(await rij.innerText(), /19\.30/);
});

await browser.close();
if (fouten) {
  console.log(`\n${fouten} scenario('s) mislukt`);
  process.exit(1);
}
console.log("\nAlle end-to-end scenario's geslaagd");
