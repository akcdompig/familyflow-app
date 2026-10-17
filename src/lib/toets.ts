import type { ToetsVraag } from "./types";

/*
  Oefentoets uit je eigen AI. De app maakt zelf geen vragen en verzint dus geen leerstof:
  een ouder fotografeert de echte bladzijden, laat zijn eigen AI (ChatGPT, Claude) er vragen van maken met de opdracht hieronder,
  plakt het resultaat in de app en controleert de vragen voordat ze worden opgeslagen.
*/

export const AI_OPDRACHT = `Maak een oefentoets van de bladzijden op de foto's. Gebruik alleen wat er op de foto's staat, verzin niets.
Maak 10 vragen. Schrijf elke vraag precies zo, met een lege regel ertussen:

V: de vraag
A: het juiste antwoord
O: fout antwoord 1 | fout antwoord 2 | fout antwoord 3

De regel O mag je weglaten als het een open vraag is. Geen andere tekst ervoor of erna.`;

/** Lees de geplakte tekst. Blokken gescheiden door een lege regel; regels V:, A: en (optioneel) O:. */
export function leesToets(tekst: string): { vragen: ToetsVraag[]; fouten: number } {
  const blokken = tekst.replace(/\r/g, "").split(/\n\s*\n/);
  const vragen: ToetsVraag[] = [];
  let fouten = 0;
  for (const b of blokken) {
    const r = b.split("\n").map((x) => x.trim()).filter(Boolean);
    if (!r.length) continue;
    const pak = (p: RegExp) => r.find((x) => p.test(x))?.replace(p, "").trim();
    const v = pak(/^(\*\*)?(v|vraag)\s*\d*\s*[:.)]\s*(\*\*)?/i);
    const a = pak(/^(\*\*)?(a|antwoord)\s*[:.)]\s*(\*\*)?/i);
    const o = pak(/^(\*\*)?(o|opties|fout)\s*[:.)]\s*(\*\*)?/i);
    if (!v || !a) {
      fouten++;
      continue;
    }
    const fout = o ? o.split("|").map((x) => x.trim()).filter((x) => x && x.toLowerCase() !== a.toLowerCase()) : [];
    vragen.push(fout.length ? { v, a, opties: fout.slice(0, 5) } : { v, a });
  }
  return { vragen: vragen.slice(0, 40), fouten };
}

/** Antwoord nakijken bij een open vraag: zonder hoofdletters, leestekens en lidwoorden. */
export const zelfde = (x: string, y: string) => {
  const k = (t: string) => t.toLowerCase().replace(/[^a-zà-ÿ0-9 ]/g, " ").replace(/\b(de|het|een|der|die|das|the|a|an)\b/g, " ").replace(/\s+/g, " ").trim();
  return k(x) === k(y) && k(x) !== "";
};

/** Vaste volgorde van keuzes per vraag (zelfde volgorde bij herladen). */
export function keuzes(v: ToetsVraag, i: number): string[] {
  const alle = [v.a, ...(v.opties ?? [])];
  const h = [...v.v].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, i + 3);
  return alle.map((x, j) => ({ x, r: (h >> (j % 16)) % 97 + j })).sort((p, q) => p.r - q.r).map((p) => p.x);
}
