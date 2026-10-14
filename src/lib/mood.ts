import type { CheckIn, MoodLevel } from "./types";

export const MOODS: { level: MoodLevel; label: string; color: string }[] = [
  { level: 1, label: "Heel slecht", color: "var(--ff-mood-1)" },
  { level: 2, label: "Niet zo", color: "var(--ff-mood-2)" },
  { level: 3, label: "Gaat wel", color: "var(--ff-mood-3)" },
  { level: 4, label: "Goed", color: "var(--ff-mood-4)" },
  { level: 5, label: "Top", color: "var(--ff-mood-5)" },
];

export const TOPICS = ["School", "Thuis", "Vrienden", "Broer of zus", "Online", "Slaap", "Sport", "Iets anders"];

/** Uitdrukking op het gezicht van de avatar. */
export type Expression = "blij" | "goed" | "neutraal" | "verdrietig" | "boos" | "rust" | "moe";

export function expressionFor(c: CheckIn | undefined): Expression {
  if (!c) return "neutraal";
  if (c.rest) return "rust";
  return ({ 1: "verdrietig", 2: "verdrietig", 3: "neutraal", 4: "goed", 5: "blij" } as const)[c.mood];
}

export function moodLabel(c: CheckIn | undefined): string {
  if (!c) return "nog niet ingecheckt";
  if (c.rest) return "even rust";
  return MOODS[c.mood - 1].label.toLowerCase();
}

export function moodDot(c: CheckIn | undefined): string {
  if (!c) return "var(--ff-lijn)";
  if (c.rest) return "var(--ff-lucht)";
  if (c.mood <= 2) return "var(--ff-koraal)";
  if (c.mood === 3) return "var(--ff-zon)";
  return "var(--ff-munt)";
}

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const t = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  return same ? `vandaag ${t}` : d.toLocaleDateString("nl-NL", { weekday: "long" }) + ` ${t}`;
}
