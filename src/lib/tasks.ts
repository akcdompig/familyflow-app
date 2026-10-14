import type { FamilyState, Member, Task } from "./types";

export const todayKey = (d = new Date()) => d.toLocaleDateString("sv-SE");

/** Wie doet deze taak vandaag? Bij "beurt" rouleert het elke dag tussen de kinderen. */
export function assigneeFor(state: FamilyState, task: Task, date = todayKey()): string {
  if (task.assignee !== "beurt") return task.assignee;
  const kids = state.members.filter((m) => m.role !== "ouder");
  if (!kids.length) return state.members[0]?.id ?? "";
  const day = Math.floor(new Date(date + "T12:00:00").getTime() / 864e5);
  const offset = state.tasks.filter((t) => t.assignee === "beurt").indexOf(task);
  return kids[(day + offset) % kids.length].id;
}

export function tasksToday(state: FamilyState, date = todayKey()): Task[] {
  return state.tasks.filter((t) => (t.pet ? state.pet.has : true) && (t.repeat === "dagelijks" || t.date === date));
}

export function tasksFor(state: FamilyState, memberId: string, date = todayKey()): Task[] {
  return tasksToday(state, date).filter((t) => assigneeFor(state, t, date) === memberId);
}

export const isDone = (state: FamilyState, taskId: string, date = todayKey()) => !!state.done[date]?.[taskId];

/** Energie van 0 tot 1: hoeveel van je taken van vandaag af zijn. */
export function energyOf(state: FamilyState, m: Member): number {
  const mine = tasksFor(state, m.id);
  if (!mine.length) return 0.5;
  return mine.filter((t) => isDone(state, t.id)).length / mine.length;
}

export const levelOf = (xp: number) => Math.floor(xp / 100) + 1;

export const TASK_SUGGESTIONS: { title: string; icon: Task["icon"]; xp: number; pet?: boolean }[] = [
  { title: "Huiswerk maken", icon: "pen", xp: 20 },
  { title: "20 minuten leren", icon: "boek", xp: 15 },
  { title: "Training of sporten", icon: "sport", xp: 25 },
  { title: "Kamer opruimen", icon: "bed", xp: 10 },
  { title: "Tafel dekken", icon: "bord", xp: 10 },
  { title: "Vaatwasser uitruimen", icon: "huis", xp: 10 },
  { title: "Afval wegbrengen", icon: "afval", xp: 10 },
  { title: "Boodschappen halen", icon: "kar", xp: 10 },
  { title: "Telefoon om 21.30 in de keuken", icon: "telefoon", xp: 15 },
  { title: "Huisdier uitlaten of eten geven", icon: "poot", xp: 10, pet: true },
];
