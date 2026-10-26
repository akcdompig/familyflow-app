import { werkOp } from "./huis";
import { addDays, iso } from "./planner";
import { duur } from "./stats";
import type { FamilyState } from "./types";

/*
  3.22 Mijn geld. Een eigen geldoverzicht per kind. Geen bank, geen echte betalingen: de ouder is de bank.
  Doel: de waarde van geld leren. Geld komt binnen (zakgeld, loon uit een bijbaan, weekbonus, extra klus, cadeau)
  en gaat eraf als je iets koopt. Bedragen in centen. Wat je koopt, zie je ook in uren werk.
  Zakgeld hoeft niemand in te voeren: het komt elke week of maand vanzelf binnen (afgeleid, niet opgeslagen).
*/

export type GeldSoort = "zakgeld" | "loon" | "bonus" | "klus" | "cadeau" | "anders" | "uitgave";
export type UitgaveCat = "eten" | "kleding" | "gamen" | "uitgaan" | "telefoon" | "vervoer" | "cadeau" | "sparen" | "anders";

export interface GeldPost {
  id: string;
  datum: string;
  /** Positief = erbij, negatief = eraf. */
  cents: number;
  soort: GeldSoort;
  wat: string;
  cat?: UitgaveCat;
  /** Wie het invoerde. */
  door: string;
  at: string;
}

export interface Zakgeld {
  cents: number;
  per: "week" | "maand";
  /** Vanaf deze dag. Week: elke maandag. Maand: elke 1e. */
  vanaf: string;
}

export interface Geld {
  posten: GeldPost[];
  zakgeld?: Zakgeld;
  doel?: { wat: string; cents: number };
}

export const IN_SOORTEN: { id: Exclude<GeldSoort, "uitgave" | "zakgeld">; label: string; emoji: string }[] = [
  { id: "loon", label: "Loon van mijn bijbaan", emoji: "💼" },
  { id: "cadeau", label: "Cadeau (verjaardag, opa en oma)", emoji: "🎁" },
  { id: "klus", label: "Extra klus (betaald)", emoji: "🧽" },
  { id: "bonus", label: "Weekbonus", emoji: "🏁" },
  { id: "anders", label: "Iets anders", emoji: "➕" },
];

export const CATS: { id: UitgaveCat; label: string; emoji: string }[] = [
  { id: "eten", label: "Eten en drinken", emoji: "🍟" },
  { id: "kleding", label: "Kleding en schoenen", emoji: "👟" },
  { id: "gamen", label: "Gamen en apps", emoji: "🎮" },
  { id: "uitgaan", label: "Uitgaan en vrienden", emoji: "🎉" },
  { id: "telefoon", label: "Telefoon", emoji: "📱" },
  { id: "vervoer", label: "Vervoer", emoji: "🚌" },
  { id: "cadeau", label: "Cadeau voor iemand", emoji: "🎁" },
  { id: "anders", label: "Iets anders", emoji: "🛍️" },
];

export const SOORT_EMOJI: Record<GeldSoort, string> = { zakgeld: "💰", loon: "💼", bonus: "🏁", klus: "🧽", cadeau: "🎁", anders: "➕", uitgave: "🛍️" };

/** Bruto minimumuurloon per 1 juli 2026 (Rijksoverheid, via ondernemenmetpersoneel.nl). 19 en 20 staan er niet bij. */
export const MINIMUMLOON: Record<number, number> = { 15: 450, 16: 517, 17: 592, 18: 750, 21: 1499 };
export const minimumloonVoor = (age?: number) => (age === undefined ? undefined : age >= 21 ? MINIMUMLOON[21] : MINIMUMLOON[age]);

export const euro = (cents: number, teken = false) => {
  const t = (Math.abs(cents) / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${cents < 0 ? "− " : teken && cents > 0 ? "+ " : ""}€ ${t}`;
};

/** "12,50", "€ 5", "5 euro", "2.50" → centen. Niks herkenbaars → undefined. */
export function parseEuro(tekst: string | undefined): number | undefined {
  if (!tekst) return undefined;
  const t = tekst.trim();
  const m = t.match(/(\d{1,5})(?:[.,](\d{1,2}))?/);
  if (!m) return undefined;
  if (!/€|euro/i.test(t) && !/^\d{1,5}([.,]\d{1,2})?$/.test(t)) return undefined;
  const c = Number(m[1]) * 100 + (m[2] ? Number(m[2].padEnd(2, "0")) : 0);
  return c > 0 ? c : undefined;
}

/** Zakgeld als posten, van `vanaf` tot en met `tot`. Afgeleid: niemand hoeft het in te voeren. */
export function zakgeldPosten(z: Zakgeld | undefined, tot: string): GeldPost[] {
  if (!z || z.cents <= 0) return [];
  const uit: GeldPost[] = [];
  let d = z.vanaf;
  // Eerste betaaldag op of na vanaf.
  if (z.per === "week") while (new Date(d + "T12:00:00").getDay() !== 1) d = addDays(d, 1);
  else if (d.slice(8) !== "01") d = volgendeMaand(d);
  for (let i = 0; d <= tot && i < 600; i++) {
    uit.push({ id: `zg:${d}`, datum: d, cents: z.cents, soort: "zakgeld", wat: z.per === "week" ? `Zakgeld week van ${new Date(d + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}` : `Zakgeld ${new Date(d + "T12:00:00").toLocaleDateString("nl-NL", { month: "long" })}`, door: "", at: d + "T07:00:00" });
    d = z.per === "week" ? addDays(d, 7) : volgendeMaand(d);
  }
  return uit;
}
const volgendeMaand = (d: string) => {
  const [y, m] = d.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
};

/** Alle posten van iemand, nieuwste eerst (inclusief zakgeld tot vandaag). */
export function posten(s: FamilyState, id: string, nu = new Date()): GeldPost[] {
  const g = s.geld?.[id];
  if (!g) return [];
  return [...g.posten, ...zakgeldPosten(g.zakgeld, iso(nu))].sort((a, b) => b.datum.localeCompare(a.datum) || b.at.localeCompare(a.at));
}

export const saldo = (s: FamilyState, id: string, nu = new Date()) => posten(s, id, nu).reduce((a, p) => a + p.cents, 0);

/** In en uit in een maand ("2026-10"), plus uitgaven per categorie (grootste eerst). */
export function maand(s: FamilyState, id: string, ym: string, nu = new Date()) {
  const lijst = posten(s, id, nu).filter((p) => p.datum.startsWith(ym));
  const inn = lijst.filter((p) => p.cents > 0).reduce((a, p) => a + p.cents, 0);
  const uit = -lijst.filter((p) => p.cents < 0).reduce((a, p) => a + p.cents, 0);
  const per: Partial<Record<UitgaveCat, number>> = {};
  for (const p of lijst) if (p.cents < 0) per[p.cat ?? "anders"] = (per[p.cat ?? "anders"] ?? 0) - p.cents;
  const cats = (Object.entries(per) as [UitgaveCat, number][]).sort((a, b) => b[1] - a[1]);
  return { inn, uit, cats, posten: lijst };
}

/** Gemiddeld per week erbij (min eraf), over de laatste 4 weken. */
export function tempo(s: FamilyState, id: string, nu = new Date()): number {
  const van = addDays(iso(nu), -27);
  const netto = posten(s, id, nu).filter((p) => p.datum >= van).reduce((a, p) => a + p.cents, 0);
  return Math.round(netto / 4);
}

/** Hoe staat het spaardoel ervoor? Weken = bij het huidige tempo (als dat positief is). */
export function doelStand(s: FamilyState, id: string, nu = new Date()) {
  const d = s.geld?.[id]?.doel;
  if (!d || d.cents <= 0) return null;
  const heb = Math.max(0, saldo(s, id, nu));
  const nog = Math.max(0, d.cents - heb);
  const t = tempo(s, id, nu);
  return { ...d, heb, nog, pct: Math.min(100, Math.round((heb / d.cents) * 100)), weken: nog === 0 ? 0 : t > 0 ? Math.ceil(nog / t) : undefined };
}

/**
  Gewerkt met een uurloon, tussen twee dagen (tot en met). Vast werk en diensten, vrije dagen niet.
  Vandaag telt pas als de dienst voorbij is. Geeft minuten en het bruto loon per werk.
*/
export function gewerkt(s: FamilyState, id: string, van: string, tot: string, nu = new Date()) {
  const vandaag = iso(nu);
  const klok = nu.toTimeString().slice(0, 5);
  const per = new Map<string, { naam: string; uurloon: number; minuten: number }>();
  for (let d = van; d <= tot && d <= vandaag; d = addDays(d, 1)) {
    for (const w of werkOp(s, id, d)) {
      const uurloon = w.werk.uurloon;
      if (!uurloon || w.vrij) continue;
      if (d === vandaag && w.tot > w.van && w.tot > klok) continue;
      const r = per.get(w.werk.id) ?? { naam: w.werk.naam, uurloon, minuten: 0 };
      r.minuten += duur(w.van, w.tot);
      per.set(w.werk.id, r);
    }
  }
  const lijst = [...per.values()].map((r) => ({ ...r, cents: Math.round((r.minuten / 60) * r.uurloon) }));
  return { lijst, minuten: lijst.reduce((a, r) => a + r.minuten, 0), cents: lijst.reduce((a, r) => a + r.cents, 0) };
}

/** Het hoogste uurloon dat iemand heeft (om aankopen in uren werk te laten zien). */
export const uurloonVan = (s: FamilyState, id: string) => Math.max(0, ...(s.werk?.[id] ?? []).map((w) => w.uurloon ?? 0)) || undefined;

/** "3,5 uur werken": hoe lang moet je werken voor dit bedrag? Afgerond op een half uur. */
export function urenWerk(cents: number, uurloon?: number): string | undefined {
  if (!uurloon || cents <= 0) return undefined;
  const u = Math.max(0.5, Math.round((cents / uurloon) * 2) / 2);
  return `${u.toLocaleString("nl-NL")} uur werken`;
}

/** Mag `wie` het geld van `van` zien? Je eigen, of als ouder dat van iedereen. Broers en zussen niet. */
export const magZien = (s: FamilyState, wie: string, van: string) => wie === van || s.members.find((m) => m.id === wie)?.role === "ouder";
