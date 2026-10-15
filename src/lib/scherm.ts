/*
  Schermtijd: "eerst je dag, dan je scherm".
  - De telefoon (Schermtijd van Apple) regelt het blokkeren. De app kan dat niet zelf, en dat hoort ook zo.
  - De app laat zien of je dag af is. Pas dan mag je om extra tijd vragen. Ouders zien het meteen bij een verzoek.
  - Ouders nemen elke dag de schermtijd over uit Schermtijd (twee getallen). Zo zie je de week, zonder te raden.
  - Alleen het kind zelf en de ouders zien het. Geen vergelijking met broers of zussen.
*/

import { addDays, iso } from "./planner";
import { dagdeel, type Dagdeel } from "./dag";
import { dagprogramma } from "./dagprogramma";
import type { FamilyState } from "./types";

const VOLGORDE: Dagdeel[] = ["ochtend", "middag", "avond", "nacht"];
export const STANDAARD_DOEL = 120;

/** Is je dag af (tot nu toe)? Routine, klussen en taken van dit dagdeel en eerder. */
export function dagAf(s: FamilyState, id: string, nu = new Date()): { af: boolean; open: string[] } {
  const tot = VOLGORDE.indexOf(dagdeel(nu));
  const open = dagprogramma(s, id, nu)
    .filter((x) => (x.soort === "routine" || x.soort === "klus" || x.soort === "taak") && !x.klaar && !x.later && VOLGORDE.indexOf(x.deel) <= tot)
    .map((x) => x.titel.replace(/ \(alvast\)$/, ""));
  return { af: open.length === 0, open };
}

export const doelVan = (s: FamilyState, id: string) => s.schermAfspraak?.[id]?.doel ?? STANDAARD_DOEL;

/** De laatste 7 dagen (oudste eerst), met wat er is ingevuld. */
export function week(s: FamilyState, id: string, nu = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(iso(nu), i - 6);
    const x = s.schermtijd?.[id]?.[d];
    return { d, totaal: x?.totaal, sociaal: x?.sociaal };
  });
}

/** Gemiddelde over de ingevulde dagen van de laatste week, en hoeveel dagen binnen het doel. */
export function weekStand(s: FamilyState, id: string, nu = new Date()) {
  const w = week(s, id, nu).filter((x) => x.totaal !== undefined);
  if (!w.length) return null;
  const doel = doelVan(s, id);
  return { gemiddeld: Math.round(w.reduce((a, x) => a + x.totaal!, 0) / w.length), binnen: w.filter((x) => x.totaal! <= doel).length, dagen: w.length };
}

export const uurMin = (m?: number) => (m === undefined ? "–" : m >= 60 ? `${Math.floor(m / 60)} u${m % 60 ? ` ${m % 60} m` : ""}` : `${m} m`);
