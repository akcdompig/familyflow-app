import { test } from "node:test";
import assert from "node:assert/strict";
import { bewijzen, boomFase, competenties, dagStand, gezinsWeek } from "@/lib/groei";
import { gezin, at } from "./helpers";
import type { KlusDone } from "@/lib/types";

const ROUTINE = ["douchen", "tanden", "deo", "haar", "lotion"];

test("dagStand: routine en ingedeelde klussen bepalen of de dag af is", () => {
  const d = "2026-10-13";
  const leeg = gezin();
  assert.notEqual(dagStand(leeg, "k1", d).stand, "af");
  const s = gezin({ dag: { [d]: { k1: { routine: ROUTINE, water: 6, fruit: 2 } } } });
  const st = dagStand(s, "k1", d);
  assert.ok(st.af >= 1);
});

test("bewijzen: zelfstandig, samenwerken, emotie, conflict en plannen worden herkend", () => {
  const log: KlusDone[] = [{ id: "a", klus: "vaat-uit", by: "k1", at: at("2026-10-13", "09:00").toISOString() }];
  const s = gezin({
    klusLog: log,
    samen: [{ id: "s", soort: "koken", titel: "Samen koken", wie: ["p1", "k1"], datum: "2026-10-12", door: "k1", at: at("2026-10-10").toISOString(), gedaan: at("2026-10-12").toISOString() }],
    history: { k1: [{ mood: 2, rest: true, at: at("2026-10-14").toISOString() }] },
    conflicts: [{ id: "c", at: at("2026-10-11").toISOString(), from: "k1", with: "k2", topic: "Gamen", physical: false, sides: {}, status: "opgelost", solvedAt: at("2026-10-11").toISOString() }],
    tasks: [{ id: "t", title: "Leren", icon: "boek", assignee: "k1", repeat: "eenmalig", date: "2026-10-14", xp: 5, createdBy: "k1", study: { subject: "Engels", kind: "toets", deadline: "2026-10-16", part: 1, of: 2, min: 20 } }],
  });
  const b = bewijzen(s, "k1", "2026-10-09", "2026-10-15");
  const soorten = new Set(b.map((x) => x.competentie));
  for (const c of ["verantwoordelijkheid", "samenwerken", "teleurstelling", "conflicten", "plannen", "communiceren", "band"]) assert.ok(soorten.has(c), `${c} herkend`);
  // Feiten en oefenen/toepassen zijn gescheiden.
  assert.ok(b.some((x) => x.soort === "oefenen") && b.some((x) => x.soort === "toepassen"));
  assert.ok(b.every((x) => x.bron === "feit"));
  // Automatisch uit Somtoday telt niet als zelf plannen.
  const auto = gezin({ tasks: [{ id: "t", title: "Leren", icon: "boek", assignee: "k1", repeat: "eenmalig", date: "2026-10-14", xp: 5, createdBy: "k1", study: { subject: "Engels", kind: "toets", deadline: "2026-10-16", part: 1, of: 2, min: 20, sid: "x" } }] });
  assert.ok(!bewijzen(auto, "k1", "2026-10-09", "2026-10-15").some((x) => x.competentie === "plannen"));
});

test("competenties: één drukke week geeft geen 'gaat steeds beter', herhaling over weken wel", () => {
  // 10 klussen in één week: komt maar in 1 van de 4 weken voor.
  const eenWeek: KlusDone[] = Array.from({ length: 6 }, (_, i) => ({ id: `k${i}`, klus: "vaat-uit", by: "k1", at: at(`2026-10-${String(9 + i).padStart(2, "0")}`, "09:00").toISOString() }));
  const v1 = competenties(gezin({ klusLog: eenWeek }), "k1", at("2026-10-15")).find((x) => x.c.id === "verantwoordelijkheid")!;
  assert.ok(v1.fase === "oefenen" || v1.fase === "vaker", v1.fase);
  assert.notEqual(v1.fase, "groeit");
  // Elke week een paar keer, 4 weken lang: gaat steeds beter.
  const elkeWeek: KlusDone[] = [];
  for (let w = 0; w < 4; w++) for (let d = 0; d < 3; d++) {
    const dt = new Date(Date.UTC(2026, 8, 18 + w * 7 + d * 2, 10)).toISOString();
    elkeWeek.push({ id: `w${w}${d}`, klus: "vaat-uit", by: "k1", at: dt });
  }
  const v4 = competenties(gezin({ klusLog: elkeWeek }), "k1", at("2026-10-15")).find((x) => x.c.id === "verantwoordelijkheid")!;
  assert.equal(v4.weken.filter(Boolean).length, 4);
  assert.equal(v4.fase, "groeit");
  assert.equal(competenties(gezin(), "k1", at("2026-10-15")).length, 10);
});

test("gezinsweek en boom: meer samen en meer dagen af = grotere boom", () => {
  const leeg = gezinsWeek(gezin(), "2026-10-05", at("2026-10-15"));
  assert.equal(leeg.samen, 0);
  assert.equal(boomFase([leeg, leeg]).fase, 0);
  assert.equal(boomFase([{ ...leeg, score: 80 }, { ...leeg, score: 80 }]).emoji, "🌳");
});
