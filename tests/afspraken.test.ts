import { test } from "node:test";
import assert from "node:assert/strict";
import { herhaling, herkomst, teEvalueren } from "@/lib/afspraken";
import { nuDoen, dagprogramma } from "@/lib/dagprogramma";
import { gezin } from "./helpers";
import type { Afspraak } from "@/lib/types";

const nu = new Date("2026-10-15T18:00:00+02:00");
const dagenTerug = (n: number) => new Date(nu.getTime() - n * 864e5).toISOString();

test("afsprakenlus: na 7 dagen vraagt de app 'hielp het?', daarna een week niet meer", () => {
  const vers: Afspraak = { id: "a", text: "Seintje voor het stoppen", at: dagenTerug(3), by: "p1", scenario: "gamen" };
  const oud: Afspraak = { id: "b", text: "Kloppen", at: dagenTerug(8), by: "p1" };
  const s = gezin({ afspraken: [vers, oud] });
  assert.deepEqual(teEvalueren(s, "k1", nu).map((a) => a.id), ["b"], "alleen de afspraak van 8 dagen oud");
  const beoordeeld = gezin({ afspraken: [vers, { ...oud, evaluaties: [{ at: dagenTerug(1), by: "k1", oordeel: "ja" }] }] });
  assert.equal(teEvalueren(beoordeeld, "k1", nu).length, 0, "net beoordeeld: niet opnieuw vragen");
  assert.equal(teEvalueren(beoordeeld, "k2", nu).length, 1, "een ander gezinslid mag nog");
  const inOverleg = gezin({ afspraken: [{ ...oud, evaluaties: [{ at: dagenTerug(2), by: "gezin", oordeel: "beetje" }] }] });
  assert.equal(teEvalueren(inOverleg, "k2", nu).length, 0, "samen beoordeeld in het overleg telt voor iedereen");
  const gestopt = gezin({ afspraken: [{ ...oud, gestopt: dagenTerug(1) }] });
  assert.equal(teEvalueren(gestopt, "k1", nu).length, 0, "losgelaten afspraken komen niet terug");
});

test("herhaling: 3 keer hetzelfde thema in 4 weken wordt opgemerkt, veiligheidschecks tellen niet", () => {
  const s = gezin({
    conflicts: [],
    coachLog: [
      { at: dagenTerug(20), by: "p1", scenario: "gamen", licht: "oranje" },
      { at: dagenTerug(12), by: "p2", scenario: "gamen", licht: "rood" },
      { at: dagenTerug(5), by: "p1", scenario: "gamen", licht: "oranje" },
      { at: dagenTerug(5), by: "p1", scenario: "gamen", licht: "groen" },
      { at: dagenTerug(4), by: "k1", scenario: "advies", licht: "veilig" },
      { at: dagenTerug(40), by: "p1", scenario: "advies", licht: "rood" },
    ],
  });
  const h = herhaling(s, nu);
  assert.equal(h.length, 1);
  assert.equal(h[0].scenario, "gamen");
  assert.equal(h[0].aantal, 3, "twee logs van dezelfde sessie tellen als één");
});

test("herkomst van een afspraak in gewone taal", () => {
  assert.match(herkomst({ id: "x", text: "", at: "", by: "", scenario: "gamen" }), /stoppen met gamen/);
  assert.match(herkomst({ id: "x", text: "", at: "", by: "", scenario: "ruzie:Huiswerk" }), /ruzie over huiswerk/);
  assert.equal(herkomst({ id: "x", text: "", at: "", by: "", scenario: "overleg" }), "uit het gezinsoverleg");
});

test("Nu doen: na de ochtend is de ochtendroutine niet meer het ene ding van nu", () => {
  const s = gezin();
  const avond = new Date("2026-10-15T17:30:00+02:00");
  const stappen = dagprogramma(s, "k1", avond);
  assert.ok(stappen.some((x) => x.soort === "routine" && !x.klaar), "de routine staat nog wel in de lijst");
  assert.notEqual(nuDoen(stappen, avond)?.soort, "routine");
  const ochtend = new Date("2026-10-15T07:30:00+02:00");
  assert.equal(nuDoen(dagprogramma(s, "k1", ochtend), ochtend)?.soort, "routine");
});
