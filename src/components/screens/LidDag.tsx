"use client";

import { useState } from "react";
import { tijdTekst } from "@/lib/agenda";
import { dagLijst, STATUS_TEKST, type DagItem } from "@/lib/groei";
import { actions } from "@/lib/store";
import { weekDicht } from "@/lib/week";
import { werkOp } from "@/lib/huis";
import { iso } from "@/lib/planner";
import { lookVoor } from "@/lib/status";
import type { FamilyState, Member } from "@/lib/types";

/*
  De dag van één gezinslid. Zelfde telling als Vandaag en "Samen vandaag" (dagLijst): één bron, geen aparte lijst.
  Werk en school, afspraken, taken en huistaken. Routine en eten alleen voor ouders en jezelf (hygiëne is privé).
*/

const SOORT: Record<string, string> = { taak: "taak", klus: "huistaak", routine: "routine", eten: "eten" };

export function LidDag({ state, lid, me, onToast }: { state: FamilyState; lid: Member; me: Member; onToast?: (m: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const d = iso(new Date());
  const privé = me.role === "ouder" || me.id === lid.id;
  // Vanuit een ander gezien: "Je kamer netjes" wordt "Kamer van Noah".
  const items = dagLijst(state, lid.id, d)
    .filter((x) => privé || (x.soort !== "routine" && x.soort !== "eten"))
    .map((x) => (me.id !== lid.id && /^je kamer/i.test(x.titel) ? { ...x, titel: `Kamer van ${lid.name}` } : x));
  const werk = werkOp(state, lid.id, d).filter((w) => !w.vrij);
  const afspraken = (state.agenda?.[lid.id] ?? []).filter((a) => a.datum === d).sort((a, b) => a.van.localeCompare(b.van));
  const tellen = items.filter((x) => !x.status);
  const af = tellen.filter((x) => x.klaar).length;
  // Ouders kunnen helpen: "wel gedaan" (vergeten af te vinken), overgeslagen, ging niet door. Niet bij jezelf, niet in een afgesloten week.
  const helpen = me.role === "ouder" && lid.id !== me.id && lid.role !== "ouder" && !weekDicht(state, lid.id, d);
  const meld = (m: string) => onToast?.(m);
  const naam = lid.id === me.id ? "Jij" : lid.name;
  return (
    <section className="ff-card ff-stack-s v2-lid-dag" aria-label={`Vandaag van ${naam}`} style={{ width: "100%" }}>
      <div className="ff-row"><b className="ff-grow">Vandaag</b><span className="ff-small ff-muted">{af} van {tellen.length} gedaan</span></div>
      {(werk.length > 0 || afspraken.length > 0) && (
        <ul className="ff-lijst-dag" aria-label="Werk, school en afspraken">
          {werk.map((w) => <li key={w.werk.id + w.van}><span aria-hidden="true">{lookVoor(w.werk) === "school" ? "🎒" : "💼"}</span><span className="ff-lijst-titel">{w.werk.naam}</span><span className="ff-lijst-soort">{w.van.replace(":", ".")}–{w.tot.replace(":", ".")}</span></li>)}
          {afspraken.map((a) => <li key={a.id}><span aria-hidden="true">📅</span><span className="ff-lijst-titel">{a.titel}</span><span className="ff-lijst-soort">{tijdTekst(a)}</span></li>)}
        </ul>
      )}
      {items.length ? (
        <ul className="ff-lijst-dag" aria-label="Taken en routines">
          {items.map((x, i) => (
            <li key={x.id + i} className={`${x.klaar ? "is-af" : ""}${x.status ? " is-status" : ""}${helpen ? " is-helpen" : ""}`}>
              {helpen ? (
                <button className="v2-lid-item" aria-expanded={open === x.id} onClick={() => setOpen(open === x.id ? null : x.id)}>
                  <Regel x={x} />
                </button>
              ) : <Regel x={x} />}
              {helpen && open === x.id && (
                <span className="v2-lid-acties">
                  {x.status ? (
                    <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => { actions.zetStatus(lid.id, d, x.id, null); setOpen(null); meld("Telt weer gewoon mee"); }}>Telt weer mee</button>
                  ) : x.klaar ? (
                    (x.soort === "taak" || x.soort === "klus") && <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => { actions.ouderTerug(lid.id, x.id); setOpen(null); meld("Vinkje weggehaald"); }}>Toch niet gedaan</button>
                  ) : (
                    <>
                      {(x.soort === "taak" || x.soort === "klus") && <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => { actions.ouderAfvinken(lid.id, x.id); setOpen(null); meld(`Afgevinkt voor ${lid.name} ✓`); }}>Wel gedaan</button>}
                      <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => { actions.zetStatus(lid.id, d, x.id, "overgeslagen"); setOpen(null); meld("Overgeslagen: telt niet mee"); }}>Overgeslagen</button>
                      <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => { actions.zetStatus(lid.id, d, x.id, "nietdoor"); setOpen(null); meld("Ging niet door: telt niet mee"); }}>Ging niet door</button>
                    </>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : <span className="ff-small ff-muted">Niks voor vandaag.</span>}
    </section>
  );
}

function Regel({ x }: { x: DagItem }) {
  return (
    <>
      <span aria-hidden="true">{x.klaar ? "✅" : x.status ? "➖" : "⬜"}</span>
      <span className="ff-lijst-titel">{x.titel}</span>
      <span className="ff-lijst-soort">{x.status ? STATUS_TEKST[x.status] : x.klaar ? "gedaan" : "open"} · {SOORT[x.soort] ?? x.soort}</span>
    </>
  );
}
