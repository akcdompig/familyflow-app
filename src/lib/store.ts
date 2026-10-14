"use client";

import { useSyncExternalStore } from "react";
import { demoFamily } from "./demo";
import { todayKey } from "./tasks";
import type { AvatarConfig, CalmPlan, CheckIn, FamilyState, Task } from "./types";

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
  if (s.version === 2) return s as FamilyState;
  if (s.version === 1) {
    const d = demoFamily();
    return { ...d, ...s, version: 2, tasks: d.tasks, done: d.done, xp: d.xp, played: d.played, plans: d.plans, calm: [], pet: d.pet } as FamilyState;
  }
  return null;
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
    set({ ...state, checkins: { ...state.checkins, [memberId]: { ...c, at: new Date().toISOString() } } });
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
  reset() {
    set(demoFamily());
  },
};
