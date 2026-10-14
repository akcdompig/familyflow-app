"use client";

import { useSyncExternalStore } from "react";
import * as cloud from "./cloud";
import { demoFamily } from "./demo";
import { phoneTaskTitle, todayKey } from "./tasks";
import type { AvatarConfig, CalmPlan, CheckIn, Conflict, ConflictSide, FamilyState, Meeting, ProKind, Task } from "./types";

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
      const hist = [...(s.history[memberId] ?? []), { mood: c.mood, rest: c.rest, at }].slice(-60);
      return { ...s, checkins: { ...s.checkins, [memberId]: { ...c, at } }, history: { ...s.history, [memberId]: hist } };
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
      return { ...s, done: { ...s.done, [d]: day }, xp: isKid(s, doer) && task.xp ? addXp(s, doer, wasDone ? -task.xp : task.xp) : s.xp };
    });
    return nowDone;
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
    update((s) => ({ ...s, calm: [...s.calm, { member: memberId, at }].slice(-100), xp: addXp(s, memberId, 5) }));
  },
  /** Oefenlevel klaar. Alleen de eerste keer XP. */
  finishScenario(memberId: string, id: number): boolean {
    if ((state.played[memberId] ?? []).includes(id)) return false;
    update((s) => {
      const list = s.played[memberId] ?? [];
      if (list.includes(id)) return s;
      return { ...s, played: { ...s.played, [memberId]: [...list, id] }, xp: addXp(s, memberId, 20) };
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
      if (!help) for (const m of [c.from, c.with]) xp = { ...xp, [m]: (xp[m] ?? 0) + 20 };
      return { ...s, xp, conflicts: s.conflicts.map((x) => (x.id === id ? { ...x, status: help ? "hulp" : "opgelost", solution } : x)) };
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
  /** Alleen demo. */
  reset() {
    if (live) return;
    update(() => demoFamily());
  },
};
