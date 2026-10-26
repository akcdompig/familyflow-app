import { test } from "node:test";
import assert from "node:assert/strict";
import { actions, snapshot } from "@/lib/store";
import { geldActies } from "@/lib/geldacties";
import { posten, saldo } from "@/lib/geld";
import { maandag } from "@/lib/huis";
import { iso } from "@/lib/planner";

// De store start in demomodus: het voorbeeldgezin (Noah = k1, Lina = k2, Papa = p1).

test("kind zet zelf iets erbij en haalt een uitgave eraf", () => {
  const voor = saldo(snapshot(), "k1");
  const a = geldActies.boek("k1", "k1", { cents: 1000, soort: "cadeau", wat: "Tante" });
  const b = geldActies.boek("k1", "k1", { cents: 350, soort: "uitgave", wat: "Chips", cat: "eten" });
  assert.ok(a && b);
  assert.equal(saldo(snapshot(), "k1"), voor + 1000 - 350);
  assert.equal(posten(snapshot(), "k1").find((p) => p.id === b)?.cents, -350, "uitgave is negatief");
});

test("broer of zus mag niks boeken of weghalen bij een ander", () => {
  assert.equal(geldActies.boek("k1", "k2", { cents: 500, soort: "cadeau", wat: "x" }), null);
  const id = geldActies.boek("k1", "k1", { cents: 200, soort: "anders", wat: "Statiegeld" })!;
  assert.equal(geldActies.weg("k1", "k2", id), false);
  assert.equal(geldActies.weg("k1", "p1", id), true, "ouder mag het wel");
});

test("alleen ouders stellen zakgeld in; wat al binnen was blijft staan", () => {
  assert.equal(geldActies.setZakgeld("k1", "k1", { cents: 99900, per: "week" }), false);
  const voor = saldo(snapshot(), "k1");
  assert.equal(geldActies.setZakgeld("k1", "p1", { cents: 700, per: "week" }), true);
  assert.equal(saldo(snapshot(), "k1"), voor, "verhogen verandert het verleden niet");
  assert.equal(snapshot().geld?.k1.zakgeld?.cents, 700);
});

test("weekbonus uitbetaald: bedrag uit de beloning komt in Mijn geld, terugzetten haalt hem weg", () => {
  const d = iso(new Date());
  const ma = maandag(d);
  actions.setWeekAfspraak("k2", [{ pct: 50, wat: "€ 2,50" }], "");
  actions.weekAfsluiten("k2", "p1", { maandag: ma, af: 1, totaal: 1, pct: 100, gehaald: true, beloning: "€ 2,50", behaald: 0 });
  const voor = saldo(snapshot(), "k2");
  actions.weekUitbetaald("k2", ma, true);
  assert.equal(saldo(snapshot(), "k2"), voor + 250);
  actions.weekUitbetaald("k2", ma, false);
  assert.equal(saldo(snapshot(), "k2"), voor);
});
