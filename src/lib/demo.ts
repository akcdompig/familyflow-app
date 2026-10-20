import type { FamilyState } from "./types";
import { DEFAULT_REWARDS } from "./xp";
import { maakPlan } from "./takenplan";

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
const day = (n: number) => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE");

/** Twee weken voorbeeld-afvinkwerk, voor "Wie doet wat". */
function demoDone(d: string): FamilyState["done"] {
  const out: FamilyState["done"] = { [d]: { t1: "k1", t4: "k2", t9: "p2" } };
  for (let n = 1; n <= 14; n++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - n);
    const key = dt.toLocaleDateString("sv-SE");
    const wd = dt.getDay();
    const day: Record<string, string> = { t13: n % 4 === 0 ? "p2" : "p1" };
    if (n % 2) day.t1 = "k1";
    if (n % 3) day.t4 = "k2";
    if (n % 2 === 0) day.t6 = n % 4 ? "k1" : "p1";
    if (n % 3 === 0) day.t7 = "k2";
    if ([1, 2, 4, 5].includes(wd)) day.t14 = "p1";
    if ([1, 2, 3, 4].includes(wd)) day.t15 = "p2";
    if ([3, 6].includes(wd)) { day.t16 = "p2"; day.t17 = "p1"; }
    out[key] = day;
  }
  return out;
}

/**
  Zeven weken voorbeeldgeschiedenis, zodat je in Groei en Week ziet hoe een gezin groeit.
  Elke week iets beter: vaker de ochtendroutine, vaker de vaatwasser, en steeds vaker samen iets.
  Zo gekozen dat er bij het openen geen achievements meteen vallen (badgesStart is 4 dagen terug).
*/
function demoGeschiedenis() {
  const dag: NonNullable<FamilyState["dag"]> = {};
  const klusLog: FamilyState["klusLog"] = [];
  const history: Record<string, { mood: 1 | 2 | 3 | 4 | 5; rest: boolean; at: string }[]> = { p1: [], p2: [], k1: [], k2: [] };
  const rnd = (n: number, k: number) => ((Math.sin(n * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
  for (let n = 1; n <= 49; n++) {
    const d = new Date(Date.now() - n * 864e5).toLocaleDateString("sv-SE");
    const p = 0.9 - Math.floor(n / 7) * 0.1;
    dag[d] = {};
    ["k1", "k2", "p1", "p2"].forEach((id, i) => {
      const goed = rnd(n, i) < p;
      dag[d][id] = { routine: goed ? ["douchen", "tanden", "deo", "haar", "lotion"] : ["tanden"], kleding: "nieuw", water: goed ? 6 : 3, fruit: goed ? 2 : 1, eten: ["ontbijt", "lunch", "avondeten"] };
      if (n % 2 === 0) history[id].push({ mood: (goed ? 4 : 3) as 3 | 4, rest: id.startsWith("k") && !goed && n % 4 === 0, at: daysAgo(n, 19) });
    });
    if (rnd(n, 5) < p) klusLog.push({ id: `h${n}a`, klus: "vaat-uit", by: n % 2 ? "k1" : "k2", at: daysAgo(n, 8) });
    if (rnd(n, 6) < p) klusLog.push({ id: `h${n}b`, klus: "vaat-in", by: n % 2 ? "k2" : "k1", at: daysAgo(n, 20) });
    if (rnd(n, 7) < p + 0.05) klusLog.push({ id: `h${n}c`, klus: "keuken", by: n % 3 === 0 ? "k1" : n % 2 ? "p1" : "p2", at: daysAgo(n, 20) });
    if (n % 2 === 0) for (const k of ["k1", "k2"]) if (rnd(n, k === "k1" ? 8 : 9) < p) klusLog.push({ id: `h${n}${k}`, klus: `kamer:${k}`, by: k, at: daysAgo(n, 17) });
    if (n % 3 === 0 && n >= 14 && rnd(n, 10) < p) klusLog.push({ id: `h${n}s`, klus: "stofzuigen", by: n % 2 ? "k2" : "k1", at: daysAgo(n, 15) });
  }
  const s = (id: string, n: number, soort: string, titel: string, wie: string[], vrienden?: string) => ({ id, soort, titel, wie, datum: new Date(Date.now() - n * 864e5).toLocaleDateString("sv-SE"), door: wie[0], at: daysAgo(n + 2, 12), gedaan: daysAgo(n, 16), reactie: Object.fromEntries(wie.map((w) => [w, "😍" as const])), ...(vrienden ? { vrienden } : {}) });
  const samen: FamilyState["samen"] = [
    s("s1", 40, "film", "Filmavond thuis", ["p1", "p2", "k1", "k2"]),
    s("s2", 26, "koken", "Samen koken", ["p1", "k2"]),
    s("s3", 19, "fietsen", "Fietstocht", ["p1", "k1"]),
    s("s4", 12, "bordspel", "Bordspel", ["p2", "k1", "k2"]),
    s("s5", 9, "koken", "Samen koken", ["p1", "k1"]),
    s("s6", 6, "sporten", "Samen trainen", ["p1", "k1", "k2"]),
    { id: "s7", soort: "sporten", titel: "Trainen met Lina en Noah", wie: ["p1", "k1", "k2"], datum: new Date(Date.now() + 864e5).toLocaleDateString("sv-SE"), tijd: "17:00", door: "p1", at: daysAgo(1, 20) },
  ];
  return { dag, klusLog, history, samen };
}

/** Voorbeeldgezin. Alle namen en gegevens zijn verzonnen. */
/** De demo zoals een ouder hem gebruikt: de klussen van de rest van deze week zijn verdeeld met "Verdeel de taken". Volgende week mag je zelf proberen. */
export function demoFamily(): FamilyState {
  const s = demoBasis();
  const restVanDeWeek = 7 - ((new Date().getDay() + 6) % 7); // maandag 7 dagen, zondag 1
  return { ...s, klusAfspraken: { ...(s.klusAfspraken ?? {}), planning: maakPlan(s, today(), restVanDeWeek) } };
}

function demoBasis(): FamilyState {
  const d = today();
  const g = demoGeschiedenis();
  return {
    version: 3,
    family: "Familie Jansen",
    me: "p1",
    members: [
      { id: "p1", name: "Papa", role: "ouder", energy: 0.5, avatar: { skin: "s5", hair: "kort", hairColor: "#2b1b14", extras: ["baard"], outfit: "overhemd", outfitColor: "#3a3670" } },
      { id: "p2", name: "Mama", role: "ouder", energy: 0.5, avatar: { skin: "s2", hair: "lang", hairColor: "#5a3825", extras: [], outfit: "trui", outfitColor: "#3cc6a0" } },
      { id: "k1", name: "Noah", role: "kind", age: 13, bedtime: "21:30", energy: 0.5, avatar: { skin: "s4", hair: "krullen", hairColor: "#2b1b14", extras: [], outfit: "hoodie", outfitColor: "#ff6b57" } },
      { id: "k2", name: "Lina", role: "tiener", age: 17, bedtime: "22:30", energy: 0.5, avatar: { skin: "s3", hair: "knot", hairColor: "#3a2418", extras: ["sproeten", "koptelefoon"], outfit: "tshirt", outfitColor: "#8fa6ff" } },
    ],
    // Zo zou een ouder het instellen: wat meer dan de standaard, zodat er ook op een schooldag iets te doen is.
    klusAfspraken: { verwachting: { k1: { school: 25, vrij: 40 }, k2: { school: 30, vrij: 45 } } },
    checkins: {
      p1: { mood: 3, rest: false, topics: ["Thuis"], wantsTalk: false, at: at(8, 5) },
      p2: { mood: 5, rest: false, topics: [], wantsTalk: false, at: at(7, 40) },
      k1: { mood: 5, rest: false, topics: ["Sport"], wantsTalk: false, at: at(7, 55) },
      k2: { mood: 2, rest: true, topics: ["School"], wantsTalk: false, at: at(16, 10) },
    },
    tasks: [
      { id: "t1", title: "Huiswerk maken", icon: "pen", assignee: "k1", repeat: "dagelijks", xp: 15, createdBy: "p1" },
      { id: "t2", title: "Training of sporten", icon: "sport", assignee: "k1", repeat: "dagelijks", xp: 10, createdBy: "p1" },
      { id: "t3", title: "Telefoon om 20.30 aan de lader", icon: "telefoon", assignee: "k1", repeat: "dagelijks", xp: 10, createdBy: "p1" },
      { id: "t4", title: "Op tijd opstaan en ontbijten", icon: "zon", assignee: "k2", repeat: "dagelijks", xp: 10, createdBy: "p2" },
      { id: "t5", title: "Stageverslag: één alinea", icon: "pen", assignee: "k2", repeat: "eenmalig", date: d, xp: 15, createdBy: "k2" },
      { id: "t6", title: "Vaatwasser uitruimen", icon: "huis", assignee: "beurt", repeat: "dagelijks", xp: 5, createdBy: "p2" },
      { id: "t7", title: "Tafel dekken", icon: "bord", assignee: "beurt", repeat: "dagelijks", xp: 5, createdBy: "p2" },
      { id: "t8", title: "Hond uitlaten", icon: "poot", assignee: "beurt", repeat: "dagelijks", xp: 10, pet: true, createdBy: "p1" },
      { id: "t9", title: "Boodschappen halen", icon: "kar", assignee: "p2", repeat: "eenmalig", date: d, xp: 0, createdBy: "p2" },
      { id: "t10", title: "Mail naar mentor over rapportgesprek", icon: "post", assignee: "p1", repeat: "eenmalig", date: d, xp: 0, createdBy: "p1" },
      { id: "t11", title: "Wiskunde hoofdstuk 4 oefenen", icon: "boek", assignee: "k1", repeat: "eenmalig", date: d, xp: 15, createdBy: "school", source: "school" },
      { id: "t12", title: "Geef elk kind vandaag één compliment", icon: "zon", assignee: "p2", repeat: "dagelijks", xp: 0, createdBy: "zorg", source: "zorg" },
      { id: "t13", title: "Koken", icon: "kook", assignee: "p1", repeat: "dagelijks", xp: 0, cat: "huishouden", min: 45, createdBy: "p1" },
      { id: "t14", title: "Werkdag", icon: "werk", assignee: "p1", repeat: "wekelijks", days: [1, 2, 4, 5], xp: 0, cat: "werk", min: 540, createdBy: "p1" },
      { id: "t15", title: "Werkdag", icon: "werk", assignee: "p2", repeat: "wekelijks", days: [1, 2, 3, 4], xp: 0, cat: "werk", min: 480, createdBy: "p2" },
      { id: "t16", title: "Was ophangen", icon: "was", assignee: "p2", repeat: "wekelijks", days: [3, 6], xp: 0, cat: "huishouden", min: 15, createdBy: "p2" },
      { id: "t17", title: "Stofzuigen", icon: "schoon", assignee: "p1", repeat: "wekelijks", days: [3, 6], xp: 0, cat: "huishouden", min: 30, createdBy: "p1" },
    ],
    done: demoDone(d),
    xp: { k1: 185, k2: 90 },
    reading: { k2: [{ at: daysAgo(1, 21), min: 20, book: "De Gelukkige Klas" }] },
    played: { k1: [1, 2], k2: [] },
    plans: {
      k1: { signals: ["Warm hoofd", "Vuisten ballen"], helps: ["Naar mijn rustplek", "Bokszak of sporten"], needs: ["Even met rust laten", "Later rustig praten"], place: "Mijn kamer met muziek op" },
      k2: { signals: ["Alles is stom"], helps: ["Muziek op", "Even naar buiten"], needs: ["Niet praten, wel in de buurt"], place: "" },
    },
    calm: [],
    pet: { has: false, name: "", kind: "hond" },
    history: {
      p1: [...g.history.p1.reverse(), ...[3, 4, 3, 2, 3, 4].map((m, i) => ({ mood: m, rest: false, at: daysAgo(6 - i) }))],
      p2: [...g.history.p2.reverse(), ...[4, 4, 5, 4, 3, 4].map((m, i) => ({ mood: m, rest: false, at: daysAgo(6 - i) }))],
      k1: [...g.history.k1.reverse(), ...[4, 3, 2, 3, 4, 4].map((m, i) => ({ mood: m, rest: false, at: daysAgo(6 - i) }))],
      k2: [...g.history.k2.reverse(), ...[3, 2, 3, 2, 3, 3].map((m, i) => ({ mood: m, rest: i === 3, at: daysAgo(6 - i) }))],
    },
    dag: g.dag,
    samen: g.samen,
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
      { at: daysAgo(14, 19), therm: { p1: 5, p2: 6, k1: 6, k2: 5 }, goals: { 0: 4, 1: 3, 2: 5 }, good: "Rustigere ochtenden", problem: "Telefoon 's avonds", solution: "Een uur voor bedtijd aan de lader in de keuken", fun: "Fietstocht" },
      { at: daysAgo(7, 19), therm: { p1: 6, p2: 7, k1: 7, k2: 5 }, goals: { 0: 6, 1: 5, 2: 6 }, good: "Ruzie zelf opgelost met de app", problem: "Wie mag voorin de auto", solution: "Even dagen Noah, oneven dagen Lina", fun: "Bowlen" },
    ],
    rewards: DEFAULT_REWARDS.map((r) => ({ ...r })),
    pros: [
      { id: "school", name: "Mentor Van Dijk", org: "Het Baken College" },
      { id: "zorg", name: "Coach Sanne", org: "Wijkteam Stad" },
    ],
    consent: { school: true, zorg: true },
    messages: [
      { id: "m1", from: "school", to: "k1", text: "Vrijdag toets wiskunde, hoofdstuk 4. Elke dag 20 minuten oefenen helpt echt.", at: at(9, 15), read: false },
      { id: "m2", from: "zorg", to: "ouders", text: "Fijn gesprek vorige week. Probeer deze week elk kind elke dag één compliment te geven.", at: daysAgo(1, 10), read: false },
    ],
    quests: [
      { id: "q1", member: "k1", title: "Spreek een vast stopseintje af en stop deze week 3 keer op tijd zonder ruzie.", skill: "overgang", from: "coach", at: daysAgo(2) },
      { id: "q2", member: "k1", title: "Oefen: Een normale vraag, een vals antwoord", scenario: "vals-antwoord", skill: "toon", from: "zorg", at: daysAgo(1) },
      { id: "q3", member: "k2", title: "Geef deze week één keer rustig een grens aan.", skill: "grens", from: "coach", at: daysAgo(4), done: daysAgo(1) },
    ],
    afspraken: [
      { id: "a1", text: "Een seintje 10 minuten voordat de gametijd voorbij is", at: daysAgo(8), by: "p1", scenario: "gamen" },
      { id: "a2", text: "Kloppen voordat je bij een ander binnenkomt", at: daysAgo(3), by: "p2", scenario: "in-de-weg" },
    ],
    coachLog: [
      { at: daysAgo(19), by: "p1", scenario: "gamen", licht: "oranje" },
      { at: daysAgo(12), by: "p2", scenario: "gamen", licht: "rood" },
      { at: daysAgo(5), by: "p1", scenario: "gamen", licht: "oranje" },
      { at: daysAgo(3), by: "k2", scenario: "in-de-weg", licht: "rood" },
    ],
    coach: {
      k1: [{ id: "gamen-stoppen", at: daysAgo(2), path: ["aanval", "opkomen"], outcome: "opgelost" }],
      k2: [{ id: "iemand-doet-vals", at: daysAgo(4), path: ["opkomen"], outcome: "opgelost" }],
    },
    proNotes: { school: "", zorg: "Gezin is gemotiveerd. Ochtenden gaan beter. Let op ruzies bij spelletjes." },
    badgesStart: daysAgo(4),
    // Lina deed deze week voor het eerst iets nieuws; die viering was er al, zodat de demo rustig opent.
    badges: [{ id: "b-demo-1", who: "k2", badge: "nieuwe-vaardigheid", at: daysAgo(5), gezien: ["k2", "p1", "p2", "k1"] }],
    // Voorbeeld: wat er nog in de schatkist ligt, en waarvoor. Eén eerdere claim van Noah als historie.
    claim: { p1: 0, p2: 0, k1: 140, k2: 60 },
    // Een losse afspraak voor papa vandaag, zonder dat er iets anders hoeft te staan.
    agenda: {
      p1: [{ id: "ag1", titel: "Ontbijten met Akram", datum: new Date(daysAgo(0, 12)).toLocaleDateString("sv-SE"), van: "11:00", tot: "12:00", soort: "sociaal", met: "Akram", waar: "Café de Haven", at: daysAgo(1, 20) }],
    },
    inzet: { p1: [{ id: "iz1", soort: "pitch", datum: new Date(daysAgo(1, 12)).toLocaleDateString("sv-SE"), tekst: "pitch voor een nieuwe klant", at: daysAgo(1, 21) }] },
    // Weekafspraak (vooraf, vast) en een oefentoets die papa plakte.
    // Weekbonus: zakgeld krijgen ze altijd; de bonus komt erbovenop in twee treden.
    weekAfspraak: {
      k1: { drempel: 70, beloning: "€ 2,50", treden: [{ pct: 70, wat: "€ 2,50" }, { pct: 85, wat: "€ 5" }], zakgeld: "€ 5" },
      k2: { drempel: 70, beloning: "€ 3,75", treden: [{ pct: 70, wat: "€ 3,75" }, { pct: 85, wat: "€ 7,50" }], zakgeld: "€ 10" },
    },
    // Twee eerder afgesloten weken van Noah: één met de hele bonus (uitbetaald), één net niet gehaald.
    weekAfsluiting: (() => {
      const ma = (w: number) => { const x = new Date(); x.setDate(x.getDate() - ((x.getDay() + 6) % 7) - 7 * w); return x.toLocaleDateString("sv-SE"); };
      const zo = (w: number) => new Date(new Date(ma(w) + "T19:00:00").getTime() + 6 * 864e5).toISOString();
      return { k1: { [ma(2)]: { af: 52, totaal: 60, pct: 87, gehaald: true, beloning: "€ 5", trede: 1, betaald: zo(2), door: "p1", at: zo(2) }, [ma(3)]: { af: 40, totaal: 59, pct: 68, gehaald: false, door: "p1", at: zo(3) } } };
    })(),
    oefentoetsen: {
      k1: [{ id: "ot1", titel: "Duits H4 woordjes", door: "p1", at: daysAgo(1, 20), vragen: [
        { v: "Wat betekent 'der Hund'?", a: "de hond", opties: ["de kat", "het huis", "de boom"] },
        { v: "Wat betekent 'die Schule'?", a: "de school", opties: ["de schoen", "de tafel", "de straat"] },
        { v: "Vertaal: het boek", a: "das Buch" },
        { v: "Wat betekent 'schnell'?", a: "snel", opties: ["langzaam", "groot", "koud"] },
      ] }, { id: "ot2", titel: "Engels H2 woordjes", door: "p1", at: daysAgo(4, 20), vragen: [
        { v: "Vertaal: the kitchen", a: "de keuken", opties: ["de kamer", "de kip", "het kussen"] },
        { v: "Vertaal: to borrow", a: "lenen" },
        { v: "Vertaal: the weather", a: "het weer", opties: ["de wereld", "de wind", "het water"] },
      ], pogingen: [
        { at: daysAgo(3, 19), goed: 1, totaal: 3, fout: [0, 1], antwoorden: ["de kamer", "", "het weer"] },
        { at: daysAgo(2, 19), goed: 2, totaal: 3, fout: [1], antwoorden: ["de keuken", "lijnen", "het weer"] },
      ] }],
    },
    xpLog: {
      k1: [
        { id: "x1", n: 10, wat: "Korte oefening gedaan", at: daysAgo(4, 17), claim: daysAgo(3, 19) },
        { id: "x2", n: 10, wat: "Korte oefening gedaan", at: daysAgo(4, 17), claim: daysAgo(3, 19) },
        { id: "x3", n: 20, wat: "Ochtendroutine", at: daysAgo(3, 8), claim: daysAgo(3, 19) },
        { id: "x4", n: 10, wat: "Ochtendroutine", at: daysAgo(1, 8) },
        { id: "x5", n: 15, wat: "Huiswerk maken", at: daysAgo(1, 17) },
        { id: "x6", n: 5, wat: "Vaatwasser inruimen en aanzetten", at: daysAgo(1, 20) },
        { id: "x7", n: 15, wat: "Oefenscenario met de coach", at: daysAgo(1, 19) },
      ],
      k2: [
        { id: "x8", n: 10, wat: "Stofzuigen", at: daysAgo(3, 15) },
        { id: "x9", n: 10, wat: "Was doen (draaien, ophangen, vouwen)", at: daysAgo(1, 18) },
        { id: "x10", n: 5, wat: "Vaatwasser uitruimen", at: daysAgo(1, 8) },
        { id: "x11", n: 5, wat: "Ochtendroutine", at: daysAgo(1, 8) },
      ],
    },
    werk: {
      p1: [{ id: "w1", naam: "Kantoor", soort: "vast", days: [1, 2, 4, 5], van: "08:00", tot: "17:00", inkomen: true }],
      p2: [{ id: "w2", naam: "Gemeente", soort: "vast", days: [1, 2, 3, 4], van: "08:30", tot: "17:00", inkomen: true }],
      k1: [{ id: "w3", naam: "School", soort: "vast", days: [1, 2, 3, 4, 5], van: "08:30", tot: "15:00", look: "school" }],
      k2: [{ id: "w4", naam: "ROC", soort: "vast", days: [1, 2, 4], van: "09:00", tot: "13:00", look: "school" }],
    },
    klusLog: [
      ...g.klusLog!.reverse(),
      { id: "kl1", klus: "bedden", by: "p2", at: daysAgo(6, 10) },
      { id: "kl2", klus: "flessen", by: "k1", at: daysAgo(9, 16) },
      { id: "kl3", klus: "stofzuigen", by: "k2", at: daysAgo(3, 15) },
      { id: "kl4", klus: "was", by: "k2", at: daysAgo(1, 18) },
      { id: "kl5", klus: "vaat-in", by: "k1", at: daysAgo(1, 20) },
      { id: "kl6", klus: "vaat-uit", by: "k2", at: daysAgo(1, 8) },
      { id: "kl7", klus: "keuken", by: "p1", at: daysAgo(1, 20) },
    ],
    koken: { [day(-1)]: { kok: "p1", wat: "Nasi met kip" } },
    pot: {
      doel: "Bowlen met z'n allen",
      cents: 6000,
      items: [
        { id: "e1", cents: 375, soort: "statiegeld", reden: "Statiegeld", by: "k1", voor: "k1", at: daysAgo(9, 16) },
        { id: "e2", cents: 100, soort: "beloning", reden: "Goed geleerd voor een toets", by: "p2", voor: "k2", at: daysAgo(2, 19) },
        { id: "e3", cents: 1000, soort: "inleg", reden: "Inleg", by: "p1", voor: "p1", at: daysAgo(5, 12) },
      ],
    },
  };
}
