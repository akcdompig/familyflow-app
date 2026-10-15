/*
  Eerlijke klussenverdeling. Geen discussie meer over "wie is er aan de beurt".

  Uitgangspunten:
  - Eerlijk = eerlijk in TIJD, niet in aantal. 5 minuten afval is niet hetzelfde als 30 minuten was.
  - Elke dag één vaste verdeling. Die blijft de hele dag gelijk, en is op elke telefoon hetzelfde.
  - Wat je mag verwachten hangt af van je dag: schooldag weinig, vrije dag meer, werken de ouders dan nog iets meer.
    Een ouder die werkt krijgt bijna niks. Vrijstelling (ziek, toets) = vandaag niks, en dat telt niet als achterstand.
  - Wie de laatste 2 weken het minst deed (naar wat hij/zij aankan), krijgt de klus. Wie een klus vaak deed, krijgt
    hem minder snel. Wie op school zit of tot laat werkt, slaat over. Te jong voor een klus? Dan niet.
  - Zonder afspraken van de ouders geldt het VOORSTEL van de app. Dat is overal zichtbaar als voorstel.
  - Daarna kan het nog wisselen: samen beslist (spel, loting, om de beurt, samen doen) of door een ouder.
    Doe je een klus die je via een spel kreeg, dan tellen die minuten gewoon: de dagen erna krijg je juist minder.
*/

import { addDays, iso } from "./planner";
import { KLUSSEN, klusKey, werkOp, type Klus } from "./huis";
import { lookVoor } from "./status";
import type { FamilyState, Member } from "./types";

export type DagSoort = "school" | "vrij" | "weekend" | "vakantie" | "werk" | "vrijstelling";
export interface Verwachting {
  id: string;
  soort: DagSoort;
  /** Verwachte minuten klussen vandaag. */
  doel: number;
  /** Uitleg: "vrij, papa en mama werken". */
  reden: string;
}
export interface Verdeling {
  /** klusKey → lidId */
  wie: Record<string, string>;
  /** Klus samen doen: klusKey → de partner. */
  mee: Record<string, string>;
  /** Waarom deze persoon (zonder naam ervoor: "deed dit de laatste 2 weken het minst"). */
  reden: Record<string, string>;
  /** Klussen die er op een vrije dag bij kwamen (moeten nog niet, mogen alvast). */
  extra: Set<string>;
  verwachting: Record<string, Verwachting>;
  /** Minuten die iedereen vandaag kreeg. */
  vandaag: Record<string, number>;
}

const leden = (s: FamilyState) => s.members.filter((m) => m.joined !== false);
const isKind = (m: Member) => m.role !== "ouder";
const dagenTussen = (a: string, b: string) => Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 864e5);
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const basisVan = (key: string) => key.split(":")[0];
const klusVan = (key: string) => KLUSSEN.find((k) => k.id === basisVan(key));

/** Klein, vast getal uit een tekst: zelfde dag = zelfde uitkomst bij gelijke stand. */
export function hash(t: string) {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/* ---------- Afspraken (of het voorstel) ---------- */

export const isVastgelegd = (s: FamilyState) => !!s.klusAfspraken?.vastgelegd;
export const klusAan = (s: FamilyState, k: Klus) => s.klusAfspraken?.klussen?.[k.id]?.aan ?? true;
export const minutenVan = (s: FamilyState, k: Klus) => s.klusAfspraken?.klussen?.[k.id]?.minuten ?? k.minuten;
export const minutenKey = (s: FamilyState, key: string) => {
  const k = klusVan(key);
  return k ? minutenVan(s, k) : 10;
};
/** Mag dit lid deze klus doen? Afspraak gaat voor; anders: ouders altijd, kinderen vanaf de voorgestelde leeftijd. */
export function magDoen(s: FamilyState, m: Member, k: Klus): boolean {
  const a = s.klusAfspraken?.klussen?.[k.id];
  if (a?.niet?.includes(m.id)) return false;
  if (a?.wel?.includes(m.id)) return true;
  if (!isKind(m)) return true;
  return m.age === undefined || m.age >= k.vanaf;
}
/** Standaard verwachting (minuten) voor een kind, als de ouders niks hebben ingesteld. */
export function standaardVerwachting(m: Member) {
  const jong = m.age !== undefined && m.age < 10;
  return { school: jong ? 10 : 15, vrij: jong ? 20 : 25 };
}
export function eigenVerwachting(s: FamilyState, m: Member) {
  return { ...standaardVerwachting(m), ...stripUndef(s.klusAfspraken?.verwachting?.[m.id]) };
}
function stripUndef<T extends object>(o?: T): Partial<T> {
  return Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
}

/* ---------- Wie is er wanneer? ---------- */

function werkt(s: FamilyState, id: string, d: string) {
  return werkOp(s, id, d).some((w) => !w.vrij && lookVoor(w.werk) !== "school");
}
function opSchool(s: FamilyState, id: string, d: string) {
  return werkOp(s, id, d).some((w) => !w.vrij && lookVoor(w.werk) === "school");
}
/** Werkt tot na half 10 's avonds (of 's nachts): die dag geen klussen. */
function totLaat(s: FamilyState, id: string, d: string) {
  return werkOp(s, id, d).some((w) => !w.vrij && lookVoor(w.werk) !== "school" && (mins(w.tot) <= mins(w.van) || mins(w.tot) > 21 * 60 + 30));
}

export function verwachting(s: FamilyState, m: Member, d: string): Verwachting {
  const vrijst = s.vrijstelling?.[d]?.[m.id];
  if (vrijst) return { id: m.id, soort: "vrijstelling", doel: 0, reden: `vrijstelling: ${vrijst}` };
  const wd = new Date(d + "T12:00:00").getDay();
  const weekend = wd === 0 || wd === 6;
  if (!isKind(m)) {
    if (totLaat(s, m.id, d)) return { id: m.id, soort: "werk", doel: 0, reden: "werkt tot laat" };
    if (werkt(s, m.id, d)) return { id: m.id, soort: "werk", doel: 5, reden: "werkt" };
    return { id: m.id, soort: weekend ? "weekend" : "vrij", doel: 30, reden: "thuis" };
  }
  const ouders = leden(s).filter((x) => !isKind(x));
  const werkend = ouders.filter((o) => werkt(s, o.id, d)).map((o) => o.name.toLowerCase());
  const allemaal = ouders.length > 0 && werkend.length === ouders.length;
  const eigen = eigenVerwachting(s, m);
  const vakantie = (s.vakanties?.[m.id] ?? []).some((v) => d >= v.van && d <= v.tot);
  if (opSchool(s, m.id, d)) return { id: m.id, soort: "school", doel: eigen.school, reden: "schooldag" };
  if (weekend) return { id: m.id, soort: "weekend", doel: Math.round((eigen.vrij * 0.8) / 5) * 5, reden: "weekend" };
  const werkTekst = allemaal ? (werkend.length > 1 ? `${werkend.join(" en ")} werken` : `${werkend[0]} werkt`) : "";
  return { id: m.id, soort: vakantie ? "vakantie" : "vrij", doel: eigen.vrij + (allemaal ? 10 : 0), reden: [vakantie ? "vakantie" : "vrij", werkTekst].filter(Boolean).join(", ") };
}

/* ---------- Geschiedenis ---------- */

/** Minuten per lid in de 14 dagen vóór d, hoe vaak per klus, en wanneer het laatst per klus. */
function belasting(s: FamilyState, d: string) {
  const van = addDays(d, -14);
  const punten: Record<string, number> = {};
  const perKlus: Record<string, number> = {};
  const laatstDoor: Record<string, number> = {};
  for (const k of s.klusLog ?? []) {
    const dag = iso(new Date(k.at));
    if (dag >= d) continue;
    const b = basisVan(k.klus);
    laatstDoor[`${b}|${k.by}`] = Math.max(laatstDoor[`${b}|${k.by}`] ?? 0, new Date(k.at).getTime());
    if (dag < van) continue;
    punten[k.by] = (punten[k.by] ?? 0) + minutenKey(s, k.klus) / (k.samen ? 2 : 1);
    perKlus[`${b}|${k.by}`] = (perKlus[`${b}|${k.by}`] ?? 0) + 1;
  }
  return { punten, perKlus, laatstDoor };
}

/** Laatst gedaan vóór dag d (wat er vandaag gebeurt telt niet: de verdeling blijft de hele dag gelijk). */
function laatstVoor(s: FamilyState, key: string, d: string): string | null {
  const log = s.klusLog ?? [];
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].klus !== key) continue;
    const dag = iso(new Date(log[i].at));
    if (dag < d) return dag;
  }
  return null;
}

/* ---------- De verdeling ---------- */

const cache = new WeakMap<FamilyState, Map<string, Verdeling>>();

export function verdeling(s: FamilyState, d = iso(new Date())): Verdeling {
  const c = cache.get(s)?.get(d);
  if (c) return c;
  const uit = bereken(s, d);
  if (!cache.has(s)) cache.set(s, new Map());
  cache.get(s)!.set(d, uit);
  return uit;
}

function bereken(s: FamilyState, d: string, zonder?: { key: string; id: string }): Verdeling {
  const alle = leden(s);
  const kids = alle.filter(isKind);
  const verw: Record<string, Verwachting> = Object.fromEntries(alle.map((m) => [m.id, verwachting(s, m, d)]));
  const { punten, perKlus, laatstDoor } = belasting(s, d);
  const vandaag: Record<string, number> = Object.fromEntries(alle.map((m) => [m.id, 0]));
  const wie: Record<string, string> = {};
  const mee: Record<string, string> = {};
  const reden: Record<string, string> = {};
  const extra = new Set<string>();
  const dagMs = new Date(d + "T12:00:00").getTime();

  const kies = (k: Klus, key: string, pool: Member[]) => {
    const kandidaten = pool.filter((m) => verw[m.id].doel > 0 && magDoen(s, m, k) && !(zonder && zonder.key === key && zonder.id === m.id));
    if (!kandidaten.length) return undefined;
    const last = (m: Member) => ((punten[m.id] ?? 0) + vandaag[m.id] * 2) / Math.max(10, verw[m.id].doel);
    const score = (m: Member) => {
      const vol = vandaag[m.id] + minutenVan(s, k) > verw[m.id].doel + 5 ? 1000 : 0;
      const zelfde = (perKlus[`${k.id}|${m.id}`] ?? 0) * 0.6;
      const lang = -(dagMs - (laatstDoor[`${k.id}|${m.id}`] ?? 0)) / 864e5 / 1000;
      return vol + last(m) + zelfde + lang + hash(`${d}|${key}|${m.id}`) * 0.01;
    };
    const gekozen = [...kandidaten].sort((a, b) => score(a) - score(b))[0];
    const anderen = kandidaten.filter((m) => m.id !== gekozen.id);
    reden[key] = !anderen.length
      ? "is de enige die het vandaag kan"
      : anderen.every((m) => (perKlus[`${k.id}|${m.id}`] ?? 0) > (perKlus[`${k.id}|${gekozen.id}`] ?? 0))
        ? "deed deze klus de laatste 2 weken het minst"
        : anderen.every((m) => last(m) >= last(gekozen))
          ? "heeft de laatste 2 weken het minst gedaan"
          : "zo is het vandaag het eerlijkst verdeeld";
    return gekozen;
  };

  // 1. Wat moet er vandaag? Eerst de langste klussen, dan de korte.
  const moet: { k: Klus; key: string; kind?: Member }[] = [];
  const kan: { k: Klus; key: string }[] = [];
  for (const k of KLUSSEN) {
    if (k.naKoken || !klusAan(s, k)) continue; // restjes: regelt de koelkast-logica (na het eten, niet de kok)
    const rijen = k.perKind ? kids.map((m) => ({ key: klusKey(k, m.id), kind: m as Member | undefined })) : [{ key: k.id, kind: undefined }];
    for (const r of rijen) {
      const l = laatstVoor(s, r.key, d);
      const ago = l ? dagenTussen(l, d) : null;
      if (k.elke === 1 || (ago !== null && ago >= k.elke) || (r.kind && ago === null)) moet.push({ k, key: r.key, kind: r.kind });
      else if (!r.kind && (ago === null || ago >= k.elke - 1)) kan.push({ k, key: r.key });
    }
  }
  // Even lang? Dan eerst de klus waar het verschil tussen mensen het grootst is (wie hem vaak deed, krijgt hem niet weer).
  const scheefKlus = (k: Klus) => {
    const n = (k.iedereen ? alle : kids).map((m) => perKlus[`${k.id}|${m.id}`] ?? 0);
    return n.length ? Math.max(...n) - Math.min(...n) : 0;
  };
  moet.sort((a, b) => minutenVan(s, b.k) - minutenVan(s, a.k) || scheefKlus(b.k) - scheefKlus(a.k) || a.key.localeCompare(b.key));
  for (const m of moet) {
    let lid: Member | undefined;
    if (m.kind) {
      lid = verw[m.kind.id].doel > 0 ? m.kind : undefined;
      if (lid) reden[m.key] = "het is je eigen kamer";
    } else lid = kies(m.k, m.key, m.k.iedereen ? alle : kids);
    if (!lid) continue;
    wie[m.key] = lid.id;
    vandaag[lid.id] += minutenVan(s, m.k);
  }

  // 2. Vrije dag en nog ruimte? Dan hooguit één klus erbij die binnenkort toch moet. Zo is vrij geen luie dag,
  //    maar rust blijft rust: nooit meer dan één, en nooit boven de verwachting uit.
  kan.sort((a, b) => minutenVan(s, b.k) - minutenVan(s, a.k) || hash(d + a.key) - hash(d + b.key));
  const kreegExtra = new Set<string>();
  for (const x of kan) {
    const ruimte = kids.filter((m) => verw[m.id].soort !== "school" && verw[m.id].doel > 0 && !kreegExtra.has(m.id) && vandaag[m.id] < verw[m.id].doel && vandaag[m.id] + minutenVan(s, x.k) <= verw[m.id].doel + 5);
    if (!ruimte.length) continue;
    const lid = kies(x.k, x.key, ruimte);
    if (!lid) continue;
    wie[x.key] = lid.id;
    vandaag[lid.id] += minutenVan(s, x.k);
    reden[x.key] = "is vandaag vrij, dus deze mag alvast";
    extra.add(x.key);
    kreegExtra.add(lid.id);
  }

  // 3. Gewisseld: samen beslist, of door een ouder.
  const besluit = (key: string) => [...(s.uitdagingen ?? [])].reverse().find((u) => u.klus === key && iso(new Date(u.at)) === d);
  for (const [key, id] of Object.entries(s.ruil?.[d] ?? {})) {
    if (!wie[key] || !alle.some((m) => m.id === id) || wie[key] === id) continue;
    if (zonder && zonder.key === key && zonder.id === id) continue;
    const min = minutenKey(s, key);
    vandaag[wie[key]] -= min;
    vandaag[id] = (vandaag[id] ?? 0) + min;
    wie[key] = id;
    reden[key] = besluit(key) ? "samen beslist" : "ingedeeld door een ouder";
  }
  for (const [key, partner] of Object.entries(s.samenDoen?.[d] ?? {})) {
    if (!wie[key] || wie[key] === partner || !alle.some((m) => m.id === partner)) continue;
    const half = Math.round(minutenKey(s, key) / 2);
    vandaag[wie[key]] -= half;
    vandaag[partner] = (vandaag[partner] ?? 0) + half;
    mee[key] = partner;
    reden[key] = "doen jullie samen";
  }

  return { wie, mee, reden, extra, verwachting: verw, vandaag };
}

/** Wie is de beste volgende voor deze klus als `zonder` hem vandaag niet kan? (Voor "lukt me niet".) */
export function volgende(s: FamilyState, d: string, key: string, zonder: string): string | undefined {
  const v = bereken(s, d, { key, id: zonder });
  const w = v.wie[key];
  return w && w !== zonder ? w : undefined;
}

/* ---------- Overzicht voor ouders ---------- */

/** Minuten en klussen per lid over de laatste 14 dagen (vandaag meegeteld). */
export function eerlijk(s: FamilyState, nu = new Date()): { id: string; minuten: number; klussen: number; vaakst?: string }[] {
  const van = addDays(iso(nu), -13);
  return leden(s).map((m) => {
    const log = (s.klusLog ?? []).filter((k) => k.by === m.id && iso(new Date(k.at)) >= van);
    const tel: Record<string, number> = {};
    for (const k of log) tel[basisVan(k.klus)] = (tel[basisVan(k.klus)] ?? 0) + 1;
    const top = Object.entries(tel).sort((a, b) => b[1] - a[1])[0];
    return { id: m.id, minuten: Math.round(log.reduce((a, k) => a + minutenKey(s, k.klus) / (k.samen ? 2 : 1), 0)), klussen: log.length, vaakst: top && top[1] >= 4 && top[1] / log.length > 0.5 ? top[0] : undefined };
  });
}

/**
  Signaal voor ouders (alleen zij zien het): is het scheef gegroeid tussen de kinderen?
  Rekening gehouden met wat je mag verwachten: wie meer schooldagen had, hoeft ook minder.
*/
export function scheef(s: FamilyState, nu = new Date()): { veel: string; weinig: string; tekst: string } | null {
  const kids = leden(s).filter(isKind);
  if (kids.length < 2) return null;
  const e = eerlijk(s, nu);
  const verw = (m: Member) => {
    let t = 0;
    for (let i = 0; i < 14; i++) t += verwachting(s, m, addDays(iso(nu), -i)).doel;
    return Math.max(30, t);
  };
  const r = kids.map((m) => {
    const min = e.find((x) => x.id === m.id)!.minuten;
    return { m, min, ratio: min / verw(m) };
  }).sort((a, b) => b.ratio - a.ratio);
  const hoog = r[0];
  const laag = r[r.length - 1];
  if (hoog.min - laag.min < 60 || hoog.ratio < laag.ratio * 1.6) return null;
  return { veel: hoog.m.id, weinig: laag.m.id, tekst: `${hoog.m.name} deed de laatste 2 weken ${hoog.min} minuten, ${laag.m.name} ${laag.min}. De app geeft ${laag.m.name} de komende dagen vanzelf wat meer. Wil je zelf iets wisselen?` };
}

/* ---------- Samen beslissen ---------- */

export type Hand = "steen" | "papier" | "schaar";
export const HANDEN: { id: Hand; emoji: string; label: string }[] = [
  { id: "steen", emoji: "✊", label: "Steen" },
  { id: "papier", emoji: "✋", label: "Papier" },
  { id: "schaar", emoji: "✌️", label: "Schaar" },
];
/** 1 = a wint, -1 = b wint, 0 = gelijk. */
export const winnaar = (a: Hand, b: Hand) => (a === b ? 0 : (a === "steen" && b === "schaar") || (a === "papier" && b === "steen") || (a === "schaar" && b === "papier") ? 1 : -1);

const telt = (u: { manier?: string }) => !u.manier || u.manier === "spel" || u.manier === "loting";

/** Hoe vaak op rij pech gehad bij spel of loting (laatste 7 dagen)? */
export function pech(s: FamilyState, id: string, nu = new Date()): number {
  const grens = nu.getTime() - 7 * 864e5;
  const mijn = (s.uitdagingen ?? []).filter((u) => telt(u) && u.spelers.includes(id) && new Date(u.at).getTime() > grens);
  let n = 0;
  for (let i = mijn.length - 1; i >= 0; i--) {
    if (mijn[i].verliezer !== id) break;
    n++;
  }
  return n;
}
/** 2 keer op rij pech = voorsprong: je begint met 1–0 bij het spel, en de loting valt vaker jouw kant op. */
export const heeftVoorsprong = (s: FamilyState, id: string, nu = new Date()) => pech(s, id, nu) >= 2;
/** Vandaag 3 keer pech: vandaag geen spel of loting meer. Dan alleen om de beurt of samen. */
export const genoegPech = (s: FamilyState, id: string, nu = new Date()) =>
  (s.uitdagingen ?? []).filter((u) => telt(u) && u.verliezer === id && iso(new Date(u.at)) === iso(nu)).length >= 3;
/** Hooguit 3 keer per dag samen beslissen starten. */
export const magBeslissen = (s: FamilyState, id: string, nu = new Date()) =>
  (s.uitdagingen ?? []).filter((u) => u.spelers[0] === id && iso(new Date(u.at)) === iso(nu)).length < 3;

/** Om de beurt: wie deze klus het langst niet deed, doet hem. Gelijk? Wie de laatste 2 weken minder deed. */
export function beurtTussen(s: FamilyState, key: string, a: string, b: string, d = iso(new Date())): string {
  const { punten, laatstDoor } = belasting(s, addDays(d, 1));
  const la = laatstDoor[`${basisVan(key)}|${a}`] ?? 0;
  const lb = laatstDoor[`${basisVan(key)}|${b}`] ?? 0;
  if (la !== lb) return la < lb ? a : b;
  const pa = punten[a] ?? 0;
  const pb = punten[b] ?? 0;
  if (pa !== pb) return pa < pb ? a : b;
  return hash(`${d}|${key}|${a}`) < hash(`${d}|${key}|${b}`) ? a : b;
}

/** Eerlijke loting: kans dat A de klus doet. Wie de laatste 2 weken meer deed, heeft minder kans. Voorsprong telt mee. */
export function lotKans(s: FamilyState, a: string, b: string, nu = new Date()): number {
  const { punten } = belasting(s, addDays(iso(nu), 1));
  let p = ((punten[b] ?? 0) + 30) / ((punten[a] ?? 0) + (punten[b] ?? 0) + 60);
  if (heeftVoorsprong(s, a, nu)) p *= 0.6;
  if (heeftVoorsprong(s, b, nu)) p = 1 - (1 - p) * 0.6;
  return Math.min(0.85, Math.max(0.15, p));
}
