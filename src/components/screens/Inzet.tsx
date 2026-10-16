"use client";

import { useState } from "react";
import { INZET, waardering, weekInzet } from "@/lib/inzet";
import { iso } from "@/lib/planner";
import { actions } from "@/lib/store";
import type { FamilyState, InzetSoort, Member } from "@/lib/types";

/** Wat je deed deze week: werk, school, afspraken, samen en rust. Waardering zonder punten. */
export function InzetKaart({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [soort, setSoort] = useState<InzetSoort | null>(null);
  const [tekst, setTekst] = useState("");
  const regels = weekInzet(state, me.id);
  const zinnen = waardering(state, me.id);
  const bewaar = () => {
    if (!soort) return;
    actions.inzetErbij(me.id, soort, iso(new Date()), tekst);
    onToast("Staat erbij 👍");
    setOpen(false);
    setSoort(null);
    setTekst("");
  };
  return (
    <section className="ff-card ff-stack-s" aria-label="Wat je deed deze week">
      <b>✨ Wat je deed deze week</b>
      {zinnen.length > 0 && (
        <ul className="ff-waardering" aria-label="Vandaag">
          {zinnen.map((z) => <li key={z}>{z}</li>)}
        </ul>
      )}
      {regels.length ? (
        <ul className="ff-inzet-lijst">
          {regels.map((r, i) => (
            <li key={r.tekst + i}>
              <span aria-hidden="true">{r.emoji}</span>
              <span className="ff-grow">{r.tekst}</span>
              {r.bron === "zelf" && r.id && <button className="ff-inzet-weg" aria-label={`${r.tekst} weghalen`} onClick={() => actions.inzetWeg(me.id, r.id!)}>×</button>}
            </li>
          ))}
        </ul>
      ) : (
        <span className="ff-small ff-muted">Nog niks deze week. Werk en school uit je rooster komen hier vanzelf.</span>
      )}
      {!open ? (
        <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => setOpen(true)}>+ Iets wat je deed</button>
      ) : (
        <div className="ff-stack-s">
          <div className="ff-chips" role="group" aria-label="Wat deed je?">
            {INZET.map((x) => <button key={x.id} className="ff-chip" aria-pressed={soort === x.id} onClick={() => setSoort(x.id)}><span aria-hidden="true">{x.emoji}</span> {x.label}</button>)}
          </div>
          {soort && (
            <label className="ff-field">
              <span className="ff-eyebrow">Kort erbij (optioneel)</span>
              <input value={tekst} onChange={(e) => setTekst(e.target.value)} maxLength={80} placeholder="Bijv. pitch voor de nieuwe klant" />
            </label>
          )}
          <div className="ff-row">
            <button className="ff-btn ff-btn-ghost" onClick={() => { setOpen(false); setSoort(null); }}>Annuleren</button>
            <button className="ff-btn ff-btn-primary ff-grow" disabled={!soort} onClick={bewaar}>Erbij zetten</button>
          </div>
        </div>
      )}
      <span className="ff-small ff-muted">Geen punten: dit laat zien wat je doet. Een lange dag is niet meer waard dan een korte.</span>
    </section>
  );
}
