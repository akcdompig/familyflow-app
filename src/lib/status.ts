/* Wat is iemand nu aan het doen? Slapen of werken, voor de avatars in de huiskamer. */

import { iso, addDays } from "./planner";
import type { Bezig, FamilyState, WerkItem } from "./types";

/** Slaapt dit gezinslid? Na 14 uur slapen telt het niet meer, dan is iemand vergeten in te checken. */
export function slaapt(state: FamilyState, id: string, nu = new Date()): boolean {
  const at = state.sleep?.[id];
  return !!at && nu.getTime() - new Date(at).getTime() < 14 * 3600e3;
}

export function lookVoor(w: WerkItem): Bezig {
  if (w.look) return w.look;
  const n = w.naam.toLowerCase();
  if (/school|roc|college|lyceum|mbo|klas|stage/.test(n)) return "school";
  if (/secur|beveilig|victorie|portier|deur/.test(n)) return "security";
  if (/bootcamp|training|sport|gym|trainer|les /.test(n)) return "sport";
  if (/hei|bouw|toezicht/.test(n)) return "bouw";
  if (/catering|kok|keuken|restaurant|horeca/.test(n)) return "keuken";
  return "kantoor";
}

const minuten = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** Valt het tijdstip binnen van–tot? Werkt ook over middernacht. */
function binnen(nuMin: number, van: string, tot: string) {
  const a = minuten(van);
  const b = minuten(tot);
  return a <= b ? nuMin >= a && nuMin < b : nuMin >= a || nuMin < b;
}

export interface Bezigheid {
  werk: WerkItem;
  look: Bezig;
  van: string;
  tot: string;
  /** 0–1: hoe ver het werk of de schooldag nu is. */
  pct: number;
  /** Minuten tot het klaar is. */
  rest: number;
}

/** "nog 3u 20m" */
export const restTekst = (min: number) => (min >= 60 ? `nog ${Math.floor(min / 60)}u${min % 60 ? ` ${min % 60}m` : ""}` : `nog ${min} min`);

function voortgang(nuMin: number, van: string, tot: string) {
  const a = minuten(van);
  let b = minuten(tot);
  if (b <= a) b += 1440;
  let n = nuMin;
  if (n < a) n += 1440;
  const pct = Math.max(0, Math.min(1, (n - a) / (b - a)));
  return { pct, rest: Math.max(0, b - n) };
}

/** Aan welk werk (of welke schooldag) is dit gezinslid nu bezig, als het goed is? Met hoe ver het is. */
export function werktNu(state: FamilyState, id: string, nu = new Date()): Bezigheid | null {
  const vandaag = iso(nu);
  const gisteren = addDays(vandaag, -1);
  const nuMin = nu.getHours() * 60 + nu.getMinutes();
  const wd = nu.getDay();
  const lijst = state.werk?.[id] ?? [];
  for (const w of lijst) {
    if (w.soort !== "vast" || !w.van || !w.tot) continue;
    const overNacht = minuten(w.tot) < minuten(w.van);
    // School telt niet in de vakantie.
    const vakantie = (d: string) => lookVoor(w) === "school" && (state.vakanties?.[id] ?? []).some((v) => d >= v.van && d <= v.tot);
    const vrij = (d: string) => !!state.vrij?.[d]?.includes(`${id}:${w.id}`) || vakantie(d);
    const vandaagActief = w.days?.includes(wd) && !vrij(vandaag) && binnen(nuMin, w.van, overNacht ? "23:59" : w.tot);
    const vanGisteren = overNacht && w.days?.includes((wd + 6) % 7) && !vrij(gisteren) && nuMin < minuten(w.tot);
    if (vandaagActief || vanGisteren) return { werk: w, look: lookVoor(w), van: w.van, tot: w.tot, ...voortgang(nuMin, w.van, w.tot) };
  }
  // Lesrooster uit Somtoday: vandaag tussen het eerste en laatste uur = op school.
  const les = (state.rooster?.[id] ?? []).find((r) => r.date === vandaag);
  const vakantieVandaag = (state.vakanties?.[id] ?? []).some((v) => vandaag >= v.van && vandaag <= v.tot);
  if (les && !vakantieVandaag && binnen(nuMin, les.van, les.tot)) {
    const w: WerkItem = { id: "somtoday", naam: "School", soort: "wisselend", look: "school" };
    return { werk: w, look: "school", van: les.van, tot: les.tot, ...voortgang(nuMin, les.van, les.tot) };
  }
  for (const d of state.diensten ?? []) {
    if (d.member !== id) continue;
    const overNacht = minuten(d.tot) < minuten(d.van);
    const actief = (d.date === vandaag && binnen(nuMin, d.van, overNacht ? "23:59" : d.tot)) || (overNacht && d.date === gisteren && nuMin < minuten(d.tot));
    if (actief) {
      const w = lijst.find((x) => x.id === d.werkId) ?? { id: d.werkId, naam: "Werk", soort: "wisselend" as const };
      return { werk: w, look: lookVoor(w), van: d.van, tot: d.tot, ...voortgang(nuMin, d.van, d.tot) };
    }
  }
  return null;
}
