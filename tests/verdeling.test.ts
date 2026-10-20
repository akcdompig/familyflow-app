import { test } from "node:test";
import assert from "node:assert/strict";
import { verdeling, verwachting, eerlijk, pech, heeftVoorsprong, genoegPech, winnaar, scheef, beurtTussen, lotKans, volgende, magDoen } from "@/lib/verdeling";
import { KLUSSEN } from "@/lib/huis";
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
/** Herfstvakantie voor beide kinderen: een echte vrije dag (zonder schooltijden is doordeweeks anders een schooldag). */
const HERFST = { k1: [{ naam: "Herfst", van: "2026-10-12", tot: "2026-10-18" }], k2: [{ naam: "Herfst", van: "2026-10-12", tot: "2026-10-18" }] };
const som = (v: ReturnType<typeof verdeling>, id: string) => v.vandaag[id];

test("verwachting: vrij terwijl ouders werken = meer, schooldag = minder, werkende ouder = weinig", () => {
  const s = gezin({ werk: WERK, vakanties: { k1: [{ naam: "Herfstvakantie", van: "2026-10-12", tot: "2026-10-18" }] } });
  const d = "2026-10-15"; // donderdag: papa en mama werken
  const k1 = verwachting(s, lid(s, "k1"), d);
  assert.equal(k1.soort, "vakantie");
  assert.equal(k1.doel, 35);
  assert.match(k1.reden, /werken/);
  assert.equal(verwachting(s, lid(s, "k2"), d).soort, "school");
  assert.ok(verwachting(s, lid(s, "k2"), d).doel < k1.doel);
  assert.equal(verwachting(s, lid(s, "p1"), d).doel, 5);
  // Woensdag: papa thuis (roostervrij)
  assert.equal(verwachting(s, lid(s, "p1"), "2026-10-14").doel, 30);
});

test("verdeling: niet steeds dezelfde de vaatwasser", () => {
  const log: KlusDone[] = [];
  // De afgelopen 6 dagen deed Noah (k1) steeds de vaatwasser uitruimen.
  for (let i = 1; i <= 6; i++) log.push({ id: `x${i}`, klus: "vaat-uit", by: "k1", at: at(`2026-10-${String(15 - i).padStart(2, "0")}`, "08:00").toISOString() });
  const s = gezin({ klusLog: log, vakanties: HERFST });
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
  const p = (id: string) => e.find((x) => x.id === id)!.minuten;
  assert.ok(p("k1") > 0 && p("k2") > 0);
  // Naar wat je mocht verwachten (schooldagen tellen minder): niemand meer dan 1,5× de ander.
  const verw = (id: string) => {
    let t = 0;
    for (let i = 0; i < 14; i++) t += verwachting(s, lid(s, id), new Date(Date.UTC(2026, 9, 1 + i, 12)).toISOString().slice(0, 10)).doel;
    return t;
  };
  const r1 = p("k1") / verw("k1");
  const r2 = p("k2") / verw("k2");
  assert.ok(Math.max(r1, r2) / Math.min(r1, r2) < 1.5, `k1 ${p("k1")}/${verw("k1")} k2 ${p("k2")}/${verw("k2")}`);
  assert.equal(scheef(s, at("2026-10-14")), null, "geen signaal als de app zelf verdeelt");
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
  assert.ok(heeftVoorsprong(s, "k1", nu));
  assert.ok(!heeftVoorsprong(s, "k2", nu));
  assert.ok(!genoegPech(s, "k1", nu));
  assert.ok(genoegPech(gezin({ uitdagingen: [u(1, "k1"), u(2, "k1"), u(3, "k1")] }), "k1", nu));
});

test("afspraken: klus uit, niet voor dit kind, leeftijd, en vrijstelling", () => {
  const vaat = KLUSSEN.find((k) => k.id === "vaat-uit")!;
  const ramen = KLUSSEN.find((k) => k.id === "ramen")!;
  const s0 = gezin();
  const jong = { ...lid(s0, "k1"), age: 8 };
  assert.ok(!magDoen(s0, jong, ramen), "ramen pas vanaf 12 (voorstel)");
  assert.ok(magDoen(s0, jong, vaat));
  // Uit: niemand krijgt hem.
  const uit = gezin({ klusAfspraken: { klussen: { "vaat-uit": { aan: false } } } });
  assert.equal(verdeling(uit, "2026-10-15").wie["vaat-uit"], undefined);
  // Niet voor k1: dan k2.
  const niet = gezin({ vakanties: HERFST, klusAfspraken: { klussen: { "vaat-uit": { niet: ["k1"] } } } });
  assert.equal(verdeling(niet, "2026-10-15").wie["vaat-uit"], "k2");
  // Vrijstelling: vandaag niks, ook geen eigen kamer.
  const vrij = gezin({ vrijstelling: { "2026-10-15": { k1: "ziek" } } });
  const v = verdeling(vrij, "2026-10-15");
  assert.ok(!Object.values(v.wie).includes("k1"));
  assert.equal(v.verwachting.k1.soort, "vrijstelling");
});

test("afspraken: eigen verwachting per kind telt", () => {
  const school = gezin({ werk: WERK, klusAfspraken: { verwachting: { k1: { school: 5, vrij: 40 } } } });
  assert.equal(verwachting(school, lid(school, "k1"), "2026-10-15").doel, 5);
  const vrij = gezin({ vakanties: HERFST, klusAfspraken: { verwachting: { k1: { school: 5, vrij: 40 } } } });
  assert.equal(verwachting(gezin({ klusAfspraken: { verwachting: { k1: { school: 5, vrij: 40 } } } }), lid(vrij, "k1"), "2026-10-15").doel, 5, "geen schooltijden ingevuld: doordeweeks schooldag");
  assert.equal(verwachting(vrij, lid(vrij, "k1"), "2026-10-15").doel, 40);
  assert.equal(verwachting(vrij, lid(vrij, "k1"), "2026-10-17").doel, 30, "weekend: 80% van vrij");
});

test("vrije dag: hooguit één klus extra, en nooit boven de verwachting", () => {
  const s = gezin({ werk: WERK, vakanties: { k1: [{ naam: "Herfst", van: "2026-10-12", tot: "2026-10-18" }], k2: [{ naam: "Herfst", van: "2026-10-12", tot: "2026-10-18" }] } });
  const v = verdeling(s, "2026-10-15");
  for (const id of ["k1", "k2"]) {
    assert.ok([...v.extra].filter((k) => v.wie[k] === id).length <= 1);
    assert.ok(v.vandaag[id] <= v.verwachting[id].doel + 15, `${id}: ${v.vandaag[id]} van ${v.verwachting[id].doel}`);
  }
});

test("samen doen: allebei de helft van de minuten", () => {
  const s = gezin();
  const v = verdeling(s, "2026-10-15");
  const eig = v.wie["vaat-uit"];
  const ander = eig === "k1" ? "k2" : "k1";
  const v2 = verdeling(gezin({ samenDoen: { "2026-10-15": { "vaat-uit": ander } } }), "2026-10-15");
  assert.equal(v2.mee["vaat-uit"], ander);
  assert.equal(v2.vandaag[eig], v.vandaag[eig] - 5);
  assert.equal(v2.vandaag[ander], v.vandaag[ander] + 5);
});

test("lukt me niet: volgende kandidaat is iemand anders", () => {
  const s = gezin();
  const eig = verdeling(s, "2026-10-15").wie["vaat-uit"];
  const v = volgende(s, "2026-10-15", "vaat-uit", eig);
  assert.ok(v && v !== eig);
});

test("om de beurt en loting zijn eerlijk", () => {
  const log = [
    { id: "a", klus: "vaat-in", by: "k1", at: at("2026-10-14", "20:00").toISOString() },
    { id: "b", klus: "vaat-in", by: "k2", at: at("2026-10-10", "20:00").toISOString() },
    { id: "c", klus: "was", by: "k1", at: at("2026-10-13", "20:00").toISOString() },
    { id: "d", klus: "bedden", by: "k1", at: at("2026-10-12", "20:00").toISOString() },
  ];
  const s = gezin({ klusLog: log });
  assert.equal(beurtTussen(s, "vaat-in", "k1", "k2", "2026-10-15"), "k2", "wie het langst niet deed");
  const p = lotKans(s, "k1", "k2", at("2026-10-15"));
  assert.ok(p < 0.5, `k1 deed veel meer, dus minder kans: ${p}`);
  assert.ok(p >= 0.15);
});

test("signaal voor ouders als het scheef groeit", () => {
  const log: KlusDone[] = [];
  for (let i = 1; i <= 10; i++) log.push({ id: `w${i}`, klus: "was", by: "k1", at: at(`2026-10-${String(15 - i).padStart(2, "0")}`, "18:00").toISOString() });
  const s = gezin({ klusLog: log });
  const sig = scheef(s, at("2026-10-15"));
  assert.equal(sig?.veel, "k1");
  assert.match(sig!.tekst, /minuten/);
  assert.equal(scheef(gezin(), at("2026-10-15")), null);
});

test("drukke schooldag: wat kan wachten schuift door, dagelijkse klussen niet", () => {
  const log: KlusDone[] = [{ id: "s", klus: "stofzuigen", by: "k2", at: at("2026-10-12", "15:00").toISOString() }];
  const school = verdeling(gezin({ werk: WERK, klusLog: log }), "2026-10-15");
  assert.ok(school.uitgesteld.has("stofzuigen"), "stofzuigen schuift door op een volle schooldag");
  assert.ok(school.wie["vaat-uit"] && school.wie["vaat-in"], "vaatwasser gaat altijd door");
  const vrij = verdeling(gezin({ werk: WERK, klusLog: log, vakanties: { k1: [{ naam: "Herfst", van: "2026-10-12", tot: "2026-10-18" }], k2: [{ naam: "Herfst", van: "2026-10-12", tot: "2026-10-18" }] } }), "2026-10-15");
  assert.ok(vrij.wie["stofzuigen"], "op een vrije dag gaat het wel door");
  // Echt te lang blijven liggen: dan toch.
  const oud: KlusDone[] = [{ id: "s", klus: "stofzuigen", by: "k2", at: at("2026-10-05", "15:00").toISOString() }];
  assert.ok(verdeling(gezin({ werk: WERK, klusLog: oud }), "2026-10-15").wie["stofzuigen"]);
});

test("3.16: nooit meer dan de tijd van een kind; geen schooltijden = doordeweeks schooldag; kamer-regel en namen kloppen", async () => {
  const { klusStatus: status, naamKlus } = await import("@/lib/huis");
  const aan = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, { aan: true }]));
  const s = gezin({
    werk: { p1: WERK.p1, p2: WERK.p2, k1: WERK.k1 }, // k2 heeft geen schooltijden in de app
    vakanties: { k1: [{ naam: "Herfstvakantie", van: "2026-10-12", tot: "2026-10-18" }] },
    klusAfspraken: {
      verwachting: { k1: { school: 30, vrij: 60 }, k2: { school: 45, vrij: 60 } },
      klussen: { ...aan(["afwas", "afdrogen", "woonkamer", "was-vouwen", "trap", "aanrecht", "bed-op", "tafel-dekken", "planten", "schoenen"]), kamer: { niet: ["k1", "k2"] } },
    },
  });
  const di = "2026-10-20"; // dinsdag na de herfstvakantie, papa en mama werken
  const v = verdeling(s, di);
  assert.equal(v.verwachting.k2.soort, "school", "geen schooltijden ingevuld: doordeweeks een schooldag");
  assert.equal(v.verwachting.k2.doel, 45);
  for (const id of ["k1", "k2"]) assert.ok(v.vandaag[id] <= v.verwachting[id].doel + 5, `${id}: ${v.vandaag[id]} min, mag ${v.verwachting[id].doel}`);
  assert.ok(Object.values(v.reden).includes("de kinderen hebben vandaag hun tijd al vol"), "wat niet past, gaat naar een ouder");
  assert.equal(v.wie["kamer:k2"], undefined, "kamer staat op 'niet' voor de kinderen");
  assert.equal(v.wie["kamer:k1"], undefined);
  const bed = status(s, at(di, "16:00")).find((k) => k.key === "bed-op:k2");
  assert.ok(bed, "bed opmaken is er wel");
  assert.equal(naamKlus(bed!, "p1"), "Bed opmaken", "geen tweede 'Kamer van'");
  // In de herfstvakantie van de broer telt het voor haar ook als vakantie.
  assert.equal(verwachting(s, lid(s, "k2"), "2026-10-14").soort, "vakantie");
  // Weekend blijft weekend.
  assert.equal(verwachting(s, lid(s, "k2"), "2026-10-24").soort, "weekend");
});
