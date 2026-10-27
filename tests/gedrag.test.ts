import { test } from "node:test";
import assert from "node:assert/strict";
import { gedragWeek, magGoedmaken, redenen, schermStraf, sterOp, turvenOp } from "@/lib/gedrag";
import { maandag } from "@/lib/huis";
import { addDays } from "@/lib/planner";
import { actions, snapshot } from "@/lib/store";
import { weekKaart } from "@/lib/week";
import { gezin } from "./helpers";

// Een vaste week: maandag 12 t/m zondag 18 oktober 2026.
const ma = "2026-10-12";
const dag = (i: number) => addDays(ma, i);
const turf = (datum: string, n: 1 | 2 = 1, weg = false) => ({ id: "t" + datum + n + Math.random(), datum, at: datum + "T20:00:00", reden: "x", n, door: "p1", ...(weg ? { weg: { at: "y", door: "p1" } } : {}) });

test("sterren: alleen voorbije dagen zonder turf, vanaf de start", () => {
  const s = gezin({ gedragAfspraak: { k1: { sinds: dag(1) } }, gedrag: { k1: [turf(dag(2))] } });
  const vandaag = dag(4);
  assert.equal(sterOp(s, "k1", dag(0), vandaag), false, "voor de start geen ster");
  assert.equal(sterOp(s, "k1", dag(1), vandaag), true);
  assert.equal(sterOp(s, "k1", dag(2), vandaag), false, "turf = geen ster");
  assert.equal(sterOp(s, "k1", dag(3), vandaag), true);
  assert.equal(sterOp(s, "k1", vandaag, vandaag), false, "vandaag is nog bezig");
  assert.equal(sterOp(gezin(), "k1", dag(1), vandaag), false, "uit = geen sterren");
});

test("weekscore: −5% per turf (max 3 per dag), liegen telt dubbel, goedgemaakt telt niet, +3% per ster", () => {
  const s = gezin({
    gedragAfspraak: { k1: { sinds: ma } },
    gedrag: { k1: [turf(dag(0), 2), turf(dag(0)), turf(dag(0)), turf(dag(1)), turf(dag(2), 1, true)] },
  });
  assert.equal(turvenOp(s, "k1", dag(0)), 4);
  const g = gedragWeek(s, "k1", ma, dag(6));
  assert.equal(g.turven, 5, "4 op maandag + 1 op dinsdag; goedgemaakt telt niet");
  assert.equal(g.min, 3 * 5 + 1 * 5, "maandag hooguit 3 turven");
  assert.equal(g.sterren, 4, "woensdag t/m zaterdag (zondag is vandaag)");
  assert.equal(g.delta, 4 * 3 - 20);
  assert.equal(g.extra, false);
});

test("scherm: morgen 15 of 30 minuten minder, bij 3 turven geen scherm in de avond", () => {
  const s = gezin({ gedragAfspraak: { k1: { sinds: ma } }, gedrag: { k1: [turf(dag(0)), turf(dag(1), 2), turf(dag(2), 2), turf(dag(2))] } });
  assert.deepEqual(schermStraf(s, "k1", dag(1)), { turven: 1, min: 15, geenAvond: false });
  assert.deepEqual(schermStraf(s, "k1", dag(2)), { turven: 2, min: 30, geenAvond: false });
  assert.deepEqual(schermStraf(s, "k1", dag(3)), { turven: 3, min: 0, geenAvond: true });
  assert.equal(schermStraf(gezin({ gedrag: { k1: [turf(dag(0))] } }), "k1", dag(1)).turven, 0, "uit = geen gevolg");
});

test("redenen gebruiken de avondtijden van het kind", () => {
  const s = gezin({ gedragAfspraak: { k2: { sinds: ma, avond: { douchen: "21:00" } } } });
  assert.ok(redenen(s, "k2").some((r) => r.tekst === "Te laat naar boven (21:00)"));
  assert.ok(redenen(s, "k2").some((r) => r.tekst === "Eten na 19:30"), "standaard voor wat niet is ingesteld");
  assert.equal(redenen(s, "k2").find((r) => r.tekst === "Gelogen")?.n, 2);
});

test("turf geven, goedmaken (1 per week) en een turf-dag wordt niet groen", () => {
  const vandaag = new Date();
  const d = vandaag.toLocaleDateString("sv-SE");
  actions.setGedragAfspraak("k2", { sinds: d });
  const voor = weekKaart(snapshot(), "k2");
  const a = actions.turf("k2", "Niet gedoucht", 1, "p1", d)!;
  const b = actions.turf("k2", "Gelogen", 2, "p1", d)!;
  const na = weekKaart(snapshot(), "k2");
  assert.equal(na.gedrag?.turven, 3);
  // 3.23: een turf maakt de dag niet groen (geen procenten meer van de weekscore af).
  assert.equal(na.week.find((x) => x.vandaag)?.kleur, "turf");
  assert.equal(na.pct, voor.pct, "de taken zelf tellen gewoon");
  assert.ok(magGoedmaken(snapshot(), "k2", d));
  assert.equal(actions.turfGoedgemaakt("k2", b, "p1"), true);
  assert.equal(actions.turfGoedgemaakt("k2", a, "p1"), false, "maar één per week");
  assert.equal(turvenOp(snapshot(), "k2", d), 1);
  actions.turfWeghalen("k2", a);
  assert.equal(turvenOp(snapshot(), "k2", d), 0);
  assert.equal(snapshot().gedrag?.k2?.length, 1, "goedgemaakte blijft zichtbaar");
  actions.setGedragAfspraak("k2", null);
  assert.equal(weekKaart(snapshot(), "k2").gedrag, undefined, "uit = telt niet mee");
  assert.equal(maandag(d) <= d, true);
});
