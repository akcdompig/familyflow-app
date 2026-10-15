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

export type TaskIcon = "pen" | "boek" | "sport" | "huis" | "bord" | "afval" | "poot" | "bed" | "telefoon" | "zon" | "kar" | "post" | "werk" | "was" | "schoon" | "kook" | "auto";

/** Soort taak, voor het overzicht "Wie doet wat". */
export type TaakCat = "huishouden" | "kinderen" | "school" | "sport" | "werk" | "overig";

/** Een lid-id, of "beurt": rouleert elke dag tussen de kinderen. */
export type Assignee = string;

export interface Task {
  id: string;
  title: string;
  icon: TaskIcon;
  assignee: Assignee;
  repeat: "dagelijks" | "eenmalig" | "wekelijks";
  /** Alleen bij eenmalig: de dag (YYYY-MM-DD). */
  date?: string;
  /** Alleen bij wekelijks: op welke dagen (0 = zondag … 6 = zaterdag). */
  days?: number[];
  /** Soort taak en hoe lang hij ongeveer duurt, voor "Wie doet wat". */
  cat?: TaakCat;
  min?: number;
  xp: number;
  /** Alleen tonen als het gezin een huisdier heeft. */
  pet?: boolean;
  createdBy: string;
  /** Gezet door school of zorg. */
  source?: ProKind;
  /** Leerblok uit de leerplanner. */
  study?: { subject: string; kind: string; deadline: string; part: number; of: number; min: number; /** Id uit Somtoday, als het daar vandaan komt. */ sid?: string; note?: string; /** Een ouder bevestigt dit blokje (overhoren). */ ouder?: boolean };
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

/** Werk of een inkomstenbron van een gezinslid. Vast = elke week op dezelfde dagen; wisselend = losse diensten. */
export interface WerkItem {
  id: string;
  naam: string;
  soort: "vast" | "wisselend";
  /** Bij vast: dagen (0 = zondag … 6 = zaterdag) en tijden. */
  days?: number[];
  van?: string; // "08:30"
  tot?: string; // "17:00"
  /** Hier verdient iemand geld mee (geen bedragen). */
  inkomen?: boolean;
  /** Hoe de avatar eruitziet tijdens dit werk. */
  look?: Bezig;
}

/** Wat de avatar aan het doen is tijdens werk. */
export type Bezig = "kantoor" | "sport" | "security" | "bouw" | "keuken" | "school";
export interface Dienst {
  id: string;
  member: string;
  werkId: string;
  date: string;
  van: string;
  tot: string;
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
  afspraken?: Afspraak[];
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
  /** Somtoday per kind: welke items al zijn ingepland (ook als ze daarna zijn weggehaald) en wanneer het laatst is opgehaald. */
  somtoday?: Record<string, { at: string; seen: string[] }>;
  /** Schoolvakanties per kind (uit Somtoday). Dan geen schooltaken. */
  vakanties?: Record<string, { naam: string; van: string; tot: string }[]>;
  /** Lesrooster uit Somtoday per kind: per dag het eerste en laatste uur. */
  rooster?: Record<string, { date: string; van: string; tot: string; lessen: number }[]>;
  /** Werk per gezinslid, en losse diensten (security, heitoezicht, …). */
  werk?: Record<string, WerkItem[]>;
  diensten?: Dienst[];
  /** Dagelijkse basis per dag en lid: ochtendroutine, kleding, water, fruit, ontbijt, sport. */
  dag?: Record<string, Record<string, { routine: string[]; kleding?: "nieuw" | "zelfde"; water: number; fruit: number; ontbijt?: boolean; sport?: boolean; eten?: string[]; snoep?: number; zoet?: number }>>;
  /** Koken per dag: wie kookt, wat, restjes van gisteren, wie eet mee. */
  koken?: Record<string, Kookplan>;
  /** Klussen in huis: wie deed wat en wanneer. Nieuwste achteraan. */
  klusLog?: KlusDone[];
  /** Het gezinspotje: sparen voor iets leuks samen. Geen bank, alleen bijhouden. */
  pot?: { doel: string; cents: number; items: PotItem[] };
  /** Punten die al geclaimd zijn (stand van xp bij de laatste claim). Het verschil wacht in je schatkist. */
  claim?: Record<string, number>;
  /** Gehaalde achievements. gezien = wie de viering al heeft gezien. */
  badges?: { id: string; who: string; badge: string; at: string; gezien: string[] }[];
  /** Vanaf wanneer achievements tellen (oude data telt niet mee). */
  badgesStart?: string;
  /** Waar wil je tips over? Per lid: koken, sport, gezond, leren, hoofd, geld. */
  interesses?: Record<string, string[]>;
  /** Laatst actief in de app, per lid (ISO-tijd). Daarop rekenen de herinneringen. */
  actief?: Record<string, string>;
  /** "Net gedaan": wat iedereen vandaag heeft afgevinkt. Geen melding, alleen zichtbaar in de huiskamer. */
  feed?: { id: string; who: string; tekst: string; punten: number; at: string }[];
  /** Vast werk dat een keer niet doorgaat: vrij[datum] = ["lidId:werkId"]. */
  vrij?: Record<string, string[]>;
  /** Porren: een duwtje van een gezinslid. */
  porren?: { id: string; from: string; to: string; at: string; tekst: string; gezien?: boolean }[];
  /** Wie slaapt: sleep[lid] = tijd van welterusten. Inchecken maakt je wakker. */
  sleep?: Record<string, string>;
  /** Bevestigd door een ouder: checked[datum][taakId] = id van de ouder. */
  checked?: Record<string, Record<string, string>>;
  /** Klus van eigenaar gewisseld (samen beslist of door een ouder): ruil[datum][klusKey] = lidId. */
  ruil?: Record<string, Record<string, string>>;
  /** Klus samen doen: samenDoen[datum][klusKey] = de partner (de eigenaar staat in de verdeling of in ruil). */
  samenDoen?: Record<string, Record<string, string>>;
  /** Samen beslist wie een klus doet (spel, loting, om de beurt, samen). Nieuwste achteraan. */
  uitdagingen?: Uitdaging[];
  /** Samen dingen doen: koken, boodschappen, film, stad, buiten. Bouwt de band op. */
  samen?: SamenMoment[];
  /** Afspraken over klussen, door ouders vastgelegd. Zonder afspraken geldt het voorstel van de app. */
  klusAfspraken?: Afspraken;
  /** Vandaag geen klussen (ziek, toets, toernooi): vrijstelling[datum][lidId] = reden. */
  vrijstelling?: Record<string, Record<string, string>>;
  /** "Dit lukt me vandaag niet" of "ik wil hulp": een vraag aan de ouders. */
  bezwaren?: Bezwaar[];
  /** Antwoord van een ouder op een vraag (los opgeslagen, zodat een kind het niet kan wijzigen). */
  bezwaarAntwoord?: Record<string, { keuze: "ok" | "ouder" | "samen" | "toch"; door: string; at: string; tekst?: string }>;
  /** Schermtijd per lid per dag, overgenomen uit Schermtijd op de telefoon (door een ouder). Minuten. */
  schermtijd?: Record<string, Record<string, { totaal: number; sociaal?: number; door: string; at: string }>>;
  /** Schermtijd-afspraak per kind: hoeveel minuten per dag is het doel. */
  schermAfspraak?: Record<string, { doel: number }>;
  /** Groeidoelen per kind: welke vaardigheden, en de terugblik per week (maandag → vaardigheid → hoe ging het). */
  doelen?: Record<string, { vaardigheden: string[]; terugblik?: Record<string, Record<string, "goed" | "beter" | "lastig">>; /** Wat zou thuis beter mogen, in eigen woorden. */ wens?: string; /** Per taak: leuk, wil ik leren, kan ik zelf, hulp nodig. */ taken?: Record<string, TaakGevoel> }>;
}

/** Een gezinsafspraak (uit de coach, een ruzie of zelf gemaakt). Na een week vraagt de app: hielp het? */
export interface Afspraak {
  id: string;
  text: string;
  at: string;
  by: string;
  /** Waar hij vandaan komt: een coachsituatie, "ruzie:<onderwerp>" of leeg. */
  scenario?: string;
  evaluaties?: { at: string; by: string; oordeel: Oordeel }[];
  /** Gestopt: het gezin heeft hem losgelaten of vervangen. */
  gestopt?: string;
}
export type Oordeel = "ja" | "beetje" | "nee";

export interface Afspraken {
  /** Wanneer en door wie vastgelegd. Leeg = nog een voorstel. */
  vastgelegd?: string;
  door?: string;
  /** Per klus: aan/uit, minuten, en wie hem niet doet. */
  klussen?: Record<string, { aan?: boolean; minuten?: number; niet?: string[]; wel?: string[] }>;
  /** Per lid: verwachte minuten op een schooldag en op een vrije dag. */
  verwachting?: Record<string, { school?: number; vrij?: number }>;
  /** Taken die de ouders zelf toevoegden (naast de bibliotheek). */
  eigen?: EigenTaak[];
  /** Bevestigde weekplanning: datum → taak → wie (en eventueel samen met wie), met de reden. */
  planning?: Record<string, Record<string, PlanRegel>>;
  /** Wat er aan de planning veranderde, voor iedereen terug te lezen. */
  planLog?: { at: string; door: string; tekst: string }[];
  /** Afwezig voor een periode (logeren, kamp, ziek): dan geen taken, en het telt niet als achterstand. */
  afwezig?: Record<string, { van: string; tot: string; reden?: string }[]>;
}

export interface PlanRegel {
  wie: string;
  mee?: string;
  reden?: string;
}

export interface EigenTaak {
  id: string;
  label: string;
  emoji: string;
  /** Om de hoeveel dagen: 1 = elke dag, 7 = elke week. */
  elke: number;
  minuten: number;
  vanaf: number;
  xp: number;
  instructie?: string;
  begeleiding?: boolean;
  iedereen?: boolean;
}

/** Hoe een kind tegenover een taak staat. Een voorkeur is een aanwijzing, geen vaste taak. */
export type TaakGevoel = "leuk" | "leren" | "zelf" | "hulp";

export interface Bezwaar {
  id: string;
  at: string;
  datum: string;
  klus: string;
  door: string;
  soort: "lukt-niet" | "hulp";
  reden: string;
}

export interface Uitdaging {
  id: string;
  at: string;
  klus: string;
  spelers: [string, string];
  /** Wie de klus doet. */
  verliezer: string;
  /** Hoe besloten: steen-papier-schaar, eerlijke loting, om de beurt, of samen doen. */
  manier?: "spel" | "loting" | "beurt" | "samen";
  /** Bij samen doen: de ander. */
  partner?: string;
  /** Voorsprong gekregen (na 2 keer op rij pech). */
  joker?: string;
}

export interface SamenMoment {
  id: string;
  soort: string;
  titel: string;
  /** Gezinsleden die meedoen. */
  wie: string[];
  /** Vrienden of vriendinnen die meedoen (vrije tekst). */
  vrienden?: string;
  datum: string;
  tijd?: string;
  door: string;
  at: string;
  /** Wanneer het gedaan is (ISO). Leeg = nog gepland. */
  gedaan?: string;
  /** Hoe was het? Per lid. */
  reactie?: Record<string, "😐" | "🙂" | "😍">;
}

export interface Kookplan {
  kok?: string;
  wat?: string;
  /** Restjes van gisteren. Mag hooguit één dag achter elkaar (max 2 dagen hetzelfde). */
  restjes?: boolean;
  /** Wie eet er mee. Leeg = nog niet gekozen, dan iedereen die thuis is. */
  eters?: string[];
  gasten?: number;
}

export interface KlusDone {
  id: string;
  klus: string;
  by: string;
  at: string;
  /** Samen gedaan: ieder de helft van de tijd en de punten. Zelfde `samen`-id bij beide regels. */
  samen?: string;
}

export interface PotItem {
  id: string;
  cents: number;
  soort: "statiegeld" | "beloning" | "inleg" | "uitgave";
  reden: string;
  /** Wie het erin deed (of bij een beloning: wie de ouder was). */
  by: string;
  /** Bij een beloning: voor welk kind. Bij statiegeld/inleg: wie het bijdroeg. */
  voor?: string;
  at: string;
}
