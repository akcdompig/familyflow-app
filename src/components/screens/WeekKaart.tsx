"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import { addDays, iso } from "@/lib/planner";
import { maandag } from "@/lib/huis";
import { eerdereWeken, tredenVan, weekKaart, type WeekKaart as Kaart } from "@/lib/week";
import type { FamilyState, Member, WeekTrede } from "@/lib/types";

/*
  Weekkaart met weekbonus (3.10).
  - Zakgeld krijg je altijd. Het staat erbij zodat je ziet dat het niet van de week afhangt.
  - De bonus komt erbovenop, in hooguit twee vaste treden (bijv. 70% → € 2,50, 85% → € 5).
  - Je ziet steeds hoeveel vinkjes je nog nodig hebt voor de volgende trede. Geen bedrag per vinkje.
  - Zondag sluit een ouder de week af. Dan staat vast wat je krijgt, en de ouder vinkt aan als het betaald is.
*/

const datumKort = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
const vinkjes = (n: number) => `${n} ${n === 1 ? "vinkje" : "vinkjes"}`;
const watOf = (t: WeekTrede) => t.wat || "de bonus";

function Balk({ pct, treden }: { pct: number; treden: WeekTrede[] }) {
  return (
    <span className="v2-weekbalk" aria-hidden="true">
      <i style={{ width: `${Math.min(100, pct)}%` }} />
      {treden.map((t) => <b key={t.pct} style={{ left: `${t.pct}%` }} />)}
    </span>
  );
}

/** Eén zin: hoe staat de bonus ervoor? */
export function bonusZin(k: Kaart): string {
  if (k.gesloten) return k.gesloten.gehaald ? `Week afgesloten: ${k.gesloten.beloning ?? "gehaald"} 🎉` : "Week afgesloten";
  if (k.behaald < 0) {
    const t = k.treden[0];
    return t ? `Nog ${vinkjes(k.volgende?.nog ?? 0)} tot ${watOf(t)}` : `Je week: ${k.pct}%`;
  }
  const binnen = watOf(k.treden[k.behaald]);
  return k.volgende ? `${binnen} binnen! Nog ${vinkjes(k.volgende.nog)} tot ${watOf(k.volgende)}` : `🏁 ${binnen} gehaald!`;
}

/** Eén regel op Vandaag (kinderen): hoe staat je week ervoor? Tik = naar Week. */
export function WeekRegel({ state, me, onWeek }: { state: FamilyState; me: Member; onWeek: () => void }) {
  const k = weekKaart(state, me.id);
  if (!k.totaal && !k.gesloten) return null;
  const heeftBonus = k.treden.some((t) => t.wat);
  return (
    <button className="v2-weekregel" onClick={onWeek} aria-label={`${heeftBonus ? bonusZin(k) : `Je week: ${k.pct}%`}. Bekijk de week`}>
      <span aria-hidden="true">🗓️</span>
      <b className="ff-grow">{heeftBonus ? bonusZin(k) : `Je week: ${k.pct}% gedaan`}</b>
      <span aria-hidden="true">›</span>
    </button>
  );
}

/** Kort, voor kinderen (bovenaan Week): hoe staat mijn week en mijn bonus ervoor? */
export function MijnWeekKort({ state, me, startOpen = false }: { state: FamilyState; me: Member; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const k = weekKaart(state, me.id);
  if (!k.totaal && !k.gesloten) return null;
  const klaar = !!k.gesloten || (k.behaald >= 0 && !k.volgende);
  return (
    <section className={`ff-card v2-mijnweek-kort${klaar ? " is-gehaald" : ""}`} aria-label="Mijn week">
      <button className="v2-mijnweek-knop" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ff-grow ff-stack-xs" style={{ textAlign: "left" }}>
          <b>{bonusZin(k)}</b>
          <span className="ff-small ff-muted">
            {k.pct}% gedaan{k.dagenGoed > 0 ? ` · ${k.dagenGoed} ${k.dagenGoed === 1 ? "dag" : "dagen"} helemaal af` : ""}
            {k.gesloten && k.gesloten.gehaald ? (k.gesloten.betaald ? " · uitbetaald ✓" : " · nog uit te betalen") : ""}
          </span>
        </span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      <Balk pct={k.pct} treden={k.treden} />
      {k.zakgeld && <span className="ff-small v2-zakgeld">💰 Zakgeld {k.zakgeld}: krijg je altijd. De bonus komt erbovenop.</span>}
      {open && (
        <>
          <Treden k={k} />
          <WeekDetails k={k} />
          <Eerder state={state} kind={me} />
        </>
      )}
    </section>
  );
}

/** De treden van de bonus, met wat al binnen is. */
function Treden({ k }: { k: Kaart }) {
  if (!k.treden.some((t) => t.wat)) return null;
  return (
    <ul className="v2-treden" aria-label="Weekbonus">
      {k.treden.map((t, i) => {
        const binnen = k.gesloten ? k.gesloten.trede !== undefined && i <= k.gesloten.trede : i <= k.behaald;
        return (
          <li key={t.pct} className={binnen ? "is-binnen" : ""}>
            <span aria-hidden="true">{binnen ? "✅" : "⬜"}</span>
            <span className="ff-grow">vanaf {t.pct}%</span>
            <b>{watOf(t)}</b>
          </li>
        );
      })}
    </ul>
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
      <li className="ff-small ff-muted">Overgeslagen en "ging niet door" tellen niet mee.</li>
    </ul>
  );
}

/** Eerdere weken: wat er gehaald en uitbetaald is. Eerlijk en terug te kijken. */
function Eerder({ state, kind, ouder = false }: { state: FamilyState; kind: Member; ouder?: boolean }) {
  const lijst = eerdereWeken(state, kind.id).filter((w) => w.maandag !== maandag(iso(new Date())));
  if (!lijst.length) return null;
  return (
    <div className="ff-stack-xs" aria-label="Eerdere weken">
      <b className="ff-small">Eerdere weken</b>
      <ul className="v2-weekregels">
        {lijst.map((w) => (
          <li key={w.maandag}>
            <span className="ff-grow">vanaf {datumKort(w.maandag)} · {w.pct}%</span>
            <b>{w.gehaald ? w.beloning ?? "gehaald" : "geen bonus"}</b>
            {w.gehaald && (ouder
              ? <button className={`v2-betaald${w.betaald ? " is-betaald" : ""}`} aria-pressed={!!w.betaald} onClick={() => actions.weekUitbetaald(kind.id, w.maandag, !w.betaald)}>{w.betaald ? "betaald ✓" : "betaald?"}</button>
              : <span className="ff-small ff-muted">{w.betaald ? " ✓" : " nog niet"}</span>)}
          </li>
        ))}
      </ul>
    </div>
  );
}

const SNEL = ["€ 2,50", "€ 5", "Film kiezen", "Uur later naar bed", "Kiezen wat we eten"];

/** Voor ouders, bij een kind: de week, de bonus, afsluiten en uitbetalen. Ook de vorige week als die nog open staat. */
export function WeekOuder({ state, kind, me, onToast }: { state: FamilyState; kind: Member; me: Member; onToast: (m: string) => void }) {
  const nu = new Date();
  const dezeMa = maandag(iso(nu));
  const vorigeMa = addDays(dezeMa, -7);
  const vorige = weekKaart(state, kind.id, new Date(addDays(dezeMa, -1) + "T20:00:00"), vorigeMa);
  const deze = weekKaart(state, kind.id, nu, dezeMa);
  const huidig = tredenVan(state, kind.id);
  const [instellen, setInstellen] = useState(false);
  const [t1, setT1] = useState<WeekTrede>(huidig[0] ?? { pct: 70, wat: "" });
  const [t2, setT2] = useState<WeekTrede | null>(huidig[1] ?? null);
  const [zakgeld, setZakgeld] = useState(state.weekAfspraak?.[kind.id]?.zakgeld ?? "");
  const [sluit, setSluit] = useState<string | null>(null);
  const zondag = nu.getDay() === 0;

  const blok = (k: Kaart, titel: string, magSluiten: boolean) => (
    <div className="ff-stack-xs" key={k.maandag}>
      <div className="ff-row"><b className="ff-grow">{titel}</b><span className="ff-small ff-muted">{k.pct}% · {k.dagenGoed}/{k.dagen} dagen goed</span></div>
      <Balk pct={k.pct} treden={k.treden} />
      <span className="ff-small">{bonusZin(k)}</span>
      <details className="v2-week-details"><summary className="ff-small">Wat telt er mee?</summary><WeekDetails k={k} /></details>
      {k.gesloten ? (
        <div className="ff-row v2-week-dicht">
          <span className="ff-small ff-grow">🔒 Afgesloten op {datumKort(k.gesloten.at.slice(0, 10))}: {k.gesloten.gehaald ? `${k.gesloten.beloning ?? "gehaald"} (${k.gesloten.pct}%)` : `geen bonus (${k.gesloten.pct}%)`}</span>
          {k.gesloten.gehaald && <button className={`v2-betaald${k.gesloten.betaald ? " is-betaald" : ""}`} aria-pressed={!!k.gesloten.betaald} onClick={() => { actions.weekUitbetaald(kind.id, k.maandag, !k.gesloten!.betaald); if (!k.gesloten!.betaald) onToast("Genoteerd als uitbetaald"); }}>{k.gesloten.betaald ? "Uitbetaald ✓" : "Uitbetaald?"}</button>}
        </div>
      ) : magSluiten && (sluit !== k.maandag ? (
        <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => setSluit(k.maandag)}>Week afsluiten</button>
      ) : (
        <div className="v2-samen-keuze" role="group" aria-label="Week afsluiten">
          <span className="ff-small">{k.behaald >= 0 ? `${kind.name} haalde ${k.pct}%. Uitbetalen: ${watOf(k.treden[k.behaald])}.` : `${kind.name} haalde ${k.pct}% (nodig: ${k.treden[0]?.pct ?? k.drempel}%). Deze week geen bonus; het zakgeld blijft gewoon.`} Daarna staat het vast.</span>
          <div className="ff-row">
            <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => setSluit(null)}>Nog niet</button>
            <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => { actions.weekAfsluiten(kind.id, me.id, k); setSluit(null); onToast(k.gehaald ? "Week afgesloten 🏁 Vergeet niet uit te betalen" : "Week afgesloten"); }}>Ja, afsluiten</button>
          </div>
        </div>
      ))}
    </div>
  );

  const trede = (t: WeekTrede, zet: (t: WeekTrede) => void, opties: number[], label: string) => (
    <div className="ff-stack-xs v2-trede-instel">
      <span className="ff-small"><b>{label}</b></span>
      <div className="ff-chips">{opties.map((p) => <button key={p} className="ff-chip" aria-pressed={t.pct === p} onClick={() => zet({ ...t, pct: p })}>{p}%</button>)}</div>
      <label className="ff-field"><span className="ff-eyebrow">Wat krijgt {kind.name} dan?</span><input value={t.wat} onChange={(e) => zet({ ...t, wat: e.target.value })} maxLength={60} placeholder="Bijv. € 2,50 of film kiezen" /></label>
      <div className="ff-chips">{SNEL.map((w) => <button key={w} className="ff-chip ff-chip-s" onClick={() => zet({ ...t, wat: w })}>{w}</button>)}</div>
    </div>
  );

  return (
    <section className="ff-card ff-stack-s v2-weekouder" aria-label={`Week van ${kind.name}`} style={{ width: "100%" }}>
      {!instellen ? (
        <button className="ff-link ff-small" onClick={() => setInstellen(true)}>
          Weekbonus: {huidig.map((t) => `${t.pct}% → ${watOf(t)}`).join(" · ")}{state.weekAfspraak?.[kind.id]?.zakgeld ? ` · zakgeld ${state.weekAfspraak[kind.id].zakgeld}` : ""} · aanpassen
        </button>
      ) : (
        <div className="ff-stack-s v2-samen-keuze">
          <b>Weekbonus voor {kind.name}</b>
          <span className="ff-small ff-muted">Zakgeld krijgt {kind.name} altijd. De bonus komt erbovenop, voor de hele week samen. Geen bedrag per vinkje: zo wordt het een routine, geen onderhandeling.</span>
          <label className="ff-field"><span className="ff-eyebrow">Vast zakgeld per week (optioneel, alleen ter info)</span><input value={zakgeld} onChange={(e) => setZakgeld(e.target.value)} maxLength={30} placeholder="Bijv. € 5" /></label>
          {trede(t1, setT1, [60, 70, 75, 80], "Trede 1: vanaf hoeveel procent?")}
          {t2 ? (
            <>
              {trede(t2, (x) => setT2(x), [80, 85, 90, 100].filter((p) => p > t1.pct), "Trede 2: vanaf hoeveel procent?")}
              <button className="ff-link ff-small" onClick={() => setT2(null)}>Alleen één trede</button>
            </>
          ) : (
            <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => setT2({ pct: Math.max(85, t1.pct + 5), wat: "" })}>+ Tweede trede (bijv. 85% → hele bonus)</button>
          )}
          <div className="ff-row">
            <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => setInstellen(false)}>Annuleren</button>
            <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => { actions.setWeekAfspraak(kind.id, t2 && t2.pct > t1.pct ? [t1, t2] : [t1], zakgeld); setInstellen(false); onToast("Weekbonus opgeslagen"); }}>Opslaan</button>
          </div>
        </div>
      )}
      {vorige.totaal > 0 && !vorige.gesloten && blok(vorige, `Vorige week (vanaf ${datumKort(vorigeMa)})`, true)}
      {blok(deze, "Deze week", zondag)}
      {!zondag && !deze.gesloten && <span className="ff-small ff-muted">Afsluiten kan op zondag, bij het weekoverleg.</span>}
      <Eerder state={state} kind={kind} ouder />
    </section>
  );
}
