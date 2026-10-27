import { test } from "node:test";
import assert from "node:assert/strict";
import { dagStand } from "@/lib/groei";
import { GROEN_PCT, weekDagen, weekKaart } from "@/lib/week";
import { gezin, at } from "./helpers";

// 3.23 Groene dagen: een dag is groen bij 80% van die dag, en niet met een turf. De bonus hangt aan het aantal groene dagen.

const ma = "2026-10-19";
const alles = { routine: ["douchen", "tanden", "deo", "haar", "lotion"], water: 0, fruit: 0, eten: ["ontbijt", "lunch", "tussendoor", "avond"], ontbijt: true };

test("kleur per dag volgt 80% van die dag; dagen na vandaag zijn 'later'", () => {
  const s = gezin({ dag: { [ma]: { k1: alles }, "2026-10-20": { k1: { routine: [], water: 0, fruit: 0 } } } });
  const nu = "2026-10-22";
  const w = weekDagen(s, "k1", ma, nu);
  assert.equal(w.length, 7);
  for (const d of w.filter((x) => x.datum <= nu)) {
    const st = dagStand(s, "k1", d.datum);
    const p = st.totaal ? (st.af / st.totaal) * 100 : 0;
    if (p >= GROEN_PCT) assert.equal(d.kleur, "groen", d.datum);
    else assert.notEqual(d.kleur, "groen", d.datum);
  }
  assert.deepEqual(w.filter((x) => x.datum > nu).map((x) => x.kleur), ["later", "later", "later"], "vr, za, zo");
  assert.equal(w.find((x) => x.vandaag)?.datum, nu);
});

test("een turf maakt een dag niet groen (alleen als turven aanstaan); goedgemaakt telt weer", () => {
  const turf = { id: "t1", datum: ma, at: ma + "T20:00:00", reden: "Niet gedoucht", n: 1 as const, door: "p1" };
  const zonder = weekDagen(gezin({ dag: { [ma]: { k1: alles } }, gedrag: { k1: [turf] } }), "k1", ma, "2026-10-21");
  const met = gezin({ dag: { [ma]: { k1: alles } }, gedrag: { k1: [turf] }, gedragAfspraak: { k1: { sinds: "2026-10-01" } } });
  assert.notEqual(zonder[0].kleur, "turf", "turven uit: telt niet");
  assert.equal(weekDagen(met, "k1", ma, "2026-10-21")[0].kleur, "turf");
  const goed = { ...met, gedrag: { k1: [{ ...turf, weg: { at: ma + "T21:00:00", door: "p1" } }] } };
  assert.notEqual(weekDagen(goed, "k1", ma, "2026-10-21")[0].kleur, "turf");
});

test("bonus op groene dagen; niet meer haalbaar op zondag als je te weinig hebt", () => {
  const s = gezin({ weekAfspraak: { k1: { drempel: 71, treden: [{ pct: 71, dagen: 5, wat: "€ 2,50" }, { pct: 86, dagen: 6, wat: "€ 5" }] } } });
  const k = weekKaart(s, "k1", at("2026-10-25", "20:00"), ma);
  assert.equal(k.nodig, 5);
  assert.equal(k.groen, k.week.filter((x) => x.kleur === "groen").length);
  assert.ok(k.over <= 1, "op zondagavond kan hooguit vandaag nog groen worden");
  if (k.groen + k.over < 5) assert.equal(k.haalbaar, false);
  const maandagK = weekKaart(s, "k1", at("2026-10-19", "07:00"), ma);
  assert.equal(maandagK.haalbaar, true, "maandagochtend kan alles nog");
  assert.equal(maandagK.over, 7);
});

test("vandaag: hoeveel vinkjes nog voor een groene dag", () => {
  const s = gezin({ dag: { "2026-10-22": { k1: { routine: [], water: 0, fruit: 0, eten: ["ontbijt"], ontbijt: true } } } });
  const d = weekDagen(s, "k1", ma, "2026-10-22").find((x) => x.vandaag)!;
  if (d.kleur !== "groen") assert.equal(d.nogVoorGroen, Math.max(0, Math.ceil((GROEN_PCT / 100) * d.totaal - 1e-9) - d.af));
});
