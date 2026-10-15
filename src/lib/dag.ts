/*
  Dagelijkse basis, zoals in de Sims: hygiëne en gezondheid.
  - Hygiëne: de ochtendroutine en schone kleding. Na de deadline zonder routine, of op dag 3 in dezelfde kleren,
    komt er een walmpje van je avatar af.
  - Gezondheid: water, fruit, ontbijt en bewegen. Geen calorieën of gewicht, alleen de gewoonte.
  Alles is simpel af te vinken. Kinderen verdienen er XP mee.
*/

import { addDays, iso } from "./planner";
import type { FamilyState } from "./types";

export interface DagLog {
  routine: string[];
  /** "nieuw" = schone set aan, "zelfde" = zelfde kleren als gisteren. */
  kleding?: "nieuw" | "zelfde";
  water: number;
  fruit: number;
  ontbijt?: boolean;
  sport?: boolean;
  /** Afgevinkte eetmomenten: ontbijt, lunch, tussendoor, avondeten. */
  eten?: string[];
}

/* De dag in vier stukken, zoals thuis: ochtend, middag, avond en nacht. */
export type Dagdeel = "ochtend" | "middag" | "avond" | "nacht";
export const DAGDELEN: { id: Dagdeel; label: string; emoji: string; van: number; tot: number }[] = [
  { id: "ochtend", label: "Ochtend", emoji: "🌅", van: 6, tot: 12 },
  { id: "middag", label: "Middag", emoji: "☀️", van: 12, tot: 18 },
  { id: "avond", label: "Avond", emoji: "🌆", van: 18, tot: 23 },
  { id: "nacht", label: "Nacht", emoji: "🌙", van: 23, tot: 6 },
];
export function dagdeel(nu = new Date()): Dagdeel {
  const h = nu.getHours();
  if (h >= 6 && h < 12) return "ochtend";
  if (h >= 12 && h < 18) return "middag";
  if (h >= 18 && h < 23) return "avond";
  return "nacht";
}

/** Eetmomenten: even afvinken, net als in de Sims. Vanaf "na" telt het als gemist. */
export const ETEN: { id: string; label: string; emoji: string; deel: Dagdeel; na: number }[] = [
  { id: "ontbijt", label: "Ontbijt", emoji: "🥣", deel: "ochtend", na: 11 },
  { id: "lunch", label: "Lunch", emoji: "🥪", deel: "middag", na: 14 },
  { id: "tussendoor", label: "Tussendoortje", emoji: "🥕", deel: "middag", na: 17 },
  { id: "avondeten", label: "Avondeten", emoji: "🍽️", deel: "avond", na: 20 },
];
export const gegeten = (log: DagLog, id: string) => !!log.eten?.includes(id) || (id === "ontbijt" && !!log.ontbijt);

const TIPS: Record<Dagdeel, string[]> = {
  ochtend: [
    "Eerst je ochtendroutine, dan pas je telefoon.",
    "Een glas water bij het opstaan maakt je sneller wakker.",
    "Leg je kleren voor morgen vanavond al klaar. Scheelt gedoe.",
    "Bed even rechttrekken kost 30 seconden en je kamer ziet er meteen netter uit.",
    "Check de vaatwasser: schoon? Even uitruimen voor je vertrekt.",
  ],
  middag: [
    "Pak een stuk fruit uit de koelkast. Daar ligt het voor.",
    "Huiswerk na de lunch is sneller klaar dan om 9 uur 's avonds.",
    "Tijd voor water. Even een glas halen?",
    "Vanavond eten: weet iemand al wie er kookt?",
    "Kort stofzuigen? Om de dag houdt het huis fris.",
  ],
  avond: [
    "Na het eten samen de keuken opruimen: 10 minuten, klaar.",
    "Telefoon een uur voor bedtijd aan de lader.",
    "Tas voor morgen al ingepakt?",
    "Zet de vaatwasser aan voor je gaat slapen.",
    "Even je kamer opruimen voor het slapen. Morgen blij mee.",
  ],
  nacht: ["Tijd om te slapen. Morgen weer een nieuwe dag.", "Goed geslapen = makkelijker opstaan. Welterusten!"],
};
/** Tip die elk uur wisselt, voor iedereen in het gezin hetzelfde. */
export function tipVanNu(nu = new Date()): string {
  const lijst = TIPS[dagdeel(nu)];
  const i = (nu.getDate() * 24 + nu.getHours()) % lijst.length;
  return lijst[i];
}

export function begroeting(nu = new Date()): string {
  return { ochtend: "Goedemorgen", middag: "Goedemiddag", avond: "Goedenavond", nacht: "Slaap lekker" }[dagdeel(nu)];
}

const DAGNAAM = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const MAAND = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
/** "Donderdag 15 oktober · 08:15" */
export function datumTijd(nu = new Date()): string {
  const d = DAGNAAM[nu.getDay()];
  return `${d.charAt(0).toUpperCase() + d.slice(1)} ${nu.getDate()} ${MAAND[nu.getMonth()]} · ${String(nu.getHours()).padStart(2, "0")}:${String(nu.getMinutes()).padStart(2, "0")}`;
}

export const ROUTINE: { id: string; label: string; emoji: string; gewicht: number }[] = [
  { id: "douchen", label: "Douchen", emoji: "🚿", gewicht: 30 },
  { id: "tanden", label: "Tanden poetsen", emoji: "🪥", gewicht: 25 },
  { id: "deo", label: "Deodorant", emoji: "🧴", gewicht: 15 },
  { id: "haar", label: "Haar doen", emoji: "💇", gewicht: 10 },
  { id: "lotion", label: "Bodylotion", emoji: "✨", gewicht: 10 },
  { id: "parfum", label: "Parfum", emoji: "🌸", gewicht: 0 },
];
/** Kleding telt 10 mee in hygiëne. */

export const DOEL = { water: 6, fruit: 2 };

const leeg = (): DagLog => ({ routine: [], water: 0, fruit: 0 });
export const dagLog = (s: FamilyState, id: string, d = iso(new Date())): DagLog => ({ ...leeg(), ...(s.dag?.[d]?.[id] ?? {}) });

/** Hoeveelste dag in dezelfde set kleren (vandaag meegeteld). Nog niks gekozen vandaag = waarschijnlijk dezelfde. */
export function kledingDag(s: FamilyState, id: string, d = iso(new Date())): number {
  const vandaag = s.dag?.[d]?.[id]?.kleding;
  if (vandaag === "nieuw") return 1;
  let n = 1;
  let dag = addDays(d, -1);
  for (let i = 0; i < 10; i++) {
    const k = s.dag?.[dag]?.[id]?.kleding;
    if (!k) break; // niks bekend: niet verder tellen
    n++;
    if (k === "nieuw") break;
    dag = addDays(dag, -1);
  }
  return n;
}

/** Na dit uur telt een niet gedane routine als "niet gedaan". Weekend later. */
export function deadlineUur(nu = new Date()) {
  const wd = nu.getDay();
  return wd === 0 || wd === 6 ? 12 : 10;
}

export function hygiene(s: FamilyState, id: string, nu = new Date()): number {
  const log = dagLog(s, id, iso(nu));
  let score = ROUTINE.filter((r) => log.routine.includes(r.id)).reduce((a, r) => a + r.gewicht, 0);
  const kd = kledingDag(s, id, iso(nu));
  if (log.kleding === "nieuw" || (log.kleding === "zelfde" && kd <= 2)) score += 10;
  if (kd >= 3) score -= 40;
  return Math.max(0, Math.min(100, score));
}

export function gezondheid(s: FamilyState, id: string, nu = new Date()): number {
  const log = dagLog(s, id, iso(nu));
  const w = Math.min(1, log.water / DOEL.water) * 35;
  const f = Math.min(1, log.fruit / DOEL.fruit) * 20;
  const m = (gegeten(log, "ontbijt") ? 10 : 0) + (gegeten(log, "lunch") ? 10 : 0) + (gegeten(log, "avondeten") ? 10 : 0) + (gegeten(log, "tussendoor") ? 5 : 0);
  return Math.round(w + f + m + (log.sport ? 10 : 0));
}

/** Komt er een walmpje van je af? Pas na de deadline, of als je op dag 3 in dezelfde kleren loopt. */
export function walm(s: FamilyState, id: string, nu = new Date()): boolean {
  if (kledingDag(s, id, iso(nu)) >= 3 && dagLog(s, id, iso(nu)).kleding !== "nieuw") return true;
  return nu.getHours() >= deadlineUur(nu) && hygiene(s, id, nu) < 55;
}

/** Dorst: 's middags nog bijna niks gedronken. */
export function dorst(s: FamilyState, id: string, nu = new Date()): boolean {
  const h = nu.getHours();
  const w = dagLog(s, id, iso(nu)).water;
  return (h >= 12 && w < 2) || (h >= 17 && w < 4);
}

/** XP die een kind vandaag met de basis verdient. Afvinken en terugzetten gaat zo altijd goed. */
export function basisXp(log: DagLog): number {
  const r = log.routine.filter((x) => ROUTINE.some((y) => y.id === x && y.gewicht > 0)).length;
  const compleet = ROUTINE.filter((y) => y.gewicht > 0).every((y) => log.routine.includes(y.id));
  return r * 2 + (compleet ? 5 : 0) + (log.kleding ? 1 : 0) + (log.water >= DOEL.water ? 5 : 0) + (log.fruit >= DOEL.fruit ? 5 : 0) + ETEN.filter((e) => gegeten(log, e.id)).length * 2 + (log.sport ? 3 : 0);
}

/** Dagscore 0–100: hygiëne, gezondheid en taken. Voor het klassement in de huiskamer. */
export function dagscore(s: FamilyState, id: string, takenPct: number, nu = new Date()): number {
  return Math.round(hygiene(s, id, nu) * 0.35 + gezondheid(s, id, nu) * 0.35 + takenPct * 100 * 0.3);
}

/** Hoeveel dagen op rij de hele ochtendroutine gedaan (gisteren en eerder, plus vandaag als hij al af is). */
export function reeks(s: FamilyState, id: string, nu = new Date()): number {
  const vol = (d: string) => ROUTINE.filter((y) => y.gewicht > 0).every((y) => s.dag?.[d]?.[id]?.routine.includes(y.id));
  let n = vol(iso(nu)) ? 1 : 0;
  let d = addDays(iso(nu), -1);
  while (n < 60 && vol(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Welke eetmomenten zijn gemist? (tijd voorbij en niet afgevinkt) */
export function gemist(s: FamilyState, id: string, nu = new Date()): string[] {
  const log = dagLog(s, id, iso(nu));
  return ETEN.filter((e) => nu.getHours() >= e.na && !gegeten(log, e.id)).map((e) => e.id);
}
