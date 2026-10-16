import { demoFamily } from "@/lib/demo";
import type { FamilyState } from "@/lib/types";

/** Een leeg testgezin: 2 ouders, 2 kinderen, niks gedaan. Zelfde leden als de demo. */
export function gezin(extra: Partial<FamilyState> = {}): FamilyState {
  const d = demoFamily();
  return {
    ...d,
    tasks: [],
    done: {},
    xp: {},
    claim: {},
    xpLog: {},
    agenda: {},
    inzet: {},
    checkins: {},
    history: {},
    klusLog: [],
    koken: {},
    pot: { doel: "", cents: 0, items: [] },
    werk: {},
    diensten: [],
    dag: {},
    samen: [],
    feed: [],
    badges: [],
    vakanties: {},
    rooster: {},
    vrij: {},
    sleep: {},
    badgesStart: "2000-01-01T00:00:00.000Z",
    ...extra,
  };
}

/** Datum/tijd in Nederland: at("2026-10-15", "08:30"). */
export const at = (d: string, t = "12:00") => new Date(`${d}T${t}:00+02:00`);
export const iso = (d: Date) => d.toLocaleDateString("sv-SE");
