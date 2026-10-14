import type { FamilyState } from "./types";

const at = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() > Date.now()) d.setTime(Date.now() - 20 * 60 * 1000);
  return d.toISOString();
};

/** Voorbeeldgezin. Alle namen en gegevens zijn verzonnen. */
export function demoFamily(): FamilyState {
  return {
    version: 1,
    family: "Familie Jansen",
    me: "p1",
    members: [
      {
        id: "p1", name: "Papa", role: "ouder", energy: 0.35,
        avatar: { skin: "s5", hair: "kort", hairColor: "#2b1b14", extras: ["baard"], outfit: "overhemd", outfitColor: "#3a3670" },
      },
      {
        id: "p2", name: "Mama", role: "ouder", energy: 0.7,
        avatar: { skin: "s2", hair: "lang", hairColor: "#5a3825", extras: [], outfit: "trui", outfitColor: "#3cc6a0" },
      },
      {
        id: "k1", name: "Noah", role: "kind", age: 13, energy: 0.9,
        avatar: { skin: "s4", hair: "krullen", hairColor: "#2b1b14", extras: [], outfit: "hoodie", outfitColor: "#ff6b57" },
      },
      {
        id: "k2", name: "Lina", role: "tiener", age: 17, energy: 0.5,
        avatar: { skin: "s3", hair: "knot", hairColor: "#3a2418", extras: ["sproeten", "koptelefoon"], outfit: "tshirt", outfitColor: "#8fa6ff" },
      },
    ],
    checkins: {
      p1: { mood: 3, rest: false, topics: ["Thuis"], wantsTalk: false, at: at(8, 5) },
      p2: { mood: 5, rest: false, topics: [], wantsTalk: false, at: at(7, 40) },
      k1: { mood: 5, rest: false, topics: ["Sport"], wantsTalk: false, at: at(7, 55) },
      k2: { mood: 2, rest: true, topics: ["School"], wantsTalk: false, at: at(16, 10) },
    },
  };
}
