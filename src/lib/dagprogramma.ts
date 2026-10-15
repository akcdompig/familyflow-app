/*
  Het dagprogramma: alles wat jij vandaag moet doen, in één lijst, op volgorde van de dag.
  Gemaakt voor kinderen met ADHD/ADD: één duidelijke lijst, één ding tegelijk ("Nu doen"), alles met één tik af.
  Er komt niks nieuws in de opslag: het is een kijk op wat er al is (routine, eten, werk/school, taken, klussen).
*/

import { ETEN, ROUTINE, dagLog, dagdeel, gegeten, type Dagdeel } from "./dag";
import { klusStatus, kookplan, naamKlus, werkTaken } from "./huis";
import { slaapt } from "./status";
import { isDone, tasksFor } from "./tasks";
import type { FamilyState, Task } from "./types";

export type Soort = "routine" | "eten" | "werk" | "taak" | "klus" | "slapen";

export interface Stap {
  id: string;
  deel: Dagdeel;
  /** "08:30" voor dingen met een tijd, anders leeg. */
  tijd?: string;
  titel: string;
  emoji: string;
  soort: Soort;
  klaar: boolean;
  /** Werk of school: hoe ver (0–1). */
  bezig?: number;
  /** Kan niet afgevinkt worden (werk en school gaan vanzelf). */
  vanzelf?: boolean;
  /** Ochtendroutine: losse stapjes. */
  sub?: { id: string; label: string; emoji: string; klaar: boolean }[];
  punten?: number;
  task?: Task;
  klusKey?: string;
  klusXp?: number;
  /** Klus: hoeveel minuten ongeveer, en met wie samen. */
  minuten?: number;
  samenMet?: string;
  /** Klus "voor straks": je werkt of zit op school. */
  later?: boolean;
  /** Klus die je alvast mag doen (vrije dag). Telt pas mee als je hem gedaan hebt. */
  extra?: boolean;
}

const VOLGORDE: Dagdeel[] = ["ochtend", "middag", "avond", "nacht"];

/** In welk dagdeel hoort deze taak? Op basis van het icoon en de titel. */
function deelVoorTaak(t: Task): Dagdeel {
  if (t.icon === "zon" || /opstaan|ontbijt|ochtend/i.test(t.title)) return "ochtend";
  if (t.icon === "telefoon" || /lader|slapen|avond|tas inpakken/i.test(t.title)) return "avond";
  return "middag";
}
const KLUS_DEEL: Record<string, Dagdeel> = { "vaat-uit": "ochtend", koelkast: "avond", keuken: "avond", "vaat-in": "avond", afval: "avond" };

export function dagprogramma(s: FamilyState, id: string, nu = new Date()): Stap[] {
  const log = dagLog(s, id);
  const stappen: Stap[] = [];
  const nodig = ROUTINE.filter((r) => r.gewicht > 0);

  // Ochtend: de routine als één stap met stapjes, dan ontbijt.
  const sub = [...ROUTINE.map((r) => ({ id: r.id, label: r.label, emoji: r.emoji, klaar: log.routine.includes(r.id) })), { id: "kleding", label: "Schone kleren", emoji: "👕", klaar: log.kleding === "nieuw" || log.kleding === "zelfde" }];
  stappen.push({ id: "routine", deel: "ochtend", titel: "Ochtendroutine", emoji: "🚿", soort: "routine", klaar: nodig.every((r) => log.routine.includes(r.id)), sub, punten: nodig.length * 2 + 5 });
  for (const e of ETEN) stappen.push({ id: `eten:${e.id}`, deel: e.deel, titel: e.label, emoji: e.emoji, soort: "eten", klaar: gegeten(log, e.id), punten: 2 });

  // Werk en school: staan er vanzelf in.
  for (const w of werkTaken(s, id, nu)) {
    if (w.status === "vrij") continue;
    const h = Number(w.van.slice(0, 2));
    stappen.push({ id: `werk:${w.key}`, deel: h < 12 ? "ochtend" : h < 18 ? "middag" : "avond", tijd: w.van, titel: `${w.naam} · tot ${w.tot.replace(":", ".")}`, emoji: w.school ? "🎒" : "💼", soort: "werk", klaar: w.status === "gedaan", bezig: w.status === "bezig" ? w.pct : undefined, vanzelf: true });
  }

  // Taken (huiswerk, leren, vaste taken). De oude losse "Werkdag" niet meer: werk staat er al in.
  for (const t of tasksFor(s, id).filter((t) => !(t.cat === "werk" && /^werkdag$/i.test(t.title)))) {
    stappen.push({ id: `taak:${t.id}`, deel: deelVoorTaak(t), titel: t.title, emoji: t.study ? "📚" : t.icon === "telefoon" ? "📱" : t.icon === "sport" ? "⚽" : "✅", soort: "taak", klaar: isDone(s, t.id), punten: t.xp, task: t });
  }

  // Klussen waar jij aan de beurt bent (alleen wat vandaag echt moet), plus wat je vandaag al deed.
  const bezigNu = werkTaken(s, id, nu).some((w) => w.status === "bezig");
  for (const k of klusStatus(s, nu)) {
    if (k.beurt?.id !== id && k.mee?.id !== id && !(k.vandaagGedaan && k.laatst?.by === id)) continue;
    // Ingedeeld in de eerlijke verdeling van vandaag (ook "alvast" op een vrije dag), of de restjes na het eten.
    if (!k.vandaagGedaan && !k.ingedeeld && !(k.klus.naKoken && k.nodig)) continue;
    if (k.klus.naKoken && !kookplan(s).kok && !k.teLaat) continue;
    stappen.push({ id: `klus:${k.key}`, deel: KLUS_DEEL[k.klus.id] ?? "middag", titel: naamKlus(k, id) + (k.extra && !k.vandaagGedaan ? " (alvast)" : ""), emoji: k.klus.emoji, soort: "klus", klaar: k.vandaagGedaan, punten: k.klus.xp, klusKey: k.key, klusXp: k.klus.xp, minuten: k.minuten, samenMet: k.mee?.id === id ? k.beurt?.name : k.mee?.name, later: bezigNu && !k.vandaagGedaan, extra: !!k.extra && !k.vandaagGedaan });
  }

  // Nacht: op tijd slapen.
  const m = s.members.find((x) => x.id === id);
  stappen.push({ id: "slapen", deel: "nacht", tijd: m?.bedtime, titel: m?.bedtime ? `Slapen om ${m.bedtime.replace(":", ".")}` : "Op tijd slapen", emoji: "🌙", soort: "slapen", klaar: slaapt(s, id, nu) });

  return stappen.sort((a, b) => VOLGORDE.indexOf(a.deel) - VOLGORDE.indexOf(b.deel) || (a.tijd ?? "99").localeCompare(b.tijd ?? "99"));
}

/** Het eerstvolgende dat je nu kunt doen: in dit dagdeel of eerder, niet af, niet "vanzelf", niet "voor straks". */
export function nuDoen(stappen: Stap[], nu = new Date()): Stap | undefined {
  const tot = VOLGORDE.indexOf(dagdeel(nu));
  return stappen.find((s) => !s.klaar && !s.vanzelf && !s.later && s.soort !== "slapen" && VOLGORDE.indexOf(s.deel) <= tot);
}

/** Wat telt voor "je dag": alles wat je zelf afvinkt. Niet: slapen, werk/school (gaat vanzelf) en "alvast"-klussen die nog open staan. */
export const telt = (st: Stap) => st.soort !== "slapen" && !st.vanzelf && !st.extra;
export const voortgang = (stappen: Stap[]) => {
  const tellen = stappen.filter(telt);
  return { klaar: tellen.filter((s) => s.klaar).length, totaal: tellen.length };
};
