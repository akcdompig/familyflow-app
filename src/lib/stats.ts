/*
  "Wie doet wat": rekent uit de afgevinkte taken (state.done) hoeveel tijd ieder gezinslid ergens aan besteedt.
  Werk telt mee voor hoe druk iemand is, maar niet voor de verdeling van het huishouden.
*/

import { taakInfo } from "./catalog";
import { addDays, iso } from "./planner";
import type { FamilyState, TaakCat } from "./types";

export type Periode = "week" | "vorigeweek" | "maand";

export function bereik(p: Periode, nu = new Date()): { van: string; tot: string; label: string } {
  const t = iso(nu);
  const ma = addDays(t, -((nu.getDay() + 6) % 7));
  if (p === "week") return { van: ma, tot: addDays(ma, 6), label: "Deze week" };
  if (p === "vorigeweek") return { van: addDays(ma, -7), tot: addDays(ma, -1), label: "Vorige week" };
  const van = t.slice(0, 8) + "01";
  const volgende = new Date(nu.getFullYear(), nu.getMonth() + 1, 1, 12);
  return { van, tot: addDays(iso(volgende), -1), label: "Deze maand" };
}

export interface LidStats {
  id: string;
  min: number; // alles behalve werk
  werk: number;
  aantal: number;
  xp: number;
  perCat: Record<TaakCat, number>;
  perDag: Record<string, number>; // incl. werk
  top: { title: string; min: number; keer: number }[];
}

const leeg = (): Record<TaakCat, number> => ({ huishouden: 0, kinderen: 0, school: 0, sport: 0, werk: 0, overig: 0 });

export function statsVoor(state: FamilyState, van: string, tot: string): LidStats[] {
  const map = new Map<string, LidStats>();
  for (const m of state.members) map.set(m.id, { id: m.id, min: 0, werk: 0, aantal: 0, xp: 0, perCat: leeg(), perDag: {}, top: [] });
  const tops = new Map<string, Map<string, { min: number; keer: number }>>();
  const taken = new Map(state.tasks.map((t) => [t.id, t]));
  for (const [dag, lijst] of Object.entries(state.done)) {
    if (dag < van || dag > tot) continue;
    for (const [taskId, wie] of Object.entries(lijst)) {
      const t = taken.get(taskId);
      const s = map.get(wie);
      if (!t || !s) continue;
      const { cat, min } = taakInfo(t);
      s.perCat[cat] += min;
      s.perDag[dag] = (s.perDag[dag] ?? 0) + min;
      s.aantal++;
      s.xp += t.xp ?? 0;
      if (cat === "werk") s.werk += min;
      else s.min += min;
      const tm = tops.get(wie) ?? new Map();
      const cur = tm.get(t.title) ?? { min: 0, keer: 0 };
      tm.set(t.title, { min: cur.min + min, keer: cur.keer + 1 });
      tops.set(wie, tm);
    }
  }
  for (const [wie, tm] of tops) {
    const s = map.get(wie)!;
    s.top = [...tm.entries()].map(([title, v]) => ({ title, ...v })).sort((a, b) => b.min - a.min).slice(0, 5);
  }
  return [...map.values()];
}

/** Aandeel in het huishouden (0–1) per lid. */
export function huishoudAandeel(stats: LidStats[]): Record<string, number> {
  const totaal = stats.reduce((a, s) => a + s.perCat.huishouden, 0);
  return Object.fromEntries(stats.map((s) => [s.id, totaal ? s.perCat.huishouden / totaal : 0]));
}

/** Minuten per week voor de laatste n weken (oud → nieuw), voor één lid. */
export function trend(state: FamilyState, id: string, n = 6, nu = new Date()): { label: string; min: number; werk: number }[] {
  const ma = addDays(iso(nu), -((nu.getDay() + 6) % 7));
  return Array.from({ length: n }, (_, i) => {
    const van = addDays(ma, -7 * (n - 1 - i));
    const s = statsVoor(state, van, addDays(van, 6)).find((x) => x.id === id)!;
    return { label: `${Number(van.slice(8))}/${Number(van.slice(5, 7))}`, min: s.min, werk: s.werk };
  });
}

const uren = (m: number) => (m >= 60 ? `${Math.round((m / 60) * 10) / 10} uur` : `${m} min`);
export { uren };

/** Eén tip van de coach, vriendelijk en zonder te wijzen. */
export function coachTip(state: FamilyState, stats: LidStats[]): string | null {
  const naam = (id: string) => state.members.find((m) => m.id === id)?.name ?? "";
  const aandeel = huishoudAandeel(stats);
  const totaalHuis = stats.reduce((a, s) => a + s.perCat.huishouden, 0);
  if (totaalHuis < 60) return "Vink deze week ook huishoudtaken af, zoals koken, de was en stofzuigen. Dan ziet iedereen hoe het werk verdeeld is.";
  const [top] = [...stats].sort((a, b) => b.perCat.huishouden - a.perCat.huishouden);
  const drukste = [...stats].sort((a, b) => b.min + b.werk - (a.min + a.werk))[0];
  const kids = stats.filter((s) => state.members.find((m) => m.id === s.id)?.role !== "ouder");
  if (aandeel[top.id] >= 0.7) {
    const kidsHuis = kids.reduce((a, s) => a + s.perCat.huishouden, 0);
    return `${naam(top.id)} doet ${Math.round(aandeel[top.id] * 100)}% van het huishouden. ${kidsHuis < 60 && kids.length ? "Kinderen, kies samen twee vaste taakjes voor deze week, zoals tafel dekken of de vaatwasser." : "Wie neemt deze week het koken of de was een keer over?"}`;
  }
  if (drukste && drukste.werk > 0 && drukste.id === top.id) return `${naam(drukste.id)} heeft het druk met werk én thuis. Een kleine verrassing helpt: neem ongevraagd één taak over.`;
  const lui = kids.find((k) => k.perCat.huishouden === 0);
  if (lui) return `${naam(lui.id)} heeft deze periode nog geen huishoudtaak gedaan. Begin klein: één taakje van 5 minuten per dag.`;
  return "Mooi verdeeld! Bespreek bij het gezinsoverleg wat goed ging en wie volgende week iets nieuws probeert.";
}
