/*
  Het huishouden, zonder discussie.
  - Klussen: wie deed het als laatste en wie is nu aan de beurt. Blijft iets liggen, dan zie je dat in de huiskamer.
  - Koken: wie kookt, wat, wie eet mee. Restjes mag, maar hooguit 2 dagen hetzelfde eten.
    Kookt er niemand, dan krijgt de rest honger. Dat zie je aan hun poppetje.
  - Gezinspotje: statiegeld, beloningen van ouders en inleg. Geen bank, alleen bijhouden.
  - Werkweek: vast werk staat er vanzelf in. Vrij genomen? Klik het weg.
*/

import { addDays, iso } from "./planner";
import { dagLog, gegeten } from "./dag";
import { lookVoor, werktNu } from "./status";
import { minutenVan, verdeling } from "./verdeling";
import type { FamilyState, Kookplan, KlusDone, Member, WerkItem } from "./types";

export interface Klus {
  id: string;
  label: string;
  emoji: string;
  /** Om de hoeveel dagen het moet. */
  elke: number;
  xp: number;
  /** Wat je in de huiskamer ziet als het te lang blijft liggen. */
  rommel: string;
  /** Per kind apart (eigen kamer). */
  perKind?: boolean;
  /** Ook ouders draaien mee in de beurt. Anders alleen de kinderen. */
  iedereen?: boolean;
  /** Alleen op dagen dat er gekookt is, en pas na het eten (restjes in de koelkast). */
  naKoken?: boolean;
  /** Hoe lang het ongeveer duurt. Daarmee wordt eerlijk verdeeld (niet het aantal klussen). */
  minuten: number;
  /** Vanaf welke leeftijd (voorstel; ouders kunnen het aanpassen). Een richtlijn, geen garantie dat het veilig kan. */
  vanaf: number;
  /** Wat je precies doet, concreet. */
  instructie?: string;
  /** Alleen met een ouder erbij (koken, schoonmaakmiddelen). Gaat nooit vanzelf naar een kind alleen. */
  begeleiding?: boolean;
  /** Uit de bibliotheek: staat standaard uit, ouders zetten hem aan. */
  standaardUit?: boolean;
  /** Zelf toegevoegd door de ouders. */
  eigen?: boolean;
}

export const KLUSSEN: Klus[] = [
  { id: "vaat-uit", label: "Vaatwasser uitruimen", emoji: "🍽️", elke: 1, xp: 5, rommel: "🍽️", minuten: 10, vanaf: 7, instructie: "Alles uit de vaatwasser op zijn plek zetten. Scherpe messen laat je liggen voor een ouder." },
  { id: "vaat-in", label: "Vaatwasser inruimen en aanzetten", emoji: "🫧", elke: 1, xp: 5, rommel: "🥣", minuten: 10, vanaf: 8, instructie: "Vieze borden en bekers erin, een tablet in het bakje, deur dicht en aanzetten." },
  { id: "keuken", label: "Keuken opruimen", emoji: "🧽", elke: 1, xp: 5, rommel: "🍕", iedereen: true, minuten: 15, vanaf: 8, instructie: "Spullen van het aanrecht opruimen, het aanrecht schoonmaken en de tafel afvegen." },
  { id: "stofzuigen", label: "Stofzuigen", emoji: "🧹", elke: 2, xp: 10, rommel: "💨", minuten: 25, vanaf: 9, instructie: "Woonkamer en gang. Eerst spullen van de vloer, dan stofzuigen, ook onder de tafel." },
  { id: "was", label: "Was doen (draaien, ophangen, vouwen)", emoji: "👕", elke: 2, xp: 10, rommel: "🧺", iedereen: true, minuten: 30, vanaf: 11, instructie: "Was sorteren op kleur, machine aan op het juiste programma, daarna ophangen." },
  { id: "kamer", label: "Eigen kamer netjes", emoji: "🛏️", elke: 2, xp: 5, rommel: "🧦", perKind: true, minuten: 15, vanaf: 6, instructie: "Kleren in de kast of de wasmand, bed rechtleggen, vloer vrij." },
  { id: "bedden", label: "Bedden verschonen", emoji: "🛌", elke: 7, xp: 15, rommel: "🛏️", iedereen: true, minuten: 30, vanaf: 10, instructie: "Oude hoezen eraf en in de wasmand, schone hoezen erop." },
  { id: "afval", label: "Afval buiten zetten", emoji: "🗑️", elke: 3, xp: 5, rommel: "🗑️", minuten: 5, vanaf: 8, instructie: "Vuilniszak dichtknopen, naar de container, nieuwe zak in de bak." },
  { id: "koelkast", label: "Restjes in de koelkast", emoji: "🧊", elke: 1, xp: 5, rommel: "🍲", iedereen: true, naKoken: true, minuten: 5, vanaf: 8, instructie: "Restjes in een bakje met deksel, in de koelkast. Pannen in de gootsteen." },
  { id: "ramen", label: "Ramen lappen", emoji: "🪟", elke: 14, xp: 20, rommel: "🫧", iedereen: true, minuten: 45, vanaf: 12, instructie: "Binnenkant van de ramen beneden. Emmer warm water, spons, daarna droog met de wisser." },
  { id: "flessen", label: "Flessen wegbrengen (statiegeld)", emoji: "🍾", elke: 7, xp: 10, rommel: "🍾", minuten: 20, vanaf: 10, instructie: "Lege flessen naar de supermarkt en het bonnetje aan een ouder geven." },
  // Bibliotheek: staan standaard uit. Ouders zetten aan wat bij hun gezin past.
  { id: "tafel-dekken", label: "Tafel dekken", emoji: "🍴", elke: 1, xp: 5, rommel: "🍴", minuten: 5, vanaf: 6, standaardUit: true, instructie: "Borden, bestek en glazen voor iedereen die mee-eet." },
  { id: "tafel-af", label: "Tafel afruimen", emoji: "🧺", elke: 1, xp: 5, rommel: "🍝", minuten: 5, vanaf: 6, standaardUit: true, instructie: "Alles van tafel naar het aanrecht of de vaatwasser, tafel afvegen." },
  { id: "woonkamer", label: "Woonkamer netjes", emoji: "🛋️", elke: 1, xp: 5, rommel: "🧸", iedereen: true, minuten: 10, vanaf: 6, standaardUit: true, instructie: "Spullen terug naar de kamer van wie ze zijn, kussens recht, afstandsbediening op zijn plek." },
  { id: "was-vouwen", label: "Was vouwen", emoji: "🧦", elke: 3, xp: 5, rommel: "🧺", minuten: 15, vanaf: 9, standaardUit: true, instructie: "Droge was vouwen en per persoon op een stapel leggen." },
  { id: "was-opbergen", label: "Schone was opbergen", emoji: "🗄️", elke: 3, xp: 5, rommel: "👚", minuten: 10, vanaf: 8, standaardUit: true, instructie: "Je eigen stapel in je kast leggen. Handdoeken in de badkamer." },
  { id: "badkamer", label: "Badkamer schoonmaken", emoji: "🛁", elke: 7, xp: 15, rommel: "🧴", iedereen: true, minuten: 25, vanaf: 12, standaardUit: true, instructie: "Wastafel, spiegel en kraan schoon met het groene middel en een doekje. Geen bleek of chloor." },
  { id: "boodschappen", label: "Boodschappen uitpakken", emoji: "🛍️", elke: 7, xp: 5, rommel: "🥫", minuten: 10, vanaf: 7, standaardUit: true, instructie: "Koel spul eerst in de koelkast, de rest in de kast. Tassen terug in de auto." },
  { id: "boodschappenlijst", label: "Boodschappenlijst aanvullen", emoji: "📝", elke: 7, xp: 5, rommel: "📝", minuten: 5, vanaf: 9, standaardUit: true, instructie: "Kijk in de koelkast en de kast wat bijna op is en zet het op de lijst." },
  { id: "koken-helpen", label: "Helpen met koken", emoji: "🥕", elke: 7, xp: 10, rommel: "🥘", iedereen: true, minuten: 30, vanaf: 8, standaardUit: true, begeleiding: true, instructie: "Groente wassen en snijden, tafel klaarzetten. Een ouder doet het fornuis en de oven." },
  { id: "maaltijd", label: "Een eenvoudige maaltijd maken", emoji: "🍳", elke: 7, xp: 20, rommel: "🥘", iedereen: true, minuten: 45, vanaf: 11, standaardUit: true, begeleiding: true, instructie: "Samen een recept kiezen, boodschappen checken en koken. Een ouder blijft in de keuken." },
];

/** Alle taken van dit gezin: de bibliotheek en wat de ouders zelf toevoegden. */
export function alleKlussen(s: FamilyState): Klus[] {
  return [...KLUSSEN, ...((s.klusAfspraken?.eigen ?? []).map((e) => ({ rommel: "📌", ...e, eigen: true })) as Klus[])];
}
export const klusById = (s: FamilyState, id: string) => alleKlussen(s).find((k) => k.id === id.split(":")[0]);
/** Staat deze taak aan? Afspraak gaat voor; anders staat de basis aan en de bibliotheek uit. */
export const klusAan = (s: FamilyState, k: Klus) => s.klusAfspraken?.klussen?.[k.id]?.aan ?? !k.standaardUit;

const dagenTussen = (a: string, b: string) => Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 864e5);
const kidsVan = (s: FamilyState) => s.members.filter((m) => m.role !== "ouder" && m.joined !== false);

/** Sleutel in het logboek: de klus, en bij een per-kind-klus ook het kind. */
export const klusKey = (k: Klus, kind?: string) => (k.perKind && kind ? `${k.id}:${kind}` : k.id);

export function laatst(s: FamilyState, key: string): KlusDone | undefined {
  const log = s.klusLog ?? [];
  for (let i = log.length - 1; i >= 0; i--) if (log[i].klus === key) return log[i];
  return undefined;
}

export type KlusStatus = { key: string; klus: Klus; kind?: Member; laatst?: KlusDone; dagenGeleden: number | null; teLaat: number; vandaagGedaan: boolean; /** Moet vandaag (of is te laat). */ nodig: boolean; beurt?: Member; /** Vandaag ingedeeld (eerlijke verdeling). */ ingedeeld?: boolean; /** Moet nog niet, maar mag alvast (vrije dag). */ extra?: boolean; /** Doet hem samen met de beurt. */ mee?: Member; /** Schuift door naar een rustigere dag. */ uitgesteld?: boolean; /** Waarom deze persoon. */ reden?: string; minuten: number };

/** Hoe staat elke klus ervoor? teLaat > 0 = blijft liggen. */
export function klusStatus(s: FamilyState, nu = new Date()): KlusStatus[] {
  const vandaag = iso(nu);
  const out: KlusStatus[] = [];
  const v = verdeling(s, vandaag);
  const lid = (id?: string) => (id ? s.members.find((m) => m.id === id) : undefined);
  for (const k of alleKlussen(s)) {
    if (!klusAan(s, k)) continue;
    const rijen = k.perKind ? kidsVan(s).map((m) => ({ key: klusKey(k, m.id), kind: m as Member | undefined })) : [{ key: k.id, kind: undefined }];
    if (k.naKoken) {
      out.push(koelkastStatus(s, k, nu));
      continue;
    }
    for (const r of rijen) {
      const l = laatst(s, r.key);
      const ago = l ? dagenTussen(iso(new Date(l.at)), vandaag) : null;
      // Te laat = langer liggen dan de bedoeling. Een dagelijkse klus van gisteren moet vandaag, maar is nog niet te laat.
      const teLaat = ago === null ? 0 : Math.max(0, ago - k.elke);
      const ingedeeld = lid(v.wie[r.key]);
      out.push({ key: r.key, klus: k, kind: r.kind, laatst: l, dagenGeleden: ago, teLaat, nodig: ago === null || ago >= k.elke, vandaagGedaan: ago === 0, beurt: ingedeeld ?? r.kind ?? beurtVoor(s, k, nu), ingedeeld: !!ingedeeld, extra: v.extra.has(r.key), uitgesteld: v.uitgesteld.has(r.key), mee: lid(v.mee[r.key]), reden: v.reden[r.key], minuten: minutenVan(s, k) });
    }
  }
  return out;
}

/** Na het eten: restjes in de koelkast. Vergeten? Dan staat de pan de volgende ochtend nog in de huiskamer. */
function koelkastStatus(s: FamilyState, k: Klus, nu: Date): KlusStatus {
  const vandaag = iso(nu);
  const gisteren = addDays(vandaag, -1);
  const l = laatst(s, k.id);
  const ld = l ? iso(new Date(l.at)) : "";
  const uur = l ? new Date(l.at).getHours() : 0;
  // Gedaan "voor die avond": vanaf 15 uur die dag, of de nacht erna voor 6 uur.
  const gedaanVoor = (d: string) => !!l && ((ld === d && uur >= 15) || (ld === addDays(d, 1) && uur < 6));
  const kok = (d: string) => kookplan(s, d).kok;
  // Vanochtend alsnog weggezet telt ook.
  const gisterenVergeten = !!kok(gisteren) && !gedaanVoor(gisteren) && !(ld === vandaag && uur < 15);
  const naEten = nu.getHours() * 60 + nu.getMinutes() >= 19 * 60 + 30;
  const vandaagGedaan = gedaanVoor(vandaag);
  const nodig = gisterenVergeten || (!!kok(vandaag) && naEten && !vandaagGedaan);
  // Niet de kok zelf: die heeft al gekookt.
  const kokId = kok(vandaag) ?? kok(gisteren);
  const pool = s.members.filter((m) => m.joined !== false && m.id !== kokId && !bezigTotLaat(s, m.id, nu));
  const lastBy = (id: string) => (s.klusLog ?? []).filter((x) => x.klus === k.id && x.by === id).map((x) => new Date(x.at).getTime()).pop() ?? 0;
  const beurt = [...pool].sort((a, b) => lastBy(a.id) - lastBy(b.id))[0];
  return { key: k.id, klus: k, laatst: l, dagenGeleden: l ? dagenTussen(ld, vandaag) : null, teLaat: gisterenVergeten ? 1 : 0, nodig: nodig && !vandaagGedaan, vandaagGedaan: vandaagGedaan && !!kok(vandaag), beurt, reden: beurt ? "heeft het langst geen restjes weggezet (de kok niet)" : undefined, minuten: minutenVan(s, k) };
}

/** Werkt iemand tot laat (na 21.30) of de hele dag nog? Dan doet die vandaag geen klussen meer. */
function bezigTotLaat(s: FamilyState, id: string, nu: Date) {
  const b = werktNu(s, id, nu);
  return !!b && nu.getHours() * 60 + nu.getMinutes() + b.rest > 21 * 60 + 30;
}

/**
  Wie is er aan de beurt: wie het het langst niet gedaan heeft.
  Wie nu vrij is gaat voor. Wie aan het werk of op school is, krijgt het "voor straks". Wie tot laat werkt, slaat over.
*/
export function beurtVoor(s: FamilyState, k: Klus, nu = new Date()): Member | undefined {
  const pool = (k.iedereen ? s.members.filter((m) => m.joined !== false) : kidsVan(s)).filter((m) => !bezigTotLaat(s, m.id, nu));
  if (!pool.length) return undefined;
  const lastBy = (id: string) => {
    const log = s.klusLog ?? [];
    for (let i = log.length - 1; i >= 0; i--) if (log[i].klus === k.id && log[i].by === id) return new Date(log[i].at).getTime();
    return 0;
  };
  const bezig = (id: string) => (werktNu(s, id, nu) ? 1 : 0);
  return [...pool].sort((a, b) => bezig(a.id) - bezig(b.id) || lastBy(a.id) - lastBy(b.id))[0];
}

/** Hoeveel rommel ligt er? Voor de huiskamer: elke klus die te laat is geeft een rommeltje. */
export function rommel(s: FamilyState, nu = new Date()): string[] {
  return klusStatus(s, nu)
    .filter((x) => x.teLaat > 0)
    .sort((a, b) => b.teLaat - a.teLaat)
    .map((x) => x.klus.rommel)
    .slice(0, 6);
}

/* ---------- Koken ---------- */

export const kookplan = (s: FamilyState, d = iso(new Date())): Kookplan => s.koken?.[d] ?? {};
export const isGeregeld = (p: Kookplan) => !!p.kok || !!p.restjes;

/** Restjes mag, behalve als gisteren ook al restjes waren (max 2 dagen hetzelfde). */
export function magRestjes(s: FamilyState, d = iso(new Date())): boolean {
  const gisteren = kookplan(s, addDays(d, -1));
  return !!gisteren.kok && !gisteren.restjes;
}

/** Wie is er rond etenstijd (18:30) aan het werk? */
export function werktTijdensEten(s: FamilyState, id: string, d = iso(new Date())): boolean {
  return !!werktNu(s, id, new Date(d + "T18:30:00"));
}

/** Wie eet er mee: gekozen, of anders iedereen die er dan is. */
export function eters(s: FamilyState, d = iso(new Date())): string[] {
  const p = kookplan(s, d);
  if (p.eters) return p.eters;
  return s.members.filter((m) => m.joined !== false && !werktTijdensEten(s, m.id, d)).map((m) => m.id);
}

/** Honger: na 18:00 en er kookt niemand, of laat op de dag nog niks gegeten. */
export function honger(s: FamilyState, id: string, nu = new Date()): boolean {
  const h = nu.getHours();
  const d = iso(nu);
  const log = dagLog(s, id, d);
  if (h >= 18 && h < 23 && !gegeten(log, "avondeten") && !isGeregeld(kookplan(s, d)) && eters(s, d).includes(id)) return true;
  if (h >= 14 && h < 18 && !gegeten(log, "lunch")) return true;
  return h >= 20 && h < 23 && !gegeten(log, "avondeten");
}

/* ---------- Gezinspotje ---------- */

export const euro = (c: number) => `€ ${(c / 100).toFixed(2).replace(".", ",")}`;
export const potStand = (s: FamilyState) => (s.pot?.items ?? []).reduce((a, x) => a + (x.soort === "uitgave" ? -x.cents : x.cents), 0);
/** Wie heeft er het meest aan bijgedragen (statiegeld, beloningen, inleg)? */
export function bijdragen(s: FamilyState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of s.pot?.items ?? []) {
    if (x.soort === "uitgave") continue;
    const wie = x.voor ?? x.by;
    out[wie] = (out[wie] ?? 0) + x.cents;
  }
  return out;
}

export const BELONINGEN: { reden: string; cents: number; emoji: string }[] = [
  { reden: "Huiswerk gemaakt", cents: 50, emoji: "📚" },
  { reden: "Goed geleerd voor een toets", cents: 100, emoji: "🎯" },
  { reden: "Hele dag de app bijgehouden", cents: 25, emoji: "📱" },
  { reden: "Uit zichzelf geholpen", cents: 50, emoji: "🙌" },
];

/** "€ 2,50" of "2.5" of "2,50" → centen. */
export function parseEuro(t: string): number {
  const n = Number(t.replace(/[€\s]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

/* ---------- Werkweek ---------- */

const DAG = ["zo", "ma", "di", "wo", "do", "vr", "za"];
export const dagKort = (d: string) => DAG[new Date(d + "T12:00:00").getDay()];

/** Maandag van de week waarin d valt. */
export function maandag(d = iso(new Date())): string {
  const wd = new Date(d + "T12:00:00").getDay();
  return addDays(d, wd === 0 ? -6 : 1 - wd);
}

export const vrijKey = (member: string, werkId: string) => `${member}:${werkId}`;
export const isVrij = (s: FamilyState, d: string, member: string, werkId: string) => !!s.vrij?.[d]?.includes(vrijKey(member, werkId));

/** Al het werk van iemand op een dag: vast werk (vanzelf ingevuld) en losse diensten. */
export function werkOp(s: FamilyState, member: string, d: string): { werk: WerkItem; van: string; tot: string; vrij: boolean; dienstId?: string }[] {
  const wd = new Date(d + "T12:00:00").getDay();
  const lijst = s.werk?.[member] ?? [];
  const vakantie = (s.vakanties?.[member] ?? []).some((v) => d >= v.van && d <= v.tot);
  const vast = lijst
    .filter((w) => w.soort === "vast" && w.days?.includes(wd) && w.van && w.tot)
    .map((w) => ({ werk: w, van: w.van!, tot: w.tot!, vrij: isVrij(s, d, member, w.id) || (vakantie && lookVoor(w) === "school") }));
  const los = (s.diensten ?? [])
    .filter((x) => x.member === member && x.date === d)
    .map((x) => ({ werk: lijst.find((w) => w.id === x.werkId) ?? { id: x.werkId, naam: "Werk", soort: "wisselend" as const }, van: x.van, tot: x.tot, vrij: false, dienstId: x.id }));
  // Lesrooster uit Somtoday (alleen als er geen eigen schooltijden staan).
  const heeftSchool = vast.some((v) => lookVoor(v.werk) === "school");
  const les = !heeftSchool ? (s.rooster?.[member] ?? []).find((r) => r.date === d) : undefined;
  const somLes = les ? [{ werk: { id: "somtoday", naam: `School (${les.lessen} ${les.lessen === 1 ? "les" : "lessen"})`, soort: "wisselend" as const, look: "school" as const }, van: les.van, tot: les.tot, vrij: vakantie, dienstId: "somtoday" }] : [];
  return [...vast, ...los, ...somLes].sort((a, b) => a.van.localeCompare(b.van));
}

/** Leesbare naam van een klus in een lijst. */
export const naamKlus = (k: KlusStatus, me: string) => (k.klus.perKind && k.kind ? (k.kind.id === me ? "Je kamer netjes" : `Kamer van ${k.kind.name}`) : k.klus.label);

export type WerkTaak = { key: string; naam: string; van: string; tot: string; status: "vrij" | "gepland" | "bezig" | "gedaan"; pct: number; werkId: string; dienstId?: string; school: boolean };

/**
  Werk en school als vaste taken van vandaag. Staat er vanzelf in (vast werk, diensten, lesrooster).
  Na de eindtijd telt het als gedaan, je hoeft niks af te vinken. Vrij genomen? Klik het weg.
*/
export function werkTaken(s: FamilyState, member: string, nu = new Date()): WerkTaak[] {
  const d = iso(nu);
  const nuMin = nu.getHours() * 60 + nu.getMinutes();
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  // Nachtdienst van gisteren die nog loopt (bv. security 20.00–02.00).
  const nacht = werkOp(s, member, addDays(d, -1))
    .filter((w) => !w.vrij && m(w.tot) <= m(w.van) && nuMin < m(w.tot))
    .map((w): WerkTaak => ({ key: `gisteren:${w.werk.id}:${w.dienstId ?? w.van}`, naam: w.werk.naam, van: w.van, tot: w.tot, status: "bezig", pct: (nuMin + 1440 - m(w.van)) / (m(w.tot) + 1440 - m(w.van)), werkId: w.werk.id, dienstId: w.dienstId, school: false }));
  return [...nacht, ...werkOp(s, member, d).map((w) => {
    const a = m(w.van);
    let b = m(w.tot);
    if (b <= a) b += 1440;
    const status: WerkTaak["status"] = w.vrij ? "vrij" : nuMin >= b ? "gedaan" : nuMin >= a ? "bezig" : "gepland";
    return {
      key: `${w.werk.id}:${w.dienstId ?? w.van}`,
      naam: w.werk.naam,
      van: w.van,
      tot: w.tot,
      status,
      pct: status === "gedaan" ? 1 : status === "bezig" ? (nuMin - a) / (b - a) : 0,
      werkId: w.werk.id,
      dienstId: w.dienstId,
      school: lookVoor(w.werk) === "school",
    };
  })];
}

/**
  Bestaat deze taak al als huistaak? Dan niet nog een keer als losse taak (anders twee keer in de lijst en twee keer punten).
  Vergelijkt de naam zonder hoofdletters en leestekens; "Vaatwasser inruimen" past ook bij "Vaatwasser inruimen en aanzetten".
*/
export function huistaakVoor(s: FamilyState, titel: string): Klus | undefined {
  const kaal = (t: string) => t.toLowerCase().split(" (")[0].replace(/[^a-zà-ÿ0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const t = kaal(titel);
  if (t.length < 4) return undefined;
  return alleKlussen(s).find((k) => klusAan(s, k) && !k.perKind && (kaal(k.label) === t || kaal(k.label).startsWith(t + " ") || t.startsWith(kaal(k.label) + " ")));
}
