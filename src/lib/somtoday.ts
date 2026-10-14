/*
  Somtoday → FamilyFlow.
  De Edge Function "somtoday" haalt toetsen en huiswerk op (4 weken vooruit).
  Nieuwe dingen worden met de leerplanner meteen verdeeld in korte blokjes en bij de taken van het kind gezet.
  Wat al eens is ingepland, komt niet terug, ook niet als iemand het heeft weggehaald.
*/

import * as cloud from "./cloud";
import { iso, plan, vanSomtoday, type Blok, type SomItem } from "./planner";
import { actions, isLive, snapshot } from "./store";
import type { FamilyState, Task } from "./types";

export interface SomStatus {
  member_id: string;
  school: string | null;
  last_sync: string | null;
  last_error: string | null;
  gekoppeld: boolean;
}
export interface School {
  uuid: string;
  naam: string;
  plaats: string;
  sso: boolean;
}

const fn = <T,>(body: Record<string, unknown>) => cloud.edge<T>("somtoday", body);
export const somStatus = () => fn<SomStatus[]>({ action: "status" });
export const zoekScholen = (q: string) => fn<School[]>({ action: "scholen", q });
export const koppelMetWachtwoord = (member_id: string, school: School, username: string, password: string) =>
  fn<{ ok: true }>({ action: "login", member_id, tenant_uuid: school.uuid, school: school.naam, username, password });
export const startLink = (member_id: string, school: School) => fn<{ url: string }>({ action: "startLink", member_id, tenant_uuid: school.uuid, school: school.naam });
export const finishLink = (member_id: string, callback: string) => fn<{ ok: true }>({ action: "finishLink", member_id, callback });
export const plakLogin = (member_id: string, data: string) => fn<{ ok: true }>({ action: "plakLogin", member_id, data });
export const ontkoppel = (member_id: string) => fn<{ ok: true }>({ action: "ontkoppel", member_id });

/** Leerblok uit de planner als taak. */
export function blokNaarTaak(b: Blok, who: string, createdBy: string): Omit<Task, "id"> {
  return {
    title: b.title,
    icon: b.kind === "huiswerk" || b.kind === "inleveren" ? "pen" : "boek",
    assignee: who,
    repeat: "eenmalig",
    date: b.date,
    xp: Math.round(b.min / 2),
    createdBy,
    study: { subject: b.subject, kind: b.kind, deadline: b.deadline, part: b.part, of: b.of, min: b.min, sid: b.sid, note: b.note },
  };
}

/** Plan de nieuwe Somtoday-items van één kind in. Geeft terug wat er is toegevoegd. */
export function planSomtoday(state: FamilyState, who: string, items: SomItem[], createdBy: string, today = iso(new Date())) {
  const seen = new Set(state.somtoday?.[who]?.seen ?? []);
  const nieuw = items.filter((i) => !seen.has(i.sid));
  const planItems = nieuw.map(vanSomtoday).filter((x): x is NonNullable<typeof x> => !!x);
  const bestaand = state.tasks.filter((t) => t.study && t.assignee === who && t.date && t.date >= today).map((t) => ({ date: t.date!, min: t.study!.min }));
  const result = plan(planItems, { today, bestaand });
  const taken = result.blokken.map((b) => blokNaarTaak(b, who, createdBy));
  return {
    taken,
    sids: nieuw.map((i) => i.sid),
    toetsen: planItems.filter((p) => p.kind === "toets" || p.kind === "so").length,
    huiswerk: planItems.filter((p) => p.kind !== "toets" && p.kind !== "so").length,
    telaat: result.telaat,
  };
}

const LAATST = "familyflow:somtoday:laatst";
const ELKE = 3 * 60 * 60 * 1000; // hooguit om de 3 uur vanzelf
let bezig = false;

/**
 * Haal Somtoday op en plan nieuwe dingen in. Gaat vanzelf als de app opent (hooguit om de 3 uur).
 * Geeft een korte melding terug, of null als er niks nieuws is.
 */
export async function syncSomtoday(force = false): Promise<string | null> {
  if (!isLive() || bezig) return null;
  try {
    const laatst = Number(window.localStorage.getItem(LAATST) ?? 0);
    if (!force && Date.now() - laatst < ELKE) return null;
  } catch {
    /* geen opslag */
  }
  bezig = true;
  try {
    const res = await fn<Record<string, { items?: SomItem[]; fout?: string }>>({ action: "ophalen" });
    try {
      window.localStorage.setItem(LAATST, String(Date.now()));
    } catch {
      /* */
    }
    const state = snapshot();
    const meIsParent = state.members.find((m) => m.id === state.me)?.role === "ouder";
    const meldingen: string[] = [];
    for (const [who, r] of Object.entries(res)) {
      const naam = state.members.find((m) => m.id === who)?.name ?? "";
      if (!naam) continue;
      if (r.fout) {
        if (meIsParent || who === state.me) meldingen.push(`Somtoday ${naam}: ${r.fout}`);
        continue;
      }
      const p = planSomtoday(state, who, r.items ?? [], state.me);
      if (!p.sids.length) continue;
      actions.addSomtoday(who, p.taken, p.sids);
      if (p.toetsen || p.huiswerk) {
        const delen = [p.toetsen && `${p.toetsen} ${p.toetsen === 1 ? "toets" : "toetsen"}`, p.huiswerk && `${p.huiswerk} huiswerk`].filter(Boolean).join(" en ");
        meldingen.push(who === state.me ? `Uit Somtoday: ${delen} ingepland` : `Uit Somtoday: ${delen} ingepland voor ${naam}`);
      }
    }
    return meldingen.length ? meldingen.join(" · ") : force ? "Niks nieuws in Somtoday" : null;
  } catch (e) {
    return force ? String((e as Error).message ?? e) : null;
  } finally {
    bezig = false;
  }
}
