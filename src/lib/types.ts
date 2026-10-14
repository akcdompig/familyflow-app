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

/** 1 = heel slecht … 5 = top. "rust" = wil even met rust gelaten worden. */
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
  /** 0–1, komt straks uit quests en routines. Zegt niets over gevoel. */
  energy: number;
}

export interface FamilyState {
  version: 1;
  family: string;
  members: Member[];
  me: string;
  checkins: Record<string, CheckIn | undefined>;
}
