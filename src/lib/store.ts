"use client";

import { useSyncExternalStore } from "react";
import { demoFamily } from "./demo";
import { todayKey } from "./tasks";
import type { AvatarConfig, CalmPlan, CheckIn, Conflict, ConflictSide, FamilyState, Meeting, ProKind, Task } from "./types";

/*
  Eenvoudige lokale store. Straks komt Supabase erachter (tabellen + Realtime),
  zodat een check-in op de telefoon van het kind meteen in de huiskamer van de ouder verschijnt.
  De schermen praten alleen met useFamily() en actions, dus dat wisselen raakt de schermen niet.
*/

const KEY = "familyflow:v1";
let state: FamilyState = load();
const listeners = new Set<() => void>();

function migrate(raw: unknown): FamilyState | null {
  const s = raw as Partial<FamilyState> & { version?: number };
  if (!s || !Array.isArray(s.members)) return null;
  if (s.version === 3) return s as FamilyState;
  // Oudere versies: ontbrekende onderdelen aanvullen met het voorbeeldgezin.
  const d = demoFamily();
  return { ...d, ...s, version: 3 } as FamilyState;
}

function load(): FamilyState {
  if (typeof window === "undefined") return demoFamily();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const s = migrate(JSON.parse(raw));
      if (s) return s;
    }
  } catch {
    /* opslag niet beschikbaar: demo gebruiken */
  }
  return demoFamily();
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* geen opslag: alleen in geheugen */
  }
}

function set(next: FamilyState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

export function useFamily(): FamilyState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

const addXp = (s: FamilyState, id: string, n: number) => ({ ...s.xp, [id]: Math.max(0, (s.xp[id] ?? 0) + n) });
const newId = () => "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export const actions = {
  switchMe(id: string) {
    set({ ...state, me: id });
  },
  checkIn(memberId: string, c: Omit<CheckIn, "at">) {
    const at = new Date().toISOString();
    const hist = [...(state.history[memberId] ?? []), { mood: c.mood, rest: c.rest, at }].slice(-60);
    set({ ...state, checkins: { ...state.checkins, [memberId]: { ...c, at } }, history: { ...state.history, [memberId]: hist } });
  },
  saveAvatar(memberId: string, avatar: AvatarConfig, name?: string) {
    set({ ...state, members: state.members.map((m) => (m.id === memberId ? { ...m, avatar, name: name?.trim() || m.name } : m)) });
  },
  acknowledgeTalk(memberId: string) {
    const c = state.checkins[memberId];
    if (!c) return;
    set({ ...state, checkins: { ...state.checkins, [memberId]: { ...c, wantsTalk: false } } });
  },
  /** Taak afvinken of terugzetten. Geeft terug of de taak nu af is. */
  toggleTask(task: Task, memberId: string): boolean {
    const d = todayKey();
    const day = { ...(state.done[d] ?? {}) };
    const wasDone = !!day[task.id];
    const doer = wasDone ? day[task.id] : memberId;
    if (wasDone) delete day[task.id];
    else day[task.id] = memberId;
    const kid = state.members.find((m) => m.id === doer)?.role !== "ouder";
    set({ ...state, done: { ...state.done, [d]: day }, xp: kid && task.xp ? addXp(state, doer, wasDone ? -task.xp : task.xp) : state.xp });
    return !wasDone;
  },
  addTask(t: Omit<Task, "id">) {
    set({ ...state, tasks: [...state.tasks, { ...t, id: newId() }] });
  },
  removeTask(id: string) {
    set({ ...state, tasks: state.tasks.filter((t) => t.id !== id) });
  },
  setPet(pet: FamilyState["pet"]) {
    set({ ...state, pet });
  },
  savePlan(memberId: string, plan: CalmPlan) {
    set({ ...state, plans: { ...state.plans, [memberId]: plan } });
  },
  calmDone(memberId: string) {
    set({ ...state, calm: [...state.calm, { member: memberId, at: new Date().toISOString() }], xp: addXp(state, memberId, 5) });
  },
  /** Oefenlevel klaar. Alleen de eerste keer XP. */
  finishScenario(memberId: string, id: number): boolean {
    const list = state.played[memberId] ?? [];
    if (list.includes(id)) return false;
    set({ ...state, played: { ...state.played, [memberId]: [...list, id] }, xp: addXp(state, memberId, 20) });
    return true;
  },
  startConflict(c: Omit<Conflict, "id" | "at" | "status">) {
    set({ ...state, conflicts: [...state.conflicts, { ...c, id: "c" + Date.now().toString(36), at: new Date().toISOString(), status: "wacht" }] });
  },
  answerConflict(id: string, memberId: string, side: ConflictSide) {
    set({ ...state, conflicts: state.conflicts.map((c) => (c.id === id ? { ...c, sides: { ...c.sides, [memberId]: side } } : c)) });
  },
  closeConflict(id: string, solution: string) {
    const help = solution === "Een ouder helpt ons";
    const c = state.conflicts.find((x) => x.id === id);
    let xp = state.xp;
    if (c && !help) for (const m of [c.from, c.with]) xp = { ...xp, [m]: (xp[m] ?? 0) + 20 };
    set({ ...state, xp, conflicts: state.conflicts.map((x) => (x.id === id ? { ...x, status: help ? "hulp" : "opgelost", solution } : x)) });
  },
  /** Ouder heeft geholpen bij een ruzie. */
  parentHelped(id: string) {
    set({ ...state, conflicts: state.conflicts.map((x) => (x.id === id ? { ...x, status: "opgelost", solution: "Opgelost met hulp van een ouder" } : x)) });
  },
  saveMeeting(m: Omit<Meeting, "at">) {
    set({ ...state, meetings: [...state.meetings, { ...m, at: new Date().toISOString() }] });
  },
  setGoals(goals: string[]) {
    set({ ...state, goals });
  },
  setRewards(rewards: FamilyState["rewards"]) {
    set({ ...state, rewards });
  },
  setConsent(kind: ProKind, on: boolean) {
    set({ ...state, consent: { ...state.consent, [kind]: on } });
  },
  sendMessage(from: ProKind, to: string, text: string) {
    set({ ...state, messages: [...state.messages, { id: "m" + Date.now().toString(36), from, to, text, at: new Date().toISOString(), read: false }] });
  },
  readMessage(id: string) {
    set({ ...state, messages: state.messages.map((m) => (m.id === id ? { ...m, read: true } : m)) });
  },
  saveProNote(kind: ProKind, text: string) {
    set({ ...state, proNotes: { ...state.proNotes, [kind]: text } });
  },
  reset() {
    set(demoFamily());
  },
};
