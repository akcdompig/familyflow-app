import type { FamilyState } from "./types";

const daysAgo = (n: number, h = 18) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

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
    version: 3,
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
      { id: "t11", title: "Wiskunde hoofdstuk 4 oefenen", icon: "boek", assignee: "k1", repeat: "eenmalig", date: d, xp: 20, createdBy: "school", source: "school" },
      { id: "t12", title: "Geef elk kind vandaag één compliment", icon: "zon", assignee: "p2", repeat: "dagelijks", xp: 0, createdBy: "zorg", source: "zorg" },
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
    history: {
      p1: [3, 4, 3, 2, 3, 4].map((m, i) => ({ mood: m, rest: false, at: daysAgo(6 - i) })),
      p2: [4, 4, 5, 4, 3, 4].map((m, i) => ({ mood: m, rest: false, at: daysAgo(6 - i) })),
      k1: [4, 3, 2, 3, 4, 4].map((m, i) => ({ mood: m, rest: false, at: daysAgo(6 - i) })),
      k2: [3, 2, 3, 2, 3, 3].map((m, i) => ({ mood: m, rest: i === 3, at: daysAgo(6 - i) })),
    },
    conflicts: [
      { id: "c1", at: daysAgo(11), from: "k2", with: "k1", topic: "Taken in huis", physical: false, sides: {}, status: "opgelost", solution: "Om de beurt" },
      { id: "c2", at: daysAgo(9), from: "k1", with: "k2", topic: "Spullen pakken of lenen", physical: false, sides: {}, status: "opgelost", solution: "We spreken een regel af" },
      { id: "c3", at: daysAgo(3), from: "k1", with: "k2", topic: "Plagen of uitlachen", physical: false, sides: {}, status: "opgelost", solution: "We zeggen allebei sorry" },
      {
        id: "c4", at: at(15, 30), from: "k2", with: "k1", topic: "Iets eerlijk verdelen", physical: false, status: "wacht",
        sides: { k2: { feel: ["Oneerlijk behandeld"], want: ["Een afspraak maken"], story: "Noah mag altijd voorin de auto." } },
      },
    ],
    goals: ["Minder ruzie tussen de kinderen", "Rustige ochtenden", "Samen leuke dingen doen"],
    meetings: [
      { at: daysAgo(21, 19), therm: { p1: 4, p2: 5, k1: 5, k2: 4 }, goals: { 0: 3, 1: 2, 2: 4 }, good: "Noah ging 3 keer naar training", problem: "Ruzie over de vaatwasser", solution: "Takenlijst in de app, om de beurt", fun: "Pannenkoeken bakken" },
      { at: daysAgo(14, 19), therm: { p1: 5, p2: 6, k1: 6, k2: 5 }, goals: { 0: 4, 1: 3, 2: 5 }, good: "Rustigere ochtenden", problem: "Telefoon 's avonds", solution: "Om 21.30 aan de lader in de keuken", fun: "Fietstocht" },
      { at: daysAgo(7, 19), therm: { p1: 6, p2: 7, k1: 7, k2: 5 }, goals: { 0: 6, 1: 5, 2: 6 }, good: "Ruzie zelf opgelost met de app", problem: "Wie mag voorin de auto", solution: "Even dagen Noah, oneven dagen Lina", fun: "Bowlen" },
    ],
    rewards: [
      { level: 2, title: "Pizza-avond, jij kiest" },
      { level: 3, title: "Uitje met papa of mama" },
      { level: 4, title: "Uur extra gametijd in het weekend" },
      { level: 5, title: "Vriend blijven slapen" },
    ],
    pros: [
      { id: "school", name: "Mentor Van Dijk", org: "Het Baken College" },
      { id: "zorg", name: "Coach Sanne", org: "Wijkteam Stad" },
    ],
    consent: { school: true, zorg: true },
    messages: [
      { id: "m1", from: "school", to: "k1", text: "Vrijdag toets wiskunde, hoofdstuk 4. Elke dag 20 minuten oefenen helpt echt.", at: at(9, 15), read: false },
      { id: "m2", from: "zorg", to: "ouders", text: "Fijn gesprek vorige week. Probeer deze week elk kind elke dag één compliment te geven.", at: daysAgo(1, 10), read: false },
    ],
    proNotes: { school: "", zorg: "Gezin is gemotiveerd. Ochtenden gaan beter. Let op ruzies bij spelletjes." },
  };
}
