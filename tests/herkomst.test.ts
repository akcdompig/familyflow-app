import { test } from "node:test";
import assert from "node:assert/strict";
import { gezin } from "./helpers";
import { historie, metHerkomst, openRegels, ZONDER_DETAILS } from "@/lib/herkomst";
import { actions, snapshot } from "@/lib/store";
import type { FamilyState } from "@/lib/types";

const geef = (s: FamilyState, id: string, n: number, wat: string) => metHerkomst(s, { ...s, xp: { ...s.xp, [id]: (s.xp[id] ?? 0) + n } }, wat);

test("één beloning: totaal en regel kloppen", () => {
  const s = geef(gezin({ claim: { k1: 0 } }), "k1", 20, "Keuken opgeruimd");
  const o = openRegels(s, "k1");
  assert.equal(o.totaal, 20);
  assert.deepEqual(o.regels.map((r) => [r.wat, r.n]), [["Keuken opgeruimd", 20]]);
});

test("meerdere beloningen: zelfde soort bij elkaar, som = totaal", () => {
  let s = gezin({ claim: { k1: 0 } });
  s = geef(s, "k1", 2, "Ochtendroutine");
  s = geef(s, "k1", 2, "Ochtendroutine");
  s = geef(s, "k1", 20, "Keuken opgeruimd");
  const o = openRegels(s, "k1");
  assert.equal(o.totaal, 24);
  assert.deepEqual(o.regels.map((r) => [r.wat, r.n, r.keer]), [["Ochtendroutine", 4, 2], ["Keuken opgeruimd", 20, 1]]);
});

test("lege schatkist: niks te claimen, geen regels", () => {
  const o = openRegels(gezin(), "k1");
  assert.equal(o.totaal, 0);
  assert.deepEqual(o.regels, []);
});

test("oude punten zonder uitleg: eerlijk 'zonder details', niks verzonnen", () => {
  const s = geef(gezin({ xp: { k1: 30 }, claim: { k1: 0 } }), "k1", 10, "Gelezen");
  const o = openRegels(s, "k1");
  assert.equal(o.totaal, 40);
  assert.deepEqual(o.regels.map((r) => [r.wat, r.n]), [[ZONDER_DETAILS, 30], ["Gelezen", 10]]);
});

test("afvinken ongedaan: de regel verdwijnt weer", () => {
  let s = geef(gezin({ claim: { k1: 0 } }), "k1", 15, "Huiswerk maken");
  s = metHerkomst(s, { ...s, xp: { ...s.xp, k1: 0 } }, "Huiswerk maken");
  assert.equal(openRegels(s, "k1").totaal, 0);
  assert.equal((s.xpLog?.k1 ?? []).length, 0);
});

test("claim via de app: precies één keer, met uitleg en historie", () => {
  const voor = snapshot().xp.k2 ?? 0;
  actions.claim("k2");
  actions.klusGedaan("ramen", "k2", 20, "Ramen lappen");
  const c = actions.claim("k2");
  assert.ok(c && c.totaal >= 20);
  assert.ok(c!.regels.some((r) => r.wat === "Ramen lappen" && r.n === 20));
  assert.equal(c!.regels.reduce((a, r) => a + r.n, 0), c!.totaal, "regels tellen op tot het totaal");
  // Dubbelklik / opnieuw openen: niks meer.
  assert.equal(actions.claim("k2"), null);
  assert.equal(actions.claimPunten("k2"), 0);
  assert.ok((snapshot().xp.k2 ?? 0) >= voor + 20);
  const h = historie(snapshot(), "k2");
  assert.ok(h[0].regels.some((r) => r.wat === "Ramen lappen"));
});

test("klus samen gedaan: allebei de helft, met wie erbij", () => {
  // Zonder afgesproken partner is het gewoon jouw klus, met de naam van de klus.
  actions.claim("k1");
  actions.klusGedaan("koelkast", "k1", 10, "Koelkast schoonmaken");
  const o = openRegels(snapshot(), "k1");
  assert.ok(o.regels.some((r) => /^Koelkast schoonmaken/.test(r.wat)));
});
