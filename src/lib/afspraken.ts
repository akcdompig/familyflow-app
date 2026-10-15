import { conflictById } from "./conflicts";
import type { Afspraak, FamilyState, Oordeel } from "./types";

/*
  De afsprakenlus: probleem → afspraak → actie op Vandaag → na 7 dagen "hielp het?".
  Bij "nee" kiest het gezin een andere afspraak of zoekt hulp. Zo stopt de begeleiding niet na de afspraak.
*/

const DAG = 864e5;
export const EVALUATIE_NA = 7;
export const OORDEEL: Record<Oordeel, { label: string; emoji: string }> = {
  ja: { label: "Ja, het helpt", emoji: "👍" },
  beetje: { label: "Een beetje", emoji: "🤏" },
  nee: { label: "Nee, nog niet", emoji: "👎" },
};

export const actief = (s: FamilyState) => (s.afspraken ?? []).filter((a) => !a.gestopt);

/** Laatste oordeel van het gezin over deze afspraak. */
export const laatsteOordeel = (a: Afspraak) => a.evaluaties?.at(-1);

/** Afspraken waar ik nu "hielp het?" over kan zeggen: 7 dagen oud, en ik heb er de afgelopen 7 dagen niks over gezegd. */
export function teEvalueren(s: FamilyState, me: string, nu = new Date()): Afspraak[] {
  return actief(s).filter((a) => {
    if (nu.getTime() - new Date(a.at).getTime() < EVALUATIE_NA * DAG) return false;
    // Samen beoordeeld in het gezinsoverleg telt ook voor jou.
    const mijn = (a.evaluaties ?? []).filter((e) => e.by === me || e.by === "gezin").at(-1);
    return !mijn || nu.getTime() - new Date(mijn.at).getTime() >= EVALUATIE_NA * DAG;
  });
}

/** Leesbare herkomst van een afspraak. */
export function herkomst(a: Afspraak): string {
  if (!a.scenario) return "zelf gemaakt";
  if (a.scenario === "overleg") return "uit het gezinsoverleg";
  if (a.scenario.startsWith("ruzie:")) return `na een ruzie over ${a.scenario.slice(6).toLowerCase()}`;
  const c = conflictById(a.scenario);
  return c ? `uit de coach: ${c.title.toLowerCase()}` : "uit de coach";
}

export interface Herhaling {
  thema: string;
  titel: string;
  aantal: number;
  /** Coachsituatie die erbij hoort, om de coach meteen te openen. */
  scenario?: string;
}

/** Wat komt vaker terug? Ruzies en coachgebruik per thema, de laatste 28 dagen. Vanaf 3 keer. */
export function herhaling(s: FamilyState, nu = new Date(), min = 3): Herhaling[] {
  const grens = nu.getTime() - 28 * DAG;
  const tel = new Map<string, Herhaling>();
  const plus = (thema: string, titel: string, scenario?: string) => {
    const h = tel.get(thema) ?? { thema, titel, aantal: 0, scenario };
    h.aantal++;
    tel.set(thema, h);
  };
  for (const c of s.conflicts ?? []) if (new Date(c.at).getTime() >= grens) plus(`ruzie:${c.topic}`, c.topic);
  // Coachgebruik telt per sessie (eerste log van een persoon per situatie per dag), veiligheidschecks niet.
  const gezien = new Set<string>();
  for (const l of s.coachLog ?? []) {
    if (l.licht === "veilig" || new Date(l.at).getTime() < grens) continue;
    const sleutel = `${l.by}:${l.scenario}:${l.at.slice(0, 10)}`;
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    plus(`coach:${l.scenario}`, conflictById(l.scenario)?.title ?? l.scenario, l.scenario);
  }
  return [...tel.values()].filter((h) => h.aantal >= min).sort((a, b) => b.aantal - a.aantal);
}

/** Thema's om aan te werken. Worden de gezinsdoelen die het gezin elke week in het overleg scoort. */
export const THEMAS = [
  "Rustige ochtenden",
  "Minder ruzie tussen de kinderen",
  "Duidelijke afspraken over schermtijd",
  "Huiswerk zonder strijd",
  "Meer samen doen",
  "Respectvol met elkaar praten",
  "Eerlijk verdelen in huis",
];
