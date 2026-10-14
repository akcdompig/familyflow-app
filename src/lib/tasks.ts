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

/** Valt deze dag in een schoolvakantie van dit kind? */
export function vakantieOp(state: FamilyState, memberId: string, date = todayKey()) {
  return (state.vakanties?.[memberId] ?? []).find((v) => date >= v.van && date <= v.tot) ?? null;
}

/** Vaste schooltaak, zoals "Huiswerk maken" elke dag. Niet voor losse leerblokjes. */
export const isSchoolTaak = (t: Task) => t.repeat === "dagelijks" && !t.study && (t.icon === "pen" || /huiswerk|leren|school/i.test(t.title));

export function tasksFor(state: FamilyState, memberId: string, date = todayKey()): Task[] {
  const vrij = !!vakantieOp(state, memberId, date);
  return tasksToday(state, date).filter((t) => assigneeFor(state, t, date) === memberId && !(vrij && isSchoolTaak(t)));
}

/** Wacht dit blokje nog op een ouder? */
export const wachtOpOuder = (state: FamilyState, t: Task, date = todayKey()) => !!t.study?.ouder && isDone(state, t.id, date) && !state.checked?.[date]?.[t.id];

export const isDone = (state: FamilyState, taskId: string, date = todayKey()) => !!state.done[date]?.[taskId];

/** Energie van 0 tot 1: hoeveel van je taken van vandaag af zijn. */
export function energyOf(state: FamilyState, m: Member): number {
  const mine = tasksFor(state, m.id);
  if (!mine.length) return 0.5;
  return mine.filter((t) => isDone(state, t.id)).length / mine.length;
}

export { levelOf } from "./xp";

export const TASK_SUGGESTIONS: { title: string; icon: Task["icon"]; xp: number; pet?: boolean }[] = [
  { title: "Huiswerk maken", icon: "pen", xp: 15 },
  { title: "20 minuten leren", icon: "boek", xp: 10 },
  { title: "Training of sporten", icon: "sport", xp: 10 },
  { title: "Kamer opruimen", icon: "bed", xp: 10 },
  { title: "Tafel dekken", icon: "bord", xp: 5 },
  { title: "Vaatwasser uitruimen", icon: "huis", xp: 5 },
  { title: "Afval wegbrengen", icon: "afval", xp: 5 },
  { title: "Boodschappen halen", icon: "kar", xp: 10 },
  { title: "Telefoon aan de lader in de keuken", icon: "telefoon", xp: 10 },
  { title: "Huisdier uitlaten of eten geven", icon: "poot", xp: 5, pet: true },
];

/** Een uur voor bedtijd: "21:30" → "20.30". */
export function phoneTime(bedtime: string): string {
  const [h, m] = bedtime.split(":").map(Number);
  const t = ((h * 60 + (m || 0) - 60) + 1440) % 1440;
  return `${Math.floor(t / 60)}.${String(t % 60).padStart(2, "0")}`;
}
export const phoneTaskTitle = (bedtime: string) => `Telefoon om ${phoneTime(bedtime)} aan de lader`;
