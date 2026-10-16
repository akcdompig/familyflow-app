import { werkOp } from "./huis";
import { addDays, iso } from "./planner";
import { lookVoor } from "./status";
import type { FamilyState, InzetSoort } from "./types";

/*
  Inzet zichtbaar maken, zonder er punten aan te hangen.
  - Wat de app al weet (werk en school uit het rooster, afspraken, samen gedaan, even rustig geworden) hoef je niet nog eens in te vullen.
  - Wat de app niet kan weten (een pitch voorbereid, extra verantwoordelijkheid) zet je er met één tik bij.
  - Waardering alleen als het in de gegevens staat. Geen verzonnen prestaties, en rust telt als iets goeds.
  - Geen punten: er is geen eerlijke regel voor (een lange werkdag is niet meer waard dan een korte, en salaris telt nooit).
*/

export const INZET: { id: InzetSoort; label: string; emoji: string; zin: string }[] = [
  { id: "project", label: "Extra projectwerk", emoji: "🛠️", zin: "Je hebt extra projectwerk gedaan." },
  { id: "pitch", label: "Presentatie of pitch voorbereid", emoji: "🎤", zin: "Je hebt een belangrijke presentatie voorbereid." },
  { id: "verantwoordelijkheid", label: "Extra verantwoordelijkheid", emoji: "🧭", zin: "Je hebt extra verantwoordelijkheid genomen." },
  { id: "ontwikkeling", label: "Iets geleerd", emoji: "🌱", zin: "Je hebt tijd gestoken in jezelf ontwikkelen." },
  { id: "familie", label: "Familie", emoji: "👨‍👩‍👧", zin: "Je hebt tijd gemaakt voor familie." },
  { id: "rust", label: "Rust en herstel", emoji: "🌿", zin: "Je hebt ruimte gemaakt voor rust en herstel." },
];
export const inzetDef = (id: InzetSoort) => INZET.find((x) => x.id === id) ?? INZET[0];

export interface InzetRegel {
  emoji: string;
  tekst: string;
  /** Waar het vandaan komt: rooster, agenda, samen, rust of zelf ingevuld. */
  bron: "rooster" | "agenda" | "samen" | "rust" | "zelf";
  id?: string;
}

const maandagVan = (d: string) => addDays(d, -((new Date(d + "T12:00:00").getDay() + 6) % 7));
const uren = (van: string, tot: string) => Math.max(0, (Number(tot.slice(0, 2)) * 60 + Number(tot.slice(3, 5)) - Number(van.slice(0, 2)) * 60 - Number(van.slice(3, 5))) / 60);
const verstreken = (d: string, tot: string, nu: Date) => d < iso(nu) || (d === iso(nu) && tot <= nu.toTimeString().slice(0, 5));

/** Deze week (maandag t/m nu): wat deed je? Alleen wat echt in de gegevens staat. */
export function weekInzet(s: FamilyState, id: string, nu = new Date()): InzetRegel[] {
  const vandaag = iso(nu);
  const dagen: string[] = [];
  for (let d = maandagVan(vandaag); d <= vandaag; d = addDays(d, 1)) dagen.push(d);
  const uit: InzetRegel[] = [];

  // Werk en school uit het rooster. Telt dagen, geen uren: meer uren is niet beter.
  const werkDagen = new Map<string, number>();
  const schoolDagen = new Set<string>();
  for (const d of dagen) {
    for (const w of werkOp(s, id, d)) {
      if (w.vrij || !verstreken(d, w.van, nu)) continue;
      if (lookVoor(w.werk) === "school") schoolDagen.add(d);
      else werkDagen.set(w.werk.naam, (werkDagen.get(w.werk.naam) ?? 0) + 1);
    }
  }
  for (const [naam, n] of werkDagen) uit.push({ emoji: "💼", tekst: `${n} ${n === 1 ? "werkdag" : "werkdagen"} bij ${naam}`, bron: "rooster" });
  if (schoolDagen.size) uit.push({ emoji: "🎒", tekst: `${schoolDagen.size} ${schoolDagen.size === 1 ? "dag" : "dagen"} naar school`, bron: "rooster" });

  // Afspraken die al geweest zijn.
  const afspraken = (s.agenda?.[id] ?? []).filter((a) => dagen.includes(a.datum) && verstreken(a.datum, a.van, nu));
  const zakelijk = afspraken.filter((a) => a.soort === "zakelijk");
  if (zakelijk.length) uit.push({ emoji: "🤝", tekst: zakelijk.length === 1 ? `Zakelijke afspraak: ${zakelijk[0].titel}` : `${zakelijk.length} zakelijke afspraken`, bron: "agenda" });
  const anders = afspraken.filter((a) => a.soort !== "zakelijk");
  if (anders.length) uit.push({ emoji: "📅", tekst: anders.length === 1 ? `Afspraak: ${anders[0].titel}` : `${anders.length} andere afspraken`, bron: "agenda" });

  // Samen gedaan met het gezin.
  const samen = (s.samen ?? []).filter((x) => x.gedaan && x.wie.includes(id) && dagen.includes(iso(new Date(x.gedaan))));
  if (samen.length) uit.push({ emoji: "💞", tekst: samen.length === 1 ? `Samen: ${samen[0].titel}` : `${samen.length} keer iets samen gedaan`, bron: "samen" });

  // Even rustig geworden.
  const rust = (s.calm ?? []).filter((c) => c.member === id && dagen.includes(iso(new Date(c.at))));
  if (rust.length) uit.push({ emoji: "🌿", tekst: rust.length === 1 ? "Een keer bewust rustig geworden" : `${rust.length} keer bewust rustig geworden`, bron: "rust" });

  // Zelf ingevuld.
  for (const x of (s.inzet?.[id] ?? []).filter((x) => dagen.includes(x.datum))) {
    const def = inzetDef(x.soort);
    uit.push({ emoji: def.emoji, tekst: x.tekst ? `${def.label}: ${x.tekst}` : def.label, bron: "zelf", id: x.id });
  }
  return uit;
}

/** Waardering voor vandaag, alleen als de gegevens het onderbouwen. Hooguit drie zinnen. */
export function waardering(s: FamilyState, id: string, nu = new Date()): string[] {
  const d = iso(nu);
  const zinnen: string[] = [];
  const eigen = (s.inzet?.[id] ?? []).filter((x) => x.datum === d);
  for (const soort of ["pitch", "verantwoordelijkheid", "project", "ontwikkeling", "familie", "rust"] as InzetSoort[]) if (eigen.some((x) => x.soort === soort)) zinnen.push(inzetDef(soort).zin);
  const zakelijk = (s.agenda?.[id] ?? []).find((a) => a.datum === d && a.soort === "zakelijk" && verstreken(d, a.tot, nu));
  if (zakelijk) zinnen.push(`Je hebt tijd besteed aan een zakelijke afspraak: ${zakelijk.titel}.`);
  const werk = werkOp(s, id, d).find((w) => !w.vrij && lookVoor(w.werk) !== "school" && verstreken(d, w.tot, nu) && uren(w.van, w.tot) > 0);
  if (werk) zinnen.push(`Je hebt vandaag je werkdag bij ${werk.werk.naam} erop zitten.`);
  return [...new Set(zinnen)].slice(0, 3);
}
