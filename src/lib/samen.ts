/*
  Samen: dingen samen doen, om de band te versterken. Ouder en kind, broers en zussen, en met vrienden.
  - Vrijblijvend. Geen verplichting, geen doel om te halen, geen reeks die je kwijt kunt raken.
  - Je kiest wat past bij jullie tijd, budget en energie.
  - Achteraf: hoe was het? Dat is genoeg.
  - De band zie je alleen zelf (jij en de ander), nooit een ranglijst.

  Groeidoelen: de competenties uit competenties.ts. Het kind kiest er 1 of 2, samen met een ouder.
  - Per leeftijd concreet: wat kun je deze week oefenen?
  - Wat je in de app doet telt vanzelf als oefenen (samen koken = samenwerken, hulp vragen = initiatief).
  - Elke week een korte terugblik: lukte goed / ging beter / nog lastig. Geen cijfer, geen vergelijking.
*/

import { addDays, iso } from "./planner";
import { maandag } from "./huis";
import { hash } from "./verdeling";
import { COMPETENTIES, competentie, oefentips, type Competentie } from "./competenties";
import type { FamilyState, Member, SamenMoment } from "./types";

export type Tijd = "kort" | "uur" | "middag";
export type Energie = "rustig" | "actief";
export interface Idee {
  id: string;
  titel: string;
  emoji: string;
  tijd: Tijd;
  /** 0 = gratis, 1 = €, 2 = €€ */
  budget: 0 | 1 | 2;
  energie: Energie;
  vaardigheden: string[];
  /** Leuk met vrienden of vriendinnen erbij. */
  vrienden?: boolean;
  vanaf?: number;
}

export const IDEEEN: Idee[] = [
  { id: "koken", titel: "Samen koken", emoji: "🍳", tijd: "uur", budget: 1, energie: "rustig", vaardigheden: ["samenwerken", "plannen", "verantwoordelijkheid"] },
  { id: "boodschappen", titel: "Samen boodschappen doen", emoji: "🛒", tijd: "uur", budget: 1, energie: "rustig", vaardigheden: ["plannen", "verantwoordelijkheid", "communiceren"] },
  { id: "bakken", titel: "Iets bakken", emoji: "🧁", tijd: "uur", budget: 1, energie: "rustig", vaardigheden: ["samenwerken", "initiatief"], vrienden: true },
  { id: "ontbijt", titel: "Ontbijt maken voor de rest", emoji: "🥞", tijd: "kort", budget: 1, energie: "rustig", vaardigheden: ["initiatief", "rekening"] },
  { id: "film", titel: "Filmavond thuis", emoji: "🍿", tijd: "middag", budget: 0, energie: "rustig", vaardigheden: ["rekening"], vrienden: true },
  { id: "bios", titel: "Naar de film", emoji: "🎬", tijd: "middag", budget: 2, energie: "rustig", vaardigheden: ["plannen"], vrienden: true },
  { id: "stad", titel: "Samen de stad in", emoji: "🏙️", tijd: "middag", budget: 1, energie: "actief", vaardigheden: ["plannen", "rekening"], vrienden: true },
  { id: "wandelen", titel: "Wandelen en kletsen", emoji: "🌳", tijd: "uur", budget: 0, energie: "actief", vaardigheden: ["communiceren"] },
  { id: "avondloop", titel: "Rondje lopen na het eten", emoji: "🌙", tijd: "kort", budget: 0, energie: "rustig", vaardigheden: ["communiceren"] },
  { id: "fietsen", titel: "Fietstocht", emoji: "🚲", tijd: "middag", budget: 0, energie: "actief", vaardigheden: ["samenwerken", "plannen"], vrienden: true },
  { id: "sporten", titel: "Samen sporten of trainen", emoji: "💪", tijd: "uur", budget: 0, energie: "actief", vaardigheden: ["samenwerken", "teleurstelling"], vrienden: true },
  { id: "zwemmen", titel: "Zwemmen", emoji: "🏊", tijd: "middag", budget: 1, energie: "actief", vaardigheden: ["rekening"], vrienden: true },
  { id: "bordspel", titel: "Bordspel of kaartspel", emoji: "🎲", tijd: "uur", budget: 0, energie: "rustig", vaardigheden: ["teleurstelling", "rekening", "conflicten"], vrienden: true },
  { id: "puzzel", titel: "Puzzel of bouwen", emoji: "🧩", tijd: "uur", budget: 0, energie: "rustig", vaardigheden: ["samenwerken"] },
  { id: "gamen", titel: "Samen gamen (één team)", emoji: "🎮", tijd: "uur", budget: 0, energie: "rustig", vaardigheden: ["samenwerken", "teleurstelling"], vrienden: true },
  { id: "creatief", titel: "Iets creatiefs maken", emoji: "🎨", tijd: "uur", budget: 0, energie: "rustig", vaardigheden: ["initiatief"], vrienden: true },
  { id: "muziek", titel: "Muziek laten horen aan elkaar", emoji: "🎧", tijd: "kort", budget: 0, energie: "rustig", vaardigheden: ["communiceren", "rekening"] },
  { id: "leren", titel: "Elkaar iets nieuws leren", emoji: "💡", tijd: "kort", budget: 0, energie: "rustig", vaardigheden: ["communiceren", "initiatief"] },
  { id: "kamer", titel: "Samen een kamer opknappen", emoji: "🧰", tijd: "middag", budget: 1, energie: "actief", vaardigheden: ["samenwerken", "verantwoordelijkheid"] },
  { id: "picknick", titel: "Picknick in het park", emoji: "🧺", tijd: "middag", budget: 1, energie: "actief", vaardigheden: ["plannen"], vrienden: true },
  { id: "helpen", titel: "Samen iemand helpen", emoji: "🤝", tijd: "uur", budget: 0, energie: "actief", vaardigheden: ["rekening", "initiatief"], vanaf: 10 },
  { id: "afspreken", titel: "Vrienden uitnodigen bij ons", emoji: "👫", tijd: "middag", budget: 0, energie: "rustig", vaardigheden: ["rekening", "initiatief"], vrienden: true },
];

export const TIJD: Record<Tijd, string> = { kort: "half uurtje", uur: "1–2 uur", middag: "middag of avond" };
export const BUDGET = ["gratis", "€", "€€"];

/** De groeidoelen gebruiken dezelfde competenties als Groei en het weekverhaal (één lijst, zie competenties.ts). */
export type Vaardigheid = Competentie;
export const VAARDIGHEDEN = COMPETENTIES;
export const vaardigheid = competentie;
export const oefeningen = (v: Vaardigheid, m?: Member) => oefentips(v, m?.age);

/* ---------- Samen-momenten ---------- */

const gedaanSamen = (s: FamilyState, nu: Date, dagen: number) =>
  (s.samen ?? []).filter((x) => x.gedaan && new Date(x.gedaan).getTime() > nu.getTime() - dagen * 864e5);

/** De band tussen twee mensen: hoeveel keer samen iets gedaan de laatste 30 dagen. 0–5 hartjes. */
export function band(s: FamilyState, a: string, b: string, nu = new Date()): number {
  return Math.min(5, gedaanSamen(s, nu, 30).filter((x) => x.wie.includes(a) && x.wie.includes(b)).length);
}

/** Gepland (nog niet gedaan) en niet ouder dan 3 dagen over tijd. */
export function gepland(s: FamilyState, nu = new Date()): SamenMoment[] {
  const grens = addDays(iso(nu), -3);
  return (s.samen ?? []).filter((x) => !x.gedaan && x.datum >= grens).sort((a, b) => (a.datum + (a.tijd ?? "")).localeCompare(b.datum + (b.tijd ?? "")));
}

/** Een idee voor jou: met wie deed je de laatste tijd het minst samen? En iets dat bij jullie past. */
export function suggestie(s: FamilyState, me: Member, nu = new Date()): { met: Member; idee: Idee } | null {
  const anderen = s.members.filter((m) => m.id !== me.id && m.joined !== false);
  if (!anderen.length) return null;
  const d = iso(nu);
  const met = [...anderen].sort((a, b) => band(s, me.id, a.id, nu) - band(s, me.id, b.id, nu) || hash(d + a.id) - hash(d + b.id))[0];
  const jongste = Math.min(me.age ?? 99, met.age ?? 99);
  const wd = nu.getDay();
  const weekend = wd === 0 || wd === 6;
  const passend = IDEEEN.filter((i) => (i.vanaf ?? 0) <= jongste && (weekend || i.tijd !== "middag"));
  const idee = passend[Math.floor(hash(d + me.id + met.id) * passend.length)] ?? IDEEEN[0];
  return { met, idee };
}

/** Hoeveel samen-momenten deze maand, voor het hele gezin. Alleen positief: geen doel. */
export const dezeMaand = (s: FamilyState, nu = new Date()) => gedaanSamen(s, nu, 30).length;

export const weekVan = (nu = new Date()) => maandag(iso(nu));
