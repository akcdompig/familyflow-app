import { klusById } from "./huis";
import { addDays } from "./planner";
import { magDoen, verdeling, verwachting } from "./verdeling";
import type { FamilyState, KlusDone, Member, PlanRegel, TaakGevoel } from "./types";

/*
  "Verdeel de taken": een weekvoorstel dat ouders bekijken, aanpassen en bevestigen.

  - Basis is dezelfde eerlijke verdeling als elke dag (tijd, wie het recent deed, roosters, leeftijd, afspraken).
    Het voorstel rekent dag voor dag vooruit alsof de geplande taken gedaan worden, zodat de week zelf ook eerlijk is
    (vaatwasser: Lina, Noah, Lina, Noah... als het rooster het toelaat).
  - Voorkeuren van kinderen tellen alleen hier, op de telefoon van de ouder. De bevestigde week wordt opgeslagen,
    zodat elke telefoon hetzelfde ziet (kinderen zien de voorkeuren van anderen niet en zouden anders anders rekenen).
    - "Dit vind ik leuk": een kleine voorkeur, hooguit de helft van de keren. Nooit een vaste taak.
    - "Dit wil ik leren": hooguit één keer per week, samen met een ouder.
    - "Hier heb ik hulp bij nodig": alleen samen met een ouder.
  - Wat ouders vast aan iemand gaven (alleen die persoon mag het) gaat altijd voor; dat regelt de dagverdeling al.
*/

export type Plan = Record<string, Record<string, PlanRegel>>;

const isKind = (m: Member) => m.role !== "ouder";
const leden = (s: FamilyState) => s.members.filter((m) => m.joined !== false);
const basis = (key: string) => key.split(":")[0];

/** Voorkeur van een kind voor een taak. */
export const gevoel = (s: FamilyState, id: string, klusId: string): TaakGevoel | undefined => s.doelen?.[id]?.taken?.[basis(klusId)];

/** Een ouder die die dag thuis tijd heeft (of anders de eerste ouder). */
function ouderVoor(s: FamilyState, d: string, behalve?: string): Member | undefined {
  const ouders = leden(s).filter((m) => !isKind(m) && m.id !== behalve);
  return ouders.find((o) => verwachting(s, o, d).doel >= 30) ?? ouders.find((o) => verwachting(s, o, d).doel > 0) ?? ouders[0];
}

export function maakPlan(s: FamilyState, start: string, dagen = 7): Plan {
  const datums = Array.from({ length: dagen }, (_, i) => addDays(start, i));
  // Bestaande planning voor deze dagen telt niet mee: we rekenen opnieuw. Wissels van vandaag laten we staan.
  const planning = { ...(s.klusAfspraken?.planning ?? {}) };
  for (const d of datums) delete planning[d];
  let sim: FamilyState = { ...s, klusAfspraken: { ...(s.klusAfspraken ?? {}), planning } };
  const plan: Plan = {};
  const kids = leden(s).filter(isKind);
  const geleerd = new Set<string>();
  const leuk: Record<string, { kreeg: number; kans: number }> = {};
  const nam = (id?: string) => s.members.find((m) => m.id === id)?.name ?? "";

  for (const d of datums) {
    const v = verdeling(sim, d);
    const regels: Record<string, PlanRegel> = {};
    for (const [key, id] of Object.entries(v.wie)) regels[key] = { wie: id, reden: v.reden[key] };
    const beschikbaar = (m: Member) => verwachting(sim, m, d).doel > 0;

    for (const [key, r] of Object.entries(regels)) {
      const k = klusById(s, key);
      if (!k || k.perKind) continue;
      // Leren: één keer per week, samen met een ouder. Ook bij taken met begeleiding.
      const leerling = kids.find((m) => !geleerd.has(m.id) && gevoel(s, m.id, k.id) === "leren" && beschikbaar(m) && m.id !== r.wie && (magDoen(s, m, k) || k.begeleiding));
      if (leerling) {
        const ouder = ouderVoor(sim, d);
        regels[key] = { wie: leerling.id, mee: ouder?.id, reden: `wil dit leren: vandaag samen met ${nam(ouder?.id).toLowerCase() || "een ouder"}` };
        geleerd.add(leerling.id);
        continue;
      }
      // Leuk: kleine voorkeur, hooguit de helft van de keren dat de taak voorkomt.
      const liefhebbers = kids.filter((m) => gevoel(s, m.id, k.id) === "leuk" && magDoen(s, m, k) && beschikbaar(m));
      for (const m of liefhebbers) {
        const t = (leuk[`${k.id}|${m.id}`] ??= { kreeg: 0, kans: 0 });
        t.kans++;
        if (r.wie === m.id) t.kreeg++;
      }
      const huidig = s.members.find((m) => m.id === r.wie);
      if (huidig && isKind(huidig) && gevoel(s, huidig.id, k.id) !== "leuk") {
        const lief = liefhebbers.find((m) => {
          const t = leuk[`${k.id}|${m.id}`];
          return m.id !== r.wie && t.kreeg < Math.ceil(t.kans / 2) && plan[addDays(d, -1)]?.[key]?.wie !== m.id;
        });
        if (lief) {
          regels[key] = { wie: lief.id, reden: "vindt dit leuk (en het blijft eerlijk verdeeld)" };
          leuk[`${k.id}|${lief.id}`].kreeg++;
        }
      }
      // Hulp nodig: alleen samen met een ouder.
      const nu = regels[key];
      if (!nu.mee && gevoel(s, nu.wie, k.id) === "hulp") {
        const ouder = ouderVoor(sim, d, nu.wie);
        if (ouder) regels[key] = { ...nu, mee: ouder.id, reden: `samen met ${ouder.name.toLowerCase()}, want hier is hulp bij fijn` };
      }
    }

    plan[d] = regels;
    // Doe alsof het gedaan is, zodat de volgende dag daar rekening mee houdt.
    const at = new Date(`${d}T18:00:00`).toISOString();
    const log: KlusDone[] = [];
    for (const [key, r] of Object.entries(regels)) {
      if (r.mee) {
        const groep = `plan-${d}-${key}`;
        log.push({ id: `sim-${d}-${key}`, klus: key, by: r.wie, at, samen: groep }, { id: `sim-${d}-${key}-mee`, klus: key, by: r.mee, at, samen: groep });
      } else log.push({ id: `sim-${d}-${key}`, klus: key, by: r.wie, at });
    }
    sim = { ...sim, klusLog: [...(sim.klusLog ?? []), ...log] };
  }
  return plan;
}

export interface Wijziging {
  datum: string;
  key: string;
  van?: string;
  naar: string;
}

/** Wat verandert er aan een al bevestigde planning? Alleen dagen die al bevestigd waren. */
export function wijzigingen(s: FamilyState, plan: Plan): Wijziging[] {
  const oud = s.klusAfspraken?.planning ?? {};
  const uit: Wijziging[] = [];
  for (const [d, regels] of Object.entries(plan)) {
    if (!oud[d]) continue;
    const keys = new Set([...Object.keys(oud[d]), ...Object.keys(regels)]);
    for (const key of keys) {
      const a = oud[d][key]?.wie;
      const b = regels[key]?.wie;
      if (a !== b && b) uit.push({ datum: d, key, van: a, naar: b });
    }
  }
  return uit;
}

/** Minuten per persoon in een plan: om in één oogopslag te zien of de week eerlijk is. */
export function minutenInPlan(s: FamilyState, plan: Plan): Record<string, number> {
  const uit: Record<string, number> = {};
  for (const regels of Object.values(plan)) {
    for (const [key, r] of Object.entries(regels)) {
      const k = klusById(s, key);
      const min = (s.klusAfspraken?.klussen?.[k?.id ?? ""]?.minuten ?? k?.minuten ?? 10) / (r.mee ? 2 : 1);
      uit[r.wie] = (uit[r.wie] ?? 0) + min;
      if (r.mee) uit[r.mee] = (uit[r.mee] ?? 0) + min;
    }
  }
  return uit;
}

/** Komende taken van één persoon: uit de bevestigde planning, of een voorstel als er nog niks bevestigd is. */
export function mijnWeek(s: FamilyState, id: string, start: string, dagen = 7): { datum: string; key: string; regel: PlanRegel; bevestigd: boolean }[] {
  const bevestigd = s.klusAfspraken?.planning ?? {};
  const voorstel = datumsZonder(bevestigd, start, dagen) ? maakPlan(s, start, dagen) : {};
  const uit: { datum: string; key: string; regel: PlanRegel; bevestigd: boolean }[] = [];
  for (let i = 0; i < dagen; i++) {
    const d = addDays(start, i);
    const regels = bevestigd[d] ?? voorstel[d] ?? {};
    for (const [key, r] of Object.entries(regels)) if (r.wie === id || r.mee === id) uit.push({ datum: d, key, regel: r, bevestigd: !!bevestigd[d] });
  }
  return uit;
}
const datumsZonder = (p: Record<string, unknown>, start: string, dagen: number) => Array.from({ length: dagen }, (_, i) => addDays(start, i)).some((d) => !p[d]);
