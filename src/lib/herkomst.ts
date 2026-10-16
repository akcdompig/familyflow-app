import { teClaimen } from "./xp";
import type { FamilyState, XpRegel } from "./types";

/*
  Herkomst van punten: bij elke wijziging kijken we hoeveel punten iemand erbij kreeg (of kwijtraakte) en waarvoor.
  - Het puntentotaal (xp) en de claimstand (claim) blijven de bron van waarheid. Dit logboek legt alleen uit.
  - Ontbreekt de uitleg (oude punten, andere telefoon), dan zeggen we dat eerlijk: "zonder details". Niks verzinnen.
  - Een claim zet bij elke open regel het tijdstip van de claim. Daarmee is ook de historie te zien.
*/

export type Wat = string | ((wie: string) => string | undefined);

const MAX = 150;
const nieuwId = () => "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const ZONDER_DETAILS = "Eerder verdiend (zonder details)";

/** Na een wijziging: wie kreeg er punten bij of af, en waarvoor? */
export function metHerkomst(voor: FamilyState, na: FamilyState, wat?: Wat, at = new Date().toISOString()): FamilyState {
  const ids = new Set([...Object.keys(voor.xp ?? {}), ...Object.keys(na.xp ?? {})]);
  let log = na.xpLog ?? {};
  let anders = false;
  for (const id of ids) {
    const d = (na.xp?.[id] ?? 0) - (voor.xp?.[id] ?? 0);
    if (!d) continue;
    const label = (typeof wat === "function" ? wat(id) : wat) || "Overige punten";
    const lijst = [...(log[id] ?? [])];
    if (d > 0) lijst.push({ id: nieuwId(), n: d, wat: label, at });
    else haalWeg(lijst, -d, label);
    log = { ...log, [id]: lijst.slice(-MAX) };
    anders = true;
  }
  return anders ? { ...na, xpLog: log } : na;
}

/** Punten gingen eraf (afvinken ongedaan gemaakt): haal de bijbehorende open regels weg, nieuwste eerst. */
function haalWeg(lijst: XpRegel[], n: number, label: string) {
  const open = (r: XpRegel) => !r.claim;
  const precies = lijst.map((r, i) => [r, i] as const).reverse().find(([r]) => open(r) && r.wat === label && r.n === n);
  if (precies) {
    lijst.splice(precies[1], 1);
    return;
  }
  let rest = n;
  for (const voorkeur of [true, false]) {
    for (let i = lijst.length - 1; i >= 0 && rest > 0; i--) {
      const r = lijst[i];
      if (!open(r) || (voorkeur && r.wat !== label)) continue;
      if (r.n <= rest) {
        rest -= r.n;
        lijst.splice(i, 1);
      } else {
        lijst[i] = { ...r, n: r.n - rest };
        rest = 0;
      }
    }
  }
}

export interface OpenRegel {
  wat: string;
  n: number;
  keer: number;
  onbekend?: boolean;
}

/** Wat ligt er klaar om te claimen, en waarvoor? Het totaal komt altijd uit de echte puntenstand. */
export function openRegels(s: FamilyState, id: string): { totaal: number; regels: OpenRegel[] } {
  const totaal = teClaimen(s, id);
  if (!totaal) return { totaal: 0, regels: [] };
  let open = (s.xpLog?.[id] ?? []).filter((r) => !r.claim);
  // Meer uitleg dan punten (bijvoorbeeld al geclaimd op een andere telefoon): de oudste vallen af.
  while (open.length && som(open) > totaal) open = open.slice(1);
  const regels = groepeer(open);
  const gat = totaal - som(open);
  if (gat > 0) regels.unshift({ wat: ZONDER_DETAILS, n: gat, keer: 1, onbekend: true });
  return { totaal, regels };
}

const som = (l: { n: number }[]) => l.reduce((a, r) => a + r.n, 0);

/** Zelfde soort punten bij elkaar: "Water gedronken +5", "Ochtendroutine ×4 +13". */
export function groepeer(regels: XpRegel[]): OpenRegel[] {
  const uit: OpenRegel[] = [];
  for (const r of regels) {
    const g = uit.find((x) => x.wat === r.wat);
    if (g) {
      g.n += r.n;
      g.keer++;
    } else uit.push({ wat: r.wat, n: r.n, keer: 1 });
  }
  return uit.filter((r) => r.n > 0);
}

/** Bij een claim: alle open regels krijgen het tijdstip van de claim. */
export function markeerGeclaimd(s: FamilyState, id: string, at: string): FamilyState {
  const lijst = s.xpLog?.[id];
  if (!lijst?.some((r) => !r.claim)) return s;
  return { ...s, xpLog: { ...(s.xpLog ?? {}), [id]: lijst.map((r) => (r.claim ? r : { ...r, claim: at })) } };
}

/** Eerdere claims, nieuwste eerst, met waar de punten vandaan kwamen. */
export function historie(s: FamilyState, id: string, max = 10): { at: string; totaal: number; regels: OpenRegel[] }[] {
  const per = new Map<string, XpRegel[]>();
  for (const r of s.xpLog?.[id] ?? []) if (r.claim) per.set(r.claim, [...(per.get(r.claim) ?? []), r]);
  return [...per.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, max)
    .map(([at, l]) => ({ at, totaal: som(l), regels: groepeer(l) }));
}
