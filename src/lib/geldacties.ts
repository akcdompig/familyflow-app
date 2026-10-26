import { newId, stand, wijzig } from "./store";
import { zakgeldPosten, type Geld, type GeldPost, type Zakgeld } from "./geld";
import { addDays, iso } from "./planner";
import type { FamilyState } from "./types";

/*
  3.22 Acties voor Mijn geld. Kinderen voeren zelf in wat erbij kwam en wat ze uitgaven, en mogen hun eigen
  invoer weghalen. Ouders mogen alles, en stellen het zakgeld in. Geen bank: de ouder betaalt in het echt.
*/

const leeg: Geld = { posten: [] };
const metGeld = (s: FamilyState, id: string, fn: (g: Geld) => Geld): FamilyState => ({ ...s, geld: { ...(s.geld ?? {}), [id]: fn(s.geld?.[id] ?? leeg) } });
const isOuder = (s: FamilyState, id: string) => s.members.find((m) => m.id === id)?.role === "ouder";

export const geldActies = {
  /** Geld erbij (positief) of eraf (uitgave, negatief). Geeft het id terug, of null als het niet mag. */
  boek(kind: string, door: string, p: { cents: number; soort: GeldPost["soort"]; wat: string; cat?: GeldPost["cat"]; datum?: string }): string | null {
    const s = stand();
    if (door !== kind && !isOuder(s, door)) return null;
    const bedrag = Math.round(Math.abs(p.cents));
    if (!bedrag || bedrag > 1_000_000) return null;
    const id = newId("g");
    const post: GeldPost = {
      id,
      datum: p.datum && p.datum <= iso(new Date()) ? p.datum : iso(new Date()),
      cents: p.soort === "uitgave" ? -bedrag : bedrag,
      soort: p.soort,
      wat: p.wat.trim().slice(0, 60) || (p.soort === "uitgave" ? "Uitgegeven" : "Erbij"),
      ...(p.soort === "uitgave" ? { cat: p.cat ?? "anders" } : {}),
      door,
      at: new Date().toISOString(),
    };
    wijzig((st) => metGeld(st, kind, (g) => ({ ...g, posten: [...g.posten, post].slice(-1000) })), p.soort === "uitgave" ? `Uitgave: ${post.wat}` : `Geld erbij: ${post.wat}`);
    return id;
  },
  /** Weghalen: je eigen invoer, of als ouder alles. Zakgeld haal je weg door het zakgeld aan te passen. */
  weg(kind: string, door: string, id: string): boolean {
    const s = stand();
    const p = s.geld?.[kind]?.posten.find((x) => x.id === id);
    if (!p || (p.door !== door && !isOuder(s, door))) return false;
    wijzig((st) => metGeld(st, kind, (g) => ({ ...g, posten: g.posten.filter((x) => x.id !== id) })));
    return true;
  },
  /**
    Zakgeld instellen (alleen ouders). Wat er tot nu toe al binnenkwam blijft staan: dat wordt vaste posten,
    het nieuwe bedrag geldt vanaf morgen. null = geen zakgeld meer.
  */
  setZakgeld(kind: string, door: string, z: Omit<Zakgeld, "vanaf"> | null): boolean {
    const s = stand();
    if (!isOuder(s, door)) return false;
    const vandaag = iso(new Date());
    wijzig((st) =>
      metGeld(st, kind, (g) => {
        const oud = zakgeldPosten(g.zakgeld, vandaag).map((p) => ({ ...p, id: newId("g"), door }));
        const { zakgeld: _weg, ...rest } = g;
        // Eerste keer: vanaf vandaag (staat het op een maandag of de 1e, dan komt het vandaag al). Daarna vanaf morgen.
        const vanaf = g.zakgeld ? addDays(vandaag, 1) : vandaag;
        return { ...rest, posten: [...g.posten, ...oud], ...(z && z.cents > 0 ? { zakgeld: { cents: Math.round(z.cents), per: z.per, vanaf } } : {}) };
      }),
    );
    return true;
  },
  /** Spaardoel (zelf of een ouder). null = geen doel. */
  setDoel(kind: string, door: string, doel: { wat: string; cents: number } | null): boolean {
    const s = stand();
    if (door !== kind && !isOuder(s, door)) return false;
    wijzig((st) =>
      metGeld(st, kind, (g) => {
        const { doel: _weg, ...rest } = g;
        return doel && doel.cents > 0 && doel.wat.trim() ? { ...rest, doel: { wat: doel.wat.trim().slice(0, 40), cents: Math.round(doel.cents) } } : rest;
      }),
    );
    return true;
  },
};
