"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { KLUS_GROEPEN, alleKlussen, klusAan, type Klus } from "@/lib/huis";
import { samenwerken } from "@/lib/samenwerken";
import type { FamilyState } from "@/lib/types";

/*
  Klussen kiezen (3.11): recht toe recht aan.
  - Een lijst met veelvoorkomende klussen, per groep. Aanzetten = hij doet mee in de verdeling. Uitzetten = weg.
  - Zoeken op een woord.
  - Zelf iets toevoegen: alleen een naam en hoe vaak. Zelf toegevoegd kun je ook weer weghalen.
  Minuten, wie het wel of niet doet en de rest staan bij "Taken en afspraken" (voor wie dat wil).
*/

const HOE_VAAK = [
  { elke: 1, label: "Elke dag" },
  { elke: 2, label: "Om de dag" },
  { elke: 7, label: "Elke week" },
];
const vaak = (k: Klus) => (k.elke === 1 ? "elke dag" : k.elke === 2 ? "om de dag" : k.elke === 7 ? "elke week" : k.elke === 14 ? "elke 2 weken" : `elke ${k.elke} dagen`);

export function KlusKiezer({ open, onClose, state, onToast }: { open: boolean; onClose: () => void; state: FamilyState; onToast: (m: string) => void }) {
  const [zoek, setZoek] = useState("");
  const [naam, setNaam] = useState("");
  const [elke, setElke] = useState(1);
  const alle = alleKlussen(state);
  const aantalAan = alle.filter((k) => klusAan(state, k)).length;
  const q = zoek.trim().toLowerCase();
  const past = (k: Klus) => !q || k.label.toLowerCase().includes(q);
  const zet = (k: Klus, aan: boolean) => samenwerken.setAfspraken((a) => ({ ...a, klussen: { ...(a.klussen ?? {}), [k.id]: { ...(a.klussen?.[k.id] ?? {}), aan } } }));
  const eigen = alle.filter((k) => k.eigen && past(k));

  const rij = (k: Klus) => {
    const aan = klusAan(state, k);
    return (
      <div key={k.id} className={`v2-kies-rij${aan ? " is-aan" : ""}`}>
        <span className="v2-kies-emoji" aria-hidden="true">{k.emoji}</span>
        <span className="ff-grow ff-stack-xs">
          <b>{k.label}</b>
          <span className="ff-small ff-muted">{vaak(k)} · {k.minuten} min · vanaf {k.vanaf}{k.perKind ? " · ieder kind" : ""}{k.begeleiding ? " · met een ouder erbij" : ""}</span>
        </span>
        {k.eigen && <button className="ff-link ff-small" onClick={() => { samenwerken.verwijderEigenTaak(k.id); onToast(`${k.label} weggehaald`); }}>Weghalen</button>}
        <button className="ff-schakel" role="switch" aria-checked={aan} aria-label={`${k.label} ${aan ? "aan" : "uit"}`} onClick={() => { zet(k, !aan); onToast(aan ? `${k.label} staat uit` : `${k.label} doet mee`); }}><i /></button>
      </div>
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="Klussen kiezen">
      <div className="ff-stack-s v2-kiezer">
        <h2 className="ff-h2">Klussen kiezen</h2>
        <span className="ff-small ff-muted">Zet aan wat bij jullie past. {aantalAan} {aantalAan === 1 ? "klus doet" : "klussen doen"} nu mee. De app verdeelt ze eerlijk, naar tijd.</span>
        <label className="ff-field"><span className="ff-eyebrow">Zoeken</span><input value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Bijv. was, hond, wc" aria-label="Klus zoeken" /></label>

        <section className="ff-card ff-stack-s v2-eigen-klus" aria-label="Zelf een klus toevoegen">
          <b>Zelf een klus toevoegen</b>
          <label className="ff-field"><span className="ff-eyebrow">Wat moet er gebeuren?</span><input value={naam} onChange={(e) => setNaam(e.target.value)} maxLength={40} placeholder="Bijv. vissen voeren" aria-label="Naam van de klus" /></label>
          <div className="ff-chips">{HOE_VAAK.map((h) => <button key={h.elke} className="ff-chip" aria-pressed={elke === h.elke} onClick={() => setElke(h.elke)}>{h.label}</button>)}</div>
          <button className="ff-btn ff-btn-primary ff-btn-s" disabled={!naam.trim()} onClick={() => { samenwerken.eigenTaak({ label: naam.trim(), emoji: "📌", elke, minuten: 10, vanaf: 8, xp: 5 }); onToast(`${naam.trim()} toegevoegd`); setNaam(""); }}>Toevoegen</button>
        </section>

        {eigen.length > 0 && (
          <section className="ff-stack-xs" aria-label="Zelf toegevoegd">
            <b>📌 Zelf toegevoegd</b>
            {eigen.map(rij)}
          </section>
        )}
        {KLUS_GROEPEN.map((g) => {
          const lijst = alle.filter((k) => !k.eigen && k.groep === g.id && past(k));
          if (!lijst.length) return null;
          const aan = lijst.filter((k) => klusAan(state, k)).length;
          return (
            <section key={g.id} className="ff-stack-xs" aria-label={g.label}>
              <b>{g.emoji} {g.label} <span className="ff-small ff-muted">{aan ? `${aan} aan` : ""}</span></b>
              {lijst.map(rij)}
            </section>
          );
        })}
        {q && !alle.some(past) && <span className="ff-small ff-muted">Niks gevonden. Voeg hem hierboven zelf toe.</span>}
        <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={onClose}>Klaar</button>
      </div>
    </Sheet>
  );
}
