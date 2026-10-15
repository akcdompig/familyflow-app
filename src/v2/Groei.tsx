"use client";

import { useState } from "react";
import { VAARDIGHEDEN, geoefend, oefeningen, vaardigheid, weekVan } from "@/lib/samen";
import { samenwerken } from "@/lib/samenwerken";
import type { FamilyState, Member } from "@/lib/types";

/*
  Groeidoelen: 1 of 2 vaardigheden om te oefenen, samen met een ouder gekozen.
  Concreet per leeftijd. Wat je in de app doet telt vanzelf als oefenen. Elke week een korte terugblik.
  Geen cijfers, geen vergelijking met broers of zussen, en "nog lastig" is een prima antwoord.
*/

const HOE = [
  { id: "goed", label: "Lukte goed", emoji: "🌟" },
  { id: "beter", label: "Ging beter", emoji: "📈" },
  { id: "lastig", label: "Nog lastig", emoji: "🌱" },
] as const;

export function Groei({ state, lid, me, onToast, compact = false }: { state: FamilyState; lid: Member; me: Member; onToast: (m: string) => void; compact?: boolean }) {
  const [kiezen, setKiezen] = useState(false);
  const mag = me.id === lid.id || me.role === "ouder";
  const gekozen = state.doelen?.[lid.id]?.vaardigheden ?? [];
  const week = weekVan();
  const tb = state.doelen?.[lid.id]?.terugblik?.[week] ?? {};
  const zelf = me.id === lid.id;

  if (kiezen || (!gekozen.length && mag && !compact)) {
    return (
      <section className="ff-card ff-stack-s" aria-label="Groeidoelen kiezen">
        <b>🌱 Waar wil {zelf ? "je" : lid.name} in groeien?</b>
        <span className="ff-small ff-muted">Kies er 1 of 2{zelf ? ", het liefst samen met papa of mama" : ` samen met ${lid.name}`}. Je kunt het altijd aanpassen.</span>
        <div className="v2-groei-keuze">
          {VAARDIGHEDEN.map((v) => {
            const aan = gekozen.includes(v.id);
            return (
              <button key={v.id} className="v2-groei-tegel" aria-pressed={aan} disabled={!mag || (!aan && gekozen.length >= 2)} onClick={() => samenwerken.setDoelen(lid.id, aan ? gekozen.filter((x) => x !== v.id) : [...gekozen, v.id])}>
                <span aria-hidden="true">{v.emoji}</span>
                <b>{v.naam}</b>
              </button>
            );
          })}
        </div>
        {gekozen.length > 0 && <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => { setKiezen(false); onToast("Groeidoelen gekozen 🌱"); }}>Klaar</button>}
      </section>
    );
  }
  if (!gekozen.length) {
    return compact ? <span className="ff-small ff-muted">Nog geen groeidoelen gekozen.{mag ? " " : ""}{mag && <button className="ff-link ff-small" onClick={() => setKiezen(true)}>Samen kiezen</button>}</span> : null;
  }

  return (
    <section className={`${compact ? "" : "ff-card "}ff-stack-s`} aria-label="Groeidoelen">
      <div className="ff-row">
        <b className="ff-grow">🌱 {zelf ? "Mijn groeidoelen" : `Groeidoelen van ${lid.name}`}</b>
        {mag && <button className="ff-link ff-small" onClick={() => setKiezen(true)}>Aanpassen</button>}
      </div>
      {gekozen.map((id) => {
        const v = vaardigheid(id);
        if (!v) return null;
        const bewijs = geoefend(state, lid.id, id);
        return (
          <div key={id} className="v2-groei">
            <b>{v.emoji} {v.naam}</b>
            {!compact && (
              <ul className="v2-groei-tips">
                {oefeningen(v, lid).map((t) => <li key={t}>{t}</li>)}
              </ul>
            )}
            <span className="ff-small">{bewijs.length ? `Deze week geoefend: ${[...new Set(bewijs)].slice(0, 3).join(" · ")}${bewijs.length > 3 ? ` (+${bewijs.length - 3})` : ""}` : <span className="ff-muted">Deze week nog niks gezien. Komt vanzelf.</span>}</span>
            <div className="v2-groei-hoe" role="group" aria-label={`Hoe ging ${v.naam.toLowerCase()} deze week?`}>
              {HOE.map((h) => (
                <button key={h.id} className="ff-chip" aria-pressed={tb[id] === h.id} disabled={!mag} onClick={() => { samenwerken.terugblik(lid.id, week, id, h.id); onToast(h.id === "lastig" ? "Eerlijk! Dat is ook groeien 🌱" : "Top 🌟"); }}>
                  {h.emoji} {h.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
