import { test } from "node:test";
import assert from "node:assert/strict";
import { dagprogramma, nuDoen, voortgang } from "@/lib/dagprogramma";
import { gezin } from "./helpers";

const vandaag = (u: number, m = 0) => { const d = new Date(); d.setHours(u, m, 0, 0); return d; };
const dag = () => new Date().toLocaleDateString("sv-SE");

test("volgorde: ochtend eerst, slapen als laatste", () => {
  const st = dagprogramma(gezin(), "k1", vandaag(8));
  assert.equal(st[0].id, "routine");
  assert.equal(st[st.length - 1].soort, "slapen");
});

test("Nu doen: eerst de ochtendroutine, dan ontbijt", () => {
  const s = gezin();
  assert.equal(nuDoen(dagprogramma(s, "k1", vandaag(8)), vandaag(8))?.id, "routine");
  const af = gezin({ dag: { [dag()]: { k1: { routine: ["douchen", "tanden", "deo", "haar", "lotion"], water: 0, fruit: 0 } } } });
  assert.equal(nuDoen(dagprogramma(af, "k1", vandaag(8)), vandaag(8))?.id, "eten:ontbijt");
});

test("Nu doen slaat werk/school (gaat vanzelf) over en kijkt niet vooruit", () => {
  const wd = new Date().getDay();
  const s = gezin({ werk: { k1: [{ id: "s", naam: "School", soort: "vast", days: [wd], van: "07:00", tot: "15:00", look: "school" }] } });
  const st = dagprogramma(s, "k1", vandaag(8));
  const school = st.find((x) => x.soort === "werk")!;
  assert.equal(school.vanzelf, true);
  assert.ok(school.bezig! > 0);
  assert.notEqual(nuDoen(st, vandaag(8))?.soort, "werk");
  assert.notEqual(nuDoen(st, vandaag(8))?.deel, "avond");
});

test("voortgang telt slapen niet mee", () => {
  const v = voortgang(dagprogramma(gezin(), "k1", vandaag(8)));
  assert.equal(v.klaar, 0);
  assert.ok(v.totaal >= 5);
});
