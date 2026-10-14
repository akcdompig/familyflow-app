export type Role = "ouder" | "kind" | "tiener";

export type SkinId = "s1" | "s2" | "s3" | "s4" | "s5" | "s6";
export type HairStyle = "kort" | "krullen" | "lang" | "knot" | "opgeschoren" | "hoofddoek" | "vlechtjes" | "kaal";
export type Extra = "sproeten" | "bril" | "baard" | "snor" | "koptelefoon" | "pet";
export type OutfitStyle = "trui" | "tshirt" | "hoodie" | "overhemd";

export interface AvatarConfig {
  skin: SkinId;
  hair: HairStyle;
  hairColor: string;
  extras: Extra[];
  outfit: OutfitStyle;
  outfitColor: string;
}

/** 1 = heel slecht … 5 = top. */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface CheckIn {
  mood: MoodLevel;
  rest: boolean;
  topics: string[];
  wantsTalk: boolean;
  at: string; // ISO-tijd
}

export interface Member {
  id: string;
  name: string;
  role: Role;
  age?: number;
  avatar: AvatarConfig;
  /** 0–1, berekend uit de taken van vandaag. Zegt niets over gevoel. */
  energy: number;
  /** Live: false tot iemand zijn eigen telefoon heeft gekoppeld en een avatar heeft gemaakt. */
  joined?: boolean;
  /** Bedtijd "21:30". De telefoon gaat een uur eerder aan de lader. */
  bedtime?: string;
  /** Alleen bij het aanmaken, om de uitnodiging te kunnen mailen. */
  email?: string;
}

export type TaskIcon = "pen" | "boek" | "sport" | "huis" | "bord" | "afval" | "poot" | "bed" | "telefoon" | "zon" | "kar" | "post";

/** Een lid-id, of "beurt": rouleert elke dag tussen de kinderen. */
export type Assignee = string;

export interface Task {
  id: string;
  title: string;
  icon: TaskIcon;
  assignee: Assignee;
  repeat: "dagelijks" | "eenmalig";
  /** Alleen bij eenmalig: de dag (YYYY-MM-DD). */
  date?: string;
  xp: number;
  /** Alleen tonen als het gezin een huisdier heeft. */
  pet?: boolean;
  createdBy: string;
  /** Gezet door school of zorg. */
  source?: ProKind;
  /** Leerblok uit de leerplanner. */
  study?: { subject: string; kind: string; deadline: string; part: number; of: number; min: number };
}

export interface CalmPlan {
  signals: string[];
  helps: string[];
  needs: string[];
  place: string;
}

export type ProKind = "school" | "zorg";

export interface Pro {
  id: ProKind;
  name: string;
  org: string;
}

export interface ConflictSide {
  feel: string[];
  want: string[];
  story: string;
}

export interface Conflict {
  id: string;
  at: string;
  from: string;
  with: string;
  topic: string;
  physical: boolean;
  sides: Record<string, ConflictSide>;
  status: "wacht" | "opgelost" | "hulp";
  solution?: string;
  solvedAt?: string;
}

export interface Meeting {
  at: string;
  therm: Record<string, number>;
  goals: Record<number, number>;
  good: string;
  problem: string;
  solution: string;
  fun: string;
}

export interface ProMessage {
  id: string;
  from: ProKind;
  to: string; // "gezin" | "ouders" | lid-id
  text: string;
  at: string;
  read: boolean;
}

/** Opdracht voor het echte leven, of een oefening die school of zorg klaarzet. */
export interface Quest {
  id: string;
  member: string;
  title: string;
  skill?: string;
  /** Id van een coachscenario om te oefenen. */
  scenario?: string;
  from: "coach" | "ouder" | ProKind;
  at: string;
  done?: string;
}

/** Eén keer een coachscenario gespeeld. */
export interface CoachRun {
  id: string;
  at: string;
  path: ("aanval" | "wegduik" | "opkomen")[];
  outcome: "opgelost" | "half" | "escalatie";
}

export interface FamilyState {
  version: 3;
  family: string;
  members: Member[];
  me: string;
  checkins: Record<string, CheckIn | undefined>;
  tasks: Task[];
  /** done[datum][taakId] = id van wie het deed */
  done: Record<string, Record<string, string>>;
  xp: Record<string, number>;
  /** Geoefende oefenlevels per lid */
  played: Record<string, number[]>;
  plans: Record<string, CalmPlan>;
  calm: { member: string; at: string }[];
  pet: { has: boolean; name: string; kind: string };
  /** Geschiedenis van check-ins, voor trends en het weeksignaal. */
  history: Record<string, { mood: number; rest: boolean; at: string }[]>;
  conflicts: Conflict[];
  goals: string[];
  meetings: Meeting[];
  rewards: { level: number; title: string }[];
  pros: Pro[];
  consent: Record<ProKind, boolean>;
  messages: ProMessage[];
  proNotes: Record<ProKind, string>;
  quests?: Quest[];
  /** coach[lid] = gespeelde coachscenario's */
  coach?: Record<string, CoachRun[]>;
  /** Gezinsafspraken uit de coach of het overleg. */
  afspraken?: { id: string; text: string; at: string; by: string; scenario?: string }[];
  /** Gelezen minuten per lid. */
  reading?: Record<string, { at: string; min: number; book?: string; uit?: boolean }[]>;
  /** Korte feedback tijdens de pilot. */
  feedback?: { id: string; by: string; at: string; vibe: "fijn" | "lastig"; text: string }[];
  /** Startdatum van het gezin, voor stap voor stap vrijspelen. Leeg = alles aan. */
  startedAt?: string;
  /** Ouders hebben alles meteen aangezet. */
  allesAan?: boolean;
  /** Alleen dat de coach gebruikt is, niet wat er gebeurde. */
  coachLog?: { at: string; by: string; scenario: string; licht: "rood" | "oranje" | "groen" | "veilig" }[];
}
