import { HAIR_COLORS, OUTFIT_COLORS } from "@/components/avatar/parts";
import { phoneTaskTitle } from "./tasks";
import type { AvatarConfig, FamilyState, Member, Role, Task } from "./types";

export interface NewMember {
  name: string;
  role: Role;
  age?: number;
  bedtime?: string;
  email?: string;
}

const SKINS = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;
const pick = <T,>(a: readonly T[], i: number) => a[i % a.length];

/** Een neutrale startavatar. Iedereen past die zelf aan bij het aanmelden. */
function startAvatar(i: number, role: Role): AvatarConfig {
  return {
    skin: pick(SKINS, i + 2),
    hair: role === "ouder" ? pick(["kort", "lang"] as const, i) : pick(["krullen", "knot", "kort", "vlechtjes"] as const, i),
    hairColor: pick(HAIR_COLORS, i),
    extras: [],
    outfit: pick(["trui", "hoodie", "tshirt", "overhemd"] as const, i),
    outfitColor: pick(OUTFIT_COLORS, i + 1),
  };
}

/** Een leeg gezin met een paar handige starttaken. De maker (ouder) staat op plek 0. */
export function newFamily(familyName: string, people: NewMember[]): FamilyState {
  const members: Member[] = people.map((p, i) => ({
    id: (p.role === "ouder" ? "p" : "k") + (i + 1),
    name: p.name.trim(),
    role: p.role,
    age: p.age,
    bedtime: p.role === "ouder" ? undefined : p.bedtime || "21:30",
    email: p.email?.trim() || undefined,
    avatar: startAvatar(i, p.role),
    energy: 0.5,
    joined: i === 0,
  }));
  const creator = members[0].id;
  const kids = members.filter((m) => m.role !== "ouder");
  const tasks: Task[] = [];
  let n = 1;
  const add = (t: Omit<Task, "id" | "createdBy">) => tasks.push({ ...t, id: "t" + n++, createdBy: creator });
  for (const k of kids) {
    add({ title: "Huiswerk maken", icon: "pen", assignee: k.id, repeat: "dagelijks", xp: 20 });
    add({ title: phoneTaskTitle(k.bedtime ?? "21:30"), icon: "telefoon", assignee: k.id, repeat: "dagelijks", xp: 15 });
  }
  if (kids.length > 1) {
    add({ title: "Vaatwasser uitruimen", icon: "huis", assignee: "beurt", repeat: "dagelijks", xp: 10 });
    add({ title: "Tafel dekken", icon: "bord", assignee: "beurt", repeat: "dagelijks", xp: 10 });
  } else if (kids.length === 1) {
    add({ title: "Tafel dekken", icon: "bord", assignee: kids[0].id, repeat: "dagelijks", xp: 10 });
  }

  return {
    version: 3,
    family: familyName.trim() || "Ons gezin",
    me: creator,
    members,
    checkins: {},
    tasks,
    done: {},
    xp: Object.fromEntries(kids.map((k) => [k.id, 0])),
    played: {},
    plans: {},
    calm: [],
    pet: { has: false, name: "", kind: "hond" },
    history: {},
    conflicts: [],
    goals: ["Minder ruzie", "Rustige ochtenden", "Samen leuke dingen doen"],
    meetings: [],
    rewards: [
      { level: 2, title: "Pizza-avond, jij kiest" },
      { level: 3, title: "Uitje met papa of mama" },
      { level: 4, title: "Uur extra gametijd in het weekend" },
      { level: 5, title: "Vriend blijven slapen" },
    ],
    pros: [],
    consent: { school: false, zorg: false },
    messages: [],
    proNotes: { school: "", zorg: "" },
    quests: [],
    coach: {},
    afspraken: [],
    coachLog: [],
  };
}

/** Tekst voor de uitnodiging, met installatie-uitleg. */
export function inviteText(opts: { name: string; from: string; code: string; url: string; family: string }) {
  return [
    `Hoi ${opts.name}!`,
    "",
    `We gaan thuis FamilyFlow gebruiken: onze eigen gezinsapp voor ${opts.family}. Wil jij ook meedoen?`,
    "",
    "Zo zet je de app op je telefoon:",
    `1. Open deze link: ${opts.url}`,
    "2. iPhone: open de link in Safari, tik op Deel (het vierkantje met de pijl) en kies 'Zet op beginscherm'.",
    "   Android: open de link in Chrome, tik op ⋮ en kies 'App installeren'.",
    "3. Open FamilyFlow vanaf je beginscherm en kies 'Ik heb een code'.",
    `4. Vul je code in: ${opts.code}`,
    "5. Maak je eigen avatar. Klaar!",
    "",
    "Doe stap 3 en 4 echt vanuit de app op je beginscherm, niet in de browser.",
    "",
    `Groetjes, ${opts.from}`,
  ].join("\n");
}
