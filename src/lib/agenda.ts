import type { AfspraakSoort, AgendaItem, FamilyState } from "./types";

/*
  Losse afspraken: "Ontbijten met Akram, 11.00–12.00".
  - Los van werk en roosters: je hoeft niks anders in te vullen.
  - Geen taak: niks af te vinken, geen punten, telt niet als werktijd en verandert de takenverdeling niet.
  - Per persoon opgeslagen (agenda[lid]); iedereen in het gezin ziet titel en tijd, de notitie alleen jij.
*/

export const SOORTEN: { id: AfspraakSoort; label: string; emoji: string }[] = [
  { id: "persoonlijk", label: "Persoonlijk", emoji: "🙂" },
  { id: "zakelijk", label: "Zakelijk", emoji: "💼" },
  { id: "sociaal", label: "Sociaal", emoji: "☕" },
  { id: "familie", label: "Familie", emoji: "👨‍👩‍👧" },
];
export const soortVan = (id: AfspraakSoort) => SOORTEN.find((s) => s.id === id) ?? SOORTEN[0];

export type Invoer = Pick<AgendaItem, "titel" | "datum" | "van" | "tot" | "soort"> & Partial<Pick<AgendaItem, "met" | "waar" | "notitie">>;

const TIJD = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Wat ontbreekt er nog? Leeg = klaar om op te slaan. Nooit stilzwijgend een datum of tijd invullen. */
export function controleer(x: Invoer): string[] {
  const fout: string[] = [];
  if (!x.titel.trim()) fout.push("Geef de afspraak een naam");
  if (!DATUM.test(x.datum)) fout.push("Kies een datum");
  if (!TIJD.test(x.van)) fout.push("Kies een begintijd");
  if (!TIJD.test(x.tot)) fout.push("Kies een eindtijd");
  if (TIJD.test(x.van) && TIJD.test(x.tot) && x.tot <= x.van) fout.push("De eindtijd moet na de begintijd liggen");
  return fout;
}

/** Netjes maken: spaties weg, lege optionele velden weg. */
export function schoon(x: Invoer): Invoer {
  const opt = (v?: string) => (v && v.trim() ? v.trim() : undefined);
  return { titel: x.titel.trim(), datum: x.datum, van: x.van, tot: x.tot, soort: x.soort, met: opt(x.met), waar: opt(x.waar), notitie: opt(x.notitie) };
}

/** Staat precies deze afspraak er al? (Twee keer op opslaan gedrukt.) */
export const isDubbel = (lijst: AgendaItem[], x: Invoer, behalve?: string) =>
  lijst.some((a) => a.id !== behalve && a.titel.toLowerCase() === x.titel.trim().toLowerCase() && a.datum === x.datum && a.van === x.van && a.tot === x.tot);

/** Afspraken van één persoon op een dag, op tijd. */
export const afsprakenOp = (s: FamilyState, id: string, d: string) => (s.agenda?.[id] ?? []).filter((a) => a.datum === d).sort((a, b) => a.van.localeCompare(b.van));

/** Wat verandert er als je een afspraak aanpast? Voor "Dit verandert" voordat je opslaat. */
export function verschil(oud: AgendaItem, nieuw: Invoer): { veld: string; van: string; naar: string }[] {
  const toon: Record<string, (v?: string) => string> = {
    titel: (v) => v ?? "",
    datum: (v) => (v ? new Date(v + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }) : ""),
    van: (v) => (v ?? "").replace(":", "."),
    tot: (v) => (v ?? "").replace(":", "."),
    soort: (v) => (v ? soortVan(v as AfspraakSoort).label : ""),
    met: (v) => v ?? "—",
    waar: (v) => v ?? "—",
    notitie: (v) => v ?? "—",
  };
  const namen: Record<string, string> = { titel: "Naam", datum: "Datum", van: "Begin", tot: "Eind", soort: "Soort", met: "Met", waar: "Waar", notitie: "Notitie" };
  const n = schoon(nieuw);
  return Object.keys(namen)
    .filter((k) => (oud[k as keyof AgendaItem] ?? undefined) !== (n[k as keyof Invoer] ?? undefined))
    .map((k) => ({ veld: namen[k], van: toon[k](oud[k as keyof AgendaItem] as string | undefined), naar: toon[k](n[k as keyof Invoer] as string | undefined) }));
}

/**
  Welk plaatje past erbij? Alleen als het iets zegt:
  - "eten": samen eten of drinken (ontbijt, lunch, koffie, diner, borrel)
  - "gesprek": met iemand afgesproken (een naam bij "met", of zakelijk/sociaal)
  Anders geen plaatje: geen decoratie bij elke afspraak.
*/
export function beeldVoor(a: Pick<AgendaItem, "titel" | "soort" | "met">): "eten" | "gesprek" | "zakelijk" | null {
  const t = a.titel.toLowerCase();
  const eten = /\b(ontbij\w*|lunch\w*|brunch\w*|koffie|thee|diner\w*|eten|etentje|borrel\w*|drankje|lunchen|ontbijten)\b/.test(t);
  const metIemand = !!a.met || /\bmet\b/.test(t);
  if (eten && metIemand) return a.soort === "zakelijk" ? "zakelijk" : "eten";
  if (metIemand && (a.soort === "zakelijk" || a.soort === "sociaal")) return a.soort === "zakelijk" ? "zakelijk" : "gesprek";
  return null;
}

export const tijdTekst = (a: Pick<AgendaItem, "van" | "tot">) => `${a.van.replace(":", ".")}–${a.tot.replace(":", ".")}`;
