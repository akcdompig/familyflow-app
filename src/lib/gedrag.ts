import { maandag } from "./huis";
import { addDays, iso } from "./planner";
import type { FamilyState, GedragAfspraak, Turf } from "./types";

/*
  Turven en sterren (3.14). Afgesproken met de ouders, voor elk kind hetzelfde:
  - Een turf is een afgesproken regel die niet gehaald is (niet komen als je geroepen wordt, te laat boven, niet gedoucht,
    eten na de afgesproken tijd, telefoon niet op tijd aan de lader). Liegen telt als 2 turven. Alleen ouders zetten een turf.
  - Gevolg, voorspelbaar en vooraf bekend:
      morgen minder scherm: 1 turf 15 min, 2 turven 30 min, 3 of meer geen scherm in de avond;
      weekscore: −5% per turf, hooguit −15% per dag.
  - Een dag zonder turf is een ster: +3% op de weekscore. 6 of 7 sterren in een week: een extra beloning.
  - Eén turf per week mag een kind goedmaken (sorry + een extra klus). Een ouder zet hem dan op "goedgemaakt".
  - Elke dag begint opnieuw. Zakgeld blijft altijd staan. Kinderen zien alleen hun eigen turven en sterren.
*/

export const PER_TURF = 5;
export const PER_STER = 3;
export const MAX_TURVEN_PER_DAG = 3;
export const STERREN_VOOR_EXTRA = 6;
export const STANDAARD_AVOND = { snack: "19:30", douchen: "20:00", lader: "20:30" };

export const afspraakVan = (s: FamilyState, id: string): GedragAfspraak | undefined => s.gedragAfspraak?.[id];
export const gedragAan = (s: FamilyState, id: string) => !!afspraakVan(s, id);
export const avondVan = (s: FamilyState, id: string) => ({ ...STANDAARD_AVOND, ...(afspraakVan(s, id)?.avond ?? {}) });

/** De redenen om uit te kiezen, met de avondtijden van dit kind erin. */
export function redenen(s: FamilyState, id: string): { tekst: string; n: 1 | 2 }[] {
  const a = avondVan(s, id);
  return [
    { tekst: "Niet gekomen toen we riepen", n: 1 },
    { tekst: `Te laat naar boven (${a.douchen})`, n: 1 },
    { tekst: "Niet gedoucht", n: 1 },
    { tekst: `Eten na ${a.snack}`, n: 1 },
    { tekst: `Telefoon niet om ${a.lader} aan de lader`, n: 1 },
    { tekst: "Gelogen", n: 2 },
  ];
}

const telt = (t: Turf) => !t.weg;
export const turvenVan = (s: FamilyState, id: string) => s.gedrag?.[id] ?? [];
/** Turven op een dag (liegen telt dubbel), zonder wat goedgemaakt is. */
export const turvenOp = (s: FamilyState, id: string, d: string) => turvenVan(s, id).filter((t) => t.datum === d && telt(t)).reduce((a, t) => a + t.n, 0);

/** Een ster: de dag is voorbij, turven en sterren stonden al aan, en er was geen turf. */
export function sterOp(s: FamilyState, id: string, d: string, vandaag = iso(new Date())): boolean {
  const a = afspraakVan(s, id);
  return !!a && d >= a.sinds && d < vandaag && turvenOp(s, id, d) === 0;
}

/** Wat turven en sterren deze week doen met de weekscore. */
export function gedragWeek(s: FamilyState, id: string, maandagVan: string, vandaag = iso(new Date())) {
  const dagen = Array.from({ length: 7 }, (_, i) => addDays(maandagVan, i)).filter((d) => d <= vandaag);
  let turven = 0, sterren = 0, min = 0;
  for (const d of dagen) {
    const n = turvenOp(s, id, d);
    turven += n;
    min += Math.min(n, MAX_TURVEN_PER_DAG) * PER_TURF;
    if (sterOp(s, id, d, vandaag)) sterren++;
  }
  const plus = sterren * PER_STER;
  return { aan: gedragAan(s, id), turven, sterren, min, plus, delta: plus - min, extra: sterren >= STERREN_VOOR_EXTRA };
}

/** Minder scherm vandaag, door turven van gisteren. */
export function schermStraf(s: FamilyState, id: string, d = iso(new Date())): { turven: number; min: number; geenAvond: boolean } {
  const turven = gedragAan(s, id) ? turvenOp(s, id, addDays(d, -1)) : 0;
  return { turven, min: turven >= MAX_TURVEN_PER_DAG ? 0 : turven * 15, geenAvond: turven >= MAX_TURVEN_PER_DAG };
}
export const strafZin = (x: { min: number; geenAvond: boolean }) => (x.geenAvond ? "geen scherm in de avond" : x.min ? `${x.min} minuten minder scherm` : "");

/** Mag er deze week nog een turf goedgemaakt worden? Eén per week. */
export const magGoedmaken = (s: FamilyState, id: string, d: string) => !turvenVan(s, id).some((t) => t.weg && maandag(t.datum) === maandag(d));
