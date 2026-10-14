"use client";

import { useSyncExternalStore } from "react";
import { demoFamily } from "./demo";
import type { AvatarConfig, CheckIn, FamilyState } from "./types";

/*
  Eenvoudige lokale store. In stukje 2 komt Supabase erachter (tabellen + Realtime),
  zodat een check-in op de telefoon van het kind meteen in de huiskamer van de ouder verschijnt.
  De rest van de app praat alleen met deze functies, dus dat wisselen raakt de schermen niet.
*/

const KEY = "familyflow:v1";
let state: FamilyState = load();
const listeners = new Set<() => void>();

function load(): FamilyState {
  if (typeof window === "undefined") return demoFamily();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FamilyState;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.members)) return parsed;
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

export const actions = {
  switchMe(id: string) {
    set({ ...state, me: id });
  },
  checkIn(memberId: string, c: Omit<CheckIn, "at">) {
    set({ ...state, checkins: { ...state.checkins, [memberId]: { ...c, at: new Date().toISOString() } } });
  },
  saveAvatar(memberId: string, avatar: AvatarConfig, name?: string) {
    set({
      ...state,
      members: state.members.map((m) => (m.id === memberId ? { ...m, avatar, name: name?.trim() || m.name } : m)),
    });
  },
  acknowledgeTalk(memberId: string) {
    const c = state.checkins[memberId];
    if (!c) return;
    set({ ...state, checkins: { ...state.checkins, [memberId]: { ...c, wantsTalk: false } } });
  },
  reset() {
    set(demoFamily());
  },
};
