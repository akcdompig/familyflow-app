"use client";

import { useState } from "react";
import { tijdTekst } from "@/lib/agenda";
import { dagLijst, STATUS_TEKST, type DagItem } from "@/lib/groei";
import { actions } from "@/lib/store";
import { weekDicht } from "@/lib/week";
import { werkOp } from "@/lib/huis";
import { addDays, iso } from "@/lib/planner";
import { lookVoor } from "@/lib/status";
import type { FamilyState, Member } from "@/lib/types";

/*
  De dag van één gezinslid. Zelfde telling als Vandaag en "Samen vandaag" (dagLijst): één bron, geen aparte lijst.
  Werk en school, afspraken, taken en huistaken. Routine en eten alleen voor ouders en jezelf (hygiëne is privé).
  3.21: een ouder kan bij een kind terugbladeren (tot 14 dagen) en vinkjes goedzetten: toch niet gedaan, of wel gedaan.
  Ook voor routine en eten. Punten gaan mee. Een afgesloten week blijft zoals hij is.
*/

const TERUG = 14;
const dagKop = (d: string, vandaag: string) =>
  d === vandaag ? "Vandaag" : d === addDays(vandaag, -1) ? "Gisteren" : new Date(d + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "short" }).replace(/^./, (c) => c.toUpperCase());

const SOORT: Record<string, string> = { taak: "taak", klus: "huistaak", routine: "routine", eten: "eten" };

export function LidDag({ state, lid, me, onToast }: { state: FamilyState; lid: Member; me: Member; onToast?: (m: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const vandaag = iso(new Date());
  const [d, setD] = useState(vandaag);
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
  const ouderBijKind = me.role === "ouder" && lid.id !== me.id && lid.role !== "ouder";
  const dicht = weekDicht(state, lid.id, d);
  const helpen = ouderBijKind && !dicht;
  const naar = (n: number) => { setD(addDays(d, n)); setOpen(null); };
  const eerste = addDays(vandaag, -TERUG);
  const meld = (m: string) => onToast?.(m);
  const naam = lid.id === me.id ? "Jij" : lid.name;
  return (
    <section className="ff-card ff-stack-s v2-lid-dag" aria-label={`${dagKop(d, vandaag)} van ${naam}`} style={{ width: "100%" }}>
      {ouderBijKind ? (
        <div className="v2-lid-dagkies">
          <button className="v2-lid-pijl" onClick={() => naar(-1)} disabled={d <= eerste} aria-label="Dag eerder">‹</button>
          <span className="ff-grow"><b>{dagKop(d, vandaag)}</b><span className="ff-small ff-muted"> · </span><span className="ff-small ff-muted v2-lid-telling">{af} van {tellen.length} gedaan</span></span>
          <button className="v2-lid-pijl" onClick={() => naar(1)} disabled={d >= vandaag} aria-label="Dag later">›</button>
        </div>
      ) : (
        <div className="ff-row"><b className="ff-grow">Vandaag</b><span className="ff-small ff-muted v2-lid-telling">{af} van {tellen.length} gedaan</span></div>
      )}
      {ouderBijKind && (
        <span className="ff-small ff-muted">{dicht ? "Deze week is afgesloten. Vinkjes staan vast." : "Tik op een regel om hem goed te zetten."}</span>
      )}
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
                    <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => { const ok = actions.ouderZet(lid.id, d, x.id, false); setOpen(null); meld(ok ? "Vinkje weggehaald, punten eraf" : "Dat lukte niet"); }}>Toch niet gedaan</button>
                  ) : (
                    <>
                      <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => { const ok = actions.ouderZet(lid.id, d, x.id, true); setOpen(null); meld(ok ? `Afgevinkt voor ${lid.name} ✓` : "Dat lukte niet"); }}>Wel gedaan</button>
                      <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => { actions.zetStatus(lid.id, d, x.id, "overgeslagen"); setOpen(null); meld("Overgeslagen: telt niet mee"); }}>Overgeslagen</button>
                      <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => { actions.zetStatus(lid.id, d, x.id, "nietdoor"); setOpen(null); meld("Ging niet door: telt niet mee"); }}>Ging niet door</button>
                    </>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : <span className="ff-small ff-muted">{d === vandaag ? "Niks voor vandaag." : "Niks op deze dag."}</span>}
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
