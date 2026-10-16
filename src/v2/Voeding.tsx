"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { DOEL, ETEN, ONGEZOND, dagLog, gegeten, gemist, ongezond } from "@/lib/dag";
import { expressionFor } from "@/lib/mood";
import { actions } from "@/lib/store";
import type { FamilyState, Member } from "@/lib/types";

/*
  Eten en drinken in getallen. Ouders zien per kind hoeveel water, fruit, maaltijden,
  en hoeveel ongezond (snoep/snack en drinken met suiker). Kinderen geven ongezond aan met één knop.
*/

type Soort = "snoep" | "zoet";
const zet = (id: string, k: Soort, d: number) => actions.updateDag(id, (l) => ({ ...l, [k]: Math.max(0, (l[k] ?? 0) + d) }));

/** Eén regel met alles van vandaag, voor het overzicht. */
export function VoedingRij({ state, id }: { state: FamilyState; id: string }) {
  const log = dagLog(state, id);
  const mis = gemist(state, id);
  return (
    <div className="v2-voeding-rij">
      <span className={`v2-vchip${log.water >= DOEL.water ? " is-goed" : ""}`} title="Glazen water">💧 {log.water}/{DOEL.water}</span>
      <span className={`v2-vchip${log.fruit >= DOEL.fruit ? " is-goed" : ""}`} title="Stuks fruit">🍎 {log.fruit}/{DOEL.fruit}</span>
      {ETEN.map((e) => (
        <span key={e.id} className={`v2-vchip is-maal${gegeten(log, e.id) ? " is-goed" : mis.includes(e.id) ? " is-mis" : ""}`} title={`${e.label}: ${gegeten(log, e.id) ? "gegeten" : mis.includes(e.id) ? "niet gegeten" : "nog niet"}`}>
          {e.emoji}{gegeten(log, e.id) ? "✓" : mis.includes(e.id) ? "✗" : ""}
        </span>
      ))}
      {ONGEZOND.map((o) => (log[o.id] ?? 0) > 0 && (
        <span key={o.id} className="v2-vchip is-ongezond" title={o.label}>{o.emoji} {log[o.id]}</span>
      ))}
    </div>
  );
}

/** Uitgebreid, in het scherm van een gezinslid. Ouders kunnen ongezond bijstellen. */
export function VoedingKaart({ state, id, kanAanpassen }: { state: FamilyState; id: string; kanAanpassen: boolean }) {
  const log = dagLog(state, id);
  const mis = gemist(state, id);
  const regel = (emoji: string, label: string, waarde: string, toon = "") => (
    <div className={`v2-vregel${toon ? ` ${toon}` : ""}`}><span aria-hidden="true">{emoji}</span><span className="ff-grow">{label}</span><b>{waarde}</b></div>
  );
  return (
    <section className="v2-voeding ff-stack-s" aria-label="Eten en drinken vandaag">
      <b>Eten en drinken vandaag</b>
      <div className="v2-vblok">
        <span className="ff-eyebrow">Drinken</span>
        {regel("💧", "Water", `${log.water} van ${DOEL.water} glazen`, log.water >= DOEL.water ? "is-goed" : "")}
        <OngezondRegel id={id} log={log} soort="zoet" kanAanpassen={kanAanpassen} />
      </div>
      <div className="v2-vblok">
        <span className="ff-eyebrow">Eten</span>
        {ETEN.map((e) => regel(e.emoji, e.label, gegeten(log, e.id) ? "gegeten ✓" : mis.includes(e.id) ? "niet gegeten" : "nog niet", gegeten(log, e.id) ? "is-goed" : mis.includes(e.id) ? "is-mis" : ""))}
        {regel("🍎", "Fruit", `${log.fruit} van ${DOEL.fruit} stuks`, log.fruit >= DOEL.fruit ? "is-goed" : "")}
        <OngezondRegel id={id} log={log} soort="snoep" kanAanpassen={kanAanpassen} />
      </div>
    </section>
  );
}

function OngezondRegel({ id, log, soort, kanAanpassen }: { id: string; log: ReturnType<typeof dagLog>; soort: Soort; kanAanpassen: boolean }) {
  const o = ONGEZOND.find((x) => x.id === soort)!;
  const n = log[soort] ?? 0;
  return (
    <div className={`v2-vregel${n > 0 ? " is-ongezond" : ""}`}>
      <span aria-hidden="true">{o.emoji}</span>
      <span className="ff-grow">{o.label}</span>
      {kanAanpassen && <button className="v2-plusmin" onClick={() => zet(id, soort, -1)} disabled={n === 0} aria-label={`${o.label} min één`}>−</button>}
      <b>{n}×</b>
      {kanAanpassen && <button className="v2-plusmin" onClick={() => zet(id, soort, 1)} aria-label={`${o.label} plus één`}>+</button>}
    </div>
  );
}

/** Voor ouders: alle kinderen onder elkaar. */
export function VoedingOverzicht({ state, onOpen }: { state: FamilyState; onOpen: (id: string) => void }) {
  const kids = state.members.filter((m) => m.role !== "ouder" && m.joined !== false);
  if (!kids.length) return null;
  return (
    <section className="ff-card ff-stack-s" aria-label="Eten en drinken van de kinderen">
      <b>Eten en drinken vandaag</b>
      {kids.map((m) => {
        const n = ongezond(dagLog(state, m.id));
        return (
          <button key={m.id} className="v2-voeding-kind" onClick={() => onOpen(m.id)}>
            <Avatar config={m.avatar} expression={expressionFor(state.checkins[m.id])} headOnly size={32} animate={false} label="" />
            <span className="ff-grow ff-stack-xs" style={{ textAlign: "left" }}>
              <b>{m.name}{n > 0 ? <span className="v2-ongezond-tag">{n}× ongezond</span> : null}</b>
              <VoedingRij state={state} id={m.id} />
            </span>
          </button>
        );
      })}
      <span className="ff-small ff-muted">✓ gegeten · ✗ gemist · 🍬 snoep of snack · 🥤 drinken met suiker</span>
    </section>
  );
}

/** De knop op Vandaag: "iets ongezonds gehad?" met snoep en zoet drinken. */
export function OngezondKnop({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const log = dagLog(state, me.id);
  const n = ongezond(log);
  return (
    <>
      <button className={`v2-teller${n > 0 ? " is-ongezond" : ""}`} onClick={() => setOpen(true)} aria-label={`Ongezond vandaag: ${n}. Tik om iets aan te geven`}>
        🍬 <b>{n}</b>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Iets ongezonds gehad?">
        <div className="ff-stack">
          <p className="ff-muted" style={{ margin: 0 }}>Eerlijk zijn levert niks in. Eén keer iets lekkers is prima, daarna zakt je gezondheidsbalk een beetje.</p>
          {ONGEZOND.map((o) => {
            const v = log[o.id] ?? 0;
            return (
              <div key={o.id} className="v2-ongezond-keuze">
                <span className="v2-ongezond-emoji" aria-hidden="true">{o.emoji}</span>
                <span className="ff-grow ff-stack-xs"><b>{o.label}</b><span className="ff-small ff-muted">{o.voorbeeld}</span></span>
                <button className="v2-plusmin" onClick={() => zet(me.id, o.id, -1)} disabled={v === 0} aria-label={`${o.label} min één`}>−</button>
                <b className="v2-ongezond-n">{v}</b>
                <button className="v2-plusmin" onClick={() => { zet(me.id, o.id, 1); onToast(`${o.emoji} genoteerd`); }} aria-label={`${o.label} plus één`}>+</button>
              </div>
            );
          })}
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setOpen(false)}>Klaar</button>
        </div>
      </Sheet>
    </>
  );
}
