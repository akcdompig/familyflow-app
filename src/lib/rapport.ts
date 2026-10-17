/*
  Het weekverhaal: een korte, eerlijke terugblik op de week, en een haalbare stap voor de volgende.

  Regels:
  - Alleen wat in de app is vastgelegd. Niks verzinnen: geen gevoelens, geen conclusies.
  - Gepland ≠ gedaan. Een gepland samen-moment telt pas als iemand op "Gedaan" tikte.
  - Feiten (vastgelegd) en reflecties (zelf aangegeven) apart.
  - Te weinig gegevens? Dan een vriendelijke melding, geen oordeel.
  - Kinderen zien hun eigen dingen en wat het gezin samen deed. Ouders zien iedereen.
*/

import { addDays, iso } from "./planner";
import { competentie, oefentips, type Competentie } from "./competenties";
import { bewijzen, dagStand, type Bewijs } from "./groei";
import { suggestie, type Idee } from "./samen";
import type { FamilyState, Member, SamenMoment } from "./types";

const DAG = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const dagNaam = (d: string) => DAG[new Date(d + "T12:00:00").getDay()];
/** Eerste letter klein, namen blijven staan ("Trainen met Lina" → "trainen met Lina"). */
export const klein = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export interface WeekRapport {
  ma: string;
  zo: string;
  isHuidig: boolean;
  genoeg: boolean;
  verhaal: string[];
  samen: { gedaan: SamenMoment[]; gepland: SamenMoment[]; nietGedaan: SamenMoment[] };
  geoefend: { c: Competentie; keer: number; waar: string[]; wie: string[] }[];
  voorbeelden: { lid: Member; b: Bewijs }[];
  zelf: { lid: Member; tekst: string }[];
  verderOefenen: { lid: Member; c: Competentie }[];
  dagenAf: { af: number; totaal: number };
  vooruit: { punten: string[]; idee: { met: Member; idee: Idee } | null; persoonlijk: { c: Competentie; tip: string } | null };
}

export function weekRapport(s: FamilyState, me: Member, ma: string, nu = new Date()): WeekRapport {
  const vandaag = iso(nu);
  const zo = addDays(ma, 6);
  const isOuder = me.role === "ouder";
  const leden = s.members.filter((m) => m.joined !== false);
  const zicht = isOuder ? leden : leden.filter((m) => m.id === me.id);
  const kids = zicht.filter((m) => m.role !== "ouder");
  const naam = (m: Member) => (m.id === me.id ? "Jij" : m.name);

  // A. Samen: gedaan, nog gepland, of gepland maar niet afgevinkt.
  const inWeek = (d?: string) => !!d && d >= ma && d <= zo;
  const gedaan = (s.samen ?? []).filter((x) => x.gedaan && inWeek(iso(new Date(x.gedaan))));
  const open = (s.samen ?? []).filter((x) => !x.gedaan && inWeek(x.datum));
  const gepland = open.filter((x) => x.datum >= vandaag);
  const nietGedaan = open.filter((x) => x.datum < vandaag);

  // B en C. Wat is er geoefend en toegepast, per persoon.
  const per = zicht.map((m) => ({ lid: m, b: bewijzen(s, m.id, ma, zo < vandaag ? zo : vandaag) }));
  const telling = new Map<string, { keer: number; waar: Set<string>; wie: Set<string> }>();
  for (const { lid, b } of per) for (const x of b) {
    const t = telling.get(x.competentie) ?? { keer: 0, waar: new Set<string>(), wie: new Set<string>() };
    t.keer++;
    t.waar.add(x.tekst);
    t.wie.add(naam(lid));
    telling.set(x.competentie, t);
  }
  const geoefend = [...telling.entries()]
    .map(([id, t]) => ({ c: competentie(id)!, keer: t.keer, waar: [...t.waar].slice(0, 3), wie: [...t.wie] }))
    .filter((x) => x.c)
    .sort((a, b) => b.keer - a.keer);

  // Voorbeelden: feiten waarin iemand iets toepaste. Verschillende competenties, hooguit 4.
  const voorbeelden: { lid: Member; b: Bewijs }[] = [];
  const gehad = new Set<string>();
  for (const { lid, b } of per) for (const x of b) {
    if (x.soort !== "toepassen" || x.bron !== "feit" || gehad.has(`${lid.id}|${x.competentie}`) || x.tekst === "Hele dag af") continue;
    gehad.add(`${lid.id}|${x.competentie}`);
    voorbeelden.push({ lid, b: x });
  }
  voorbeelden.splice(4);

  // Zelf aangegeven: reacties op samen-momenten en de eigen terugblik op groeidoelen.
  const zelf: { lid: Member; tekst: string }[] = [];
  for (const x of gedaan) for (const m of zicht) {
    const r = x.reactie?.[m.id];
    if (r) zelf.push({ lid: m, tekst: `${x.titel}: ${r === "😍" ? "heel leuk 😍" : r === "🙂" ? "leuk 🙂" : "ging wel 😐"}` });
  }
  for (const m of zicht) for (const [v, hoe] of Object.entries(s.doelen?.[m.id]?.terugblik?.[ma] ?? {})) {
    const c = competentie(v);
    if (c) zelf.push({ lid: m, tekst: `${c.naam}: ${hoe === "goed" ? "lukte goed 🌟" : hoe === "beter" ? "ging beter 📈" : "nog lastig 🌱"}` });
  }

  // Groeidoelen die het gezin verder wil oefenen.
  const verderOefenen = kids.flatMap((m) => (s.doelen?.[m.id]?.vaardigheden ?? []).map((v) => ({ lid: m, c: competentie(v)! })).filter((x) => x.c));

  // Dagen af (eigen dagen voor een kind, iedereen voor ouders).
  let af = 0;
  let totaal = 0;
  for (let d = ma; d <= zo && d <= vandaag; d = addDays(d, 1)) for (const m of zicht) {
    const st = dagStand(s, m.id, d);
    if (st.stand === "leeg") continue;
    totaal++;
    if (st.stand === "af") af++;
  }

  const feiten = gedaan.length + per.reduce((a, x) => a + x.b.filter((b) => b.bron === "feit" && b.tekst !== "Laten weten hoe het gaat").length, 0);
  const genoeg = feiten >= 3;

  // Het verhaal: twee of drie zinnen, alleen uit feiten.
  const verhaal: string[] = [];
  if (gedaan.length) verhaal.push(`Jullie deden deze week ${gedaan.length}× iets samen: ${gedaan.map((x) => klein(x.titel)).join(", ")}.`);
  else if (gepland.length) verhaal.push(`Er staat nog iets samen gepland: ${klein(gepland[0].titel)} op ${dagNaam(gepland[0].datum)}.`);
  // Alleen benoemen als er iets af was: geen "0 van de 4".
  if (af) verhaal.push(isOuder ? `Bij elkaar opgeteld waren ${af} van de ${totaal} dagen helemaal af.` : `${af} van je ${totaal} dagen waren helemaal af.`);
  if (voorbeelden[0]) verhaal.push(`${naam(voorbeelden[0].lid)}: ${klein(voorbeelden[0].b.tekst)}.`);

  // E. Vooruit: hooguit twee punten, een idee, en een klein persoonlijk doel.
  const punten: string[] = [];
  for (const x of verderOefenen) {
    if (punten.length >= 2) break;
    if (!telling.get(x.c.id)) punten.push(`${x.lid.id === me.id ? "Jij" : x.lid.name}: ${x.c.naam.toLowerCase()}. ${oefentips(x.c, x.lid.age)[0]}.`);
  }
  if (punten.length < 2 && kids.length && !verderOefenen.length) punten.push(isOuder ? "Kies met de kinderen een groeidoel (tik op je kind in de huiskamer)." : "Kies een groeidoel bij Week (Doelen en wensen), samen met papa of mama.");
  if (punten.length < 2 && !gedaan.length) punten.push("Plan één moment samen, al is het een half uurtje.");
  const eigenDoel = !isOuder ? (s.doelen?.[me.id]?.vaardigheden ?? []).map((v) => competentie(v)).find(Boolean) : undefined;
  return {
    ma, zo, isHuidig: vandaag >= ma && vandaag <= zo, genoeg, verhaal,
    samen: { gedaan, gepland, nietGedaan },
    geoefend, voorbeelden, zelf: zelf.slice(0, 6), verderOefenen, dagenAf: { af, totaal },
    vooruit: { punten, idee: suggestie(s, me, nu), persoonlijk: eigenDoel ? { c: eigenDoel, tip: oefentips(eigenDoel, me.age)[1] ?? oefentips(eigenDoel, me.age)[0] } : null },
  };
}
