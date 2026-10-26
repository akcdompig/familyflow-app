import { test } from "node:test";
import assert from "node:assert/strict";
import { doelStand, euro, gewerkt, maand, parseEuro, posten, saldo, urenWerk, zakgeldPosten } from "@/lib/geld";
import { douchen, doucheMinuut, vasteLastenTotaal } from "@/lib/thuiskosten";
import { gezin, at } from "./helpers";

test("bedragen lezen: 12,50 · € 5 · 5 euro · 2.5", () => {
  assert.equal(parseEuro("12,50"), 1250);
  assert.equal(parseEuro("€ 5"), 500);
  assert.equal(parseEuro("5 euro"), 500);
  assert.equal(parseEuro("2.5"), 250);
  assert.equal(parseEuro("Pizza avond"), undefined, "geen bedrag: geen geld");
  assert.equal(parseEuro("€ 2,50 extra"), 250);
  assert.equal(euro(1250), "€ 12,50");
  assert.equal(euro(-450), "− € 4,50");
});

test("zakgeld komt vanzelf: elke maandag, of elke 1e van de maand", () => {
  const w = zakgeldPosten({ cents: 500, per: "week", vanaf: "2026-10-01" }, "2026-10-26");
  assert.deepEqual(w.map((p) => p.datum), ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]);
  const m = zakgeldPosten({ cents: 2500, per: "maand", vanaf: "2026-08-15" }, "2026-10-26");
  assert.deepEqual(m.map((p) => p.datum), ["2026-09-01", "2026-10-01"]);
});

test("saldo: erbij min eraf, plus zakgeld; per maand en per categorie", () => {
  const s = gezin({
    geld: {
      k1: {
        zakgeld: { cents: 500, per: "week", vanaf: "2026-10-19" },
        posten: [
          { id: "a", datum: "2026-10-02", cents: 2000, soort: "cadeau", wat: "Oma", door: "k1", at: "x" },
          { id: "b", datum: "2026-10-20", cents: -450, soort: "uitgave", cat: "eten", wat: "Snacks", door: "k1", at: "x" },
          { id: "c", datum: "2026-10-21", cents: -800, soort: "uitgave", cat: "gamen", wat: "V-Bucks", door: "k1", at: "x" },
        ],
      },
    },
  });
  const nu = at("2026-10-26", "12:00");
  assert.equal(saldo(s, "k1", nu), 2000 - 450 - 800 + 500 + 500);
  const m = maand(s, "k1", "2026-10", nu);
  assert.equal(m.inn, 3000);
  assert.equal(m.uit, 1250);
  assert.deepEqual(m.cats.map(([c]) => c), ["gamen", "eten"], "grootste uitgave eerst");
  assert.equal(posten(s, "k1", nu)[0].datum, "2026-10-26", "nieuwste eerst");
});

test("spaardoel: hoeveel nog en hoe lang bij dit tempo", () => {
  const s = gezin({ geld: { k1: { doel: { wat: "Controller", cents: 7000 }, posten: [{ id: "a", datum: "2026-10-20", cents: 4000, soort: "loon", wat: "Loon", door: "k1", at: "x" }] } } });
  const d = doelStand(s, "k1", at("2026-10-26"))!;
  assert.equal(d.nog, 3000);
  assert.equal(d.pct, 57);
  assert.equal(d.weken, 3, "€ 40 in 4 weken = € 10 per week, nog € 30");
});

test("bijbaan: uren x uurloon, vrije dag en dienst van straks tellen niet", () => {
  const s = gezin({
    werk: { k2: [{ id: "w5", naam: "Toko", soort: "wisselend", inkomen: true, uurloon: 592 }] },
    diensten: [
      { id: "d1", member: "k2", werkId: "w5", date: "2026-10-10", van: "12:00", tot: "17:00" },
      { id: "d2", member: "k2", werkId: "w5", date: "2026-10-26", van: "16:00", tot: "20:00" },
      { id: "d3", member: "k2", werkId: "w5", date: "2026-09-30", van: "12:00", tot: "14:00" },
    ],
  });
  const g = gewerkt(s, "k2", "2026-10-01", "2026-10-31", at("2026-10-26", "12:00"));
  assert.equal(g.minuten, 300, "alleen de dienst van 10 okt; die van vandaag is nog niet geweest");
  assert.equal(g.cents, 2960);
});

test("aankoop in uren werk", () => {
  assert.equal(urenWerk(9000, 592), "15 uur werken");
  assert.equal(urenWerk(100, 592), "0,5 uur werken");
  assert.equal(urenWerk(500, undefined), undefined);
});

test("wat kost thuis: douchen en vaste lasten kloppen ongeveer", () => {
  const minuut = doucheMinuut();
  assert.ok(minuut > 7 && minuut < 10, `een minuut douchen kost 7–10 cent (nu ${minuut.toFixed(1)})`);
  assert.ok(Math.abs(douchen(10).jaar - Math.round(minuut * 10 * 365)) <= 1);
  assert.equal(vasteLastenTotaal(), 174_700, "Nibud: € 1.747 per maand");
});

test("zuinig thuis: liters water en CO2 bij douchen", () => {
  const d = douchen(10);
  assert.equal(d.liter, 8 * 10 * 365, "8 liter per minuut");
  assert.equal(d.co2, Math.round(0.04 * 2.134 * 10 * 365), "gas voor warm water");
});
