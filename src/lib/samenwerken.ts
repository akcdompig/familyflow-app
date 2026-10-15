/*
  Acties voor samenwerken, eerlijk verdelen, samen beslissen en groeidoelen.
  Los van store.ts gehouden; gebruikt dezelfde update (badges, stempel, opslaan in de cloud).
*/

import { addXp, metFeed, newId, wijzig } from "./store";
import { todayKey } from "./tasks";
import { volgende } from "./verdeling";
import type { Afspraken, Bezwaar, FamilyState, SamenMoment, Uitdaging } from "./types";

const naam = (s: FamilyState, id: string) => s.members.find((m) => m.id === id)?.name ?? "iemand";
const zet = <T,>(map: Record<string, Record<string, T>> | undefined, d: string, key: string, v: T | undefined) => {
  const dag = { ...(map?.[d] ?? {}) };
  if (v === undefined) delete dag[key];
  else dag[key] = v;
  // Alleen de laatste 14 dagen bewaren.
  const grens = new Date(Date.now() - 14 * 864e5).toLocaleDateString("sv-SE");
  const rest = Object.fromEntries(Object.entries(map ?? {}).filter(([k]) => k >= grens && k !== d));
  return Object.keys(dag).length ? { ...rest, [d]: dag } : rest;
};

export const samenwerken = {
  /* ---------- Afspraken (ouders) ---------- */
  setAfspraken(fn: (a: Afspraken) => Afspraken) {
    wijzig((s) => ({ ...s, klusAfspraken: fn({ ...(s.klusAfspraken ?? {}) }) }));
  },
  vastleggen(door: string) {
    wijzig((s) => metFeed({ ...s, klusAfspraken: { ...(s.klusAfspraken ?? {}), vastgelegd: new Date().toISOString(), door } }, door, "heeft de klusafspraken vastgelegd 📋"));
  },
  /** Vandaag geen klussen voor dit lid (ziek, toets, toernooi). Leeg = weer gewoon. */
  vrijstelling(id: string, reden: string | null, d = todayKey()) {
    wijzig((s) => ({ ...s, vrijstelling: zet(s.vrijstelling, d, id, reden ?? undefined) }));
  },
  /** Ouder deelt een klus anders in. */
  wissel(key: string, id: string, d = todayKey()) {
    wijzig((s) => ({ ...s, ruil: zet(s.ruil, d, key, id), samenDoen: zet(s.samenDoen, d, key, undefined) }));
  },

  /* ---------- Samen beslissen ---------- */
  /**
    Vastleggen wat er samen besloten is. `doet` doet de klus; bij "samen" doen ze hem allebei.
    Neutraal in "Net gedaan": nooit wie er won of verloor.
  */
  besloten(u: { klus: string; label: string; spelers: [string, string]; doet: string; manier: NonNullable<Uitdaging["manier"]>; voorsprong?: string }) {
    wijzig((s) => {
      const d = todayKey();
      const partner = u.manier === "samen" ? u.spelers.find((x) => x !== u.doet) : undefined;
      const nieuw: Uitdaging = { id: newId("u"), at: new Date().toISOString(), klus: u.klus, spelers: u.spelers, verliezer: u.doet, manier: u.manier, ...(partner ? { partner } : {}), ...(u.voorsprong ? { joker: u.voorsprong } : {}) };
      const uit: FamilyState = {
        ...s,
        uitdagingen: [...(s.uitdagingen ?? []), nieuw].slice(-100),
        ruil: zet(s.ruil, d, u.klus, u.doet),
        samenDoen: zet(s.samenDoen, d, u.klus, partner),
      };
      const tekst = partner ? `en ${naam(s, partner)} doen samen: ${u.label.toLowerCase()} 🤝` : `doet ${u.label.toLowerCase()} 💪`;
      return metFeed(uit, u.doet, tekst);
    });
  },

  /* ---------- Lukt me niet / hulp ---------- */
  vraag(b: Omit<Bezwaar, "id" | "at" | "datum">) {
    wijzig((s) => ({ ...s, bezwaren: [...(s.bezwaren ?? []).filter((x) => Date.now() - new Date(x.at).getTime() < 14 * 864e5), { ...b, id: newId("b"), at: new Date().toISOString(), datum: todayKey() }].slice(-50) }));
  },
  /**
    Ouder antwoordt:
    - ok: vandaag niet, de app zoekt iemand anders (of de ouder als er niemand is)
    - ouder: de ouder doet het zelf
    - samen: de ouder doet het samen met het kind
    - toch: het moet toch, met een uitleg
  */
  antwoord(b: Bezwaar, keuze: "ok" | "ouder" | "samen" | "toch", door: string, tekst?: string) {
    wijzig((s) => {
      let uit: FamilyState = { ...s, bezwaarAntwoord: { ...(s.bezwaarAntwoord ?? {}), [b.id]: { keuze, door, at: new Date().toISOString(), ...(tekst ? { tekst } : {}) } } };
      if (keuze === "ok") uit = { ...uit, ruil: zet(uit.ruil, b.datum, b.klus, volgende(uit, b.datum, b.klus, b.door) ?? door) };
      if (keuze === "ouder") uit = { ...uit, ruil: zet(uit.ruil, b.datum, b.klus, door) };
      if (keuze === "samen") uit = { ...uit, samenDoen: zet(uit.samenDoen, b.datum, b.klus, door) };
      return uit;
    });
  },

  /* ---------- Samen dingen doen ---------- */
  plan(m: Omit<SamenMoment, "id" | "at">) {
    wijzig((s) => metFeed({ ...s, samen: [...(s.samen ?? []), { ...m, id: newId("s"), at: new Date().toISOString() }].slice(-80) }, m.door, `plant samen: ${m.titel.toLowerCase()} 📅`));
  },
  /** Gedaan: iedereen die meedeed krijgt 10 punten. */
  gedaan(id: string, door: string) {
    wijzig((s) => {
      const x = (s.samen ?? []).find((m) => m.id === id);
      if (!x || x.gedaan) return s;
      let uit: FamilyState = { ...s, samen: (s.samen ?? []).map((m) => (m.id === id ? { ...m, gedaan: new Date().toISOString() } : m)) };
      for (const w of x.wie) uit = { ...uit, xp: addXp(uit, w, 10) };
      const anderen = x.wie.filter((w) => w !== door).map((w) => naam(s, w));
      const met = [...anderen, ...(x.vrienden ? [x.vrienden] : [])];
      return metFeed(uit, x.wie.includes(door) ? door : x.wie[0], `deed samen${met.length ? ` met ${met.join(" en ")}` : ""}: ${x.titel.toLowerCase()} 💞`, 10);
    });
  },
  reactie(id: string, wie: string, r: "😐" | "🙂" | "😍") {
    wijzig((s) => ({ ...s, samen: (s.samen ?? []).map((m) => (m.id === id ? { ...m, reactie: { ...(m.reactie ?? {}), [wie]: r } } : m)) }));
  },
  weg(id: string) {
    wijzig((s) => ({ ...s, samen: (s.samen ?? []).filter((m) => m.id !== id) }));
  },

  /* ---------- Groeidoelen ---------- */
  setDoelen(id: string, vaardigheden: string[]) {
    wijzig((s) => ({ ...s, doelen: { ...(s.doelen ?? {}), [id]: { ...(s.doelen?.[id] ?? {}), vaardigheden: vaardigheden.slice(0, 2) } } }));
  },
  terugblik(id: string, week: string, vaardigheid: string, hoe: "goed" | "beter" | "lastig") {
    wijzig((s) => {
      const d = s.doelen?.[id] ?? { vaardigheden: [] };
      const tb = { ...(d.terugblik ?? {}) };
      tb[week] = { ...(tb[week] ?? {}), [vaardigheid]: hoe };
      // Alleen de laatste 8 weken bewaren.
      const weken = Object.keys(tb).sort().slice(-8);
      return { ...s, doelen: { ...(s.doelen ?? {}), [id]: { ...d, terugblik: Object.fromEntries(weken.map((w) => [w, tb[w]])) } } };
    });
  },
};
