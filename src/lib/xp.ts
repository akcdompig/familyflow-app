/*
  XP-economie. Laagdrempelig, maar niet te makkelijk.
  Een kind dat alles doet, verdient zo'n 40 tot 60 XP per dag.
  Levels worden steeds iets zwaarder: level 2 haal je in een paar dagen, level 5 in ruim twee weken.
  Dingen die je kunt "farmen" (ruzies, rustig worden, opnieuw oefenen) leveren weinig of één keer per dag XP op.
*/

export const XP = {
  inchecken: 2, // één keer per dag
  klusjeKlein: 5, // tafel dekken, vaatwasser, afval
  klusje: 10, // kamer opruimen, boodschappen
  telefoon: 10, // telefoon op tijd aan de lader
  sporten: 10,
  huiswerk: 15,
  leerblokPerMin: 0.5, // 20 minuten leren = 10 XP
  lezenPer10Min: 5,
  lezenMaxPerDag: 20,
  boekUit: 25,
  oefenscenario: 15, // alleen de eerste keer
  korteOefening: 10, // alleen de eerste keer
  quest: 30, // echt gedaan in het echte leven
  ruzieOpgelost: 10, // max één keer per dag
  rustig: 3, // max één keer per dag
} as const;

import type { FamilyState } from "./types";

/** Punten die je al geclaimd hebt. Daarop telt je level. */
export const geclaimd = (s: FamilyState, id: string) => s.claim?.[id] ?? s.xp[id] ?? 0;
/** Punten die in je schatkist wachten om geclaimd te worden. */
export const teClaimen = (s: FamilyState, id: string) => Math.max(0, (s.xp[id] ?? 0) - geclaimd(s, id));

/** XP die nodig is om een level te bereiken. Level 1 = 0, level 2 = 100, 3 = 250, 4 = 450, 5 = 700, 6 = 1000 … */
export const xpForLevel = (level: number) => (level <= 1 ? 0 : 100 * (level - 1) + 25 * (level - 1) * (level - 2));

export function levelOf(xp: number): number {
  let l = 1;
  while (xp >= xpForLevel(l + 1)) l++;
  return l;
}

/** Voortgang binnen het huidige level, voor de balk. */
export function levelProgress(xp: number) {
  const level = levelOf(xp);
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  return { level, into: xp - from, need: to - from, left: to - xp, pct: Math.round(((xp - from) / (to - from)) * 100) };
}

/** Uitleg voor ouders: zo verdienen de kinderen XP. */
export const XP_UITLEG: [string, string][] = [
  ["Inchecken", `${XP.inchecken} punten, één keer per dag`],
  ["Klein klusje (tafel, vaatwasser)", `${XP.klusjeKlein} punten`],
  ["Telefoon op tijd aan de lader", `${XP.telefoon} punten`],
  ["Huiswerk maken", `${XP.huiswerk} punten`],
  ["Leren volgens de planner", "10 punten per 20 minuten"],
  ["Lezen", `${XP.lezenPer10Min} punten per 10 minuten, max ${XP.lezenMaxPerDag} per dag. Boek uit: ${XP.boekUit} punten`],
  ["Oefening in de conflictcoach", `${XP.oefenscenario} punten, alleen de eerste keer`],
  ["Opdracht in het echt gedaan", `${XP.quest} punten`],
  ["Ruzie samen opgelost, of samen hulp gevraagd", `${XP.ruzieOpgelost} punten, max één keer per dag`],
];

export const DEFAULT_REWARDS = [
  { level: 2, title: "Jij kiest het toetje" },
  { level: 3, title: "Pizza-avond, jij kiest" },
  { level: 4, title: "Uitje met papa of mama" },
  { level: 5, title: "Uur extra gametijd in het weekend" },
  { level: 6, title: "Vriend blijven slapen" },
];
