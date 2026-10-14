"use client";

import { useEffect, useState } from "react";
import { RUST_OPTIES, STOPLICHT, type Licht } from "@/lib/methodiek";

/** Het stoplichtmodel: rood, oranje of groen. Zelfde model in de hele app. */
export function StoplichtKiezer({ value, onPick, kort = false }: { value?: Licht | null; onPick: (l: Licht) => void; kort?: boolean }) {
  return (
    <div className="ff-stack-s" role="group" aria-label="Hoe hoog is de spanning?">
      {(["rood", "oranje", "groen"] as Licht[]).map((l) => (
        <button key={l} className={`ff-licht ff-licht-${l}`} aria-pressed={value === l} onClick={() => onPick(l)}>
          <span className="ff-licht-dot" />
          <span className="ff-grow">
            <b>{l[0].toUpperCase() + l.slice(1)}: {STOPLICHT[l].titel.toLowerCase()}</b>
            {!kort && <><br /><span className="ff-small">{STOPLICHT[l].signalen.slice(0, 3).join(" · ")}</span></>}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Rustig worden: altijd een keuze, nooit verplicht. Ademen met de app is één van de opties. */
export function RustKeuze({ onDone, extra = [], knop = "Ik ben rustiger, verder" }: { onDone: () => void; extra?: string[]; knop?: string }) {
  const [keuze, setKeuze] = useState("");
  const [adem, setAdem] = useState(0);
  useEffect(() => {
    if (adem <= 0) return;
    const t = window.setTimeout(() => setAdem((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [adem]);
  const opties = [...extra, ...RUST_OPTIES.map((r) => r.label)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);
  return (
    <section className="ff-card ff-stack-s ff-calm">
      <b>Eerst rust. Je hoeft nu niks op te lossen.</b>
      <p className="ff-small">Bij rood denk je minder helder. Dat geldt voor iedereen. Wat helpt jou nu?</p>
      <div className="ff-chips">
        {opties.map((o) => (
          <button key={o} className="ff-chip" aria-pressed={keuze === o} onClick={() => { setKeuze(o); setAdem(o === "Ademhalen met de app" ? 30 : 0); }}>{o}</button>
        ))}
      </div>
      {adem > 0 && (
        <>
          <p className="ff-small">4 tellen in, 4 tellen uit. Stoppen mag altijd.</p>
          <div className="ff-breath"><span>{adem}</span></div>
        </>
      )}
      {keuze && keuze !== "Ademhalen met de app" && <p className="ff-small">Neem er de tijd voor. Kom terug als je weer op oranje of groen zit.</p>}
      <button className="ff-btn ff-btn-ghost" onClick={onDone}>{knop}</button>
    </section>
  );
}

export const lichtNaarGetal = (l: Licht) => (l === "rood" ? 8 : l === "oranje" ? 5 : 3);
