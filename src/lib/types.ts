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
}

export interface CalmPlan {
  signals: string[];
  helps: string[];
  needs: string[];
  place: string;
}

export interface FamilyState {
  version: 2;
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
}
