"use client";

import { tijdTekst } from "@/lib/agenda";
import { dagLijst } from "@/lib/groei";
import { werkOp } from "@/lib/huis";
import { iso } from "@/lib/planner";
import { lookVoor } from "@/lib/status";
import type { FamilyState, Member } from "@/lib/types";

/*
  De dag van één gezinslid. Zelfde telling als Vandaag en "Samen vandaag" (dagLijst): één bron, geen aparte lijst.
  Werk en school, afspraken, taken en huistaken. Routine en eten alleen voor ouders en jezelf (hygiëne is privé).
*/

const SOORT: Record<string, string> = { taak: "taak", klus: "huistaak", routine: "routine", eten: "eten" };

export function LidDag({ state, lid, me }: { state: FamilyState; lid: Member; me: Member }) {
  const d = iso(new Date());
  const privé = me.role === "ouder" || me.id === lid.id;
  const items = dagLijst(state, lid.id, d).filter((x) => privé || (x.soort !== "routine" && x.soort !== "eten"));
  const werk = werkOp(state, lid.id, d).filter((w) => !w.vrij);
  const afspraken = (state.agenda?.[lid.id] ?? []).filter((a) => a.datum === d).sort((a, b) => a.van.localeCompare(b.van));
  const af = items.filter((x) => x.klaar).length;
  const naam = lid.id === me.id ? "Jij" : lid.name;
  return (
    <section className="ff-card ff-stack-s v2-lid-dag" aria-label={`Vandaag van ${naam}`} style={{ width: "100%" }}>
      <div className="ff-row"><b className="ff-grow">Vandaag</b><span className="ff-small ff-muted">{af} van {items.length} gedaan</span></div>
      {(werk.length > 0 || afspraken.length > 0) && (
        <ul className="ff-lijst-dag" aria-label="Werk, school en afspraken">
          {werk.map((w) => <li key={w.werk.id + w.van}><span aria-hidden="true">{lookVoor(w.werk) === "school" ? "🎒" : "💼"}</span><span className="ff-lijst-titel">{w.werk.naam}</span><span className="ff-lijst-soort">{w.van.replace(":", ".")}–{w.tot.replace(":", ".")}</span></li>)}
          {afspraken.map((a) => <li key={a.id}><span aria-hidden="true">📅</span><span className="ff-lijst-titel">{a.titel}</span><span className="ff-lijst-soort">{tijdTekst(a)}</span></li>)}
        </ul>
      )}
      {items.length ? (
        <ul className="ff-lijst-dag" aria-label="Taken en routines">
          {items.map((x, i) => (
            <li key={x.titel + i} className={x.klaar ? "is-af" : ""}>
              <span aria-hidden="true">{x.klaar ? "✅" : "⬜"}</span>
              <span className="ff-lijst-titel">{x.titel}</span>
              <span className="ff-lijst-soort">{x.klaar ? "gedaan" : "open"} · {SOORT[x.soort] ?? x.soort}</span>
            </li>
          ))}
        </ul>
      ) : <span className="ff-small ff-muted">Niks voor vandaag.</span>}
    </section>
  );
}
