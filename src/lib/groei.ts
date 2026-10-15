/*
  Groei: hoe groeien jullie als gezin, en hoe groeit ieder kind?

  Productkeuzes (pedagogisch onderbouwd waar het kan, de rest is een ontwerpkeuze die we in het gezin testen):
  - Alleen wat je echt in de app doet telt. Geen cijfer dat iemand invult over een ander.
  - Groei = vergelijken met jezelf (deze 4 weken vs. de 4 weken ervoor), nooit met een broer of zus.
  - Een gezinsscore per week op drie pijlers: Samen (verbinding), Structuur (dag af), Zelfstandig (zelf beginnen).
  - Competenties: oefenen ≠ toepassen ≠ groei. Groei pas als het week na week terugkomt.
  - Feiten (vastgelegd) en reflecties (zelf aangegeven) blijven gescheiden.
  - Kinderen zien hun eigen groei en die van het gezin. Ouders zien alles.
  - Positief verwoord. Een mindere week is "een rustigere week", geen falen.
*/

import { addDays, iso } from "./planner";
import { ETEN, ROUTINE, dagLog, gegeten } from "./dag";
import { dagprogramma, telt } from "./dagprogramma";
import { klusById, maandag } from "./huis";
import { IDEEEN } from "./samen";
import { tasksFor, isDone } from "./tasks";
import { verdeling } from "./verdeling";
import { COMPETENTIES, competentie, type Competentie } from "./competenties";
import type { FamilyState } from "./types";

/* ---------- Hoe ging een dag? ---------- */

export type Stand = "af" | "half" | "niks" | "leeg";

/** Hoe ging dag d voor dit lid: ochtendroutine, ingedeelde klussen en taken. Ook voor dagen in het verleden. */
export interface DagItem {
  soort: "routine" | "eten" | "taak" | "klus";
  titel: string;
  emoji: string;
  klaar: boolean;
}

/**
 * Eén lijst voor "je dag", overal hetzelfde: de ring op Vandaag, Gezin › Week en het weekverhaal.
 * Telt: ochtendroutine, eten, taken en jouw klussen. Niet: slapen, werk/school en "alvast"-klussen die nog open staan.
 * Vandaag komt rechtstreeks uit het dagprogramma, zodat het precies klopt met wat je op Vandaag ziet.
 */
export function dagLijst(s: FamilyState, id: string, d: string): DagItem[] {
  if (d === iso(new Date())) {
    return dagprogramma(s, id).filter(telt).map((st) => ({ soort: st.soort as DagItem["soort"], titel: st.titel, emoji: st.emoji, klaar: st.klaar }));
  }
  const log = dagLog(s, id, d);
  const items: DagItem[] = [];
  const nodig = ROUTINE.filter((r) => r.gewicht > 0);
  items.push({ soort: "routine", titel: "Ochtendroutine", emoji: "🚿", klaar: nodig.every((r) => log.routine.includes(r.id)) });
  for (const e of ETEN) items.push({ soort: "eten", titel: e.label, emoji: e.emoji, klaar: gegeten(log, e.id) });
  for (const t of tasksFor(s, id, d)) {
    if (t.cat === "werk") continue;
    items.push({ soort: "taak", titel: t.title, emoji: t.study ? "📚" : "✅", klaar: isDone(s, t.id, d) });
  }
  const v = verdeling(s, d);
  const log2 = (s.klusLog ?? []).filter((k) => iso(new Date(k.at)) === d && k.by === id);
  const gedaan = new Set(log2.map((k) => k.klus));
  const keys = new Set<string>();
  for (const [key, wie] of Object.entries(v.wie)) if (wie === id || v.mee[key] === id) keys.add(key);
  for (const key of gedaan) keys.add(key); // ook wat je extra deed
  for (const key of keys) {
    const k = klusById(s, key);
    items.push({ soort: "klus", titel: k ? (k.perKind ? "Eigen kamer" : k.label.split(" (")[0]) : key, emoji: k?.emoji ?? "🧹", klaar: gedaan.has(key) });
  }
  return items;
}

export function dagStand(s: FamilyState, id: string, d: string): { stand: Stand; af: number; totaal: number; items: DagItem[] } {
  const items = dagLijst(s, id, d);
  const af = items.filter((x) => x.klaar).length;
  const totaal = items.length;
  const leegDag = af === 0 && !s.dag?.[d]?.[id];
  if (leegDag && d > iso(new Date())) return { stand: "leeg", af, totaal, items };
  const stand: Stand = af >= totaal ? "af" : af / totaal >= 0.5 ? "half" : "niks";
  return { stand, af, totaal, items };
}

/* ---------- Competenties: wat heb je geoefend en toegepast? ---------- */

export type Soort = "oefenen" | "toepassen";
export interface Bewijs {
  competentie: string;
  datum: string;
  tekst: string;
  soort: Soort;
  /** "feit" = vastgelegd in de app; "zelf" = zelf aangegeven (reflectie, reactie). */
  bron: "feit" | "zelf";
}

/** Bij welke competenties hoort een samen-moment? Alleen wat echt relevant is, plus altijd "samen tijd". */
const samenComp = (soort: string) => [...(IDEEEN.find((i) => i.id === soort)?.vaardigheden ?? ["samenwerken"]), "band"];

/** Alles wat iemand in de app deed dat bij een competentie hoort, tussen van en tot (inclusief). */
export function bewijzen(s: FamilyState, id: string, van: string, tot: string): Bewijs[] {
  const uit: Bewijs[] = [];
  const binnen = (d: string) => d >= van && d <= tot;
  const dagVan = (at: string) => iso(new Date(at));
  const voeg = (comp: string, datum: string, tekst: string, soort: Soort, bron: Bewijs["bron"] = "feit") => {
    if (binnen(datum) && competentie(comp)) uit.push({ competentie: comp, datum, tekst, soort, bron });
  };

  // Klussen: zelf gedaan (zonder porren) = verantwoordelijkheid toegepast. Alvast gedaan = initiatief. Samen = samenwerken.
  const geporred = new Set((s.porren ?? []).filter((p) => p.to === id).map((p) => dagVan(p.at)));
  const klusDagen = new Set<string>();
  for (const k of s.klusLog ?? []) {
    if (k.by !== id) continue;
    const d = dagVan(k.at);
    if (!binnen(d)) continue;
    if (verdeling(s, d).extra.has(k.klus)) voeg("initiatief", d, "Een klus alvast gedaan", "toepassen");
    else if (!geporred.has(d) && !klusDagen.has(d)) voeg("verantwoordelijkheid", d, "Klussen gedaan zonder dat iemand het zei", "toepassen");
    klusDagen.add(d);
    if (k.samen) voeg("samenwerken", d, "Samen een klus gedaan", "toepassen");
  }

  // Dag helemaal af.
  for (let d = van; d <= tot && d <= iso(new Date()); d = addDays(d, 1)) {
    if (dagStand(s, id, d).stand === "af") voeg("verantwoordelijkheid", d, "Hele dag af", "toepassen");
  }

  // Plannen: zelf taken of leerblokjes ingepland (niet automatisch uit Somtoday), zelf iets samen gepland.
  for (const t of s.tasks ?? []) {
    if (t.createdBy !== id || t.assignee !== id || t.study?.sid) continue;
    const d = t.date ?? t.study?.deadline;
    if (d) voeg("plannen", d, t.study ? `Zelf ${t.study.subject.toLowerCase()} ingepland` : `Zelf ingepland: ${t.title.toLowerCase()}`, "toepassen");
  }
  for (const x of s.samen ?? []) if (x.door === id) voeg("plannen", dagVan(x.at), `${x.titel} gepland`, "toepassen");

  // Samen-momenten (alleen als ze echt gedaan zijn): oefenen bij de competenties die erbij horen.
  for (const x of s.samen ?? []) {
    if (!x.gedaan || !x.wie.includes(id)) continue;
    const d = dagVan(x.gedaan);
    for (const c of samenComp(x.soort)) voeg(c, d, x.titel, "oefenen");
    if (x.vrienden) voeg("sociaal", d, `${x.titel} met ${x.vrienden}`, "oefenen");
    const r = x.reactie?.[id];
    if (r === "😍" || r === "🙂") voeg("band", d, `${x.titel}: ${r === "😍" ? "heel leuk" : "leuk"} gevonden`, "oefenen", "zelf");
  }
  for (const d of Object.keys(s.koken ?? {})) if (s.koken?.[d]?.kok === id) voeg("rekening", d, "Gekookt voor het gezin", "toepassen");

  // Emoties: rust genomen, rustplan gebruikt, sportief na pech.
  for (const h of s.history?.[id] ?? []) if (h.rest) voeg("teleurstelling", dagVan(h.at), "Even rust genomen", "toepassen");
  for (const c of s.calm ?? []) if (c.member === id) voeg("teleurstelling", dagVan(c.at), "Rustplan gebruikt", "oefenen");
  for (const u of s.uitdagingen ?? []) {
    if (!u.spelers.includes(id)) continue;
    const d = dagVan(u.at);
    const deed = (s.klusLog ?? []).some((k) => k.klus === u.klus && k.by === id && dagVan(k.at) === d);
    if (u.verliezer === id && deed && (u.manier === "spel" || u.manier === "loting")) voeg("teleurstelling", d, "Sportief de klus gedaan na pech", "toepassen");
    if (u.manier === "beurt" || u.manier === "samen") voeg("conflicten", d, u.manier === "samen" ? "Samen opgelost: allebei de helft" : "Eerlijk om de beurt gekozen", "toepassen");
  }

  // Conflicten: uitgepraat (toepassen), of samen hulp gevraagd (een respectvolle poging telt ook).
  for (const c of s.conflicts ?? []) {
    if (c.from !== id && c.with !== id) continue;
    if (c.status === "opgelost") {
      voeg("conflicten", dagVan(c.solvedAt ?? c.at), `Ruzie uitgepraat over ${c.topic.toLowerCase()}`, "toepassen");
      voeg("communiceren", dagVan(c.solvedAt ?? c.at), "Naar elkaar geluisterd bij een ruzie", "toepassen");
    } else if (c.status === "hulp") voeg("conflicten", dagVan(c.at), "Samen een ouder om hulp gevraagd bij een ruzie", "oefenen");
  }

  // Praten: inchecken (één keer per dag), op tijd zeggen dat iets niet lukt. Hulp vragen = initiatief.
  for (const d of new Set((s.history?.[id] ?? []).map((h) => dagVan(h.at)))) voeg("communiceren", d, "Laten weten hoe het gaat", "oefenen");
  for (const b of s.bezwaren ?? []) if (b.door === id) voeg(b.soort === "hulp" ? "initiatief" : "communiceren", b.datum, b.soort === "hulp" ? "Zelf om hulp gevraagd" : "Op tijd gezegd dat iets niet lukte", "toepassen");

  // Groeidoel: de eigen terugblik ("lukte goed" / "ging beter") is een reflectie, geen feit.
  for (const [week, per] of Object.entries(s.doelen?.[id]?.terugblik ?? {})) {
    const d = addDays(week, 6) > tot ? tot : addDays(week, 6);
    for (const [v, hoe] of Object.entries(per)) if (hoe !== "lastig") voeg(v, d, hoe === "goed" ? "Zelf: lukte goed deze week" : "Zelf: ging beter deze week", "oefenen", "zelf");
  }
  return uit.sort((a, b) => b.datum.localeCompare(a.datum));
}

export type Fase = "nog-niet" | "oefenen" | "vaker" | "groeit";
export const FASE: Record<Fase, string> = { "nog-niet": "Nog niet aan bod", oefenen: "Aan het oefenen", vaker: "Komt vaker terug", groeit: "Gaat steeds beter" };

export interface CompStand {
  c: Competentie;
  /** In welke van de laatste 4 weken kwam het aan bod (oudste eerst)? */
  weken: boolean[];
  oefenen: number;
  toepassen: number;
  /** In de 4 weken daarvoor. */
  vorig: number;
  fase: Fase;
  recent: Bewijs[];
}

/**
  Per competentie: in hoeveel van de laatste 4 weken kwam het aan bod, hoe vaak geoefend en toegepast.
  De fase hangt af van herhaling over weken, niet van één drukke dag. Eén activiteit = "aan het oefenen".
*/
export function competenties(s: FamilyState, id: string, nu = new Date()): CompStand[] {
  const tot = iso(nu);
  const van = addDays(tot, -27);
  const b = bewijzen(s, id, addDays(van, -28), tot);
  return COMPETENTIES.map((c) => {
    const mijn = b.filter((x) => x.competentie === c.id);
    const nu4 = mijn.filter((x) => x.datum >= van);
    const weken = [0, 1, 2, 3].map((w) => nu4.some((x) => x.datum >= addDays(van, w * 7) && x.datum < addDays(van, (w + 1) * 7)));
    const n = weken.filter(Boolean).length;
    const toepassen = nu4.filter((x) => x.soort === "toepassen").length;
    const vorig = mijn.filter((x) => x.datum < van).length;
    const fase: Fase = n === 0 ? "nog-niet" : n === 1 ? "oefenen" : n >= 3 && toepassen >= 2 && nu4.length > vorig ? "groeit" : "vaker";
    return { c, weken, oefenen: nu4.length - toepassen, toepassen, vorig, fase, recent: nu4.slice(0, 3) };
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
  const zelfstandig = leden.filter((m) => m.role !== "ouder").reduce((a, m) => a + bewijzen(s, m.id, ma, zo).filter((b) => (b.competentie === "verantwoordelijkheid" || b.competentie === "initiatief") && b.soort === "toepassen").length, 0);
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
