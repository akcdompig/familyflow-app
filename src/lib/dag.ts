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
  const w = Math.min(1, log.water / DOEL.water) * 45;
  const f = Math.min(1, log.fruit / DOEL.fruit) * 25;
  return Math.round(w + f + (log.ontbijt ? 20 : 0) + (log.sport ? 10 : 0));
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
  return r * 2 + (compleet ? 5 : 0) + (log.kleding ? 1 : 0) + (log.water >= DOEL.water ? 5 : 0) + (log.fruit >= DOEL.fruit ? 5 : 0) + (log.ontbijt ? 2 : 0) + (log.sport ? 3 : 0);
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
