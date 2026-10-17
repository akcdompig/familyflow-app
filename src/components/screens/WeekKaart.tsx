"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import { addDays, iso } from "@/lib/planner";
import { maandag } from "@/lib/huis";
import { STANDAARD_DREMPEL, weekKaart, type WeekKaart as Kaart } from "@/lib/week";
import type { FamilyState, Member } from "@/lib/types";

/*
  Weekkaart: aan het eind van de week kun je zeggen "ik heb het gedaan, en dit is het resultaat".
  Punten en geld los van elkaar: de weekafspraak is vooraf en vast, geen bedrag per vinkje.
*/

const datumKort = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

function Balk({ pct, drempel }: { pct: number; drempel: number }) {
  return (
    <span className="v2-weekbalk" aria-hidden="true">
      <i style={{ width: `${Math.min(100, pct)}%` }} />
      <b style={{ left: `${drempel}%` }} />
    </span>
  );
}

/** Kort, bovenaan Vandaag voor kinderen: hoe staat mijn week ervoor? Tik voor de hele kaart. */
export function MijnWeekKort({ state, me, startOpen = false }: { state: FamilyState; me: Member; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const k = weekKaart(state, me.id);
  if (!k.totaal) return null;
  const nog = Math.max(0, Math.ceil((k.drempel / 100) * k.totaal) - k.af);
  return (
    <section className={`ff-card v2-mijnweek-kort${k.gehaald ? " is-gehaald" : ""}`} aria-label="Mijn week">
      <button className="v2-mijnweek-knop" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ff-grow ff-stack-xs" style={{ textAlign: "left" }}>
          {/* Positief geformuleerd: wat je nog nodig hebt, niet hoeveel dagen "mislukt" zijn. De week loopt nog. */}
          <b>{k.gesloten ? (k.gesloten.gehaald ? "🏁 Week gehaald!" : "Week afgesloten") : k.gehaald ? "🏁 Je week is gehaald!" : `Je week: nog ${nog} ${nog === 1 ? "vinkje" : "vinkjes"} tot je doel`}</b>
          <span className="ff-small ff-muted">{k.pct}% gedaan{k.dagenGoed > 0 ? ` · ${k.dagenGoed} ${k.dagenGoed === 1 ? "dag" : "dagen"} helemaal af` : ""}{k.beloning ? ` · ${k.beloning}` : ""}</span>
        </span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      <Balk pct={k.pct} drempel={k.drempel} />
      {open && <WeekDetails k={k} />}
    </section>
  );
}

function WeekDetails({ k }: { k: Kaart }) {
  const r = (l: string, a: number, t: number) => <li key={l}><span className="ff-grow">{l}</span><b>{a} van {t}</b></li>;
  return (
    <ul className="v2-weekregels">
      {k.huistaken.totaal > 0 && r("🧹 Huistaken", k.huistaken.af, k.huistaken.totaal)}
      {k.taken.totaal > 0 && r("✅ Taken", k.taken.af, k.taken.totaal)}
      {k.routine.totaal > 0 && r("🚿 Ochtendroutine (dagen)", k.routine.af, k.routine.totaal)}
      {r("🎯 Oefeningen", Math.min(k.oefeningen.af, k.oefeningen.doel), k.oefeningen.doel)}
      <li><span className="ff-grow">💞 Samen gedaan</span><b>{k.samen}×</b></li>
      <li className="ff-small ff-muted">Overgeslagen en "ging niet door" tellen niet mee. Week gehaald vanaf {k.drempel}%.</li>
    </ul>
  );
}

/** Voor ouders, bij een kind: de week, de afspraak, en afsluiten. Ook de vorige week als die nog open staat. */
export function WeekOuder({ state, kind, me, onToast }: { state: FamilyState; kind: Member; me: Member; onToast: (m: string) => void }) {
  const nu = new Date();
  const dezeMa = maandag(iso(nu));
  const vorigeMa = addDays(dezeMa, -7);
  const vorige = weekKaart(state, kind.id, new Date(addDays(dezeMa, -1) + "T20:00:00"), vorigeMa);
  const deze = weekKaart(state, kind.id, nu, dezeMa);
  const [instellen, setInstellen] = useState(false);
  const [drempel, setDrempel] = useState(state.weekAfspraak?.[kind.id]?.drempel ?? STANDAARD_DREMPEL);
  const [beloning, setBeloning] = useState(state.weekAfspraak?.[kind.id]?.beloning ?? "");
  const [sluit, setSluit] = useState<string | null>(null);
  const zondag = nu.getDay() === 0;
  const blok = (k: Kaart, titel: string, magSluiten: boolean) => (
    <div className="ff-stack-xs" key={k.maandag}>
      <div className="ff-row"><b className="ff-grow">{titel}</b><span className="ff-small ff-muted">{k.pct}% · {k.dagenGoed}/{k.dagen} dagen goed</span></div>
      <Balk pct={k.pct} drempel={k.drempel} />
      <WeekDetails k={k} />
      {k.gesloten ? (
        <span className="ff-small v2-week-dicht">🔒 Afgesloten op {datumKort(k.gesloten.at.slice(0, 10))}: {k.gesloten.gehaald ? `gehaald (${k.gesloten.pct}%)${k.gesloten.beloning ? ` · ${k.gesloten.beloning}` : ""}` : `niet gehaald (${k.gesloten.pct}%)`}</span>
      ) : magSluiten && (sluit !== k.maandag ? (
        <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => setSluit(k.maandag)}>Week afsluiten</button>
      ) : (
        <div className="v2-samen-keuze" role="group" aria-label="Week afsluiten">
          <span className="ff-small">{k.gehaald ? `Gehaald: ${k.pct}%${k.beloning ? `. ${kind.name} krijgt: ${k.beloning}` : ""}.` : `Niet gehaald: ${k.pct}% (nodig: ${k.drempel}%).`} Daarna staat het vast en kan er niks meer worden afgevinkt voor deze week.</span>
          <div className="ff-row">
            <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => setSluit(null)}>Nog niet</button>
            <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => { actions.weekAfsluiten(kind.id, me.id, k); setSluit(null); onToast(k.gehaald ? `Week afgesloten: gehaald 🏁` : "Week afgesloten"); }}>Ja, afsluiten</button>
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <section className="ff-card ff-stack-s v2-weekouder" aria-label={`Week van ${kind.name}`} style={{ width: "100%" }}>
      {vorige.totaal > 0 && !vorige.gesloten && blok(vorige, `Vorige week (vanaf ${datumKort(vorigeMa)})`, true)}
      {blok(deze, "Deze week", zondag)}
      {!zondag && !deze.gesloten && <span className="ff-small ff-muted">Afsluiten kan op zondag, bij het weekoverleg.</span>}
      {!instellen ? (
        <button className="ff-link ff-small" onClick={() => setInstellen(true)}>Weekafspraak: gehaald vanaf {deze.drempel}%{deze.beloning ? ` · ${deze.beloning}` : ""} · aanpassen</button>
      ) : (
        <div className="ff-stack-s v2-samen-keuze">
          <span className="ff-small"><b>Vanaf hoeveel procent is de week gehaald?</b></span>
          <div className="ff-chips">{[70, 75, 80, 85, 90].map((p) => <button key={p} className="ff-chip" aria-pressed={drempel === p} onClick={() => setDrempel(p)}>{p}%</button>)}</div>
          <label className="ff-field"><span className="ff-eyebrow">Wat staat er tegenover? (optioneel)</span><input value={beloning} onChange={(e) => setBeloning(e.target.value)} maxLength={60} placeholder="Bijv. € 5 weekgeld, of vrijdag film kiezen" /></label>
          <span className="ff-small ff-muted">Vast voor elke week. Geen bedrag per taak: zo wordt het een routine, geen onderhandeling.</span>
          <div className="ff-row">
            <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => setInstellen(false)}>Annuleren</button>
            <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => { actions.setWeekAfspraak(kind.id, drempel, beloning); setInstellen(false); onToast("Weekafspraak opgeslagen"); }}>Opslaan</button>
          </div>
        </div>
      )}
    </section>
  );
}
