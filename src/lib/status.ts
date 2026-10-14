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

/** Aan welk werk is dit gezinslid nu bezig, als het goed is? */
export function werktNu(state: FamilyState, id: string, nu = new Date()): { werk: WerkItem; look: Bezig } | null {
  const vandaag = iso(nu);
  const gisteren = addDays(vandaag, -1);
  const nuMin = nu.getHours() * 60 + nu.getMinutes();
  const wd = nu.getDay();
  const lijst = state.werk?.[id] ?? [];
  for (const w of lijst) {
    if (w.soort !== "vast" || !w.van || !w.tot) continue;
    const overNacht = minuten(w.tot) < minuten(w.van);
    const vandaagActief = w.days?.includes(wd) && binnen(nuMin, w.van, overNacht ? "23:59" : w.tot);
    const vanGisteren = overNacht && w.days?.includes((wd + 6) % 7) && nuMin < minuten(w.tot);
    if (vandaagActief || vanGisteren) return { werk: w, look: lookVoor(w) };
  }
  for (const d of state.diensten ?? []) {
    if (d.member !== id) continue;
    const overNacht = minuten(d.tot) < minuten(d.van);
    const actief = (d.date === vandaag && binnen(nuMin, d.van, overNacht ? "23:59" : d.tot)) || (overNacht && d.date === gisteren && nuMin < minuten(d.tot));
    if (actief) {
      const w = lijst.find((x) => x.id === d.werkId) ?? { id: d.werkId, naam: "Werk", soort: "wisselend" as const };
      return { werk: w, look: lookVoor(w) };
    }
  }
  return null;
}
