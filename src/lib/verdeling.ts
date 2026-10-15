/*
  Eerlijke klussenverdeling. Geen discussie meer over "wie is er aan de beurt".

  Elke dag maakt de app één vaste verdeling, die de hele dag hetzelfde blijft:
  - Wat moet er vandaag? Alles wat aan de beurt is volgens de logboeken tot en met gisteren.
  - Hoeveel mag je verwachten? Op een schooldag weinig, op een vrije dag meer. Werken de ouders, dan doen
    de kinderen die vrij zijn een stukje extra. Ouders die werken krijgen bijna niks.
  - Wie krijgt wat? Wie de laatste 2 weken het minst deed. Wie een klus vaak deed, krijgt hem niet weer
    (dus niet steeds dezelfde de vaatwasser). Wie tot laat werkt of op school zit, slaat over.
  - Zitten kinderen op een vrije dag nog onder hun verwachting, dan krijgen ze er een klus bij die binnenkort moet.
  Een uitdaging (steen-papier-schaar) of een ouder kan een klus daarna nog wisselen.
  Wie verliest en de klus doet, krijgt die punten gewoon: de volgende dagen krijgt die dan juist minder.
*/

import { addDays, iso } from "./planner";
import { KLUSSEN, klusKey, werkOp, type Klus } from "./huis";
import { lookVoor } from "./status";
import type { FamilyState, Member } from "./types";

export type DagSoort = "school" | "vrij" | "weekend" | "vakantie" | "werk";
export interface Verwachting {
  id: string;
  soort: DagSoort;
  /** Doel in klus-punten voor vandaag. */
  doel: number;
  /** Uitleg voor ouders: "vrij, papa en mama werken". */
  reden: string;
}
export interface Verdeling {
  /** klusKey → lidId */
  wie: Record<string, string>;
  /** Klussen die er op een vrije dag bij zijn gekomen (moeten nog niet, maar mogen alvast). */
  extra: Set<string>;
  verwachting: Record<string, Verwachting>;
  /** Punten die iedereen vandaag toegewezen kreeg. */
  vandaag: Record<string, number>;
}

const leden = (s: FamilyState) => s.members.filter((m) => m.joined !== false);
const isKind = (m: Member) => m.role !== "ouder";
const dagenTussen = (a: string, b: string) => Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 864e5);
const xpVan = (key: string) => KLUSSEN.find((k) => k.id === key.split(":")[0])?.xp ?? 5;
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Klein, vast getal uit een tekst: zelfde dag = zelfde uitkomst bij gelijke stand. */
function hash(t: string) {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

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
  const wd = new Date(d + "T12:00:00").getDay();
  const weekend = wd === 0 || wd === 6;
  const ouders = leden(s).filter((x) => !isKind(x));
  const ouderNamen = ouders.filter((o) => werkt(s, o.id, d)).map((o) => o.name.toLowerCase());
  const allemaalAanHetWerk = ouders.length > 0 && ouderNamen.length === ouders.length;
  if (!isKind(m)) {
    if (totLaat(s, m.id, d)) return { id: m.id, soort: "werk", doel: 0, reden: "werkt tot laat" };
    if (werkt(s, m.id, d)) return { id: m.id, soort: "werk", doel: 5, reden: "werkt" };
    return { id: m.id, soort: weekend ? "weekend" : "vrij", doel: 15, reden: "thuis" };
  }
  const vakantie = (s.vakanties?.[m.id] ?? []).some((v) => d >= v.van && d <= v.tot);
  const werkTekst = allemaalAanHetWerk ? (ouderNamen.length > 1 ? `${ouderNamen.join(" en ")} werken` : `${ouderNamen[0]} werkt`) : "";
  if (opSchool(s, m.id, d)) return { id: m.id, soort: "school", doel: 10, reden: "schooldag" };
  if (weekend) return { id: m.id, soort: "weekend", doel: 15, reden: "weekend" };
  const soort: DagSoort = vakantie ? "vakantie" : "vrij";
  return { id: m.id, soort, doel: allemaalAanHetWerk ? 25 : 20, reden: [vakantie ? "vakantie" : "vrij", werkTekst].filter(Boolean).join(", ") };
}

/** Klus-punten per lid in de 14 dagen vóór d, en hoe vaak per klus. */
function belasting(s: FamilyState, d: string) {
  const van = addDays(d, -14);
  const punten: Record<string, number> = {};
  const perKlus: Record<string, number> = {};
  const laatstDoor: Record<string, number> = {};
  for (const k of s.klusLog ?? []) {
    const dag = iso(new Date(k.at));
    if (dag >= d) continue;
    const basis = k.klus.split(":")[0];
    laatstDoor[`${basis}|${k.by}`] = Math.max(laatstDoor[`${basis}|${k.by}`] ?? 0, new Date(k.at).getTime());
    if (dag < van) continue;
    punten[k.by] = (punten[k.by] ?? 0) + xpVan(k.klus);
    perKlus[`${basis}|${k.by}`] = (perKlus[`${basis}|${k.by}`] ?? 0) + 1;
  }
  return { punten, perKlus, laatstDoor };
}

/** Laatst gedaan vóór dag d (dus wat er vandaag al gebeurde telt niet: de verdeling blijft de hele dag gelijk). */
function laatstVoor(s: FamilyState, key: string, d: string): string | null {
  const log = s.klusLog ?? [];
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].klus !== key) continue;
    const dag = iso(new Date(log[i].at));
    if (dag < d) return dag;
  }
  return null;
}

const cache = new WeakMap<FamilyState, Map<string, Verdeling>>();

/** De verdeling van dag d. Zelfde stand = zelfde uitkomst, dus iedereen ziet op elke telefoon hetzelfde. */
export function verdeling(s: FamilyState, d = iso(new Date())): Verdeling {
  const c = cache.get(s)?.get(d);
  if (c) return c;
  const alle = leden(s);
  const kids = alle.filter(isKind);
  const verw: Record<string, Verwachting> = Object.fromEntries(alle.map((m) => [m.id, verwachting(s, m, d)]));
  const { punten, perKlus, laatstDoor } = belasting(s, d);
  const vandaag: Record<string, number> = Object.fromEntries(alle.map((m) => [m.id, 0]));
  const wie: Record<string, string> = {};
  const extra = new Set<string>();

  const kies = (k: Klus, key: string, pool: Member[]) => {
    const kandidaten = pool.filter((m) => !totLaat(s, m.id, d) && verw[m.id].doel > 0);
    if (!kandidaten.length) return undefined;
    const score = (m: Member) => {
      const vol = vandaag[m.id] >= verw[m.id].doel ? 1000 : 0;
      // Hoe zwaar zit je, naar wat je aankunt: wie vandaag minder kan, telt zwaarder.
      const last = ((punten[m.id] ?? 0) + vandaag[m.id] * 2) / Math.max(5, verw[m.id].doel);
      const zelfde = (perKlus[`${k.id}|${m.id}`] ?? 0) * 0.6;
      const lang = -(new Date(d + "T12:00:00").getTime() - (laatstDoor[`${k.id}|${m.id}`] ?? 0)) / 864e5 / 1000;
      return vol + last + zelfde + lang + hash(`${d}|${key}|${m.id}`) * 0.01;
    };
    return [...kandidaten].sort((a, b) => score(a) - score(b))[0];
  };

  // 1. Wat moet er vandaag? Eerst de zware klussen, dan de lichte.
  const moet: { k: Klus; key: string; kind?: Member }[] = [];
  const kan: { k: Klus; key: string }[] = [];
  for (const k of KLUSSEN) {
    if (k.naKoken) continue; // restjes: regelt de koelkast-logica (na het eten, niet de kok)
    const rijen = k.perKind ? kids.map((m) => ({ key: klusKey(k, m.id), kind: m as Member | undefined })) : [{ key: k.id, kind: undefined }];
    for (const r of rijen) {
      const l = laatstVoor(s, r.key, d);
      const ago = l ? dagenTussen(l, d) : null;
      if (k.elke === 1 || (ago !== null && ago >= k.elke) || (r.kind && ago === null)) moet.push({ k, key: r.key, kind: r.kind });
      else if (!r.kind && (ago === null || ago >= k.elke - 1)) kan.push({ k, key: r.key });
    }
  }
  moet.sort((a, b) => b.k.xp - a.k.xp || a.key.localeCompare(b.key));
  for (const m of moet) {
    const lid = m.kind ?? kies(m.k, m.key, m.k.iedereen ? alle : kids);
    if (!lid) continue;
    wie[m.key] = lid.id;
    vandaag[lid.id] += m.k.xp;
  }

  // 2. Vrije dag en nog weinig te doen? Dan alvast iets dat binnenkort moet. Zo is een vrije dag geen luie dag.
  kan.sort((a, b) => b.k.xp - a.k.xp || hash(d + a.key) - hash(d + b.key));
  for (const x of kan) {
    const nodig = kids.filter((m) => verw[m.id].soort !== "school" && vandaag[m.id] < verw[m.id].doel);
    if (!nodig.length) break;
    const lid = kies(x.k, x.key, nodig);
    if (!lid || vandaag[lid.id] + x.k.xp > verw[lid.id].doel + 10) continue;
    wie[x.key] = lid.id;
    vandaag[lid.id] += x.k.xp;
    extra.add(x.key);
  }

  // 3. Gewisseld door een uitdaging of een ouder.
  for (const [key, id] of Object.entries(s.ruil?.[d] ?? {})) {
    if (wie[key] && alle.some((m) => m.id === id)) {
      vandaag[wie[key]] -= xpVan(key);
      vandaag[id] = (vandaag[id] ?? 0) + xpVan(key);
      wie[key] = id;
    }
  }

  const uit: Verdeling = { wie, extra, verwachting: verw, vandaag };
  if (!cache.has(s)) cache.set(s, new Map());
  cache.get(s)!.set(d, uit);
  return uit;
}

/** Eerlijk verdeeld? Klus-punten per lid over de laatste 14 dagen (vandaag meegeteld). */
export function eerlijk(s: FamilyState, nu = new Date()): { id: string; punten: number; klussen: number; vaakst?: string }[] {
  const van = addDays(iso(nu), -13);
  return leden(s).map((m) => {
    const log = (s.klusLog ?? []).filter((k) => k.by === m.id && iso(new Date(k.at)) >= van);
    const tel: Record<string, number> = {};
    for (const k of log) tel[k.klus.split(":")[0]] = (tel[k.klus.split(":")[0]] ?? 0) + 1;
    const top = Object.entries(tel).sort((a, b) => b[1] - a[1])[0];
    return { id: m.id, punten: log.reduce((a, k) => a + xpVan(k.klus), 0), klussen: log.length, vaakst: top && top[1] >= 3 ? top[0] : undefined };
  });
}

/* ---------- Uitdaging: steen-papier-schaar ---------- */

export type Hand = "steen" | "papier" | "schaar";
export const HANDEN: { id: Hand; emoji: string; label: string }[] = [
  { id: "steen", emoji: "✊", label: "Steen" },
  { id: "papier", emoji: "✋", label: "Papier" },
  { id: "schaar", emoji: "✌️", label: "Schaar" },
];
/** 1 = a wint, -1 = b wint, 0 = gelijk. */
export const winnaar = (a: Hand, b: Hand) => (a === b ? 0 : (a === "steen" && b === "schaar") || (a === "papier" && b === "steen") || (a === "schaar" && b === "papier") ? 1 : -1);

/** Hoe vaak op rij verloren (laatste 7 dagen)? */
export function pech(s: FamilyState, id: string, nu = new Date()): number {
  const grens = nu.getTime() - 7 * 864e5;
  const mijn = (s.uitdagingen ?? []).filter((u) => u.spelers.includes(id) && new Date(u.at).getTime() > grens);
  let n = 0;
  for (let i = mijn.length - 1; i >= 0; i--) {
    if (mijn[i].verliezer !== id) break;
    n++;
  }
  return n;
}
/** 2 keer op rij verloren = joker: je begint de volgende uitdaging met 1–0 voor. */
export const heeftJoker = (s: FamilyState, id: string, nu = new Date()) => pech(s, id, nu) >= 2;
/** Vandaag al 3 keer verloren: genoeg pech gehad, je kunt vandaag niet meer uitgedaagd worden. */
export const genoegPech = (s: FamilyState, id: string, nu = new Date()) =>
  (s.uitdagingen ?? []).filter((u) => u.verliezer === id && iso(new Date(u.at)) === iso(nu)).length >= 3;
/** Hooguit 3 uitdagingen per dag starten. */
export const magUitdagen = (s: FamilyState, id: string, nu = new Date()) =>
  (s.uitdagingen ?? []).filter((u) => u.spelers[0] === id && iso(new Date(u.at)) === iso(nu)).length < 3;
