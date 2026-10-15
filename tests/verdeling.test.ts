import { test } from "node:test";
import assert from "node:assert/strict";
import { verdeling, verwachting, eerlijk, pech, heeftJoker, genoegPech, winnaar } from "@/lib/verdeling";
import { klusStatus } from "@/lib/huis";
import { dagprogramma } from "@/lib/dagprogramma";
import { gezin, at } from "./helpers";
import type { FamilyState, KlusDone } from "@/lib/types";

const WERK = {
  p1: [{ id: "w1", naam: "Kantoor", soort: "vast" as const, days: [1, 2, 4, 5], van: "08:00", tot: "17:00" }],
  p2: [{ id: "w2", naam: "Gemeente", soort: "vast" as const, days: [1, 2, 3, 4], van: "08:30", tot: "17:00" }],
  k1: [{ id: "w3", naam: "School", soort: "vast" as const, days: [1, 2, 3, 4, 5], van: "08:30", tot: "15:00", look: "school" as const }],
  k2: [{ id: "w4", naam: "ROC", soort: "vast" as const, days: [1, 2, 4], van: "09:00", tot: "13:00", look: "school" as const }],
};
const lid = (s: FamilyState, id: string) => s.members.find((m) => m.id === id)!;
const som = (v: ReturnType<typeof verdeling>, id: string) => v.vandaag[id];

test("verwachting: vrij terwijl ouders werken = meer, schooldag = minder, werkende ouder = weinig", () => {
  const s = gezin({ werk: WERK, vakanties: { k1: [{ naam: "Herfstvakantie", van: "2026-10-12", tot: "2026-10-18" }] } });
  const d = "2026-10-15"; // donderdag: papa en mama werken
  const k1 = verwachting(s, lid(s, "k1"), d);
  assert.equal(k1.soort, "vakantie");
  assert.equal(k1.doel, 25);
  assert.match(k1.reden, /werken/);
  assert.equal(verwachting(s, lid(s, "k2"), d).soort, "school");
  assert.ok(verwachting(s, lid(s, "k2"), d).doel < k1.doel);
  assert.equal(verwachting(s, lid(s, "p1"), d).doel, 5);
  // Woensdag: papa thuis (roostervrij)
  assert.equal(verwachting(s, lid(s, "p1"), "2026-10-14").doel, 15);
});

test("verdeling: niet steeds dezelfde de vaatwasser", () => {
  const log: KlusDone[] = [];
  // De afgelopen 6 dagen deed Noah (k1) steeds de vaatwasser uitruimen.
  for (let i = 1; i <= 6; i++) log.push({ id: `x${i}`, klus: "vaat-uit", by: "k1", at: at(`2026-10-${String(15 - i).padStart(2, "0")}`, "08:00").toISOString() });
  const s = gezin({ klusLog: log });
  const v = verdeling(s, "2026-10-15");
  assert.equal(v.wie["vaat-uit"], "k2");
});

test("verdeling: zwaarte eerlijk over de kinderen, ook over meerdere dagen", () => {
  let s = gezin({ werk: WERK });
  const totaal: Record<string, number> = { k1: 0, k2: 0 };
  // 14 dagen lang doen de kinderen precies wat de app zegt.
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.UTC(2026, 9, 1 + i, 12)).toISOString().slice(0, 10);
    const v = verdeling(s, d);
    const nieuw: KlusDone[] = Object.entries(v.wie).map(([klus, by], j) => ({ id: `${d}-${j}`, klus, by, at: at(d, "18:00").toISOString() }));
    for (const n of nieuw) if (n.by in totaal) totaal[n.by] += 1;
    s = { ...s, klusLog: [...(s.klusLog ?? []), ...nieuw] };
  }
  const e = eerlijk(s, at("2026-10-14"));
  const p = (id: string) => e.find((x) => x.id === id)!.punten;
  assert.ok(p("k1") > 0 && p("k2") > 0);
  // k2 heeft minder schooldagen en krijgt dus meer, maar niemand doet alles.
  assert.ok(Math.max(p("k1"), p("k2")) / Math.min(p("k1"), p("k2")) < 2.5, `k1 ${p("k1")} k2 ${p("k2")}`);
  // Niemand doet meer dan de helft van alle vaatwasser-beurten.
  const vaat = (s.klusLog ?? []).filter((k) => k.klus.startsWith("vaat"));
  for (const id of ["k1", "k2"]) assert.ok(vaat.filter((k) => k.by === id).length < vaat.length * 0.7);
});

test("verdeling: vrije dag is geen luie dag", () => {
  const s = gezin({ werk: WERK, vakanties: { k1: [{ naam: "Herfst", van: "2026-10-12", tot: "2026-10-18" }], k2: [{ naam: "Herfst", van: "2026-10-12", tot: "2026-10-18" }] } });
  const v = verdeling(s, "2026-10-15");
  for (const id of ["k1", "k2"]) assert.ok(som(v, id) >= 15, `${id} krijgt ${som(v, id)} punten`);
  assert.ok(som(v, "p1") <= 10);
});

test("verdeling blijft de hele dag gelijk, ook als er iets gedaan wordt", () => {
  const s = gezin({ werk: WERK });
  const v1 = verdeling(s, "2026-10-15");
  const s2 = { ...s, klusLog: [{ id: "a", klus: "vaat-uit", by: v1.wie["vaat-uit"], at: at("2026-10-15", "09:00").toISOString() }] };
  assert.deepEqual(verdeling(s2, "2026-10-15").wie, v1.wie);
});

test("ruil: de verliezer van de uitdaging krijgt de klus", () => {
  const s = gezin();
  const v = verdeling(s, "2026-10-15");
  const was = v.wie["vaat-uit"];
  const ander = was === "k1" ? "k2" : "k1";
  const s2 = { ...s, ruil: { "2026-10-15": { "vaat-uit": ander } } };
  assert.equal(verdeling(s2, "2026-10-15").wie["vaat-uit"], ander);
});

test("klusStatus en dagprogramma gebruiken de verdeling", () => {
  const s = gezin();
  const nu = at("2026-10-15", "10:00");
  const v = verdeling(s, "2026-10-15");
  const k = klusStatus(s, nu).find((x) => x.key === "vaat-uit")!;
  assert.equal(k.beurt?.id, v.wie["vaat-uit"]);
  assert.ok(dagprogramma(s, v.wie["vaat-uit"], nu).some((x) => x.klusKey === "vaat-uit"));
  // De eigen kamer staat er ook in, ook als die nog nooit is bijgehouden.
  assert.ok(dagprogramma(s, "k1", nu).some((x) => x.klusKey === "kamer:k1"));
});

test("steen-papier-schaar en pech-bescherming", () => {
  assert.equal(winnaar("steen", "schaar"), 1);
  assert.equal(winnaar("steen", "papier"), -1);
  assert.equal(winnaar("schaar", "schaar"), 0);
  const nu = at("2026-10-15", "18:00");
  const u = (i: number, verliezer: string) => ({ id: `u${i}`, at: at("2026-10-15", `1${i}:00`).toISOString(), klus: "vaat-in", spelers: ["k1", "k2"] as [string, string], verliezer });
  const s = gezin({ uitdagingen: [u(1, "k2"), u(2, "k1"), u(3, "k1")] });
  assert.equal(pech(s, "k1", nu), 2);
  assert.ok(heeftJoker(s, "k1", nu));
  assert.ok(!heeftJoker(s, "k2", nu));
  assert.ok(!genoegPech(s, "k1", nu));
  assert.ok(genoegPech(gezin({ uitdagingen: [u(1, "k1"), u(2, "k1"), u(3, "k1")] }), "k1", nu));
});
