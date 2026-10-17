import { SCENARIOS, type Scenario } from "./scenarios";
import type { FamilyState } from "./types";

/*
  Oefening van vandaag: elke dag één korte oefening (± 2 minuten) per kind.
  - Keuze: wat je de afgelopen 7 dagen niet deed, het liefst iets wat je nog nooit deed. Voor elke dag vast (zelfde dag = zelfde oefening).
  - Telt pas als je hem afmaakt en op "Oefening klaar" tikt. Alleen openen telt niet.
  - Eén keer per dag punten. Per ongeluk? "Ongedaan maken" haalt de registratie en de punten weer weg.
  - Een gemiste dag wordt nooit achteraf ingevuld en kost niks.
*/

export interface DagOefening {
  oefening: number;
  gedaan?: string;
  /** Hoeveel punten deze voltooiing gaf, zodat terugdraaien precies klopt. */
  xp?: number;
  /** De eerste keer ooit deze oefening (dan ook de eenmalige bonus). */
  eerste?: boolean;
}

export const DAG_OEFENING_XP = 5;
export const DUUR = "± 2 minuten";

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Welke oefening staat er vandaag klaar voor dit kind? */
export function oefeningVanVandaag(s: FamilyState, id: string, d: string): Scenario {
  const al = s.oefenDag?.[id]?.[d];
  if (al) return SCENARIOS.find((x) => x.id === al.oefening) ?? SCENARIOS[0];
  const log = s.oefenDag?.[id] ?? {};
  const laatst = new Map<number, string>();
  for (const [dag, r] of Object.entries(log)) if (r.gedaan && dag < d && (laatst.get(r.oefening) ?? "") < dag) laatst.set(r.oefening, dag);
  const gespeeld = new Set(s.played?.[id] ?? []);
  const grens = new Date(new Date(d + "T12:00:00").getTime() - 7 * 864e5).toLocaleDateString("sv-SE");
  const vrij = SCENARIOS.filter((x) => (laatst.get(x.id) ?? "") < grens);
  const nooit = vrij.filter((x) => !gespeeld.has(x.id) && !laatst.has(x.id));
  const pool = nooit.length ? nooit : vrij.length ? vrij : SCENARIOS;
  return pool[hash(id + d) % pool.length];
}

export const gedaanVandaag = (s: FamilyState, id: string, d: string) => s.oefenDag?.[id]?.[d]?.gedaan;
