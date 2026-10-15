import { test } from "node:test";
import assert from "node:assert/strict";
import { maakPlan, minutenInPlan, wijzigingen, type Plan } from "@/lib/takenplan";
import { verdeling } from "@/lib/verdeling";
import { addDays } from "@/lib/planner";
import { gezin, at } from "./helpers";
import type { FamilyState, KlusDone } from "@/lib/types";

// Maandag 12 oktober 2026. Geen roosters in het testgezin: Noah (k1, 13) en Lina (k2, 17) zijn elke dag vrij.
const MA = "2026-10-12";
const alleenVaatwasser = (extra: Partial<FamilyState> = {}) => {
  const uit = Object.fromEntries(["vaat-in", "keuken", "stofzuigen", "was", "kamer", "bedden", "afval", "ramen", "flessen"].map((k) => [k, { aan: false }]));
  return gezin({ klusAfspraken: { klussen: uit }, ...extra });
};
const wieDoet = (p: Plan, key: string) => Object.keys(p).sort().map((d) => p[d][key]?.wie);
const doen = (s: FamilyState, p: Plan): FamilyState => {
  const log: KlusDone[] = [];
  for (const [d, r] of Object.entries(p)) for (const [key, x] of Object.entries(r)) log.push({ id: `${d}${key}`, klus: key, by: x.wie, at: at(d, "18:00").toISOString() });
  return { ...s, klusLog: [...(s.klusLog ?? []), ...log] };
};

test("vaatwasser: om de beurt over de week, nooit drie dagen achter elkaar dezelfde", () => {
  const p = maakPlan(alleenVaatwasser(), MA, 7);
  const rij = wieDoet(p, "vaat-uit");
  assert.equal(rij.length, 7);
  for (let i = 2; i < rij.length; i++) assert.ok(!(rij[i] === rij[i - 1] && rij[i] === rij[i - 2]), `geen 3× achter elkaar: ${rij.join(",")}`);
  const noah = rij.filter((x) => x === "k1").length;
  assert.ok(noah >= 3 && noah <= 4, `eerlijk: Noah ${noah} van 7`);
});

test("wie gisteren uitruimde, is vandaag niet aan de beurt", () => {
  const s = alleenVaatwasser({ klusLog: [{ id: "x", klus: "vaat-uit", by: "k1", at: at(addDays(MA, -1), "19:00").toISOString() }] });
  const p = maakPlan(s, MA, 1);
  assert.equal(p[MA]["vaat-uit"].wie, "k2");
});

test("een week afwezig: geen taken, de ander neemt het over", () => {
  const s = alleenVaatwasser();
  s.klusAfspraken = { ...s.klusAfspraken, afwezig: { k1: [{ van: MA, tot: addDays(MA, 6), reden: "kamp" }] } };
  const p = maakPlan(s, MA, 7);
  assert.ok(wieDoet(p, "vaat-uit").every((w) => w === "k2"));
  assert.equal(verdeling(s, MA).verwachting.k1.reden, "afwezig: kamp");
});

test("door een ouder vast toegewezen gaat altijd voor", () => {
  const s = alleenVaatwasser();
  s.klusAfspraken = { ...s.klusAfspraken, klussen: { ...s.klusAfspraken!.klussen, "vaat-uit": { wel: ["k2"], niet: ["k1", "p1", "p2"] } } };
  assert.ok(wieDoet(maakPlan(s, MA, 7), "vaat-uit").every((w) => w === "k2"));
});

test("hulp nodig: de taak gaat alleen samen met een ouder, en telt dan voor allebei half", () => {
  const s = alleenVaatwasser({ doelen: { k1: { vaardigheden: [], taken: { "vaat-uit": "hulp" } } } });
  const p = maakPlan(s, MA, 7);
  const metNoah = Object.values(p).map((r) => r["vaat-uit"]).filter((r) => r.wie === "k1");
  assert.ok(metNoah.length > 0);
  assert.ok(metNoah.every((r) => r.mee && r.mee.startsWith("p")), "altijd met een ouder");
  const min = minutenInPlan(s, { [MA]: { "vaat-uit": { wie: "k1", mee: "p1" } } });
  assert.equal(min.k1, 5);
  assert.equal(min.p1, 5);
});

test("leren: hooguit één keer per week, samen met een ouder; begeleidingstaak gaat nooit vanzelf naar een kind", () => {
  const s = alleenVaatwasser();
  s.klusAfspraken = { ...s.klusAfspraken, klussen: { ...s.klusAfspraken!.klussen, maaltijd: { aan: true } } };
  const zonder = maakPlan(s, MA, 14);
  assert.ok(Object.values(zonder).every((r) => !r.maaltijd || r.maaltijd.wie.startsWith("p")), "zonder leren: alleen ouders koken");
  s.doelen = { k1: { vaardigheden: [], taken: { maaltijd: "leren" } } };
  const p = maakPlan(s, MA, 7);
  const lessen = Object.values(p).map((r) => r.maaltijd).filter((r) => r?.wie === "k1");
  assert.equal(lessen.length, 1);
  assert.ok(lessen[0].mee?.startsWith("p"));
  assert.match(lessen[0].reden ?? "", /wil dit leren/);
});

test("leuk: een voorkeur, geen vaste taak (hooguit de helft van de keren erbij)", () => {
  const s = alleenVaatwasser({ doelen: { k2: { vaardigheden: [], taken: { "vaat-uit": "leuk" } } } });
  const rij = wieDoet(maakPlan(s, MA, 14), "vaat-uit");
  const lina = rij.filter((x) => x === "k2").length;
  assert.ok(lina >= 7 && lina <= 11, `Lina vaker, maar niet altijd: ${lina} van 14`);
  assert.ok(rij.includes("k1"));
});

test("bevestigde planning gaat voor de dagberekening; opnieuw verdelen laat zien wat verandert", () => {
  const s = alleenVaatwasser();
  const p = maakPlan(s, MA, 7);
  const anders = p[MA]["vaat-uit"].wie === "k1" ? "k2" : "k1";
  const bevestigd: FamilyState = { ...s, klusAfspraken: { ...s.klusAfspraken, planning: { ...p, [MA]: { "vaat-uit": { wie: anders, reden: "aangepast door papa" } } } } };
  assert.equal(verdeling(bevestigd, MA).wie["vaat-uit"], anders);
  assert.equal(verdeling(bevestigd, MA).reden["vaat-uit"], "aangepast door papa");
  const w = wijzigingen(bevestigd, p);
  assert.deepEqual(w.map((x) => [x.datum, x.key, x.van, x.naar]), [[MA, "vaat-uit", anders, p[MA]["vaat-uit"].wie]]);
});

test("eigen taak: komt mee in de verdeling, met instructie", () => {
  const s = alleenVaatwasser();
  s.klusAfspraken = { ...s.klusAfspraken, eigen: [{ id: "eigen-hond", label: "Hond uitlaten", emoji: "🐕", elke: 1, minuten: 15, vanaf: 9, xp: 5, instructie: "Rondje park" }] };
  const p = maakPlan(s, MA, 2);
  assert.ok(p[MA]["eigen-hond"], "eigen taak staat in het plan");
});

test("over 8 weken wordt het eerlijk: minuten tussen de kinderen liggen dicht bij elkaar", () => {
  let s = gezin();
  // Start scheef: Lina deed de afgelopen 2 weken alles.
  s = { ...s, klusLog: Array.from({ length: 14 }, (_, i) => ({ id: `o${i}`, klus: "vaat-uit", by: "k2", at: at(addDays(MA, -14 + i), "19:00").toISOString() })) };
  let laatsteWeek: Record<string, number> = {};
  for (let w = 0; w < 8; w++) {
    const p = maakPlan(s, addDays(MA, w * 7), 7);
    s = doen(s, p);
    laatsteWeek = minutenInPlan(s, p);
  }
  const noah = laatsteWeek.k1 ?? 0;
  const lina = laatsteWeek.k2 ?? 0;
  assert.ok(Math.abs(noah - lina) / Math.max(noah, lina) < 0.2, `week 8: Noah ${noah} min, Lina ${lina} min`);
});
