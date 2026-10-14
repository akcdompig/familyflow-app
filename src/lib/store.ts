"use client";

import { useSyncExternalStore } from "react";
import * as cloud from "./cloud";
import { demoFamily } from "./demo";
import { phoneTaskTitle, todayKey } from "./tasks";
import { XP } from "./xp";
import type { Dienst, WerkItem, CoachRun, Quest, AvatarConfig, CalmPlan, CheckIn, Conflict, ConflictSide, FamilyState, Meeting, ProKind, Task } from "./types";

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

/** Alle wijzigingen gaan hierdoorheen. */
function update(fn: Fn) {
  state = fn(state);
  persistLocal();
  emit();
  if (live) {
    queue.push(fn);
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, 250);
  }
}

async function flush() {
  if (saving || !queue.length) return;
  saving = true;
  const sending = queue.length;
  try {
    const n = await cloud.saveFamily(state, rev);
    if (n >= 0) {
      rev = n;
      queue = queue.slice(sending);
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
      const xp = first && isKid(s, memberId) ? addXp(s, memberId, XP.inchecken) : s.xp;
      const sleep = { ...(s.sleep ?? {}) };
      delete sleep[memberId]; // inchecken = wakker
      return { ...s, xp, sleep, checkins: { ...s.checkins, [memberId]: { ...c, at } }, history: { ...s.history, [memberId]: hist } };
    });
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
      return { ...s, checked, done: { ...s.done, [d]: day }, xp: telt && isKid(s, doer) && task.xp ? addXp(s, doer, wasDone ? -task.xp : task.xp) : s.xp };
    });
    return nowDone;
  },
  /** Ouder bevestigt een blokje (bijvoorbeeld na overhoren). Dan pas XP. */
  confirmTask(task: Task, parentId: string) {
    const d = todayKey();
    update((s) => {
      const doer = s.done[d]?.[task.id];
      if (!doer || s.checked?.[d]?.[task.id]) return s;
      return { ...s, checked: { ...(s.checked ?? {}), [d]: { ...(s.checked?.[d] ?? {}), [task.id]: parentId } }, xp: isKid(s, doer) && task.xp ? addXp(s, doer, task.xp) : s.xp };
    });
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
      return { ...s, calm: [...s.calm, { member: memberId, at }].slice(-100), xp: first && isKid(s, memberId) ? addXp(s, memberId, XP.rustig) : s.xp };
    });
  },
  /** Oefenlevel klaar. Alleen de eerste keer XP. */
  finishScenario(memberId: string, id: number): boolean {
    if ((state.played[memberId] ?? []).includes(id)) return false;
    update((s) => {
      const list = s.played[memberId] ?? [];
      if (list.includes(id)) return s;
      return { ...s, played: { ...s.played, [memberId]: [...list, id] }, xp: isKid(s, memberId) ? addXp(s, memberId, XP.korteOefening) : s.xp };
    });
    return true;
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
      const solvedToday = (m: string) => s.conflicts.some((x) => x.id !== id && x.status === "opgelost" && x.solvedAt && isToday(x.solvedAt) && (x.from === m || x.with === m));
      if (!help) for (const m of [c.from, c.with]) if (!solvedToday(m)) xp = { ...xp, [m]: (xp[m] ?? 0) + XP.ruzieOpgelost };
      return { ...s, xp, conflicts: s.conflicts.map((x) => (x.id === id ? { ...x, status: help ? "hulp" : "opgelost", solution, solvedAt: help ? undefined : new Date().toISOString() } : x)) };
    });
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
      return { ...s, coach: { ...(s.coach ?? {}), [memberId]: [...list, { ...run, at }].slice(-200) }, xp: first && isKid(s, memberId) ? addXp(s, memberId, XP.oefenscenario) : s.xp };
    });
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
        xp: isKid(s, q.member) ? addXp(s, q.member, done ? XP.quest : -XP.quest) : s.xp,
      };
    });
  },
  removeQuest(id: string) {
    update((s) => ({ ...s, quests: (s.quests ?? []).filter((x) => x.id !== id) }));
  },
  addAfspraak(text: string, by: string, scenario?: string) {
    const a = { id: newId("a"), text: text.trim(), at: new Date().toISOString(), by, scenario };
    if (!a.text) return;
    update((s) => ((s.afspraken ?? []).some((x) => x.text === a.text) ? s : { ...s, afspraken: [...(s.afspraken ?? []), a].slice(-50) }));
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
    const gained = (isKid(state, memberId) ? earnedAfter - earnedToday : 0) + (uit && isKid(state, memberId) ? XP.boekUit : 0);
    const entry = { at: new Date().toISOString(), min, book: book.trim() || undefined, uit: uit || undefined };
    update((s) => ({ ...s, reading: { ...(s.reading ?? {}), [memberId]: [...(s.reading?.[memberId] ?? []), entry].slice(-300) }, xp: gained ? addXp(s, memberId, gained) : s.xp }));
    return gained;
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
