"use client";

import { useState } from "react";
import { euro, minimumloonVoor, uurloonVan, urenWerk } from "@/lib/geld";
import { APPARATEN, PRIJS, VASTE_LASTEN, apparaatCo2, apparaatKost, douchen, getal, doucheMinuut, prijsTekst, urenPerMaand, vasteLastenTotaal } from "@/lib/thuiskosten";
import type { FamilyState, Member } from "@/lib/types";

/*
  3.22 Zuinig thuis. Laat zien dat douchen, apparaten en een eigen huis geld kosten, en wat het milieu ervan merkt (liters water, kg CO2).
  Rekent met de prijzen van nu (zie thuiskosten.ts). Waar het kan ook in uren werk, met je eigen uurloon.
*/

export function WatKostThuis({ state, lid }: { state: FamilyState; lid: Member }) {
  const [min, setMin] = useState(10);
  const [gezin, setGezin] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const personen = gezin ? state.members.length : 1;
  const d = douchen(min, personen);
  const minder = douchen(2, personen);
  const korter = minder.jaar;
  const uurloon = uurloonVan(state, lid.id) ?? minimumloonVoor(lid.age);
  const totaal = vasteLastenTotaal();
  const min21 = minimumloonVoor(21)!;

  return (
    <>
      <section className="v2-zuinig-kop">
        <h2 className="ff-h2">Zuinig thuis en goed voor het milieu</h2>
        <span className="ff-small ff-muted">Minder water, minder stroom, minder CO₂. En meer geld over.</span>
      </section>
      <section className="ff-card ff-stack-s" aria-label="Douchen">
        <b>🚿 Douchen: geld en milieu</b>
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
        <div className="v2-geld-baan">
          <span className="ff-stat"><span>water per jaar</span><b>{getal(d.liter)} L</b></span>
          <span className="ff-stat"><span>CO₂ per jaar</span><b>{getal(d.co2)} kg</b></span>
        </div>
        <span className="ff-small v2-geld-tip">🌱 Elke dag 2 minuten korter scheelt {gezin ? "het gezin" : "jou"} per jaar {getal(minder.liter)} liter water, {getal(minder.co2)} kg CO₂ en {euro(korter)}.{urenWerk(korter, uurloon) ? ` Dat geld is ${urenWerk(korter, uurloon)}.` : ""}</span>
      </section>

      <section className="ff-card ff-stack-s" aria-label="Apparaten">
        <b>🔌 Apparaten: geld en milieu</b>
        <span className="ff-small ff-muted">Stroom kost nu ongeveer {euro(Math.round(PRIJS.stroom * 100))} per kWh. Tik voor een tip.</span>
        <ul className="v2-geld-lijst">
          {APPARATEN.map((a) => (
            <li key={a.id} className="v2-geld-app">
              <button className="v2-lid-item" aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)}>
                <span aria-hidden="true">{a.emoji}</span>
                <span className="ff-grow">{a.naam}<span className="ff-block ff-small ff-muted">elke dag = {prijsTekst(apparaatKost(a, 365))} en {getal(apparaatCo2(a, 365))} kg CO₂ per jaar</span></span>
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

      <p className="ff-small ff-muted">Prijzen oktober 2026: gas {euro(Math.round(PRIJS.gas * 100))} per m³, stroom {euro(Math.round(PRIJS.stroom * 100))} per kWh, water {euro(Math.round(PRIJS.water * 100))} per m³. CO₂: aardgas 2,13 kg per m³, stroom 0,33 kg per kWh. Bronnen: Milieu Centraal, Vitens, Nibud, co2emissiefactoren.nl.</p>
    </>
  );
}
