import type { FamilyState } from "./types";

const at = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() > Date.now()) d.setTime(Date.now() - 20 * 60 * 1000);
  return d.toISOString();
};
const today = () => new Date().toLocaleDateString("sv-SE");

/** Voorbeeldgezin. Alle namen en gegevens zijn verzonnen. */
export function demoFamily(): FamilyState {
  const d = today();
  return {
    version: 2,
    family: "Familie Jansen",
    me: "p1",
    members: [
      { id: "p1", name: "Papa", role: "ouder", energy: 0.5, avatar: { skin: "s5", hair: "kort", hairColor: "#2b1b14", extras: ["baard"], outfit: "overhemd", outfitColor: "#3a3670" } },
      { id: "p2", name: "Mama", role: "ouder", energy: 0.5, avatar: { skin: "s2", hair: "lang", hairColor: "#5a3825", extras: [], outfit: "trui", outfitColor: "#3cc6a0" } },
      { id: "k1", name: "Noah", role: "kind", age: 13, energy: 0.5, avatar: { skin: "s4", hair: "krullen", hairColor: "#2b1b14", extras: [], outfit: "hoodie", outfitColor: "#ff6b57" } },
      { id: "k2", name: "Lina", role: "tiener", age: 17, energy: 0.5, avatar: { skin: "s3", hair: "knot", hairColor: "#3a2418", extras: ["sproeten", "koptelefoon"], outfit: "tshirt", outfitColor: "#8fa6ff" } },
    ],
    checkins: {
      p1: { mood: 3, rest: false, topics: ["Thuis"], wantsTalk: false, at: at(8, 5) },
      p2: { mood: 5, rest: false, topics: [], wantsTalk: false, at: at(7, 40) },
      k1: { mood: 5, rest: false, topics: ["Sport"], wantsTalk: false, at: at(7, 55) },
      k2: { mood: 2, rest: true, topics: ["School"], wantsTalk: false, at: at(16, 10) },
    },
    tasks: [
      { id: "t1", title: "Huiswerk maken", icon: "pen", assignee: "k1", repeat: "dagelijks", xp: 20, createdBy: "p1" },
      { id: "t2", title: "Training of sporten", icon: "sport", assignee: "k1", repeat: "dagelijks", xp: 25, createdBy: "p1" },
      { id: "t3", title: "Telefoon om 21.30 in de keuken", icon: "telefoon", assignee: "k1", repeat: "dagelijks", xp: 15, createdBy: "p1" },
      { id: "t4", title: "Op tijd opstaan en ontbijten", icon: "zon", assignee: "k2", repeat: "dagelijks", xp: 15, createdBy: "p2" },
      { id: "t5", title: "Stageverslag: één alinea", icon: "pen", assignee: "k2", repeat: "eenmalig", date: d, xp: 20, createdBy: "k2" },
      { id: "t6", title: "Vaatwasser uitruimen", icon: "huis", assignee: "beurt", repeat: "dagelijks", xp: 10, createdBy: "p2" },
      { id: "t7", title: "Tafel dekken", icon: "bord", assignee: "beurt", repeat: "dagelijks", xp: 10, createdBy: "p2" },
      { id: "t8", title: "Hond uitlaten", icon: "poot", assignee: "beurt", repeat: "dagelijks", xp: 10, pet: true, createdBy: "p1" },
      { id: "t9", title: "Boodschappen halen", icon: "kar", assignee: "p2", repeat: "eenmalig", date: d, xp: 0, createdBy: "p2" },
      { id: "t10", title: "Mail naar mentor over rapportgesprek", icon: "post", assignee: "p1", repeat: "eenmalig", date: d, xp: 0, createdBy: "p1" },
    ],
    done: { [d]: { t1: "k1", t4: "k2", t9: "p2" } },
    xp: { k1: 185, k2: 90 },
    played: { k1: [1, 2], k2: [] },
    plans: {
      k1: { signals: ["Warm hoofd", "Vuisten ballen"], helps: ["Naar mijn rustplek", "Bokszak of sporten"], needs: ["Even met rust laten", "Later rustig praten"], place: "Mijn kamer met muziek op" },
      k2: { signals: ["Alles is stom"], helps: ["Muziek op", "Even naar buiten"], needs: ["Niet praten, wel in de buurt"], place: "" },
    },
    calm: [],
    pet: { has: false, name: "", kind: "hond" },
  };
}
