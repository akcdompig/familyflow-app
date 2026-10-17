import { dagStand } from "./groei";
import { maandag } from "./huis";
import { addDays, iso } from "./planner";
import type { FamilyState } from "./types";

/*
  De week van een kind, in één kaart. Punten en geld blijven gescheiden:
  - Punten zijn voor niveau en achievements.
  - De weekafspraak (vooraf, door een ouder) zegt vanaf welk percentage de week "gehaald" is en wat daar tegenover staat.
    Geen bedrag per vinkje, geen bonus, niks om over te onderhandelen: elke week dezelfde afspraak.
  - Een ouder sluit de week af (bij het weekoverleg). Wat dan gehaald is, staat vast en verandert niet meer.
  Overgeslagen en "ging niet door" tellen niet mee. Een dag zonder iets ingevuld telt als "niet ingevuld", niet als slecht.
*/

export const STANDAARD_DREMPEL = 80;
export const OEFENINGEN_PER_WEEK = 3;

export interface WeekKaart {
  maandag: string;
  af: number;
  totaal: number;
  pct: number;
  drempel: number;
  gehaald: boolean;
  /** Dagen waarop 80% of meer af was. */
  dagenGoed: number;
  /** Dagen die al voorbij zijn of vandaag (max 7). */
  dagen: number;
  huistaken: { af: number; totaal: number };
  taken: { af: number; totaal: number };
  routine: { af: number; totaal: number };
  oefeningen: { af: number; doel: number };
  samen: number;
  beloning?: string;
  gesloten?: { gehaald: boolean; pct: number; beloning?: string; at: string; door: string };
}

export const drempelVan = (s: FamilyState, id: string) => s.weekAfspraak?.[id]?.drempel ?? STANDAARD_DREMPEL;

export function weekKaart(s: FamilyState, id: string, nu = new Date(), maandagVan = maandag(iso(nu))): WeekKaart {
  const vandaag = iso(nu);
  const dagen: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(maandagVan, i);
    if (d <= vandaag) dagen.push(d);
  }
  let af = 0, totaal = 0, dagenGoed = 0;
  const tel = { huistaken: { af: 0, totaal: 0 }, taken: { af: 0, totaal: 0 }, routine: { af: 0, totaal: 0 } };
  for (const d of dagen) {
    const st = dagStand(s, id, d);
    af += st.af;
    totaal += st.totaal;
    if (st.totaal && st.af / st.totaal >= 0.8) dagenGoed++;
    for (const x of st.items) {
      if (x.status) continue;
      const vak = x.soort === "klus" ? tel.huistaken : x.soort === "taak" ? tel.taken : x.soort === "routine" ? tel.routine : null;
      if (!vak) continue;
      vak.totaal++;
      if (x.klaar) vak.af++;
    }
  }
  const oef = Object.entries(s.oefenDag?.[id] ?? {}).filter(([d, r]) => dagen.includes(d) && r.gedaan).length;
  const samen = (s.samen ?? []).filter((x) => x.gedaan && (x.deden ?? x.wie).includes(id) && dagen.includes(iso(new Date(x.gedaan)))).length;
  const pct = totaal ? Math.round((af / totaal) * 100) : 0;
  const drempel = drempelVan(s, id);
  const g = s.weekAfsluiting?.[id]?.[maandagVan];
  return {
    maandag: maandagVan, af, totaal, pct, drempel, gehaald: totaal > 0 && pct >= drempel, dagenGoed, dagen: dagen.length,
    ...tel, oefeningen: { af: oef, doel: OEFENINGEN_PER_WEEK }, samen,
    beloning: s.weekAfspraak?.[id]?.beloning,
    gesloten: g ? { gehaald: g.gehaald, pct: g.pct, beloning: g.beloning, at: g.at, door: g.door } : undefined,
  };
}

/** Is de week van deze datum al afgesloten? Dan mag er niks meer aan veranderen. */
export const weekDicht = (s: FamilyState, id: string, d: string) => !!s.weekAfsluiting?.[id]?.[maandag(d)];

/** Hoeveel oefeningen deze week al gedaan. */
export const oefeningenDezeWeek = (s: FamilyState, id: string, nu = new Date()) => {
  const ma = maandag(iso(nu));
  return Object.entries(s.oefenDag?.[id] ?? {}).filter(([d, r]) => d >= ma && d <= iso(nu) && r.gedaan).length;
};
