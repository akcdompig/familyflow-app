/*
  Groei: hoe groeien jullie als gezin, en hoe groeit ieder kind?

  Productkeuzes (pedagogisch onderbouwd waar het kan, de rest is een ontwerpkeuze die we in het gezin testen):
  - Alleen wat je echt in de app doet telt. Geen cijfer dat iemand invult over een ander.
  - Groei = vergelijken met jezelf (deze 4 weken vs. de 4 weken ervoor), nooit met een broer of zus.
  - Een gezinsscore per week op drie pijlers: Samen (verbinding), Structuur (dag af), Zelfstandig (zelf beginnen).
  - Kinderen zien hun eigen groei en die van het gezin. Ouders zien alles.
  - Positief verwoord. Een mindere week is "een rustigere week", geen falen.
*/

import { addDays, iso } from "./planner";
import { ROUTINE } from "./dag";
import { maandag } from "./huis";
import { IDEEEN } from "./samen";
import { tasksFor, isDone } from "./tasks";
import { verdeling } from "./verdeling";
import type { FamilyState } from "./types";

/* ---------- Hoe ging een dag? ---------- */

export type Stand = "af" | "half" | "niks" | "leeg";

/** Hoe ging dag d voor dit lid: ochtendroutine, ingedeelde klussen en taken. Ook voor dagen in het verleden. */
export function dagStand(s: FamilyState, id: string, d: string): { stand: Stand; af: number; totaal: number } {
  const routine = s.dag?.[d]?.[id]?.routine ?? [];
  const nodig = ROUTINE.filter((r) => r.gewicht > 0);
  let totaal = 1;
  let af = nodig.every((r) => routine.includes(r.id)) ? 1 : 0;
  const v = verdeling(s, d);
  const gedaan = new Set((s.klusLog ?? []).filter((k) => iso(new Date(k.at)) === d && k.by === id).map((k) => k.klus));
  for (const [key, wie] of Object.entries(v.wie)) {
    if (wie !== id && v.mee[key] !== id) continue;
    totaal++;
    if (gedaan.has(key)) af++;
  }
  for (const t of tasksFor(s, id, d)) {
    if (t.cat === "werk") continue;
    totaal++;
    if (isDone(s, t.id, d)) af++;
  }
  const leegDag = af === 0 && !s.dag?.[d]?.[id] && !gedaan.size;
  if (leegDag && d > iso(new Date())) return { stand: "leeg", af, totaal };
  const stand: Stand = af >= totaal ? "af" : af / totaal >= 0.5 ? "half" : "niks";
  return { stand, af, totaal };
}

/* ---------- Competenties ---------- */

export interface Competentie {
  id: string;
  naam: string;
  emoji: string;
  uitleg: string;
  /** Na hoeveel bewijzen (in 4 weken) je op niveau 2, 3, 4, 5 zit. */
  drempels: [number, number, number, number];
}

export const COMPETENTIES: Competentie[] = [
  { id: "zelfstandig", naam: "Zelfstandig", emoji: "🚀", uitleg: "Zelf beginnen, zonder dat iemand het hoeft te zeggen", drempels: [3, 8, 15, 24] },
  { id: "plannen", naam: "Plannen en organiseren", emoji: "🗓️", uitleg: "Zelf je huiswerk, klussen of iets leuks inplannen", drempels: [2, 5, 9, 14] },
  { id: "verantwoordelijk", naam: "Verantwoordelijk", emoji: "🎯", uitleg: "Je dag afmaken: routine, klussen en taken", drempels: [3, 8, 14, 20] },
  { id: "samenwerken", naam: "Samenwerken", emoji: "🤝", uitleg: "Samen iets doen of samen een klus oppakken", drempels: [1, 3, 6, 10] },
  { id: "emotie", naam: "Emoties de baas", emoji: "🌦️", uitleg: "Rust nemen, tot 10 tellen, sportief blijven als iets tegenzit", drempels: [1, 3, 6, 10] },
  { id: "conflict", naam: "Conflicten oplossen", emoji: "🕊️", uitleg: "Een ruzie uitpraten of samen een eerlijke oplossing kiezen", drempels: [1, 2, 4, 7] },
  { id: "praten", naam: "Praten en luisteren", emoji: "💬", uitleg: "Laten weten hoe het gaat, op tijd zeggen als iets niet lukt", drempels: [3, 7, 12, 18] },
  { id: "sociaal", naam: "Sociaal", emoji: "👫", uitleg: "Iets doen met vrienden of voor een ander", drempels: [1, 3, 5, 8] },
];

/** Groeidoel (Ik › groeidoelen) → competentie. */
const DOEL_NAAR: Record<string, string> = {
  samenwerken: "samenwerken", verantwoordelijkheid: "verantwoordelijk", plannen: "plannen", communiceren: "praten",
  teleurstelling: "emotie", conflicten: "conflict", rekening: "sociaal", initiatief: "zelfstandig",
};

export interface Bewijs {
  competentie: string;
  datum: string;
  tekst: string;
}

/** Alles wat iemand in de app deed dat bij een competentie hoort, tussen van en tot (inclusief). */
export function bewijzen(s: FamilyState, id: string, van: string, tot: string): Bewijs[] {
  const uit: Bewijs[] = [];
  const binnen = (d: string) => d >= van && d <= tot;
  const dagVan = (at: string) => iso(new Date(at));
  const voeg = (competentie: string, datum: string, tekst: string) => binnen(datum) && uit.push({ competentie, datum, tekst });

  // Zelfstandig: klussen gedaan op een dag dat niemand je hoefde te porren, en klussen die "alvast" mochten.
  const geporred = new Set((s.porren ?? []).filter((p) => p.to === id).map((p) => dagVan(p.at)));
  for (const k of s.klusLog ?? []) {
    if (k.by !== id) continue;
    const d = dagVan(k.at);
    if (!binnen(d)) continue;
    if (verdeling(s, d).extra.has(k.klus)) voeg("zelfstandig", d, "Een klus alvast gedaan");
    else if (!geporred.has(d)) voeg("zelfstandig", d, "Klus gedaan zonder dat iemand het zei");
    if (k.samen) voeg("samenwerken", d, "Samen een klus gedaan");
  }

  // Verantwoordelijk: dag af.
  for (let d = van; d <= tot && d <= iso(new Date()); d = addDays(d, 1)) {
    if (dagStand(s, id, d).stand === "af") voeg("verantwoordelijk", d, "Hele dag af");
  }

  // Plannen: zelf taken of leerblokjes ingepland, zelf iets samen gepland.
  for (const t of s.tasks ?? []) {
    // Zelf ingepland, niet automatisch uit Somtoday.
    if (t.createdBy !== id || t.assignee !== id || t.study?.sid) continue;
    const d = t.date ?? t.study?.deadline;
    if (d) voeg("plannen", t.date ?? d, t.study ? `Zelf ${t.study.subject.toLowerCase()} ingepland` : `Zelf ingepland: ${t.title.toLowerCase()}`);
  }
  for (const x of s.samen ?? []) if (x.door === id) voeg("plannen", dagVan(x.at), `${x.titel} gepland`);

  // Samenwerken en sociaal: samen-momenten.
  for (const x of s.samen ?? []) {
    if (!x.gedaan || !x.wie.includes(id)) continue;
    const d = dagVan(x.gedaan);
    voeg("samenwerken", d, x.titel);
    if (x.vrienden || IDEEEN.find((i) => i.id === x.soort)?.vaardigheden.includes("rekening")) voeg("sociaal", d, x.vrienden ? `${x.titel} met ${x.vrienden}` : x.titel);
  }
  for (const d of Object.keys(s.koken ?? {})) if (s.koken?.[d]?.kok === id) voeg("sociaal", d, "Gekookt voor het gezin");

  // Emoties: rust genomen, rustplan gebruikt, sportief na pech.
  for (const h of s.history?.[id] ?? []) if (h.rest) voeg("emotie", dagVan(h.at), "Even rust genomen in plaats van boos worden");
  for (const c of s.calm ?? []) if (c.member === id) voeg("emotie", dagVan(c.at), "Rustplan gebruikt");
  for (const u of s.uitdagingen ?? []) {
    if (!u.spelers.includes(id)) continue;
    const d = dagVan(u.at);
    const deed = (s.klusLog ?? []).some((k) => k.klus === u.klus && k.by === id && dagVan(k.at) === d);
    if (u.verliezer === id && deed && (u.manier === "spel" || u.manier === "loting")) voeg("emotie", d, "Sportief de klus gedaan na pech");
    if (u.manier === "beurt" || u.manier === "samen") voeg("conflict", d, u.manier === "samen" ? "Samen opgelost: allebei de helft" : "Eerlijk om de beurt gekozen");
  }

  // Conflicten opgelost.
  for (const c of s.conflicts ?? []) if ((c.from === id || c.with === id) && c.status === "opgelost") voeg("conflict", dagVan(c.solvedAt ?? c.at), `Ruzie uitgepraat over ${c.topic.toLowerCase()}`);

  // Praten en luisteren: inchecken, op tijd zeggen dat iets niet lukt, hulp vragen.
  const ingecheckt = new Set((s.history?.[id] ?? []).map((h) => dagVan(h.at)));
  for (const d of ingecheckt) voeg("praten", d, "Laten weten hoe het gaat");
  for (const b of s.bezwaren ?? []) if (b.door === id) voeg(b.soort === "hulp" ? "zelfstandig" : "praten", b.datum, b.soort === "hulp" ? "Zelf om hulp gevraagd" : "Op tijd gezegd dat iets niet lukte");

  // Groeidoel: terugblik "goed" of "beter" telt mee.
  for (const [week, per] of Object.entries(s.doelen?.[id]?.terugblik ?? {})) {
    for (const [v, hoe] of Object.entries(per)) if (hoe !== "lastig" && DOEL_NAAR[v]) voeg(DOEL_NAAR[v], addDays(week, 6) > tot ? tot : addDays(week, 6), hoe === "goed" ? "Groeidoel: lukte goed" : "Groeidoel: ging beter");
  }
  return uit.sort((a, b) => b.datum.localeCompare(a.datum));
}

export interface CompStand {
  c: Competentie;
  niveau: number;
  /** Bewijzen in de laatste 4 weken en de 4 weken daarvoor. */
  nu: number;
  vorig: number;
  trend: "omhoog" | "gelijk" | "omlaag";
  recent: Bewijs[];
}

/** Per competentie: niveau 1–5, trend t.o.v. de 4 weken ervoor, en de laatste voorbeelden. */
export function competenties(s: FamilyState, id: string, nu = new Date()): CompStand[] {
  const tot = iso(nu);
  const van = addDays(tot, -27);
  const b = bewijzen(s, id, addDays(van, -28), tot);
  return COMPETENTIES.map((c) => {
    const mijn = b.filter((x) => x.competentie === c.id);
    const n = mijn.filter((x) => x.datum >= van).length;
    const v = mijn.filter((x) => x.datum < van).length;
    const niveau = 1 + c.drempels.filter((t) => n >= t).length;
    return { c, niveau, nu: n, vorig: v, trend: n > v ? "omhoog" : n < v ? "omlaag" : "gelijk", recent: mijn.filter((x) => x.datum >= van).slice(0, 3) };
  });
}

/* ---------- Het gezin per week ---------- */

export interface GezinsWeek {
  maandag: string;
  /** 0–100: hoeveel van de dagen "af" waren (iedereen samen). */
  structuur: number;
  samen: number;
  zelfstandig: number;
  /** 0–100, de drie pijlers samen. */
  score: number;
  achievements: number;
  klussen: number;
}

export function gezinsWeek(s: FamilyState, ma: string, nu = new Date()): GezinsWeek {
  const vandaag = iso(nu);
  const zo = addDays(ma, 6);
  const leden = s.members.filter((m) => m.joined !== false);
  let af = 0;
  let dagen = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(ma, i);
    if (d > vandaag) break;
    for (const m of leden) {
      const st = dagStand(s, m.id, d);
      if (st.stand === "leeg") continue;
      dagen++;
      if (st.stand === "af") af++;
      else if (st.stand === "half") af += 0.5;
    }
  }
  const samen = (s.samen ?? []).filter((x) => x.gedaan && iso(new Date(x.gedaan)) >= ma && iso(new Date(x.gedaan)) <= zo).length;
  const zelfstandig = leden.filter((m) => m.role !== "ouder").reduce((a, m) => a + bewijzen(s, m.id, ma, zo).filter((b) => b.competentie === "zelfstandig").length, 0);
  const structuur = dagen ? Math.round((af / dagen) * 100) : 0;
  const kids = Math.max(1, leden.filter((m) => m.role !== "ouder").length);
  const score = Math.round(structuur * 0.5 + (Math.min(samen, 3) / 3) * 30 + (Math.min(zelfstandig, 5 * kids) / (5 * kids)) * 20);
  const achievements = (s.badges ?? []).filter((b) => iso(new Date(b.at)) >= ma && iso(new Date(b.at)) <= zo).length;
  const klussen = (s.klusLog ?? []).filter((k) => iso(new Date(k.at)) >= ma && iso(new Date(k.at)) <= zo).length;
  return { maandag: ma, structuur, samen, zelfstandig, score, achievements, klussen };
}

/** De laatste n weken (oudste eerst), deze week als laatste. */
export function gezinsWeken(s: FamilyState, n = 8, nu = new Date()): GezinsWeek[] {
  const ma = maandag(iso(nu));
  return Array.from({ length: n }, (_, i) => gezinsWeek(s, addDays(ma, (i - n + 1) * 7), nu));
}

/** Hoe groot is de gezinsboom? Op basis van de laatste twee weken. */
export function boomFase(weken: GezinsWeek[]): { fase: 0 | 1 | 2 | 3; emoji: string; naam: string } {
  const laatste = weken.slice(-2);
  const gem = laatste.reduce((a, w) => a + w.score, 0) / Math.max(1, laatste.length);
  if (gem >= 75) return { fase: 3, emoji: "🌳", naam: "Een stevige boom" };
  if (gem >= 50) return { fase: 2, emoji: "🪴", naam: "Een flinke plant" };
  if (gem >= 25) return { fase: 1, emoji: "🌿", naam: "Een groeiend plantje" };
  return { fase: 0, emoji: "🌱", naam: "Een zaadje dat begint" };
}
