"use client";

import { useState } from "react";
import { euro, minimumloonVoor, uurloonVan, urenWerk } from "@/lib/geld";
import { APPARATEN, PRIJS, VASTE_LASTEN, apparaatKost, douchen, doucheMinuut, prijsTekst, urenPerMaand, vasteLastenTotaal } from "@/lib/thuiskosten";
import type { FamilyState, Member } from "@/lib/types";

/*
  3.22 Wat kost thuis? Laat zien dat douchen, apparaten en een eigen huis echt geld kosten.
  Rekent met de prijzen van nu (zie thuiskosten.ts). Waar het kan ook in uren werk, met je eigen uurloon.
*/

export function WatKostThuis({ state, lid }: { state: FamilyState; lid: Member }) {
  const [min, setMin] = useState(10);
  const [gezin, setGezin] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const personen = gezin ? state.members.length : 1;
  const d = douchen(min, personen);
  const korter = douchen(2, personen).jaar;
  const uurloon = uurloonVan(state, lid.id) ?? minimumloonVoor(lid.age);
  const totaal = vasteLastenTotaal();
  const min21 = minimumloonVoor(21)!;

  return (
    <>
      <section className="ff-card ff-stack-s" aria-label="Douchen">
        <b>🚿 Wat kost douchen?</b>
        <span className="ff-small ff-muted">Warm water kost gas én water. Eén minuut douchen kost ongeveer {euro(Math.round(doucheMinuut()))}.</span>
        <label className="ff-field">
          <span className="ff-eyebrow">Zo lang douche {gezin ? "iedereen" : "ik"}: {min} minuten</span>
          <input type="range" min={3} max={20} value={min} onChange={(e) => setMin(Number(e.target.value))} aria-label="Minuten douchen" />
        </label>
        <div className="ff-chips">
          <button className="ff-chip" aria-pressed={!gezin} onClick={() => setGezin(false)}>Alleen ik</button>
          <button className="ff-chip" aria-pressed={gezin} onClick={() => setGezin(true)}>Hele gezin ({state.members.length})</button>
        </div>
        <div className="v2-geld-baan">
          <span className="ff-stat"><span>per keer</span><b>{euro(Math.round(doucheMinuut() * min))}</b></span>
          <span className="ff-stat"><span>per maand</span><b>{euro(d.maand)}</b></span>
          <span className="ff-stat"><span>per jaar</span><b>{euro(d.jaar)}</b></span>
        </div>
        <span className="ff-small v2-geld-tip">💡 Elke dag 2 minuten korter scheelt {gezin ? "het gezin" : "jou"} {euro(korter)} per jaar.{urenWerk(korter, uurloon) ? ` Dat is ${urenWerk(korter, uurloon)}.` : ""}</span>
      </section>

      <section className="ff-card ff-stack-s" aria-label="Apparaten">
        <b>🔌 Wat kosten apparaten?</b>
        <span className="ff-small ff-muted">Stroom kost nu ongeveer {euro(Math.round(PRIJS.stroom * 100))} per kWh. Tik voor een tip.</span>
        <ul className="v2-geld-lijst">
          {APPARATEN.map((a) => (
            <li key={a.id} className="v2-geld-app">
              <button className="v2-lid-item" aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)}>
                <span aria-hidden="true">{a.emoji}</span>
                <span className="ff-grow">{a.naam}<span className="ff-block ff-small ff-muted">elke dag = {prijsTekst(apparaatKost(a, 365))} per jaar</span></span>
                <b>{prijsTekst(apparaatKost(a))}<span className="ff-small ff-muted"> /{a.per}</span></b>
              </button>
              {open === a.id && a.tip && <span className="ff-small v2-geld-tip">{a.tip}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="ff-card ff-stack-s" aria-label="Straks op jezelf">
        <b>🏠 Straks op jezelf: wat kost dat per maand?</b>
        <span className="ff-small ff-muted">Een eenvoudig huishouden voor één persoon, in een huurhuis (Nibud).</span>
        <ul className="v2-geld-lijst">
          {VASTE_LASTEN.map((l) => (
            <li key={l.id}>
              <span aria-hidden="true">{l.emoji}</span>
              <span className="ff-grow">{l.naam}{l.uitleg && <span className="ff-block ff-small ff-muted">{l.uitleg}</span>}</span>
              <b>{euro(l.cents)}</b>
            </li>
          ))}
          <li className="v2-geld-totaal"><span aria-hidden="true">🧮</span><b className="ff-grow">Samen per maand</b><b>{euro(totaal)}</b></li>
        </ul>
        {uurloon && <span className="ff-small v2-geld-tip">⏱️ Met {uurloonVan(state, lid.id) ? "jouw uurloon" : `het minimumloon voor ${lid.age} jaar`} ({euro(uurloon)}) moet je {urenPerMaand(totaal, uurloon)} uur per maand werken om dit te betalen. Een volle baan is ongeveer 156 uur.</span>}
        <span className="ff-small ff-muted">Vanaf 21 is het minimumloon {euro(min21)} per uur: dan is het {urenPerMaand(totaal, min21)} uur per maand. Daarom loont een diploma, en sparen voordat je op jezelf gaat. Bedragen zijn bruto en een schatting.</span>
      </section>

      <p className="ff-small ff-muted">Prijzen oktober 2026: gas {euro(Math.round(PRIJS.gas * 100))} per m³, stroom {euro(Math.round(PRIJS.stroom * 100))} per kWh, water {euro(Math.round(PRIJS.water * 100))} per m³. Bronnen: Milieu Centraal, Vitens, Nibud.</p>
    </>
  );
}
