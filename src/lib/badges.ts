/*
  Achievements: dingen die kinderen niet vanzelf doen, maar wel moeten leren. Koken, klussen, ramen lappen, water drinken.
  Je haalt ze door het gewoon te doen. Het hele gezin ziet het: "Kian heeft Huisheld gehaald!"
  De meeste kun je elke week opnieuw halen ("Khloe is wéér Masterchef").
  Geen geluk of gokken: alleen wat je echt gedaan hebt telt.
*/

import { DOEL, ROUTINE } from "./dag";
import { addDays, iso } from "./planner";
import type { FamilyState } from "./types";

export interface BadgeDef {
  id: string;
  naam: string;
  emoji: string;
  /** Wat je ervoor moest doen, voor in de viering. */
  uitleg: string;
  /** Na hoeveel dagen kun je hem opnieuw halen? 0 = één keer. */
  herhaal: number;
  punten: number;
  /** Hoe ver ben je, en wat is het doel? `sinds` = alleen tellen vanaf dit moment (na de vorige keer). */
  stand: (s: FamilyState, id: string, sinds: number, nu: Date) => { n: number; doel: number };
}

const DAG = 864e5;
const klussenVan = (s: FamilyState, id: string, sinds: number, filter?: (klus: string) => boolean) =>
  (s.klusLog ?? []).filter((k) => k.by === id && new Date(k.at).getTime() > sinds && (!filter || filter(k.klus))).length;
const dagenTerug = (nu: Date, n: number) => Array.from({ length: n }, (_, i) => addDays(iso(nu), -i));
const naSinds = (d: string, sinds: number) => new Date(d + "T23:59:59").getTime() > sinds;

export const BADGES: BadgeDef[] = [
  {
    id: "huisheld", naam: "Huisheld", emoji: "🏠", uitleg: "10 klussen gedaan in een week", herhaal: 7, punten: 30,
    stand: (s, id, sinds, nu) => ({ n: klussenVan(s, id, Math.max(sinds, nu.getTime() - 7 * DAG)), doel: 10 }),
  },
  {
    id: "masterchef", naam: "Masterchef", emoji: "👨‍🍳", uitleg: "3 keer gekookt in een week", herhaal: 7, punten: 30,
    stand: (s, id, sinds, nu) => ({ n: dagenTerug(nu, 7).filter((d) => naSinds(d, sinds) && s.koken?.[d]?.kok === id).length, doel: 3 }),
  },
  {
    id: "shine", naam: "Altijd shinen", emoji: "✨", uitleg: "De ramen gelapt", herhaal: 14, punten: 25,
    stand: (s, id, sinds) => ({ n: klussenVan(s, id, sinds, (k) => k === "ramen"), doel: 1 }),
  },
  {
    id: "stofzuiger", naam: "Stofzuigerkampioen", emoji: "🧹", uitleg: "5 keer gestofzuigd in twee weken", herhaal: 14, punten: 25,
    stand: (s, id, sinds, nu) => ({ n: klussenVan(s, id, Math.max(sinds, nu.getTime() - 14 * DAG), (k) => k === "stofzuigen"), doel: 5 }),
  },
  {
    id: "koelkast", naam: "Koelkastheld", emoji: "🧊", uitleg: "5 keer de restjes in de koelkast gezet", herhaal: 14, punten: 20,
    stand: (s, id, sinds, nu) => ({ n: klussenVan(s, id, Math.max(sinds, nu.getTime() - 14 * DAG), (k) => k === "koelkast"), doel: 5 }),
  },
  {
    id: "vroege-vogel", naam: "Vroege vogel", emoji: "🌅", uitleg: "5 dagen op rij je hele ochtendroutine", herhaal: 7, punten: 30,
    stand: (s, id, sinds, nu) => {
      let n = 0;
      for (const d of dagenTerug(nu, 10)) {
        if (!naSinds(d, sinds)) break;
        const r = s.dag?.[d]?.[id]?.routine ?? [];
        if (ROUTINE.filter((x) => x.gewicht > 0).every((x) => r.includes(x.id))) n++;
        else if (d !== iso(nu)) break;
      }
      return { n, doel: 5 };
    },
  },
  {
    id: "waterheld", naam: "Waterheld", emoji: "💧", uitleg: "5 dagen genoeg water gedronken in een week", herhaal: 7, punten: 25,
    stand: (s, id, sinds, nu) => ({ n: dagenTerug(nu, 7).filter((d) => naSinds(d, sinds) && (s.dag?.[d]?.[id]?.water ?? 0) >= DOEL.water).length, doel: 5 }),
  },
  {
    id: "fruitfan", naam: "Fruitfan", emoji: "🍎", uitleg: "5 dagen je 2 stuks fruit gegeten in een week", herhaal: 7, punten: 25,
    stand: (s, id, sinds, nu) => ({ n: dagenTerug(nu, 7).filter((d) => naSinds(d, sinds) && (s.dag?.[d]?.[id]?.fruit ?? 0) >= DOEL.fruit).length, doel: 5 }),
  },
  {
    id: "samen-sterk", naam: "Samen sterk", emoji: "💞", uitleg: "3 keer iets samen gedaan in twee weken", herhaal: 14, punten: 25,
    stand: (s, id, sinds, nu) => ({ n: (s.samen ?? []).filter((x) => x.gedaan && x.wie.includes(id) && new Date(x.gedaan).getTime() > Math.max(sinds, nu.getTime() - 14 * DAG)).length, doel: 3 }),
  },
  {
    id: "spaarder", naam: "Spaarkampioen", emoji: "🐷", uitleg: "€ 5 bijgedragen aan het gezinspotje", herhaal: 30, punten: 25,
    stand: (s, id, sinds) => ({
      n: Math.floor((s.pot?.items ?? []).filter((x) => x.soort !== "uitgave" && (x.voor ?? x.by) === id && new Date(x.at).getTime() > sinds).reduce((a, x) => a + x.cents, 0) / 100),
      doel: 5,
    }),
  },
];

export const badgeDef = (id: string) => BADGES.find((b) => b.id === id);

/** Wanneer haalde dit lid deze badge voor het laatst? */
function laatsteKeer(s: FamilyState, who: string, badge: string): number {
  return (s.badges ?? []).filter((b) => b.who === who && b.badge === badge).reduce((a, b) => Math.max(a, new Date(b.at).getTime()), 0);
}
/** Tellen vanaf de vorige keer, en nooit van voor de start van de achievements (anders komen ze allemaal tegelijk). */
const vanaf = (s: FamilyState, vorige: number) => Math.max(vorige, s.badgesStart ? new Date(s.badgesStart).getTime() : 0);

/** Welke badges zijn er nu net gehaald? */
export function nieuweBadges(s: FamilyState, nu = new Date()): { who: string; def: BadgeDef }[] {
  const out: { who: string; def: BadgeDef }[] = [];
  for (const m of s.members) {
    if (m.joined === false) continue;
    for (const def of BADGES) {
      const vorige = laatsteKeer(s, m.id, def.id);
      if (vorige && (!def.herhaal || nu.getTime() - vorige < def.herhaal * DAG)) continue;
      const st = def.stand(s, m.id, vanaf(s, vorige), nu);
      if (st.n >= st.doel) out.push({ who: m.id, def });
    }
  }
  return out;
}

/** Waar ben je bijna? Voor "nog 2 klussen tot Huisheld". */
export function bijna(s: FamilyState, id: string, nu = new Date()) {
  return BADGES.map((def) => {
    const vorige = laatsteKeer(s, id, def.id);
    const wacht = vorige && def.herhaal && nu.getTime() - vorige < def.herhaal * DAG;
    const st = def.stand(s, id, vanaf(s, vorige), nu);
    return { def, ...st, wacht: !!wacht, gehaald: (s.badges ?? []).filter((b) => b.who === id && b.badge === def.id).length };
  }).filter((x) => !x.wacht && x.n > 0 && x.n < x.doel).sort((a, b) => b.n / b.doel - a.n / a.doel);
}
