"use client";

import { useSyncExternalStore } from "react";
import * as cloud from "./cloud";
import { demoFamily } from "./demo";
import { phoneTaskTitle, todayKey } from "./tasks";
import { XP } from "./xp";
import { DOEL, ROUTINE, basisXp, type DagLog } from "./dag";
import { nieuweBadges } from "./badges";
import { controleer as controleerAfspraak, isDubbel, schoon as schoonAfspraak, type Invoer } from "./agenda";
import { markeerGeclaimd, metHerkomst, openRegels, type OpenRegel, type Wat } from "./herkomst";
import { verdeling } from "./verdeling";
import { DAG_OEFENING_XP } from "./oefendag";
import { weekDicht } from "./week";
import { klusById as verdeelKlus } from "./huis";
import { SCENARIOS } from "./scenarios";
const routineAf = (l: DagLog) => ROUTINE.filter((r) => r.gewicht > 0).every((r) => l.routine.includes(r.id));
import type { WeekTrede, OefenToets, AgendaItem, InzetItem, InzetSoort, Kookplan, PotItem, Dienst, WerkItem, CoachRun, Quest, AvatarConfig, CalmPlan, CheckIn, Conflict, ConflictSide, FamilyState, Meeting, ProKind, Task } from "./types";

/*
  Eén store voor demo en echt.
  - Demo: alles lokaal in de browser.
  - Live: de gezinsstand staat in Supabase. Elke wijziging is een functie (oude stand → nieuwe stand).
    Wijzigt een andere telefoon tegelijk iets, dan halen we de nieuwste stand op en passen we onze
    wijzigingen daar opnieuw op toe. Zo raakt niemand iets kwijt.
  De schermen praten alleen met useFamily() en actions.
*/

type Fn = (s: FamilyState) => FamilyState;

const KEY = "familyflow:v1";
const LIVE_KEY = "familyflow:live";
const ME_KEY = "familyflow:ik";

let live = false;
let state: FamilyState = loadDemo();
let me = "";
let view: FamilyState = state;
const listeners = new Set<() => void>();

// Live-sync
let rev = 0;
let queue: Fn[] = [];
let saving = false;
let timer: number | undefined;
let syncError = "";

function migrate(raw: unknown): FamilyState | null {
  const s = raw as Partial<FamilyState> & { version?: number };
  if (!s || !Array.isArray(s.members)) return null;
  if (s.version === 3) return s as FamilyState;
  return { ...demoFamily(), ...s, version: 3 } as FamilyState;
}

function loadDemo(): FamilyState {
  if (typeof window === "undefined") return demoFamily();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const s = migrate(JSON.parse(raw));
      if (s) return s;
    }
  } catch {
    /* opslag niet beschikbaar */
  }
  return demoFamily();
}

function emit() {
  view = live ? { ...state, me } : state;
  listeners.forEach((l) => l());
}

function persistLocal() {
  try {
    if (live) window.localStorage.setItem(LIVE_KEY, JSON.stringify({ state, rev }));
    else window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* geen opslag */
  }
}

/** Wie bedient de app nu? Live: de ingelogde persoon. Demo: wie er gekozen is. */
const wieNu = (s: FamilyState) => (live ? me : s.me);
/** "Laatst actief" bijwerken, hooguit om de 3 minuten. Daarop rekenen de herinneringen. */
const stempel: Fn = (s) => {
  const id = wieNu(s);
  const oud = s.actief?.[id];
  if (!id || (oud && Date.now() - new Date(oud).getTime() < 3 * 60e3)) return s;
  return { ...s, actief: { ...(s.actief ?? {}), [id]: new Date().toISOString() } };
};

/** Iedereen een startpunt voor de schatkist: wat er al stond telt als geclaimd. */
const basis: Fn = (s0) => {
  const s = s0.badgesStart ? s0 : { ...s0, badgesStart: new Date().toISOString() };
  const mist = s.members.filter((m) => s.claim?.[m.id] === undefined);
  if (!mist.length) return s;
  return { ...s, claim: { ...(s.claim ?? {}), ...Object.fromEntries(mist.map((m) => [m.id, s.xp[m.id] ?? 0])) } };
};
/** Nieuwe achievements? Dan erbij zetten, met bonuspunten in de schatkist en een regel in "Net gedaan". */
const badgeCheck: Fn = (s) => {
  const nieuw = nieuweBadges(s);
  if (!nieuw.length) return s;
  let uit = s;
  for (const { who, def } of nieuw) {
    const at = new Date().toISOString();
    const voor = uit;
    uit = { ...uit, badges: [...(uit.badges ?? []), { id: newId("b"), who, badge: def.id, at, gezien: [] }].slice(-200), xp: addXp(uit, who, def.punten) };
    uit = metHerkomst(voor, uit, `Achievement: ${def.naam}`, at);
    uit = metFeed(uit, who, `heeft ${def.emoji} ${def.naam} gehaald!`, def.punten);
  }
  return uit;
};

/** Alle wijzigingen gaan hierdoorheen. */
function update(fn0: Fn, wat?: Wat) {
  // Herkomst: wie kreeg punten en waarvoor. Binnen fn, zodat het ook klopt als de wijziging opnieuw wordt toegepast na een sync.
  const fn: Fn = (s) => {
    const voor = basis(s);
    return stempel(badgeCheck(metHerkomst(voor, fn0(voor), wat)));
  };
  state = fn(state);
  persistLocal();
  emit();
  if (live) {
    queue.push(fn);
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, 250);
  }
}

const isOuder = (s: FamilyState) => s.members.find((m) => m.id === me)?.role === "ouder";

async function flush() {
  if (saving || !queue.length) return;
  saving = true;
  const sending = queue.length;
  try {
    const n = await cloud.saveFamily(state, rev);
    if (n >= 0) {
      rev = n;
      queue = queue.slice(sending);
      // Bij een kind voegt de database de wijziging samen volgens de rechten van een kind (zie beveiliging.sql).
      // Dan kan de opgeslagen stand iets anders zijn dan wat de telefoon dacht: meteen de echte stand ophalen.
      if (!isOuder(state) && !queue.length) {
        const fresh = await cloud.loadFamily();
        if (fresh && !queue.length && fresh.rev === rev) {
          state = fresh.state;
          emit();
        }
      }
    } else {
      // Iemand anders was ons voor: nieuwste stand ophalen en onze wijzigingen opnieuw toepassen.
      const fresh = await cloud.loadFamily();
      if (fresh) {
        rev = fresh.rev;
        state = queue.reduce((s, f) => f(s), fresh.state);
        emit();
      }
    }
    syncError = "";
  } catch (e) {
    syncError = String((e as Error).message ?? e);
    emit();
  } finally {
    saving = false;
    persistLocal();
    if (queue.length) timer = window.setTimeout(flush, syncError ? 4000 : 50);
  }
}

/** Kijk of er op een andere telefoon iets veranderd is. */
async function poll() {
  if (!live || saving || queue.length || document.visibilityState !== "visible") return;
  try {
    const r = await cloud.loadRev();
    if (r !== null && r !== rev) {
      const fresh = await cloud.loadFamily();
      if (fresh && !queue.length) {
        state = fresh.state;
        rev = fresh.rev;
        persistLocal();
        emit();
      }
    }
    if (syncError) {
      syncError = "";
      emit();
    }
  } catch (e) {
    syncError = String((e as Error).message ?? e);
    emit();
  }
}

let pollTimer: number | undefined;
/** Live-modus starten met de stand uit de database. */
export function startLive(s: FamilyState, r: number, memberId: string) {
  live = true;
  state = s;
  rev = r;
  me = memberId;
  queue = [];
  try {
    window.localStorage.setItem(ME_KEY, memberId);
  } catch {
    /* */
  }
  persistLocal();
  emit();
  window.clearInterval(pollTimer);
  pollTimer = window.setInterval(poll, 5000);
  document.addEventListener("visibilitychange", poll);
  window.addEventListener("focus", poll);
}

/** Laatst bekende live-stand, zodat de app ook zonder internet meteen opent. */
export function cachedLive(): { state: FamilyState; rev: number; me: string } | null {
  try {
    const raw = window.localStorage.getItem(LIVE_KEY);
    const m = window.localStorage.getItem(ME_KEY);
    if (!raw || !m) return null;
    const p = JSON.parse(raw);
    return p?.state?.members ? { state: p.state, rev: p.rev ?? 0, me: m } : null;
  } catch {
    return null;
  }
}

export function stopLive() {
  live = false;
  window.clearInterval(pollTimer);
  try {
    window.localStorage.removeItem(LIVE_KEY);
    window.localStorage.removeItem(ME_KEY);
  } catch {
    /* */
  }
}

export const isLive = () => live;
/** De stand zoals de schermen hem zien, voor code buiten React. */
export const snapshot = () => view;
export const lastSyncError = () => syncError;
export const syncNow = () => {
  void flush();
  void poll();
};

export function useFamily(): FamilyState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => view,
    () => view,
  );
}

const addXp = (s: FamilyState, id: string, n: number) => ({ ...s.xp, [id]: Math.max(0, (s.xp[id] ?? 0) + n) });
const newId = (p = "t") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
/** Iets voor het "Net gedaan"-lijstje in de huiskamer. Geen melding, alleen zichtbaar. */
const metFeed = (s: FamilyState, who: string, tekst: string, punten = 0): FamilyState => {
  const vandaag = new Date().toDateString();
  const feed = (s.feed ?? []).filter((f) => new Date(f.at).toDateString() === vandaag || Date.now() - new Date(f.at).getTime() < 864e5);
  return { ...s, feed: [...feed, { id: newId("f"), who, tekst, punten, at: new Date().toISOString() }].slice(-40) };
};
/** Voor de losse actie-bestanden (samenwerken.ts): dezelfde update, met badges, stempel en opslaan. */
export const wijzig = (fn: Fn, wat?: Wat) => update(fn, wat);
export const stand = () => state;
export { addXp, newId, metFeed };
const naamVan = (s: FamilyState, id?: string) => s.members.find((m) => m.id === id)?.name ?? "iemand";
/** Waarvoor waren de punten op "Mijn dag"? Eén omschrijving per soort, zodat het overzicht kort blijft. */
function dagWat(oud: DagLog, nieuw: DagLog): string {
  if (nieuw.routine.length !== oud.routine.length) return "Ochtendroutine";
  if ((nieuw.water >= DOEL.water) !== (oud.water >= DOEL.water)) return "Genoeg water gedronken";
  if ((nieuw.fruit >= DOEL.fruit) !== (oud.fruit >= DOEL.fruit)) return "Fruit gegeten";
  if ((nieuw.eten ?? []).length !== (oud.eten ?? []).length || !!nieuw.ontbijt !== !!oud.ontbijt) return "Op tijd gegeten";
  if (!!nieuw.sport !== !!oud.sport) return "Gesport";
  if (!!nieuw.kleding !== !!oud.kleding) return "Schone kleren aan";
  return "Mijn dag";
}
const isKid = (s: FamilyState, id: string) => !!s.members.find((m) => m.id === id) && s.members.find((m) => m.id === id)!.role !== "ouder";

export const actions = {
  /** Alleen demo: wissel van gezinslid. */
  switchMe(id: string) {
    if (live) return;
    update((s) => ({ ...s, me: id }));
  },
  checkIn(memberId: string, c: Omit<CheckIn, "at">) {
    const at = new Date().toISOString();
    update((s) => {
      const first = !(s.history[memberId] ?? []).some((h) => isToday(h.at));
      const hist = [...(s.history[memberId] ?? []), { mood: c.mood, rest: c.rest, at }].slice(-60);
      const xp = first ? addXp(s, memberId, XP.inchecken) : s.xp;
      const sleep = { ...(s.sleep ?? {}) };
      delete sleep[memberId]; // inchecken = wakker
      return { ...s, xp, sleep, checkins: { ...s.checkins, [memberId]: { ...c, at } }, history: { ...s.history, [memberId]: hist } };
    }, "Ingecheckt");
  },
  /** Dagelijkse basis bijwerken (routine, kleding, water, fruit, ontbijt, sport). Kinderen krijgen er XP voor. */
  updateDag(memberId: string, fn: (log: DagLog) => DagLog) {
    const d = todayKey();
    let wat = "Mijn dag";
    update((s) => {
      const oud: DagLog = { routine: [], water: 0, fruit: 0, ...(s.dag?.[d]?.[memberId] ?? {}) };
      const nieuw = fn({ ...oud, routine: [...oud.routine] });
      nieuw.water = Math.max(0, Math.min(20, nieuw.water));
      nieuw.fruit = Math.max(0, Math.min(10, nieuw.fruit));
      for (const k of ["snoep", "zoet"] as const) if (nieuw[k] !== undefined) nieuw[k] = Math.max(0, Math.min(20, nieuw[k] ?? 0));
      const delta = basisXp(nieuw) - basisXp(oud);
      // De laatste 9 weken bewaren: Groei kijkt 8 weken terug en moet dan nog weten welke dagen af waren.
      const grens = new Date(Date.now() - 63 * 864e5).toLocaleDateString("sv-SE");
      const dag = Object.fromEntries(Object.entries(s.dag ?? {}).filter(([k]) => k >= grens));
      let uit: FamilyState = { ...s, dag: { ...dag, [d]: { ...(dag[d] ?? {}), [memberId]: nieuw } }, xp: delta ? addXp(s, memberId, delta) : s.xp };
      if (!routineAf(oud) && routineAf(nieuw)) uit = metFeed(uit, memberId, "heeft de ochtendroutine gedaan 🚿", ROUTINE.filter((r) => r.gewicht > 0).length * 2 + 5);
      if (oud.water < DOEL.water && nieuw.water >= DOEL.water) uit = metFeed(uit, memberId, "heeft genoeg water gedronken 💧", 5);
      if (oud.fruit < DOEL.fruit && nieuw.fruit >= DOEL.fruit) uit = metFeed(uit, memberId, "heeft 2 stuks fruit gegeten 🍎", 5);
      wat = dagWat(oud, nieuw);
      return uit;
    }, () => wat);
  },
  /** Punten uit de schatkist claimen. Geeft terug hoeveel. */
  claimPunten(memberId: string): number {
    return actions.claim(memberId)?.totaal ?? 0;
  },
  /**
    Claimen met uitleg: hoeveel, en waarvoor. Eén keer: de claimstand gaat naar het puntentotaal,
    dus een tweede tik (of herladen) vindt niks meer om te claimen. De server laat claim nooit boven xp komen.
  */
  claim(memberId: string): { totaal: number; regels: OpenRegel[]; van: number } | null {
    const open = openRegels(state, memberId);
    if (!open.totaal) return null;
    const van = state.claim?.[memberId] ?? state.xp[memberId] ?? 0;
    const at = new Date().toISOString();
    update((s) => {
      const n = Math.max(0, (s.xp[memberId] ?? 0) - (s.claim?.[memberId] ?? s.xp[memberId] ?? 0));
      if (!n) return s;
      return metFeed(markeerGeclaimd({ ...s, claim: { ...(s.claim ?? {}), [memberId]: s.xp[memberId] ?? 0 } }, memberId, at), memberId, `claimde ${n} punten 💎`);
    });
    return { ...open, van };
  },
  /** Viering van een achievement gezien. */
  badgeGezien(id: string, viewer: string) {
    update((s) => ({ ...s, badges: (s.badges ?? []).map((b) => (b.id === id && !b.gezien.includes(viewer) ? { ...b, gezien: [...b.gezien, viewer] } : b)) }));
  },
  setInteresses(memberId: string, lijst: string[]) {
    update((s) => ({ ...s, interesses: { ...(s.interesses ?? {}), [memberId]: lijst } }));
  },
  /** Eetmoment afvinken (ontbijt, lunch, tussendoor, avondeten). */
  toggleEten(memberId: string, id: string) {
    actions.updateDag(memberId, (l) => {
      const heeft = !!l.eten?.includes(id) || (id === "ontbijt" && !!l.ontbijt);
      const eten = heeft ? (l.eten ?? []).filter((x) => x !== id) : [...(l.eten ?? []), id];
      return { ...l, eten, ontbijt: id === "ontbijt" ? !heeft : l.ontbijt };
    });
  },
  /** Klus gedaan. Kinderen krijgen XP. Geeft het id terug, zodat je het meteen kunt terugdraaien. */
  /**
    Klus gedaan. Samen gedaan (afgesproken via "samen doen")? Dan allebei de helft van de punten en de tijd.
    Kreeg je de klus via samen beslissen en doe je hem gewoon? Dan 3 punten extra: netjes.
  */
  klusGedaan(key: string, by: string, xp: number, label = ""): string {
    const id = newId("k");
    const klusNaam = label ? label.replace(/ \(alvast\)$/, "") : "Klus";
    let wat: Wat = klusNaam;
    update((s) => {
      const d = todayKey();
      const at = new Date().toISOString();
      // Twee keer afvinken (dubbel tikken, twee telefoons) geeft geen dubbele punten: vandaag al gedaan = klaar.
      if ((s.klusLog ?? []).some((k) => k.klus === key && new Date(k.at).toLocaleDateString("sv-SE") === d)) return s;
      const v = verdeling(s, d);
      const partner = v.mee[key] ? (by === v.mee[key] ? v.wie[key] : by === v.wie[key] ? v.mee[key] : undefined) : undefined;
      const tekst = (label ? label.replace(/ \(alvast\)$/, "") : "een klus").toLowerCase();
      if (partner) {
        const half = Math.ceil(xp / 2);
        const groep = newId("g");
        const s1 = { ...s, klusLog: [...(s.klusLog ?? []), { id, klus: key, by, at, samen: groep }, { id: newId("k"), klus: key, by: partner, at, samen: groep }].slice(-300) };
        const s2 = { ...s1, xp: addXp({ ...s1, xp: addXp(s1, by, half) }, partner, half) };
        wat = (w) => `${klusNaam} (samen met ${w === by ? naamVan(s, partner) : naamVan(s, by)})`;
        return metFeed(s2, by, `en ${s.members.find((m) => m.id === partner)?.name ?? "iemand"} deden samen: ${tekst} 🤝`, half);
      }
      const netjes = (s.uitdagingen ?? []).some((u) => u.klus === key && u.verliezer === by && (u.manier === "spel" || u.manier === "loting" || !u.manier) && new Date(u.at).toDateString() === new Date().toDateString());
      const totaal = xp + (netjes ? 3 : 0);
      wat = netjes ? `${klusNaam} (netjes gedaan +3)` : klusNaam;
      return metFeed({ ...s, klusLog: [...(s.klusLog ?? []), { id, klus: key, by, at }].slice(-300), xp: totaal ? addXp(s, by, totaal) : s.xp }, by, `heeft gedaan: ${tekst} ✓${netjes ? " Netjes 💪" : ""}`, totaal);
    }, (w) => (typeof wat === "function" ? wat(w) : wat));
    return id;
  },
  /** Verkeerd ingevuld? Weghalen, XP gaat er weer af (bij samen: bij allebei). */
  klusWeg(id: string, xp: number) {
    update((s) => {
      const k = (s.klusLog ?? []).find((x) => x.id === id);
      if (!k) return s;
      const weg = (s.klusLog ?? []).filter((x) => x.id === id || (k.samen && x.samen === k.samen));
      let uit: FamilyState = { ...s, klusLog: (s.klusLog ?? []).filter((x) => !weg.includes(x)) };
      for (const w of weg) uit = { ...uit, xp: xp ? addXp(uit, w.by, -(k.samen ? Math.ceil(xp / 2) : xp)) : uit.xp };
      return uit;
    });
  },
  setKoken(date: string, fn: (p: Kookplan) => Kookplan) {
    update((s) => {
      const grens = new Date(Date.now() - 30 * 864e5).toLocaleDateString("sv-SE");
      const koken = Object.fromEntries(Object.entries(s.koken ?? {}).filter(([k]) => k >= grens));
      const oud = koken[date] ?? {};
      const nieuw = fn({ ...oud });
      const uit = { ...s, koken: { ...koken, [date]: nieuw } };
      const vandaag = date === new Date().toLocaleDateString("sv-SE");
      if (vandaag && nieuw.kok && nieuw.kok !== oud.kok) return metFeed(uit, nieuw.kok, `kookt vanavond${nieuw.wat ? `: ${nieuw.wat}` : ""} 🍳`);
      return uit;
    });
  },
  setPotDoel(doel: string, cents: number) {
    update((s) => ({ ...s, pot: { items: [], ...(s.pot ?? {}), doel, cents } }));
  },
  addPot(item: Omit<PotItem, "id" | "at">) {
    const tekst = item.soort === "beloning" ? `kreeg een beloning in het potje: ${item.reden.toLowerCase()} 🐷` : item.soort === "statiegeld" ? "bracht statiegeld naar het potje 🍾" : "";
    update((s) => {
      const uit: FamilyState = { ...s, pot: { doel: s.pot?.doel ?? "", cents: s.pot?.cents ?? 0, items: [...(s.pot?.items ?? []), { ...item, id: newId("e"), at: new Date().toISOString() }].slice(-500) } };
      return tekst ? metFeed(uit, item.voor ?? item.by, tekst) : uit;
    });
  },
  removePot(id: string) {
    update((s) => (s.pot ? { ...s, pot: { ...s.pot, items: s.pot.items.filter((x) => x.id !== id) } } : s));
  },
  /** Vast werk gaat een dag niet door (vrij genomen), of toch wel. */
  toggleVrij(date: string, member: string, werkId: string) {
    const key = `${member}:${werkId}`;
    update((s) => {
      const lijst = s.vrij?.[date] ?? [];
      const nieuw = lijst.includes(key) ? lijst.filter((x) => x !== key) : [...lijst, key];
      const grens = new Date(Date.now() - 30 * 864e5).toLocaleDateString("sv-SE");
      const vrij = Object.fromEntries(Object.entries({ ...(s.vrij ?? {}), [date]: nieuw }).filter(([k, v]) => k >= grens && v.length));
      return { ...s, vrij };
    });
  },
  /** Iemand porren. Hooguit één keer per 10 minuten per persoon, zodat het leuk blijft. */
  por(from: string, to: string, tekst: string): boolean {
    const recent = (state.porren ?? []).some((p) => p.from === from && p.to === to && Date.now() - new Date(p.at).getTime() < 10 * 60e3);
    if (recent) return false;
    update((s) => ({ ...s, porren: [...(s.porren ?? []), { id: newId("p"), from, to, at: new Date().toISOString(), tekst }].slice(-50) }));
    return true;
  },
  porGezien(id: string) {
    update((s) => ({ ...s, porren: (s.porren ?? []).map((p) => (p.id === id ? { ...p, gezien: true } : p)) }));
  },
  /** Welterusten: de avatar gaat slapen tot de volgende check-in. */
  goToSleep(memberId: string) {
    const at = new Date().toISOString();
    update((s) => ({ ...s, sleep: { ...(s.sleep ?? {}), [memberId]: at } }));
  },
  wakeUp(memberId: string) {
    update((s) => {
      const sleep = { ...(s.sleep ?? {}) };
      delete sleep[memberId];
      return { ...s, sleep };
    });
  },
  saveAvatar(memberId: string, avatar: AvatarConfig, name?: string) {
    update((s) => ({ ...s, members: s.members.map((m) => (m.id === memberId ? { ...m, avatar, name: name?.trim() || m.name, joined: true } : m)) }));
  },
  acknowledgeTalk(memberId: string) {
    update((s) => {
      const c = s.checkins[memberId];
      return c ? { ...s, checkins: { ...s.checkins, [memberId]: { ...c, wantsTalk: false } } } : s;
    });
  },
  /** Taak afvinken of terugzetten. Geeft terug of de taak nu af is. */
  toggleTask(task: Task, memberId: string): boolean {
    const d = todayKey();
    const nowDone = !state.done[d]?.[task.id];
    update((s) => {
      const day = { ...(s.done[d] ?? {}) };
      const wasDone = !!day[task.id];
      const doer = wasDone ? day[task.id] : memberId;
      if (wasDone) delete day[task.id];
      else day[task.id] = memberId;
      // Blokjes die een ouder bevestigt: XP pas na bevestigen.
      const metOuder = !!task.study?.ouder && isKid(s, doer);
      const bevestigd = !!s.checked?.[d]?.[task.id];
      const telt = !metOuder || (wasDone && bevestigd);
      let checked = s.checked;
      if (wasDone && bevestigd) {
        const c = { ...(s.checked?.[d] ?? {}) };
        delete c[task.id];
        checked = { ...(s.checked ?? {}), [d]: c };
      }
      return { ...s, checked, done: { ...s.done, [d]: day }, xp: telt && task.xp ? addXp(s, doer, wasDone ? -task.xp : task.xp) : s.xp };
    }, task.title);
    return nowDone;
  },
  /** Ouder bevestigt een blokje (bijvoorbeeld na overhoren). Dan pas XP. */
  confirmTask(task: Task, parentId: string) {
    const d = todayKey();
    update((s) => {
      const doer = s.done[d]?.[task.id];
      if (!doer || s.checked?.[d]?.[task.id]) return s;
      return { ...s, checked: { ...(s.checked ?? {}), [d]: { ...(s.checked?.[d] ?? {}), [task.id]: parentId } }, xp: task.xp ? addXp(s, doer, task.xp) : s.xp };
    }, `${task.title} (bevestigd)`);
  },
  /** Werk van een gezinslid opslaan (hele lijst). */
  setWerk(memberId: string, list: WerkItem[]) {
    update((s) => ({ ...s, werk: { ...(s.werk ?? {}), [memberId]: list } }));
  },
  addDienst(d: Omit<Dienst, "id">) {
    update((s) => ({ ...s, diensten: [...(s.diensten ?? []), { ...d, id: newId("d") }].slice(-500) }));
  },
  removeDienst(id: string) {
    update((s) => ({ ...s, diensten: (s.diensten ?? []).filter((d) => d.id !== id) }));
  },
  /** Schoolvakanties van een kind bijwerken (alleen als er iets veranderd is). */
  setVakanties(memberId: string, list: { naam: string; van: string; tot: string }[]) {
    if (JSON.stringify(state.vakanties?.[memberId] ?? []) === JSON.stringify(list)) return;
    const vrij = (d?: string) => !!d && list.some((v) => d >= v.van && d <= v.tot);
    update((s) => {
      // Somtoday-blokjes die in de vakantie vielen en nog niet af zijn: weghalen, zodat ze opnieuw worden ingepland.
      const weg = s.tasks.filter((t) => t.assignee === memberId && t.study?.sid && vrij(t.date) && !s.done[t.date!]?.[t.id]);
      const sids = new Set(weg.map((t) => t.study!.sid!));
      const prev = s.somtoday?.[memberId];
      return {
        ...s,
        vakanties: { ...(s.vakanties ?? {}), [memberId]: list },
        tasks: s.tasks.filter((t) => !weg.includes(t) && !(t.study?.sid && sids.has(t.study.sid) && t.assignee === memberId && !s.done[t.date ?? ""]?.[t.id])),
        somtoday: prev ? { ...(s.somtoday ?? {}), [memberId]: { ...prev, seen: prev.seen.filter((x) => !sids.has(x)) } } : s.somtoday,
      };
    });
  },
  /** Lesrooster uit Somtoday bijwerken (alleen als er iets veranderd is). */
  setRooster(memberId: string, list: { date: string; van: string; tot: string; lessen: number }[]) {
    if (JSON.stringify(state.rooster?.[memberId] ?? []) === JSON.stringify(list)) return;
    update((s) => ({ ...s, rooster: { ...(s.rooster ?? {}), [memberId]: list } }));
  },
  addTask(t: Omit<Task, "id">) {
    const id = newId();
    update((s) => ({ ...s, tasks: [...s.tasks, { ...t, id }] }));
  },
  removeTask(id: string) {
    update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  },
  setPet(pet: FamilyState["pet"]) {
    update((s) => ({ ...s, pet }));
  },
  savePlan(memberId: string, plan: CalmPlan) {
    update((s) => ({ ...s, plans: { ...s.plans, [memberId]: plan } }));
  },
  calmDone(memberId: string) {
    const at = new Date().toISOString();
    update((s) => {
      const first = !s.calm.some((c) => c.member === memberId && isToday(c.at));
      return { ...s, calm: [...s.calm, { member: memberId, at }].slice(-100), xp: first ? addXp(s, memberId, XP.rustig) : s.xp };
    }, "Even rustig geworden");
  },
  /** Oefenlevel klaar. Alleen de eerste keer XP. */
  finishScenario(memberId: string, id: number): boolean {
    if ((state.played[memberId] ?? []).includes(id)) return false;
    update((s) => {
      const list = s.played[memberId] ?? [];
      if (list.includes(id)) return s;
      return { ...s, played: { ...s.played, [memberId]: [...list, id] }, xp: addXp(s, memberId, XP.korteOefening) };
    }, "Korte oefening gedaan");
    return true;
  },
  /**
    Oefening van vandaag afgemaakt (na "Oefening klaar"). Eén keer per dag: nog een keer tikken geeft niks extra.
    5 punten, plus de eenmalige bonus als het de eerste keer ooit is (zoals bij Alle oefeningen).
  */
  dagOefeningGedaan(memberId: string, oefening: number, titel: string): boolean {
    const d = todayKey();
    if (state.oefenDag?.[memberId]?.[d]?.gedaan) return false;
    update((s) => {
      const per = s.oefenDag?.[memberId] ?? {};
      if (per[d]?.gedaan) return s;
      const lijst = s.played[memberId] ?? [];
      const eerste = !lijst.includes(oefening);
      const xp = DAG_OEFENING_XP + (eerste ? XP.korteOefening : 0);
      return {
        ...s,
        played: eerste ? { ...s.played, [memberId]: [...lijst, oefening] } : s.played,
        oefenDag: { ...(s.oefenDag ?? {}), [memberId]: { ...per, [d]: { oefening, gedaan: new Date().toISOString(), xp, eerste } } },
        xp: addXp(s, memberId, xp),
      };
    }, `Oefening van vandaag: ${titel}`);
    return true;
  },
  /** Per ongeluk op klaar getikt? Terugdraaien: registratie weg, precies dezelfde punten eraf. */
  dagOefeningTerug(memberId: string) {
    const d = todayKey();
    const r = state.oefenDag?.[memberId]?.[d];
    if (!r?.gedaan) return;
    const titel = SCENARIOS.find((x) => x.id === r.oefening)?.title ?? "";
    update((s) => {
      const rec = s.oefenDag?.[memberId]?.[d];
      if (!rec?.gedaan) return s;
      const per = { ...(s.oefenDag?.[memberId] ?? {}), [d]: { oefening: rec.oefening } };
      return {
        ...s,
        played: rec.eerste ? { ...s.played, [memberId]: (s.played[memberId] ?? []).filter((x) => x !== rec.oefening) } : s.played,
        oefenDag: { ...(s.oefenDag ?? {}), [memberId]: per },
        xp: addXp(s, memberId, -(rec.xp ?? 0)),
        // Al geclaimd? Dan zakt de claimstand mee, zodat de volgende punten niet "verdwijnen".
        claim: (s.claim?.[memberId] ?? 0) > Math.max(0, (s.xp[memberId] ?? 0) - (rec.xp ?? 0)) ? { ...(s.claim ?? {}), [memberId]: Math.max(0, (s.xp[memberId] ?? 0) - (rec.xp ?? 0)) } : s.claim,
      };
    }, `Oefening van vandaag: ${titel}`);
  },
  /* ---------- Ouders helpen het vergeet-kind, en de week afsluiten ---------- */

  /** Overgeslagen of ging niet door (of weer gewoon). Telt dan niet mee. Niet meer in een afgesloten week. */
  zetStatus(kind: string, d: string, itemId: string, status: "overgeslagen" | "nietdoor" | null): boolean {
    if (weekDicht(state, kind, d)) return false;
    update((s) => {
      const dag = { ...(s.taakStatus?.[kind]?.[d] ?? {}) };
      if (status) dag[itemId] = status;
      else delete dag[itemId];
      return { ...s, taakStatus: { ...(s.taakStatus ?? {}), [kind]: { ...(s.taakStatus?.[kind] ?? {}), [d]: dag } } };
    });
    return true;
  },
  /** Een ouder vinkt vandaag iets af voor een kind ("wel gedaan, vergeten aan te vinken"). Punten gaan naar het kind. */
  ouderAfvinken(kind: string, itemId: string): boolean {
    const d = todayKey();
    if (weekDicht(state, kind, d)) return false;
    if (itemId.startsWith("taak:")) {
      const t = state.tasks.find((x) => x.id === itemId.slice(5));
      if (!t) return false;
      if (!state.done[d]?.[t.id]) actions.toggleTask(t, kind);
      return true;
    }
    if (itemId.startsWith("klus:")) {
      const key = itemId.slice(5);
      const k = verdeelKlus(state, key);
      if (!k) return false;
      actions.klusGedaan(key, kind, k.xp, k.label);
      return true;
    }
    return false;
  },
  /** Toch niet gedaan: het vinkje van vandaag weer weg (taak of huistaak), met de punten. */
  ouderTerug(kind: string, itemId: string): boolean {
    const d = todayKey();
    if (weekDicht(state, kind, d)) return false;
    if (itemId.startsWith("taak:")) {
      const t = state.tasks.find((x) => x.id === itemId.slice(5));
      if (t && state.done[d]?.[t.id]) actions.toggleTask(t, kind);
      return !!t;
    }
    if (itemId.startsWith("klus:")) {
      const key = itemId.slice(5);
      const log = [...(state.klusLog ?? [])].reverse().find((x) => x.klus === key && x.by === kind && new Date(x.at).toLocaleDateString("sv-SE") === d);
      if (log) actions.klusWeg(log.id, verdeelKlus(state, key)?.xp ?? 0);
      return !!log;
    }
    return false;
  },
  /** Weekafspraak, vooraf: vanaf welk percentage is de week gehaald, en wat staat er tegenover (vrije tekst, geen rekensom per vinkje). */
  /**
    Weekbonus instellen: 1 of 2 treden (vanaf x% krijg je y) en het vaste zakgeld (alleen ter info).
    Oude aanroep (drempel, beloning) werkt nog: dat is één trede.
  */
  setWeekAfspraak(kind: string, tredenOfDrempel: WeekTrede[] | number, zakgeldOfBeloning = "") {
    const schoon = (t: WeekTrede[]) => t.map((x) => ({ pct: Math.max(50, Math.min(100, Math.round(x.pct))), wat: x.wat.trim().slice(0, 60) })).sort((a, b) => a.pct - b.pct).filter((x, i, a) => i === 0 || x.pct > a[i - 1].pct).slice(0, 2);
    const treden = typeof tredenOfDrempel === "number" ? schoon([{ pct: tredenOfDrempel, wat: zakgeldOfBeloning }]) : schoon(tredenOfDrempel);
    if (!treden.length) return;
    const zakgeld = typeof tredenOfDrempel === "number" ? state.weekAfspraak?.[kind]?.zakgeld : zakgeldOfBeloning.trim().slice(0, 30) || undefined;
    update((s) => ({ ...s, weekAfspraak: { ...(s.weekAfspraak ?? {}), [kind]: { drempel: treden[0].pct, ...(treden[0].wat ? { beloning: treden[0].wat } : {}), treden, ...(zakgeld ? { zakgeld } : {}) } } }));
  },
  /** Bonus van een afgesloten week als uitbetaald markeren (of weer terug). Alleen ouders. */
  weekUitbetaald(kind: string, maandagVan: string, betaald: boolean) {
    update((s) => {
      const w = s.weekAfsluiting?.[kind]?.[maandagVan];
      if (!w) return s;
      const { betaald: _oud, ...rest } = w;
      return { ...s, weekAfsluiting: { ...s.weekAfsluiting, [kind]: { ...s.weekAfsluiting![kind], [maandagVan]: betaald ? { ...rest, betaald: new Date().toISOString() } : rest } } };
    });
  },
  /** Week afsluiten: de stand van nu staat vast. Al afgesloten? Dan verandert er niks. */
  weekAfsluiten(kind: string, door: string, k: { maandag: string; af: number; totaal: number; pct: number; gehaald: boolean; beloning?: string; behaald?: number }): boolean {
    if (state.weekAfsluiting?.[kind]?.[k.maandag]) return false;
    const at = new Date().toISOString();
    update((s) => {
      if (s.weekAfsluiting?.[kind]?.[k.maandag]) return s;
      const uit = { ...s, weekAfsluiting: { ...(s.weekAfsluiting ?? {}), [kind]: { ...(s.weekAfsluiting?.[kind] ?? {}), [k.maandag]: { af: k.af, totaal: k.totaal, pct: k.pct, gehaald: k.gehaald, beloning: k.gehaald ? k.beloning : undefined, ...(k.gehaald && k.behaald !== undefined && k.behaald >= 0 ? { trede: k.behaald } : {}), door, at } } } };
      return metFeed(uit, kind, k.gehaald ? `heeft de week gehaald (${k.pct}%) 🏁` : `sloot de week af met ${k.pct}%`, 0);
    });
    return true;
  },
  /** Oefentoets opslaan (een ouder plakt hem, na controle). */
  bewaarToets(kind: string, toets: Omit<OefenToets, "id" | "at" | "pogingen">): string {
    const id = newId("ot");
    update((s) => ({ ...s, oefentoetsen: { ...(s.oefentoetsen ?? {}), [kind]: [...(s.oefentoetsen?.[kind] ?? []), { ...toets, id, at: new Date().toISOString() }].slice(-30) } }));
    return id;
  },
  verwijderToets(kind: string, id: string) {
    update((s) => ({ ...s, oefentoetsen: { ...(s.oefentoetsen ?? {}), [kind]: (s.oefentoetsen?.[kind] ?? []).filter((t) => t.id !== id) } }));
  },
  /** Een poging: hoeveel goed, welke fout. Geen cijfer, alleen om te zien wat nog geoefend moet. */
  toetsPoging(kind: string, id: string, goed: number, totaal: number, fout: number[], antwoorden?: string[], zelf?: number[]) {
    const p = { at: new Date().toISOString(), goed, totaal, fout, ...(antwoorden ? { antwoorden: antwoorden.map((a) => String(a ?? "").slice(0, 120)) } : {}), ...(zelf?.length ? { zelf } : {}) };
    update((s) => ({ ...s, oefentoetsen: { ...(s.oefentoetsen ?? {}), [kind]: (s.oefentoetsen?.[kind] ?? []).map((t) => (t.id === id ? { ...t, pogingen: [...(t.pogingen ?? []), p].slice(-20) } : t)) } }));
  },
  startConflict(c: Omit<Conflict, "id" | "at" | "status">) {
    const extra = { id: newId("c"), at: new Date().toISOString(), status: "wacht" as const };
    update((s) => ({ ...s, conflicts: [...s.conflicts, { ...c, ...extra }].slice(-100) }));
  },
  answerConflict(id: string, memberId: string, side: ConflictSide) {
    update((s) => ({ ...s, conflicts: s.conflicts.map((c) => (c.id === id ? { ...c, sides: { ...c.sides, [memberId]: side } } : c)) }));
  },
  closeConflict(id: string, solution: string) {
    const help = solution === "Een ouder helpt ons";
    update((s) => {
      const c = s.conflicts.find((x) => x.id === id);
      if (!c || c.status !== "wacht") return s;
      let xp = s.xp;
      // Max één keer per dag XP voor een opgeloste ruzie, zodat niemand ruzies gaat verzinnen.
      const solvedToday = (m: string) => s.conflicts.some((x) => x.id !== id && x.status !== "wacht" && isToday(x.solvedAt ?? x.at) && (x.from === m || x.with === m));
      // Ook samen een ouder om hulp vragen telt: een respectvolle poging wordt beloond, niet alleen een perfect resultaat.
      for (const m of [c.from, c.with]) if (!solvedToday(m)) xp = { ...xp, [m]: (xp[m] ?? 0) + XP.ruzieOpgelost };
      return { ...s, xp, conflicts: s.conflicts.map((x) => (x.id === id ? { ...x, status: help ? "hulp" : "opgelost", solution, solvedAt: help ? undefined : new Date().toISOString() } : x)) };
    }, help ? "Samen hulp gevraagd bij een ruzie" : "Ruzie samen opgelost");
  },
  /** Ouder heeft geholpen bij een ruzie. */
  parentHelped(id: string) {
    update((s) => ({ ...s, conflicts: s.conflicts.map((x) => (x.id === id ? { ...x, status: "opgelost", solution: "Opgelost met hulp van een ouder" } : x)) }));
  },
  saveMeeting(m: Omit<Meeting, "at">) {
    const at = new Date().toISOString();
    update((s) => ({ ...s, meetings: [...s.meetings, { ...m, at }] }));
  },
  setGoals(goals: string[]) {
    update((s) => ({ ...s, goals }));
  },
  setRewards(rewards: FamilyState["rewards"]) {
    update((s) => ({ ...s, rewards }));
  },
  setConsent(kind: ProKind, on: boolean) {
    update((s) => ({ ...s, consent: { ...s.consent, [kind]: on } }));
  },
  sendMessage(from: ProKind, to: string, text: string) {
    const msg = { id: newId("m"), from, to, text, at: new Date().toISOString(), read: false };
    update((s) => ({ ...s, messages: [...s.messages, msg] }));
  },
  readMessage(id: string) {
    update((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? { ...m, read: true } : m)) }));
  },
  saveProNote(kind: ProKind, text: string) {
    update((s) => ({ ...s, proNotes: { ...s.proNotes, [kind]: text } }));
  },
  setWektijd(memberId: string, wektijd: string) {
    update((s) => ({ ...s, members: s.members.map((m) => (m.id === memberId ? { ...m, wektijd: wektijd || undefined } : m)) }));
  },
  setBedtime(memberId: string, bedtime: string) {
    update((s) => ({
      ...s,
      members: s.members.map((m) => (m.id === memberId ? { ...m, bedtime } : m)),
      tasks: s.tasks.map((t) => (t.icon === "telefoon" && t.assignee === memberId ? { ...t, title: phoneTaskTitle(bedtime) } : t)),
    }));
  },
  /** Coachscenario uitgespeeld. Eerste keer 20 XP, daarna 5. */
  coachDone(memberId: string, run: Omit<CoachRun, "at">) {
    const at = new Date().toISOString();
    update((s) => {
      const list = s.coach?.[memberId] ?? [];
      const first = !list.some((r) => r.id === run.id);
      return { ...s, coach: { ...(s.coach ?? {}), [memberId]: [...list, { ...run, at }].slice(-200) }, xp: first ? addXp(s, memberId, XP.oefenscenario) : s.xp };
    }, "Oefenscenario met de coach");
  },
  addQuest(q: Omit<Quest, "id" | "at">) {
    const extra = { id: newId("q"), at: new Date().toISOString() };
    update((s) => {
      // Dezelfde open opdracht niet dubbel.
      if ((s.quests ?? []).some((x) => x.member === q.member && x.title === q.title && !x.done)) return s;
      return { ...s, quests: [...(s.quests ?? []), { ...q, ...extra }].slice(-200) };
    });
  },
  /** Quest afvinken of terugzetten. Afvinken geeft 25 XP aan kinderen. */
  toggleQuest(id: string) {
    update((s) => {
      const q = (s.quests ?? []).find((x) => x.id === id);
      if (!q) return s;
      const done = q.done ? undefined : new Date().toISOString();
      return {
        ...s,
        quests: (s.quests ?? []).map((x) => (x.id === id ? { ...x, done } : x)),
        xp: addXp(s, q.member, done ? XP.quest : -XP.quest),
      };
    }, () => { const q = (state.quests ?? []).find((x) => x.id === id); return q ? `Opdracht: ${q.title}` : "Opdracht uit het echte leven"; });
  },
  removeQuest(id: string) {
    update((s) => ({ ...s, quests: (s.quests ?? []).filter((x) => x.id !== id) }));
  },
  addAfspraak(text: string, by: string, scenario?: string, voorstel?: boolean) {
    const a = { id: newId("a"), text: text.trim(), at: new Date().toISOString(), by, scenario, ...(voorstel ? { voorstel: true } : {}) };
    if (!a.text) return;
    update((s) => ((s.afspraken ?? []).some((x) => x.text === a.text && !x.gestopt) ? s : { ...s, afspraken: [...(s.afspraken ?? []), a].slice(-50) }));
  },
  /** Hielp de afspraak? Iedereen in het gezin mag dat zeggen. */
  evalueerAfspraak(id: string, by: string, oordeel: "ja" | "beetje" | "nee") {
    const at = new Date().toISOString();
    update((s) => ({ ...s, afspraken: (s.afspraken ?? []).map((a) => (a.id === id ? { ...a, evaluaties: [...(a.evaluaties ?? []), { at, by, oordeel }].slice(-20) } : a)) }));
  },
  /** Afspraak loslaten (werkt niet, of is niet meer nodig). Blijft in de geschiedenis staan. */
  stopAfspraak(id: string) {
    const at = new Date().toISOString();
    update((s) => ({ ...s, afspraken: (s.afspraken ?? []).map((a) => (a.id === id ? { ...a, gestopt: at } : a)) }));
  },
  /** Voorstel van een kind goedkeuren: vanaf nu is het een huisregel (en over een week vragen we of hij helpt). */
  keurHuisregelGoed(id: string) {
    const at = new Date().toISOString();
    update((s) => ({ ...s, afspraken: (s.afspraken ?? []).map((a) => (a.id === id ? { ...a, voorstel: undefined, at } : a)) }));
  },
  removeAfspraak(id: string) {
    update((s) => ({ ...s, afspraken: (s.afspraken ?? []).filter((x) => x.id !== id) }));
  },
  logCoach(by: string, scenario: string, licht: "rood" | "oranje" | "groen" | "veilig") {
    const at = new Date().toISOString();
    update((s) => ({ ...s, coachLog: [...(s.coachLog ?? []), { at, by, scenario, licht }].slice(-200) }));
  },
  /** Lezen loggen. XP per 10 minuten, met een max per dag. Boek uit geeft een bonus. */
  logReading(memberId: string, min: number, book: string, uit: boolean): number {
    const today = (state.reading?.[memberId] ?? []).filter((r) => isToday(r.at)).reduce((a, r) => a + r.min, 0);
    const earnedToday = Math.min(XP.lezenMaxPerDag, Math.floor(today / 10) * XP.lezenPer10Min);
    const earnedAfter = Math.min(XP.lezenMaxPerDag, Math.floor((today + min) / 10) * XP.lezenPer10Min);
    const gained = (earnedAfter - earnedToday) + (uit ? XP.boekUit : 0);
    const entry = { at: new Date().toISOString(), min, book: book.trim() || undefined, uit: uit || undefined };
    update((s) => ({ ...s, reading: { ...(s.reading ?? {}), [memberId]: [...(s.reading?.[memberId] ?? []), entry].slice(-300) }, xp: gained ? addXp(s, memberId, gained) : s.xp }), uit ? `Gelezen${book.trim() ? `: ${book.trim()}` : ""} (boek uit)` : `Gelezen${book.trim() ? `: ${book.trim()}` : ""}`);
    return gained;
  },
  /**
    Losse afspraak opslaan (nieuw of aangepast). Geen punten, geen taak. Dezelfde afspraak twee keer opslaan
    (dubbel tikken) geeft er één. Aanpassen raakt alleen deze afspraak. Geeft het id terug, of null als het niet klopt.
  */
  bewaarAfspraak(wie: string, invoer: Invoer, id?: string): string | null {
    const x = schoonAfspraak(invoer);
    if (controleerAfspraak(x).length) return null;
    const lijst = state.agenda?.[wie] ?? [];
    const bestaand = id ? lijst.find((a) => a.id === id) : undefined;
    const dubbel = lijst.find((a) => a.id !== id && isDubbel([a], x));
    if (dubbel) return dubbel.id;
    const nieuwId = bestaand?.id ?? newId("ag");
    const at = new Date().toISOString();
    update((s) => {
      const l = s.agenda?.[wie] ?? [];
      if (!bestaand && isDubbel(l, x)) return s;
      const item: AgendaItem = bestaand ? { ...bestaand, ...x, met: x.met, waar: x.waar, notitie: x.notitie, gewijzigd: at } : { id: nieuwId, ...x, at };
      const volgende = bestaand ? l.map((a) => (a.id === nieuwId ? item : a)) : [...l, item];
      // Bewaar wat nog komt en de laatste 60 dagen.
      const grens = new Date(Date.now() - 60 * 864e5).toLocaleDateString("sv-SE");
      return { ...s, agenda: { ...(s.agenda ?? {}), [wie]: volgende.filter((a) => a.datum >= grens).slice(-200) } };
    });
    return nieuwId;
  },
  verwijderAfspraak(wie: string, id: string) {
    update((s) => ({ ...s, agenda: { ...(s.agenda ?? {}), [wie]: (s.agenda?.[wie] ?? []).filter((a) => a.id !== id) } }));
  },
  /** Inzet zichtbaar maken (extra project, pitch, rust). Waardering, geen punten. Zelfde soort op dezelfde dag één keer. */
  inzetErbij(wie: string, soort: InzetSoort, datum: string, tekst?: string) {
    update((s) => {
      const l = s.inzet?.[wie] ?? [];
      if (l.some((x) => x.soort === soort && x.datum === datum && (x.tekst ?? "") === (tekst?.trim() ?? ""))) return s;
      const item: InzetItem = { id: newId("iz"), soort, datum, at: new Date().toISOString(), ...(tekst?.trim() ? { tekst: tekst.trim() } : {}) };
      return { ...s, inzet: { ...(s.inzet ?? {}), [wie]: [...l, item].slice(-150) } };
    });
  },
  inzetWeg(wie: string, id: string) {
    update((s) => ({ ...s, inzet: { ...(s.inzet ?? {}), [wie]: (s.inzet?.[wie] ?? []).filter((x) => x.id !== id) } }));
  },
  addTasks(list: Omit<Task, "id">[]) {
    const withIds = list.map((t, i) => ({ ...t, id: newId("t") + i }));
    update((s) => ({ ...s, tasks: [...s.tasks, ...withIds] }));
  },
  /** Leerblokken uit Somtoday toevoegen. Dubbele items (ook vanaf een andere telefoon) vallen eruit. */
  addSomtoday(memberId: string, list: Omit<Task, "id">[], sids: string[]) {
    const stamp = newId("t");
    update((s) => {
      const prev = s.somtoday?.[memberId];
      const seen = new Set(prev?.seen ?? []);
      const nieuw = list.filter((t) => !t.study?.sid || !seen.has(t.study.sid)).map((t, i) => ({ ...t, id: stamp + "s" + i }));
      sids.forEach((x) => seen.add(x));
      return {
        ...s,
        tasks: [...s.tasks, ...nieuw],
        somtoday: { ...(s.somtoday ?? {}), [memberId]: { at: new Date().toISOString(), seen: [...seen].slice(-600) } },
      };
    });
  },
  addFeedback(by: string, vibe: "fijn" | "lastig", text: string) {
    const f = { id: newId("f"), by, at: new Date().toISOString(), vibe, text: text.trim().slice(0, 300) };
    update((s) => ({ ...s, feedback: [...(s.feedback ?? []), f].slice(-100) }));
  },
  /** Alles meteen aan, of stap voor stap vrijspelen (start dan vandaag als er nog geen startdatum is). */
  setAllesAan(on: boolean) {
    const now = new Date().toISOString();
    update((s) => ({ ...s, allesAan: on, startedAt: on ? s.startedAt : s.startedAt ?? now }));
  },
  /** Alleen demo. */
  reset() {
    if (live) return;
    update(() => demoFamily());
  },
};
