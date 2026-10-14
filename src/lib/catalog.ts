/*
  Takendatabase. Elke taak heeft een soort en een gemiddelde duur, zodat "Wie doet wat" in tijd rekent
  en niet in aantallen: koken telt dan zwaarder dan tafel dekken.
*/

import type { TaakCat, Task, TaskIcon } from "./types";

export interface CatalogTaak {
  title: string;
  icon: TaskIcon;
  cat: TaakCat;
  min: number;
  xp: number;
  pet?: boolean;
  /** Vooral voor ouders (werk, zorg). */
  ouder?: boolean;
}

export const CATS: Record<TaakCat, { label: string; kleur: string }> = {
  huishouden: { label: "Huishouden", kleur: "var(--ff-koraal-knop)" },
  kinderen: { label: "Zorg voor de kinderen", kleur: "var(--ff-zon)" },
  school: { label: "School en leren", kleur: "var(--ff-lucht)" },
  sport: { label: "Sport en buiten", kleur: "var(--ff-munt-donker)" },
  werk: { label: "Werk", kleur: "var(--ff-nacht)" },
  overig: { label: "Overig", kleur: "var(--ff-tekst-zacht)" },
};

export const CATALOGUS: CatalogTaak[] = [
  // Huishouden
  { title: "Koken", icon: "kook", cat: "huishouden", min: 45, xp: 20 },
  { title: "Boodschappen doen", icon: "kar", cat: "huishouden", min: 45, xp: 15 },
  { title: "Tafel dekken", icon: "bord", cat: "huishouden", min: 5, xp: 5 },
  { title: "Tafel afruimen", icon: "bord", cat: "huishouden", min: 5, xp: 5 },
  { title: "Afwassen", icon: "bord", cat: "huishouden", min: 20, xp: 10 },
  { title: "Vaatwasser inruimen", icon: "huis", cat: "huishouden", min: 10, xp: 5 },
  { title: "Vaatwasser uitruimen", icon: "huis", cat: "huishouden", min: 10, xp: 5 },
  { title: "Was draaien", icon: "was", cat: "huishouden", min: 10, xp: 5 },
  { title: "Was ophangen", icon: "was", cat: "huishouden", min: 15, xp: 10 },
  { title: "Was vouwen en opruimen", icon: "was", cat: "huishouden", min: 20, xp: 10 },
  { title: "Strijken", icon: "was", cat: "huishouden", min: 30, xp: 15 },
  { title: "Stofzuigen", icon: "schoon", cat: "huishouden", min: 30, xp: 15 },
  { title: "Dweilen", icon: "schoon", cat: "huishouden", min: 30, xp: 15 },
  { title: "Ramen lappen", icon: "schoon", cat: "huishouden", min: 45, xp: 20 },
  { title: "Keukenkastjes schoonmaken", icon: "schoon", cat: "huishouden", min: 30, xp: 15 },
  { title: "Keuken schoonmaken", icon: "schoon", cat: "huishouden", min: 20, xp: 10 },
  { title: "Badkamer schoonmaken", icon: "schoon", cat: "huishouden", min: 30, xp: 15 },
  { title: "Wc schoonmaken", icon: "schoon", cat: "huishouden", min: 10, xp: 10 },
  { title: "Stoffen", icon: "schoon", cat: "huishouden", min: 20, xp: 10 },
  { title: "Bedden verschonen", icon: "bed", cat: "huishouden", min: 20, xp: 10 },
  { title: "Kamer opruimen", icon: "bed", cat: "huishouden", min: 15, xp: 10 },
  { title: "Afval wegbrengen", icon: "afval", cat: "huishouden", min: 5, xp: 5 },
  { title: "Huisdier verzorgen", icon: "poot", cat: "huishouden", min: 15, xp: 5, pet: true },
  // Zorg voor de kinderen
  { title: "Overhoren", icon: "boek", cat: "kinderen", min: 20, xp: 0, ouder: true },
  { title: "Huiswerk begeleiden", icon: "boek", cat: "kinderen", min: 30, xp: 0, ouder: true },
  { title: "Kinderen halen of brengen", icon: "auto", cat: "kinderen", min: 30, xp: 0, ouder: true },
  { title: "Sporten met de kinderen", icon: "sport", cat: "kinderen", min: 60, xp: 0, ouder: true },
  { title: "Fietsen met de kinderen", icon: "sport", cat: "kinderen", min: 60, xp: 0, ouder: true },
  { title: "Gesprek met school of mentor", icon: "post", cat: "kinderen", min: 30, xp: 0, ouder: true },
  // School en sport (kinderen)
  { title: "Huiswerk maken", icon: "pen", cat: "school", min: 30, xp: 15 },
  { title: "20 minuten leren", icon: "boek", cat: "school", min: 20, xp: 10 },
  { title: "Training of sporten", icon: "sport", cat: "sport", min: 60, xp: 10 },
  { title: "Naar buiten", icon: "zon", cat: "sport", min: 30, xp: 10 },
  { title: "Telefoon aan de lader in de keuken", icon: "telefoon", cat: "overig", min: 1, xp: 10 },
  // Werk (ouders)
  { title: "Werkdag", icon: "werk", cat: "werk", min: 540, xp: 0, ouder: true },
  { title: "Bootcamp geven", icon: "sport", cat: "werk", min: 90, xp: 0, ouder: true },
  { title: "Security-dienst", icon: "werk", cat: "werk", min: 360, xp: 0, ouder: true },
  { title: "Heibespreking", icon: "werk", cat: "werk", min: 90, xp: 0, ouder: true },
  { title: "Websites (eigen bedrijf)", icon: "werk", cat: "werk", min: 120, xp: 0, ouder: true },
  { title: "Catering", icon: "kook", cat: "werk", min: 180, xp: 0, ouder: true },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Soort en duur van een taak. Oudere taken zonder deze gegevens schatten we in uit titel en icoon. */
export function taakInfo(t: Task): { cat: TaakCat; min: number } {
  if (t.study) return { cat: "school", min: t.study.min };
  if (t.cat && t.min) return { cat: t.cat, min: t.min };
  const hit = CATALOGUS.find((c) => norm(c.title) === norm(t.title)) ?? CATALOGUS.find((c) => norm(t.title).includes(norm(c.title)));
  if (hit) return { cat: t.cat ?? hit.cat, min: t.min ?? hit.min };
  const viaIcoon: Partial<Record<TaskIcon, [TaakCat, number]>> = {
    pen: ["school", 30], boek: ["school", 20], sport: ["sport", 45], zon: ["overig", 10], telefoon: ["overig", 1],
    werk: ["werk", 240], post: ["overig", 10], auto: ["kinderen", 30],
  };
  const [cat, min] = viaIcoon[t.icon] ?? ["huishouden", 15];
  return { cat: t.cat ?? cat, min: t.min ?? min };
}
