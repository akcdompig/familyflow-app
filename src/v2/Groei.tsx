"use client";

import { useState } from "react";
import { VAARDIGHEDEN, oefeningen, vaardigheid, weekVan } from "@/lib/samen";
import { bewijzen } from "@/lib/groei";
import { iso } from "@/lib/planner";
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
  const mag = me.id === lid.id || me.role === "ouder";
  const gekozen = state.doelen?.[lid.id]?.vaardigheden ?? [];
  const [kiezen, setKiezen] = useState(false);
  const week = weekVan();
  const tb = state.doelen?.[lid.id]?.terugblik?.[week] ?? {};
  const zelf = me.id === lid.id;

  if (kiezen) {
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
    if (compact) return <span className="ff-small ff-muted">Nog geen groeidoelen gekozen.{mag ? " " : ""}{mag && <button className="ff-link ff-small" onClick={() => setKiezen(true)}>Samen kiezen</button>}</span>;
    // Eén rustige knop in plaats van meteen 10 tegels.
    return mag ? (
      <section className="ff-card ff-row" aria-label="Groeidoel">
        <span className="ff-grow"><b>🌱 Groeidoel</b><span className="ff-small ff-muted ff-block">Eén ding om te oefenen. Kies het samen.</span></span>
        <button className="ff-btn ff-btn-ghost ff-btn-sm" onClick={() => setKiezen(true)}>Kies een groeidoel</button>
      </section>
    ) : null;
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
        const bewijs = bewijzen(state, lid.id, week, iso(new Date())).filter((b) => b.competentie === id).map((b) => b.tekst);
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
