import type { FamilyState } from "./types";

const DAY = 864e5;
const within = (iso: string, days: number) => Date.now() - new Date(iso).getTime() < days * DAY;

export interface Signal {
  level: "groen" | "oranje";
  reasons: string[];
}

/** Weekkleur voor school en zorg. Alleen patronen, geen details. */
export function weekSignal(state: FamilyState): Signal {
  const reasons: string[] = [];
  for (const k of state.members.filter((m) => m.role !== "ouder")) {
    const low = (state.history[k.id] ?? []).filter((h) => within(h.at, 7) && (h.rest || h.mood <= 2)).length;
    if (low >= 3) reasons.push(`${k.name} had ${low} lastige dagen`);
  }
  if (state.conflicts.some((c) => c.physical && within(c.at, 7))) reasons.push("Ruzie met fysiek contact deze week");
  const last = state.meetings[state.meetings.length - 1];
  if (!last || !within(last.at, 14)) reasons.push("Geen gezinsoverleg in 2 weken");
  return { level: reasons.length ? "oranje" : "groen", reasons };
}

export function goalSeries(state: FamilyState): number[][] {
  return state.goals.map((_, i) => state.meetings.map((m) => m.goals[i] ?? NaN));
}

export function thermSeries(state: FamilyState): number[] {
  return state.meetings.map((m) => {
    const v = Object.values(m.therm);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
  });
}

export const conflictsThisWeek = (state: FamilyState) => state.conflicts.filter((c) => within(c.at, 7)).length;
export const conflictsLastWeek = (state: FamilyState) => state.conflicts.filter((c) => !within(c.at, 7) && within(c.at, 14)).length;
export const calmThisWeek = (state: FamilyState, id?: string) => state.calm.filter((c) => within(c.at, 7) && (!id || c.member === id)).length;
