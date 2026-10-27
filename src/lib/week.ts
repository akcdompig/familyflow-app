import { gedragAan, gedragWeek, turvenOp } from "./gedrag";
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
  3.23 Groene dagen. Kinderen rekenen niet in procenten maar in dagen:
  - Een dag wordt groen als je 80% van die dag doet, en er die dag geen turf is (goedgemaakt telt niet).
  - De bonus hangt aan een aantal groene dagen (bijv. 5 → € 2,50, 6 → € 5). Elke dag begint opnieuw bij 0.
  - In één keer inhalen kan dus niet: één dag alles doen is één groene dag.
  - Oude afspraken in procenten worden omgezet: 70% → 5 dagen, 80% → 6, 100% → 7 (afgerond op dagen van de week).
*/

/** Vanaf dit percentage van de dag is een dag groen. */
export const GROEN_PCT = 80;

export type DagKleur = "groen" | "bijna" | "grijs" | "leeg" | "turf" | "later";
export interface WeekDag {
  datum: string;
  /** "ma" … "zo" */
  kort: string;
  kleur: DagKleur;
  vandaag: boolean;
  af: number;
  totaal: number;
  turven: number;
  /** Alleen vandaag: hoeveel vinkjes nog voor een groene dag. */
  nogVoorGroen?: number;
}
const KORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];

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
  volgende?: WeekTrede & { nog: number; nogDagen: number };
  zakgeld?: string;
  gesloten?: { gehaald: boolean; pct: number; groen?: number; beloning?: string; trede?: number; betaald?: string; at: string; door: string };
  /** 3.23 De zeven dagen, met hun kleur. */
  week: WeekDag[];
  /** Aantal groene dagen tot nu toe. */
  groen: number;
  /** Groene dagen nodig voor de eerste bonus. */
  nodig: number;
  /** Kan de volgende bonus nog, met de dagen die over zijn? */
  haalbaar: boolean;
  /** Dagen die nog groen kunnen worden (vandaag als hij nog niet groen is, en de dagen erna). */
  over: number;
}

/** De treden van de weekbonus. Oude afspraak (één drempel) = één trede. Altijd gesorteerd, hooguit twee. */
export function tredenVan(s: FamilyState, id: string): WeekTrede[] {
  const a = s.weekAfspraak?.[id];
  const t = a?.treden?.length ? a.treden : [{ pct: a?.drempel ?? STANDAARD_DREMPEL, wat: a?.beloning ?? "" }];
  // 3.23: elke trede heeft een aantal groene dagen. Oude treden (alleen een percentage) worden omgezet.
  const metDagen = [...t].filter((x) => (x.dagen ?? x.pct) > 0).map((x) => ({ ...x, dagen: dagenVan(x) })).sort((x, y) => x.dagen - y.dagen);
  const uit: WeekTrede[] = [];
  for (const x of metDagen) {
    if (uit.length === 2) break;
    const vorige = uit[uit.length - 1];
    if (vorige && x.dagen <= vorige.dagen!) {
      if (vorige.dagen! >= 7) continue;
      uit.push({ ...x, dagen: vorige.dagen! + 1 });
    } else uit.push(x);
  }
  return uit;
}
/** Groene dagen voor een trede. Oude afspraak in procenten: zoveel procent van 7 dagen, afgerond. */
export const dagenVan = (t: WeekTrede) => Math.max(1, Math.min(7, t.dagen ?? Math.round((t.pct * 7) / 100)));
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
  // 3.23: de weekscore in procenten is alleen nog info voor ouders (taken samen). De bonus gaat op groene dagen.
  const pct = takenPct;
  const drempel = drempelVan(s, id);
  const g = s.weekAfsluiting?.[id]?.[maandagVan];
  const treden = tredenVan(s, id);
  const week = weekDagen(s, id, maandagVan, vandaag);
  const groen = week.filter((d) => d.kleur === "groen").length;
  const over = week.filter((d) => d.kleur === "later" || (d.vandaag && d.kleur !== "groen" && d.kleur !== "turf")).length;
  let behaald = -1;
  treden.forEach((t, i) => { if (groen >= t.dagen!) behaald = i; });
  const vt = treden[behaald + 1];
  const nogDagen = vt ? Math.max(0, vt.dagen! - groen) : 0;
  return {
    week, groen, nodig: treden[0]?.dagen ?? 6, over, haalbaar: !vt || nogDagen <= over,
    maandag: maandagVan, af, totaal, pct, drempel, gehaald: behaald >= 0, dagenGoed: groen, dagen: dagen.length,
    ...tel, oefeningen: { af: oef, doel: OEFENINGEN_PER_WEEK }, samen,
    beloning: behaald >= 0 ? treden[behaald].wat || undefined : treden[0]?.wat || undefined,
    treden, behaald,
    volgende: vt ? { ...vt, nog: vinkjesNodig(af, totaal, vt.pct), nogDagen } : undefined,
    takenPct,
    gedrag: gw.aan ? { turven: gw.turven, sterren: gw.sterren, min: gw.min, plus: gw.plus, extra: gw.extra } : undefined,
    zakgeld: s.weekAfspraak?.[id]?.zakgeld,
    gesloten: g ? { gehaald: g.gehaald, pct: g.pct, groen: g.groen, beloning: g.beloning, trede: g.trede, betaald: g.betaald, at: g.at, door: g.door } : undefined,
  };
}

/** De zeven dagen van een week met hun kleur. Een turf maakt een dag niet groen (als turven aanstaan). */
export function weekDagen(s: FamilyState, id: string, maandagVan: string, vandaag: string): WeekDag[] {
  const metTurven = gedragAan(s, id);
  return KORT.map((kort, i) => {
    const datum = addDays(maandagVan, i);
    const isVandaag = datum === vandaag;
    if (datum > vandaag) return { datum, kort, kleur: "later" as DagKleur, vandaag: false, af: 0, totaal: 0, turven: 0 };
    const st = dagStand(s, id, datum);
    const turven = metTurven ? turvenOp(s, id, datum) : 0;
    const p = st.totaal ? (st.af / st.totaal) * 100 : 0;
    const kleur: DagKleur = turven > 0 ? "turf" : st.totaal && p >= GROEN_PCT ? "groen" : st.stand === "leeg" ? "leeg" : p >= 50 ? "bijna" : "grijs";
    const nog = isVandaag && kleur !== "groen" && kleur !== "turf" ? vinkjesNodig(st.af, st.totaal, GROEN_PCT) : undefined;
    return { datum, kort, kleur, vandaag: isVandaag, af: st.af, totaal: st.totaal, turven, ...(nog !== undefined ? { nogVoorGroen: nog } : {}) };
  });
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
