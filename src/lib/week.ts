import { gedragWeek } from "./gedrag";
import { dagStand } from "./groei";
import { maandag } from "./huis";
import { addDays, iso } from "./planner";
import type { FamilyState, WeekTrede } from "./types";

/*
  De week van een kind, in één kaart. Punten en geld blijven gescheiden:
  - Punten zijn voor niveau en achievements.
  - Zakgeld krijg je altijd (Nibud: zakgeld is leergeld, geen beloning of straf). De app laat het alleen zien.
  - De weekbonus komt erbovenop, in hooguit twee vaste treden (bijv. 70% → € 2,50, 85% → € 5). Geen bedrag per vinkje of
    per procent: dat leidt tot rekenen en onderhandelen. Elke week dezelfde afspraak.
  - Een ouder sluit de week af (bij het weekoverleg). Wat dan gehaald is, staat vast en verandert niet meer.
  Overgeslagen en "ging niet door" tellen niet mee. Een dag zonder iets ingevuld telt als "niet ingevuld", niet als slecht.
  3.14: staan turven en sterren aan, dan tellen ze mee in de weekscore (−5% per turf, +3% per ster). Zie gedrag.ts.
*/

export const STANDAARD_DREMPEL = 80;
export const OEFENINGEN_PER_WEEK = 3;

export interface WeekKaart {
  maandag: string;
  af: number;
  totaal: number;
  /** Weekscore: taken, plus of min turven en sterren (als die aanstaan). */
  pct: number;
  /** Alleen de taken (zonder turven en sterren). */
  takenPct: number;
  gedrag?: { turven: number; sterren: number; min: number; plus: number; extra: boolean };
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
  /** De treden van de weekbonus, van laag naar hoog. */
  treden: WeekTrede[];
  /** Hoogste trede die nu gehaald is (index in treden), of -1. */
  behaald: number;
  /** De eerstvolgende trede, en hoeveel vinkjes je daar nu nog voor nodig hebt. */
  volgende?: WeekTrede & { nog: number };
  zakgeld?: string;
  gesloten?: { gehaald: boolean; pct: number; beloning?: string; trede?: number; betaald?: string; at: string; door: string };
}

/** De treden van de weekbonus. Oude afspraak (één drempel) = één trede. Altijd gesorteerd, hooguit twee. */
export function tredenVan(s: FamilyState, id: string): WeekTrede[] {
  const a = s.weekAfspraak?.[id];
  const t = a?.treden?.length ? a.treden : [{ pct: a?.drempel ?? STANDAARD_DREMPEL, wat: a?.beloning ?? "" }];
  return [...t].filter((x) => x.pct > 0).sort((x, y) => x.pct - y.pct).slice(0, 2);
}
/** Hoeveel vinkjes nog tot dit percentage, met wat er nu in de week staat. */
export const vinkjesNodig = (af: number, totaal: number, pct: number) => Math.max(0, Math.ceil((pct / 100) * totaal - 1e-9) - af);

export const drempelVan = (s: FamilyState, id: string) => tredenVan(s, id)[0]?.pct ?? STANDAARD_DREMPEL;

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
  const takenPct = totaal ? Math.round((af / totaal) * 100) : 0;
  const gw = gedragWeek(s, id, maandagVan, vandaag);
  const delta = gw.aan ? gw.delta : 0;
  const pct = totaal ? Math.max(0, Math.min(100, takenPct + delta)) : 0;
  const drempel = drempelVan(s, id);
  const g = s.weekAfsluiting?.[id]?.[maandagVan];
  const treden = tredenVan(s, id);
  let behaald = -1;
  treden.forEach((t, i) => { if (totaal > 0 && pct >= t.pct) behaald = i; });
  const vt = treden[behaald + 1];
  return {
    maandag: maandagVan, af, totaal, pct, drempel, gehaald: behaald >= 0, dagenGoed, dagen: dagen.length,
    ...tel, oefeningen: { af: oef, doel: OEFENINGEN_PER_WEEK }, samen,
    beloning: behaald >= 0 ? treden[behaald].wat || undefined : treden[0]?.wat || undefined,
    treden, behaald,
    volgende: vt ? { ...vt, nog: vinkjesNodig(af, totaal, Math.max(0, vt.pct - delta)) } : undefined,
    takenPct,
    gedrag: gw.aan ? { turven: gw.turven, sterren: gw.sterren, min: gw.min, plus: gw.plus, extra: gw.extra } : undefined,
    zakgeld: s.weekAfspraak?.[id]?.zakgeld,
    gesloten: g ? { gehaald: g.gehaald, pct: g.pct, beloning: g.beloning, trede: g.trede, betaald: g.betaald, at: g.at, door: g.door } : undefined,
  };
}

/** Is de week van deze datum al afgesloten? Dan mag er niks meer aan veranderen. */
export const weekDicht = (s: FamilyState, id: string, d: string) => !!s.weekAfsluiting?.[id]?.[maandag(d)];

/** Hoeveel oefeningen deze week al gedaan. */
export const oefeningenDezeWeek = (s: FamilyState, id: string, nu = new Date()) => {
  const ma = maandag(iso(nu));
  return Object.entries(s.oefenDag?.[id] ?? {}).filter(([d, r]) => d >= ma && d <= iso(nu) && r.gedaan).length;
};

/** De laatste afgesloten weken van een kind (nieuwste eerst): wat er gehaald en uitbetaald is. */
export function eerdereWeken(s: FamilyState, id: string, n = 4) {
  return Object.entries(s.weekAfsluiting?.[id] ?? {})
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, n)
    .map(([maandag, w]) => ({ maandag, ...w }));
}
