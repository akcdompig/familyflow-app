/*
  Acties voor samenwerken, eerlijk verdelen, samen beslissen en groeidoelen.
  Los van store.ts gehouden; gebruikt dezelfde update (badges, stempel, opslaan in de cloud).
*/

import { addXp, metFeed, newId, stand, wijzig } from "./store";
import { todayKey } from "./tasks";
import { OVERSLAAN, volgende } from "./verdeling";
import type { Afspraken, Bezwaar, EigenTaak, FamilyState, PlanRegel, SamenMoment, TaakGevoel, Uitdaging } from "./types";
import { klusById } from "./huis";

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

const DAGNAAM = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const dagKort = (d: string) => DAGNAAM[new Date(d + "T12:00:00").getDay()];
/** Planning en logboek opruimen: planning 3 weken terug, logboek de laatste 60 regels. */
const netjes = (a: Afspraken): Afspraken => {
  const grens = new Date(Date.now() - 21 * 864e5).toLocaleDateString("sv-SE");
  return { ...a, planning: Object.fromEntries(Object.entries(a.planning ?? {}).filter(([d]) => d >= grens)), planLog: (a.planLog ?? []).slice(-60) };
};

export const samenwerken = {
  /** "Verdeel de taken": de ouder bevestigt een weekplanning. Wat buiten deze dagen bevestigd was, blijft staan. */
  bevestigPlan(plan: Record<string, Record<string, PlanRegel>>, door: string) {
    const dagen = Object.keys(plan).sort();
    if (!dagen.length) return;
    wijzig((s) => {
      const a = s.klusAfspraken ?? {};
      const at = new Date().toISOString();
      const tekst = `heeft de taken verdeeld voor ${dagKort(dagen[0])} ${Number(dagen[0].slice(8))}/${Number(dagen[0].slice(5, 7))} t/m ${dagKort(dagen.at(-1)!)} ${Number(dagen.at(-1)!.slice(8))}/${Number(dagen.at(-1)!.slice(5, 7))}`;
      const nieuw = netjes({ ...a, vastgelegd: a.vastgelegd ?? at, door: a.door ?? door, planning: { ...(a.planning ?? {}), ...plan }, planLog: [...(a.planLog ?? []), { at, door, tekst }] });
      return metFeed({ ...s, klusAfspraken: nieuw }, door, `${tekst} 📋`);
    });
  },
  /** Reset: de verdeling van deze dagen wissen. Die dagen staan daarna weer op "nog niet verdeeld". */
  wisPlan(dagen: string[], door: string) {
    wijzig((s) => {
      const a = s.klusAfspraken ?? {};
      const weg = dagen.filter((d) => a.planning?.[d]).sort();
      if (!weg.length) return s;
      const planning = Object.fromEntries(Object.entries(a.planning ?? {}).filter(([d]) => !weg.includes(d)));
      const tekst = `heeft de verdeling gewist voor ${weg.map((d) => `${dagKort(d)} ${Number(d.slice(8))}/${Number(d.slice(5, 7))}`).join(", ")}`;
      return { ...s, klusAfspraken: netjes({ ...a, planning, planLog: [...(a.planLog ?? []), { at: new Date().toISOString(), door, tekst }] }) };
    });
  },
  /** Eén taak in de bevestigde planning aan iemand anders geven (afwezig, ziek, ruil). Komt in het logboek. */
  wijzigPlan(d: string, key: string, wie: string, door: string) {
    wijzig((s) => {
      const a = s.klusAfspraken ?? {};
      const dag = { ...(a.planning?.[d] ?? {}) };
      const oud = dag[key]?.wie;
      if (oud === wie) return s;
      dag[key] = { wie, reden: `aangepast door ${naam(s, door).toLowerCase()}` };
      const k = klusById(s, key);
      const tekst = `${dagKort(d)} ${(k?.label ?? key).toLowerCase()}: ${oud ? `${naam(s, oud)} → ` : ""}${naam(s, wie)}`;
      return { ...s, klusAfspraken: netjes({ ...a, planning: { ...(a.planning ?? {}), [d]: dag }, planLog: [...(a.planLog ?? []), { at: new Date().toISOString(), door, tekst }] }) };
    });
  },
  /** Leuk, wil ik leren, kan ik zelf, hulp nodig. Leeg = geen voorkeur. Het kind zelf of een ouder. */
  setTaakGevoel(id: string, klusId: string, g: TaakGevoel | null) {
    wijzig((s) => {
      const d = s.doelen?.[id] ?? { vaardigheden: [] };
      const taken = { ...(d.taken ?? {}) };
      if (g) taken[klusId] = g;
      else delete taken[klusId];
      return { ...s, doelen: { ...(s.doelen ?? {}), [id]: { ...d, taken } } };
    });
  },
  /** Een eigen taak toevoegen of aanpassen. Staat meteen aan. */
  eigenTaak(t: Omit<EigenTaak, "id"> & { id?: string }) {
    const id = t.id ?? `eigen-${Date.now().toString(36)}`;
    wijzig((s) => {
      const a = s.klusAfspraken ?? {};
      const rest = (a.eigen ?? []).filter((x) => x.id !== id);
      return { ...s, klusAfspraken: { ...a, eigen: [...rest, { ...t, id }], klussen: { ...(a.klussen ?? {}), [id]: { ...(a.klussen?.[id] ?? {}), aan: true } } } };
    });
  },
  /** Een eigen taak weghalen. De geschiedenis blijft staan; in de planning wordt hij overgeslagen. */
  verwijderEigenTaak(id: string) {
    wijzig((s) => ({ ...s, klusAfspraken: { ...(s.klusAfspraken ?? {}), eigen: (s.klusAfspraken?.eigen ?? []).filter((x) => x.id !== id) } }));
  },
  /** Afwezig van–tot (logeren, kamp). Leeg = weer gewoon. */
  afwezig(id: string, periode: { van: string; tot: string; reden?: string } | null) {
    wijzig((s) => {
      const a = s.klusAfspraken ?? {};
      const vandaag = new Date().toLocaleDateString("sv-SE");
      const lijst = (a.afwezig?.[id] ?? []).filter((p) => p.tot >= vandaag);
      return { ...s, klusAfspraken: { ...a, afwezig: { ...(a.afwezig ?? {}), [id]: periode ? [...lijst, periode] : [] } } };
    });
  },
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
      // Oké, vandaag niet: iemand anders (de eerstvolgende in de verdeling), of de eigen kamer gewoon een dag later.
      if (keuze === "ok") uit = { ...uit, ruil: zet(uit.ruil, b.datum, b.klus, b.klus.includes(":") ? OVERSLAAN : volgende(uit, b.datum, b.klus, b.door) ?? door) };
      if (keuze === "ouder") uit = { ...uit, ruil: zet(uit.ruil, b.datum, b.klus, door) };
      if (keuze === "samen") uit = { ...uit, samenDoen: zet(uit.samenDoen, b.datum, b.klus, door) };
      return uit;
    });
  },

  /* ---------- Samen dingen doen ---------- */
  plan(m: Omit<SamenMoment, "id" | "at">) {
    wijzig((s) => metFeed({ ...s, samen: [...(s.samen ?? []), { ...m, id: newId("s"), at: new Date().toISOString() }].slice(-80) }, m.door, `plant samen: ${m.titel.toLowerCase()} 📅`));
  },
  /** Gedaan: wie echt meedeed krijgt 10 punten. Wie niet mee kon, krijgt niks (en het plan blijft kloppen). */
  gedaan(id: string, door: string, deden?: string[]) {
    wijzig((s) => {
      const x = (s.samen ?? []).find((m) => m.id === id);
      if (!x || x.gedaan) return s;
      const wie = (deden ?? x.wie).filter((w) => x.wie.includes(w));
      if (!wie.length) return s;
      let uit: FamilyState = { ...s, samen: (s.samen ?? []).map((m) => (m.id === id ? { ...m, gedaan: new Date().toISOString(), deden: wie } : m)) };
      for (const w of wie) uit = { ...uit, xp: addXp(uit, w, 10) };
      const anderen = wie.filter((w) => w !== door).map((w) => naam(s, w));
      const met = [...anderen, ...(x.vrienden ? [x.vrienden] : [])];
      return metFeed(uit, wie.includes(door) ? door : wie[0], `deed samen${met.length ? ` met ${met.join(" en ")}` : ""}: ${x.titel.toLowerCase()} 💞`, 10);
    }, () => { const x = (stand().samen ?? []).find((m) => m.id === id); return x ? `Samen: ${x.titel}` : "Samen iets gedaan"; });
  },
  /** Per ongeluk op Gedaan getikt, of het ging anders? Terugzetten: weer gepland, en de punten gaan er bij iedereen weer af. */
  terugzetten(id: string) {
    wijzig((s) => {
      const x = (s.samen ?? []).find((m) => m.id === id);
      if (!x?.gedaan) return s;
      let uit: FamilyState = { ...s, samen: (s.samen ?? []).map((m) => (m.id === id ? { ...m, gedaan: undefined, deden: undefined } : m)) };
      for (const w of x.deden ?? x.wie) {
        uit = { ...uit, xp: addXp(uit, w, -10) };
        // Al geclaimd? Dan zakt de claimstand mee, anders "verdwijnen" de volgende punten.
        const c = uit.claim?.[w];
        if (c !== undefined && c > (uit.xp[w] ?? 0)) uit = { ...uit, claim: { ...uit.claim, [w]: uit.xp[w] ?? 0 } };
      }
      // Ook de regel in "Net gedaan" weg.
      const tekst = x.titel.toLowerCase();
      return { ...uit, feed: (uit.feed ?? []).filter((f) => !(f.tekst.includes(`: ${tekst} 💞`) && f.at >= x.gedaan!)) };
    }, () => { const x = (stand().samen ?? []).find((m) => m.id === id); return x ? `Samen: ${x.titel}` : "Samen iets gedaan"; });
  },
  /** Een gepland moment aanpassen: wie gaat mee, welke dag, hoe laat. Alleen zolang het nog niet gedaan is. */
  wijzigSamen(id: string, patch: { wie?: string[]; datum?: string; tijd?: string }) {
    wijzig((s) => ({
      ...s,
      samen: (s.samen ?? []).map((m) => (m.id === id && !m.gedaan ? { ...m, ...(patch.wie?.length ? { wie: patch.wie } : {}), ...(patch.datum ? { datum: patch.datum } : {}), tijd: patch.tijd === undefined ? m.tijd : patch.tijd || undefined } : m)),
    }));
  },
  reactie(id: string, wie: string, r: "😐" | "🙂" | "😍") {
    wijzig((s) => ({ ...s, samen: (s.samen ?? []).map((m) => (m.id === id ? { ...m, reactie: { ...(m.reactie ?? {}), [wie]: r } } : m)) }));
  },
  weg(id: string) {
    wijzig((s) => ({ ...s, samen: (s.samen ?? []).filter((m) => m.id !== id) }));
  },

  /* ---------- Schermtijd (ouders) ---------- */
  setSchermtijd(id: string, d: string, totaal: number, sociaal: number | undefined, door: string) {
    wijzig((s) => {
      const lid = { ...(s.schermtijd?.[id] ?? {}) };
      lid[d] = { totaal: Math.max(0, Math.round(totaal)), ...(sociaal !== undefined ? { sociaal: Math.max(0, Math.round(sociaal)) } : {}), door, at: new Date().toISOString() };
      // Alleen de laatste 60 dagen bewaren.
      const grens = new Date(Date.now() - 60 * 864e5).toLocaleDateString("sv-SE");
      const bewaard = Object.fromEntries(Object.entries(lid).filter(([k]) => k >= grens));
      return { ...s, schermtijd: { ...(s.schermtijd ?? {}), [id]: bewaard } };
    });
  },
  setSchermDoel(id: string, doel: number) {
    wijzig((s) => ({ ...s, schermAfspraak: { ...(s.schermAfspraak ?? {}), [id]: { doel: Math.max(15, Math.min(480, Math.round(doel))) } } }));
  },

  /* ---------- Groeidoelen ---------- */
  setDoelen(id: string, vaardigheden: string[]) {
    wijzig((s) => ({ ...s, doelen: { ...(s.doelen ?? {}), [id]: { ...(s.doelen?.[id] ?? {}), vaardigheden: vaardigheden.slice(0, 2) } } }));
  },
  /** Wat zou thuis beter mogen? Eén zin per gezinslid, in eigen woorden. */
  setWens(id: string, wens: string) {
    wijzig((s) => ({ ...s, doelen: { ...(s.doelen ?? {}), [id]: { vaardigheden: [], ...(s.doelen?.[id] ?? {}), wens: wens.trim().slice(0, 140) } } }));
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
