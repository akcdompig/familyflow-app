/*
  Samen: dingen samen doen, om de band te versterken. Ouder en kind, broers en zussen, en met vrienden.
  - Vrijblijvend. Geen verplichting, geen doel om te halen, geen reeks die je kwijt kunt raken.
  - Je kiest wat past bij jullie tijd, budget en energie.
  - Achteraf: hoe was het? Dat is genoeg.
  - De band zie je alleen zelf (jij en de ander), nooit een ranglijst.

  Groeidoelen: 8 vaardigheden. Het kind kiest er 1 of 2, samen met een ouder.
  - Per leeftijd concreet: wat kun je deze week oefenen?
  - Wat je in de app doet telt vanzelf als oefenen (samen koken = samenwerken, hulp vragen = initiatief).
  - Elke week een korte terugblik: lukte goed / ging beter / nog lastig. Geen cijfer, geen vergelijking.
*/

import { addDays, iso } from "./planner";
import { maandag } from "./huis";
import { hash } from "./verdeling";
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

export interface Vaardigheid {
  id: string;
  naam: string;
  emoji: string;
  /** Wat je deze week kunt oefenen. Jonger dan 12 en 12+. */
  jong: string[];
  tiener: string[];
}

export const VAARDIGHEDEN: Vaardigheid[] = [
  { id: "samenwerken", naam: "Samenwerken", emoji: "🤝", jong: ["Doe één klus samen met je broer of zus", "Help bij het koken: snijden of tafel dekken"], tiener: ["Kook één keer samen een maaltijd, verdeel wie wat doet", "Doe een klus samen in plaats van om de beurt"] },
  { id: "verantwoordelijkheid", naam: "Verantwoordelijkheid", emoji: "🎯", jong: ["Doe je klus zonder dat iemand het hoeft te zeggen", "Ruim je eigen spullen op voor het slapen"], tiener: ["Doe je klussen op tijd, zonder herinnering", "Zeg het zelf als iets niet lukt, en zeg wanneer het wel lukt"] },
  { id: "plannen", naam: "Zelf plannen", emoji: "🗓️", jong: ["Kies 's ochtends wanneer je je klus doet", "Leg je tas en kleren de avond ervoor klaar"], tiener: ["Plan je huiswerk en klussen in voor de week", "Plan zelf iets leuks samen, met dag en tijd"] },
  { id: "communiceren", naam: "Praten en luisteren", emoji: "💬", jong: ["Vertel bij het eten één ding over je dag", "Laat iemand uitpraten voor je zelf praat"], tiener: ["Vraag aan iemand thuis hoe zijn dag was, en luister echt", "Zeg wat je dwarszit voordat het groot wordt"] },
  { id: "teleurstelling", naam: "Omgaan met tegenvallers", emoji: "🌦️", jong: ["Verlies je een spel? Zeg 'goed gespeeld'", "Tel tot 10 als iets niet gaat zoals je wilt"], tiener: ["Verlies je? Doe de klus zonder mopperen", "Schrijf op wat tegenviel en wat je de volgende keer anders doet"] },
  { id: "conflicten", naam: "Ruzie oplossen", emoji: "🕊️", jong: ["Zeg sorry en vraag: wat kan ik doen?", "Gebruik 'om de beurt' als jullie het niet eens zijn"], tiener: ["Kies samen een eerlijke manier als jullie het niet eens zijn", "Na een ruzie: praat het binnen een dag uit"] },
  { id: "rekening", naam: "Rekening houden met anderen", emoji: "💛", jong: ["Vraag of iemand hulp nodig heeft", "Wees stil als iemand slaapt of leert"], tiener: ["Doe iets voor iemand zonder dat het gevraagd wordt", "Laat een ander kiezen wat jullie samen gaan doen"] },
  { id: "initiatief", naam: "Initiatief en hulp vragen", emoji: "🙋", jong: ["Begin zelf aan je klus", "Vraag hulp als je iets niet snapt"], tiener: ["Bedenk zelf iets leuks voor het gezin", "Vraag op tijd hulp, niet pas als het te laat is"] },
];
export const vaardigheid = (id: string) => VAARDIGHEDEN.find((v) => v.id === id);
export const oefeningen = (v: Vaardigheid, m?: Member) => (m?.age !== undefined && m.age < 12 ? v.jong : v.tiener);

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

/* ---------- Groeidoelen: wat telt als oefenen? ---------- */

/** Wat je deze week (vanaf maandag) deed dat bij deze vaardigheid hoort. Alleen positief. */
export function geoefend(s: FamilyState, id: string, vaardigheidId: string, nu = new Date()): string[] {
  const ma = maandag(iso(nu));
  const dezeWeek = (at: string) => iso(new Date(at)) >= ma;
  const uit: string[] = [];
  for (const x of s.samen ?? []) {
    if (!x.gedaan || !dezeWeek(x.gedaan) || !x.wie.includes(id)) continue;
    const idee = IDEEEN.find((i) => i.id === x.soort);
    if (idee?.vaardigheden.includes(vaardigheidId) || (!idee && vaardigheidId === "samenwerken")) uit.push(`${x.titel}`);
    else if (vaardigheidId === "plannen" && x.door === id) uit.push(`${x.titel} gepland`);
  }
  const klussen = (s.klusLog ?? []).filter((k) => k.by === id && dezeWeek(k.at));
  if (vaardigheidId === "samenwerken") for (const k of klussen.filter((k) => k.samen)) uit.push(`Klus samen gedaan`);
  if (vaardigheidId === "verantwoordelijkheid" && klussen.length) uit.push(`${klussen.length} ${klussen.length === 1 ? "klus" : "klussen"} gedaan`);
  for (const u of (s.uitdagingen ?? []).filter((u) => u.spelers.includes(id) && dezeWeek(u.at))) {
    const deed = klussen.some((k) => k.klus === u.klus && iso(new Date(k.at)) === iso(new Date(u.at)));
    if (vaardigheidId === "teleurstelling" && u.verliezer === id && deed && (u.manier === "spel" || u.manier === "loting")) uit.push("Sportief de klus gedaan na het spel");
    if (vaardigheidId === "conflicten" && (u.manier === "beurt" || u.manier === "samen")) uit.push(u.manier === "samen" ? "Samen opgelost: allebei de helft" : "Eerlijk om de beurt gekozen");
  }
  for (const b of (s.bezwaren ?? []).filter((b) => b.door === id && dezeWeek(b.at))) {
    if (vaardigheidId === "initiatief" && b.soort === "hulp") uit.push("Hulp gevraagd");
    if (vaardigheidId === "communiceren") uit.push("Op tijd gezegd dat iets niet lukte");
  }
  if (vaardigheidId === "rekening") {
    for (const d of Object.keys(s.koken ?? {})) if (d >= ma && s.koken?.[d]?.kok === id) uit.push("Gekookt voor het gezin");
  }
  return uit;
}

export const weekVan = (nu = new Date()) => maandag(iso(nu));
