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
await scenario("v2: ring op Vandaag telt hetzelfde als Gezin › Week", v2, "16:00", async (p) => {
  await wissel(p, "Lina");
  const ring = (await p.locator(".v2-ring").getAttribute("aria-label")).match(/(\d+) van (\d+)/).slice(1).join("/");
  await wissel(p, "Papa");
  await tab(p, /Gezin/).click();
  await p.getByRole("tab", { name: /^Week$/ }).click();
  const kop = (await p.locator(".v2-dagrij", { hasText: "Lina" }).locator(".v2-week-lid b").innerText()).match(/(\d+) van (\d+)/).slice(1).join("/");
  assert.equal(kop, ring);
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

await scenario("v2: kind geeft snoep aan, ouder ziet het in het overzicht", v2, "16:00", async (p) => {
  await wissel(p, "Lina");
  await p.getByRole("button", { name: /Ongezond vandaag/ }).click();
  await p.getByRole("button", { name: "Zoet drinken plus één" }).click();
  await p.getByRole("button", { name: "Snoep of snack plus één" }).click();
  await knop(p, /^Klaar$/).click();
  assert.match(await p.getByRole("button", { name: /Ongezond vandaag/ }).innerText(), /2/);
  await wissel(p, "Papa");
  await tab(p, /Gezin/).click();
  const rij = p.getByRole("region", { name: "Eten en drinken van de kinderen" }).locator(".v2-voeding-kind", { hasText: "Lina" });
  assert.match(await rij.innerText(), /2× ongezond/);
  await rij.click();
  assert.match(await p.locator(".v2-voeding").innerText(), /Zoet drinken/);
  await p.locator(".v2-voeding").scrollIntoViewIfNeeded();
});

// Nieuwere Chrome (Android): scrollTo geeft een Promise terug. Een effect mag dat niet teruggeven (fout bij Kimberly, 15 okt).
await scenario("v2: tabbladen wisselen als scrollTo een Promise teruggeeft (Chrome Android)", v2, "18:00", async (p) => {
  await p.evaluate(() => { const o = window.scrollTo.bind(window); window.scrollTo = (...a) => { o(...a); return Promise.resolve(); }; });
  for (const wie of ["Mama", "Lina"]) {
    await wissel(p, wie);
    for (const t of [/Gezin/, /Hulp/, /^Ik/, /Vandaag/, /Gezin/]) {
      await tab(p, t).click();
      await p.waitForTimeout(100);
    }
    assert.equal(await p.locator("text=Oeps").count(), 0, `geen foutscherm bij ${wie}`);
  }
});

// ---------- Samenwerken en eerlijk verdelen ----------
const gezinTab = async (p, naam) => { await tab(p, /Gezin/).click(); await p.getByRole("tab", { name: naam }).click(); };

await scenario("v2: eerlijke verdeling met minuten en waarom", v2, "16:00", async (p) => {
  await wissel(p, "Lina");
  await gezinTab(p, /Klussen/);
  const vandaag = p.getByRole("region", { name: "Wie doet wat vandaag" });
  assert.match(await vandaag.innerText(), /min/);
  assert.match(await p.locator(".ff-afspraak-banner").innerText(), /Voorstel/);
  await vandaag.locator(".ff-verdeling-rij", { hasText: "Jij" }).locator(".ff-mini-klus").first().click();
  assert.match(await p.locator(".ff-klus-info").innerText(), /minuten/);
  assert.match(await p.locator(".ff-klus-info").innerText(), /Jij/);
});

await scenario("v2: samen beslissen met steen-papier-schaar, de ander doet het", v2, "16:00", async (p) => {
  await wissel(p, "Lina");
  await gezinTab(p, /Klussen/);
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
  await p.getByRole("tab", { name: /Nu/ }).click();
  const feed = await p.locator("body").innerText();
  assert.ok(!/verloor|verloren|won /i.test(feed), "geen winnaar/verliezer in Net gedaan");
});

await scenario("v2: lukt me niet → ouder zegt oké → klus gaat naar een ander", v2, "16:00", async (p) => {
  await wissel(p, "Lina");
  await gezinTab(p, /Klussen/);
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
  await gezinTab(p, /Klussen/);
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
  const hoe = p.getByRole("region", { name: "Hoe was het?" });
  await hoe.getByRole("button", { name: /😍/ }).first().click();
  assert.match(await p.getByRole("region", { name: "Jouw band" }).innerText(), /Lina/);
});

await scenario("v2: ouder legt klusafspraken vast", v2, "10:00", async (p) => {
  await wissel(p, "Papa");
  await gezinTab(p, /Klussen/);
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
  await tab(p, /^Ik/).click();
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
await scenario("v2: kind ziet een rustige app — 4 tabbladen, korte lijsten", v2, "16:00", async (p) => {
  await wissel(p, "Noah");
  await tab(p, /Gezin/).click();
  const tabs = await p.locator(".v2-seg [role=tab]").allInnerTexts();
  assert.deepEqual(tabs.map((t) => t.replace(/\d+$/, "").trim()), ["Nu", "Samen", "Klussen", "Groei"]);
  await p.getByRole("tab", { name: /Samen/ }).click();
  assert.ok((await p.locator(".v2-idee").count()) <= 6, "hooguit 5 ideeën + iets anders");
  assert.equal(await p.getByRole("button", { name: "gratis", exact: true }).count(), 0, "filters zitten achter Meer ideeën");
  await knop(p, /Meer ideeën/).click();
  assert.equal(await p.getByRole("button", { name: "gratis", exact: true }).count(), 1);
  await wissel(p, "Papa");
  await tab(p, /Gezin/).click();
  assert.equal(await p.locator(".v2-seg [role=tab]").count(), 6, "ouders houden alles");
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
  await p.getByRole("button", { name: /^Plannen$/ }).last().click();
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
  await gezinTab(p, /Groei/);
  assert.ok((await p.getByRole("region", { name: "Het verhaal van de week" }).innerText()).length > 20);
  const samen = p.getByRole("region", { name: "Samen ondernomen" });
  assert.match(await samen.innerText(), /Trainen met Lina en Noah/);
  assert.match(await samen.innerText(), /gepland/, "morgen trainen staat als gepland, niet als gedaan");
  assert.ok(await p.getByRole("region", { name: "Volgende week" }).isVisible());
  assert.equal(await p.locator(".v2-weekgrid-naam").first().isVisible(), false, "details staan standaard dicht");
  await p.locator(".v2-meer-details summary", { hasText: "Meer bekijken" }).click();
  assert.equal(await p.locator(".v2-weekgrid-naam").count(), 4);
  // Terug naar vorige week.
  await p.getByRole("button", { name: "Vorige week" }).click();
  assert.match(await p.locator(".v2-rapport-nav").innerText(), /Vorige week/);
  assert.match(await p.getByRole("region", { name: "Samen ondernomen" }).innerText(), /gedaan/);
  await p.locator(".v2-comp-kop", { hasText: "Samenwerken" }).click();
  assert.match(await p.locator(".v2-comp-open").innerText(), /geoefend/);
  await wissel(p, "Noah");
  await gezinTab(p, /Groei/);
  await p.locator(".v2-meer-details summary", { hasText: "Meer bekijken" }).click();
  assert.equal(await p.locator(".v2-weekgrid-naam").count(), 1, "kind ziet alleen zijn eigen week");
  assert.match(await p.getByRole("region", { name: "Competenties" }).innerText(), /Waar groei jij in/);
  assert.equal(await p.getByRole("region", { name: "Competenties" }).locator(".ff-chip").count(), 0, "kind kan anderen niet bekijken");
});

await browser.close();
if (fouten) {
  console.log(`\n${fouten} scenario('s) mislukt`);
  process.exit(1);
}
console.log("\nAlle end-to-end scenario's geslaagd");
