"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import { addDays, iso } from "@/lib/planner";
import { maandag } from "@/lib/huis";
import { afspraakVan } from "@/lib/gedrag";
import { GROEN_PCT, eerdereWeken, tredenVan, weekKaart, type WeekDag, type WeekKaart as Kaart } from "@/lib/week";
import type { FamilyState, Member, WeekTrede } from "@/lib/types";

/*
  Weekkaart, 3.23: groene dagen.
  Voor kinderen (12–17, ook met ADHD) één beeld en één actie:
  - Zeven bolletjes, ma t/m zo. Groen = die dag 80% gedaan (en geen turf). Elke dag begint opnieuw.
  - Eén doel: "Nog 3 groene dagen voor € 2,50". Geen procenten, geen balk met streepjes.
  - Eén actie: "Vandaag nog 2 vinkjes voor een groene dag".
  Ouders zien hetzelfde, plus de details per dag, afsluiten en uitbetalen.
  Zakgeld krijg je altijd; de bonus komt erbovenop.
*/

const datumKort = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
const vinkjes = (n: number) => `${n} ${n === 1 ? "vinkje" : "vinkjes"}`;
const groeneDagen = (n: number) => `${n} groene ${n === 1 ? "dag" : "dagen"}`;
const watOf = (t: WeekTrede) => t.wat || "de bonus";
const DAGNAAM: Record<string, string> = { ma: "maandag", di: "dinsdag", wo: "woensdag", do: "donderdag", vr: "vrijdag", za: "zaterdag", zo: "zondag" };

const KLEUR_TEKST: Record<WeekDag["kleur"], string> = { groen: "groen", bijna: "bijna", grijs: "niet groen", leeg: "niks ingevuld", turf: "turf, niet groen", later: "nog niet" };

/** De zeven bolletjes. Klein = één regel op Vandaag. */
export function DagenRij({ k, klein = false }: { k: Kaart; klein?: boolean }) {
  return (
    <ol className={`v2-dagen${klein ? " is-klein" : ""}`} aria-label={`Deze week: ${groeneDagen(k.groen)}`}>
      {k.week.map((d) => {
        const p = d.totaal ? Math.round((d.af / d.totaal) * 100) : 0;
        return (
          <li key={d.datum} className={`is-${d.kleur}${d.vandaag ? " is-vandaag" : ""}`} aria-label={`${DAGNAAM[d.kort]}: ${d.vandaag && d.kleur !== "groen" && d.kleur !== "turf" ? `vandaag, ${d.af} van ${d.totaal}` : KLEUR_TEKST[d.kleur]}`}>
            <span className="v2-dag-bol" style={d.vandaag && d.kleur !== "groen" && d.kleur !== "turf" ? { ["--p" as string]: `${Math.min(100, (p / GROEN_PCT) * 100)}%` } : undefined} aria-hidden="true">
              {d.kleur === "groen" ? "✓" : d.kleur === "turf" ? "✕" : ""}
            </span>
            {!klein && <small aria-hidden="true">{d.kort}</small>}
          </li>
        );
      })}
    </ol>
  );
}

/** Eén zin over de bonus, in groene dagen. */
export function bonusZin(k: Kaart): string {
  if (k.gesloten) {
    const g = k.gesloten.groen !== undefined ? ` ${groeneDagen(k.gesloten.groen)}.` : "";
    return k.gesloten.gehaald ? `Week klaar:${g} ${k.gesloten.beloning ?? "Bonus"} 🎉` : `Week klaar:${g || " geen bonus."}`;
  }
  if (!k.treden.some((t) => t.wat)) return `${groeneDagen(k.groen)} deze week`;
  if (k.behaald >= 0 && !k.volgende) return `${watOf(k.treden[k.behaald])} binnen 🎉`;
  const v = k.volgende!;
  if (!k.haalbaar) return k.behaald >= 0 ? `${watOf(k.treden[k.behaald])} binnen. Meer zit er deze week niet in.` : `${watOf(v)} lukt deze week niet meer. Maandag begint alles opnieuw.`;
  const voor = `Nog ${groeneDagen(v.nogDagen)} voor ${watOf(v)}`;
  return k.behaald >= 0 ? `${watOf(k.treden[k.behaald])} binnen! ${voor}` : voor;
}

/** Eén zin over vandaag: wat moet je nu doen? */
export function vandaagZin(k: Kaart, kort = false): string | null {
  const d = k.week.find((x) => x.vandaag);
  if (!d || k.gesloten) return null;
  if (d.kleur === "turf") return kort ? "Vandaag een turf. Morgen weer een kans" : "Vandaag een turf: deze dag wordt niet groen. Morgen weer een kans.";
  if (d.kleur === "groen") return d.af < d.totaal ? `Vandaag is groen ✓${kort ? "" : ` (${d.af} van ${d.totaal})`}` : "Vandaag is groen ✓ Alles gedaan!";
  if (!d.totaal) return null;
  return kort ? `Nog ${vinkjes(d.nogVoorGroen ?? 0)} voor een groene dag` : `Vandaag: ${d.af} van ${d.totaal} gedaan. Nog ${vinkjes(d.nogVoorGroen ?? 0)} voor een groene dag`;
}

/** Eén regel op Vandaag (kinderen): de bolletjes en wat je vandaag nog moet doen. Tik = naar Week. */
export function WeekRegel({ state, me, onWeek }: { state: FamilyState; me: Member; onWeek: () => void }) {
  const k = weekKaart(state, me.id);
  if (!k.totaal && !k.gesloten) return null;
  const zin = vandaagZin(k, true) ?? bonusZin(k);
  return (
    <button className="v2-weekregel" onClick={onWeek} aria-label={`${zin}. ${bonusZin(k)}. Bekijk de week`}>
      <DagenRij k={k} klein />
      <b className="ff-grow">{zin}</b>
      <span aria-hidden="true">›</span>
    </button>
  );
}

/** De bonus-treden als twee chips: bij 5 groene dagen € 2,50, bij 6 € 5. */
function Treden({ k }: { k: Kaart }) {
  if (!k.treden.some((t) => t.wat)) return null;
  return (
    <ul className="v2-treden" aria-label="Weekbonus">
      {k.treden.map((t, i) => {
        const binnen = k.gesloten ? k.gesloten.trede !== undefined && i <= k.gesloten.trede : i <= k.behaald;
        return (
          <li key={t.dagen} className={binnen ? "is-binnen" : ""}>
            <span className="v2-trede-bol" aria-hidden="true">{binnen ? "✓" : t.dagen}</span>
            <span className="ff-grow">{groeneDagen(t.dagen!)}</span>
            <b>{watOf(t)}</b>
          </li>
        );
      })}
    </ul>
  );
}

/** Kort, voor kinderen (bovenaan Week). */
export function MijnWeekKort({ state, me }: { state: FamilyState; me: Member }) {
  const [uitleg, setUitleg] = useState(false);
  const k = weekKaart(state, me.id);
  if (!k.totaal && !k.gesloten) return null;
  const zin = vandaagZin(k);
  const klaar = !!k.gesloten || (k.behaald >= 0 && !k.volgende);
  const turven = !!afspraakVan(state, me.id);
  return (
    <section className={`ff-card v2-mijnweek-kort${klaar ? " is-gehaald" : ""}`} aria-label="Mijn week">
      <div className="ff-row"><b className="ff-grow">Mijn week</b><span className="v2-groen-teller"><b>{k.groen}</b> 🟢</span></div>
      <DagenRij k={k} />
      <b className="v2-bonuszin">{bonusZin(k)}</b>
      {zin && <span className="v2-vandaagzin">{zin}</span>}
      <Treden k={k} />
      {k.zakgeld && <span className="ff-small ff-muted">💰 Zakgeld ({k.zakgeld}) krijg je altijd. De bonus komt erbovenop.</span>}
      <button className="ff-link ff-small" aria-expanded={uitleg} onClick={() => setUitleg(!uitleg)}>{uitleg ? "Sluiten" : "Hoe werkt het?"}</button>
      {uitleg && (
        <ul className="v2-uitleg-kort ff-small">
          <li>🟢 Een dag wordt groen als je {GROEN_PCT}% van je dingen van die dag doet.</li>
          <li>🟠 Oranje: meer dan de helft gedaan, maar nog niet groen.</li>
          <li>🔄 Elke dag begint opnieuw. Inhalen op één dag kan niet: dat is één groene dag.</li>
          {turven && <li>✕ Een turf? Dan wordt die dag niet groen.</li>}
          <li>➖ Overgeslagen en "ging niet door" tellen niet mee.</li>
        </ul>
      )}
      <Eerder state={state} kind={me} />
    </section>
  );
}

/** Per dag: hoeveel er af was. Voor ouders, onder "Wat telt er mee?". */
function PerDag({ k }: { k: Kaart }) {
  return (
    <ul className="v2-weekregels">
      {k.week.filter((d) => d.kleur !== "later").map((d) => (
        <li key={d.datum}>
          <span className="ff-grow">{DAGNAAM[d.kort]} {datumKort(d.datum)}{d.vandaag ? " (vandaag)" : ""}</span>
          <span className="ff-small ff-muted">{d.totaal ? `${d.af} van ${d.totaal}` : "–"}</span>
          <b className={`v2-dagstip is-${d.kleur}`}>{d.kleur === "groen" ? "🟢" : d.kleur === "turf" ? `✕ ${d.turven === 1 ? "turf" : `${d.turven} turven`}` : d.kleur === "bijna" ? "🟠" : "⚪"}</b>
        </li>
      ))}
      <li className="ff-small ff-muted">Alles samen: {k.af} van {k.totaal} ({k.pct}%). Overgeslagen en "ging niet door" tellen niet mee.</li>
    </ul>
  );
}

/** Eerdere weken: wat er gehaald en uitbetaald is. */
function Eerder({ state, kind, ouder = false }: { state: FamilyState; kind: Member; ouder?: boolean }) {
  const lijst = eerdereWeken(state, kind.id).filter((w) => w.maandag !== maandag(iso(new Date())));
  if (!lijst.length) return null;
  return (
    <div className="ff-stack-xs" aria-label="Eerdere weken">
      <b className="ff-small">Eerdere weken</b>
      <ul className="v2-weekregels">
        {lijst.map((w) => (
          <li key={w.maandag}>
            <span className="ff-grow">vanaf {datumKort(w.maandag)}{w.groen !== undefined ? ` · ${groeneDagen(w.groen)}` : ""}</span>
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

const SNEL = ["€ 1", "€ 2,50", "€ 5", "Film kiezen", "Uur later naar bed", "Kiezen wat we eten"];

/** Voor ouders, bij een kind: de week, de bonus, afsluiten en uitbetalen. Ook de vorige week als die nog open staat. */
export function WeekOuder({ state, kind, me, onToast }: { state: FamilyState; kind: Member; me: Member; onToast: (m: string) => void }) {
  const nu = new Date();
  const dezeMa = maandag(iso(nu));
  const vorigeMa = addDays(dezeMa, -7);
  // Vorige week bekijken alsof het maandagnacht is: alle zeven dagen zijn voorbij, geen "vandaag" erin.
  const vorige = weekKaart(state, kind.id, new Date(dezeMa + "T00:00:00"), vorigeMa);
  const deze = weekKaart(state, kind.id, nu, dezeMa);
  const huidig = tredenVan(state, kind.id);
  const [instellen, setInstellen] = useState(false);
  const [t1, setT1] = useState<WeekTrede>(huidig[0] ?? { pct: 71, dagen: 5, wat: "" });
  const [t2, setT2] = useState<WeekTrede | null>(huidig[1] ?? null);
  const [zakgeld, setZakgeld] = useState(state.weekAfspraak?.[kind.id]?.zakgeld ?? "");
  const [sluit, setSluit] = useState<string | null>(null);
  const zondag = nu.getDay() === 0;

  const blok = (k: Kaart, titel: string, magSluiten: boolean, voorbij: boolean) => {
    const v = k.treden[0];
    const tekort = v ? Math.max(0, v.dagen! - k.groen) : 0;
    return (
      <div className="ff-stack-xs v2-weekblok" key={k.maandag}>
        <div className="ff-row"><b className="ff-grow">{titel}</b><span className="v2-groen-teller"><b>{k.groen}</b> 🟢</span></div>
        <DagenRij k={k} />
        <span className="ff-small"><b>{voorbij && !k.gesloten ? (k.behaald >= 0 ? `Gehaald: ${watOf(k.treden[k.behaald])}` : v ? `Net niet: ${tekort} groene ${tekort === 1 ? "dag" : "dagen"} te weinig voor ${watOf(v)}` : groeneDagen(k.groen)) : bonusZin(k)}</b></span>
        {!voorbij && vandaagZin(k) && <span className="ff-small ff-muted">{vandaagZin(k)}</span>}
        <details className="v2-week-details"><summary className="ff-small">Per dag bekijken</summary><PerDag k={k} /></details>
        {k.gesloten ? (
          <div className="ff-row v2-week-dicht">
            <span className="ff-small ff-grow">🔒 Afgesloten op {datumKort(k.gesloten.at.slice(0, 10))}: {k.gesloten.gehaald ? k.gesloten.beloning ?? "gehaald" : "geen bonus"}</span>
            {k.gesloten.gehaald && <button className={`v2-betaald${k.gesloten.betaald ? " is-betaald" : ""}`} aria-pressed={!!k.gesloten.betaald} onClick={() => { actions.weekUitbetaald(kind.id, k.maandag, !k.gesloten!.betaald); if (!k.gesloten!.betaald) onToast("Genoteerd als uitbetaald"); }}>{k.gesloten.betaald ? "Uitbetaald ✓" : "Uitbetaald?"}</button>}
          </div>
        ) : magSluiten && (sluit !== k.maandag ? (
          <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => setSluit(k.maandag)}>Week afsluiten</button>
        ) : (
          <div className="v2-samen-keuze" role="group" aria-label="Week afsluiten">
            <span className="ff-small">{k.behaald >= 0 ? `${kind.name} had ${groeneDagen(k.groen)}. Uitbetalen: ${watOf(k.treden[k.behaald])}.` : `${kind.name} had ${groeneDagen(k.groen)} (nodig: ${v?.dagen ?? k.nodig}). Deze week geen bonus; het zakgeld blijft gewoon.`} Klopt er een vinkje niet? Zet het eerst goed bij de dag hierboven. Na afsluiten staat het vast.</span>
            <div className="ff-row">
              <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => setSluit(null)}>Nog niet</button>
              <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => { actions.weekAfsluiten(kind.id, me.id, k); setSluit(null); onToast(k.gehaald ? "Week afgesloten 🏁 Vergeet niet uit te betalen" : "Week afgesloten"); }}>Ja, afsluiten</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const trede = (t: WeekTrede, zet: (t: WeekTrede) => void, opties: number[], label: string) => (
    <div className="ff-stack-xs v2-trede-instel">
      <span className="ff-small"><b>{label}</b></span>
      <div className="ff-chips">{opties.map((n) => <button key={n} className="ff-chip" aria-pressed={t.dagen === n} onClick={() => zet({ ...t, dagen: n, pct: Math.round((n * 100) / 7) })}>{n} 🟢</button>)}</div>
      <label className="ff-field"><span className="ff-eyebrow">Wat krijgt {kind.name} dan?</span><input value={t.wat} onChange={(e) => zet({ ...t, wat: e.target.value })} maxLength={60} placeholder="Bijv. € 2,50 of film kiezen" /></label>
      <div className="ff-chips">{SNEL.map((w) => <button key={w} className="ff-chip ff-chip-s" onClick={() => zet({ ...t, wat: w })}>{w}</button>)}</div>
    </div>
  );

  return (
    <section className="ff-card ff-stack-s v2-weekouder" aria-label={`Week van ${kind.name}`} style={{ width: "100%" }}>
      {!instellen ? (
        <button className="ff-link ff-small" onClick={() => { setT1(huidig[0] ?? { pct: 71, dagen: 5, wat: "" }); setT2(huidig[1] ?? null); setInstellen(true); }}>
          Weekbonus: {huidig.map((t) => `${t.dagen} 🟢 → ${watOf(t)}`).join(" · ")}{state.weekAfspraak?.[kind.id]?.zakgeld ? ` · zakgeld ${state.weekAfspraak[kind.id].zakgeld}` : ""} · aanpassen
        </button>
      ) : (
        <div className="ff-stack-s v2-samen-keuze">
          <b>Weekbonus voor {kind.name}</b>
          <span className="ff-small ff-muted">Een dag is groen als {kind.name} {GROEN_PCT}% van die dag doet{afspraakVan(state, kind.id) ? " en er geen turf is" : ""}. De bonus hangt aan het aantal groene dagen. Zakgeld krijgt {kind.name} altijd.</span>
          <label className="ff-field"><span className="ff-eyebrow">Vast zakgeld per week (optioneel, alleen ter info)</span><input value={zakgeld} onChange={(e) => setZakgeld(e.target.value)} maxLength={30} placeholder="Bijv. € 5" /></label>
          {trede(t1, setT1, [3, 4, 5, 6], "Bonus 1: bij hoeveel groene dagen?")}
          {t2 ? (
            <>
              {trede(t2, (x) => setT2(x), [4, 5, 6, 7].filter((n) => n > (t1.dagen ?? 0)), "Bonus 2: bij hoeveel groene dagen?")}
              <button className="ff-link ff-small" onClick={() => setT2(null)}>Alleen één bonus</button>
            </>
          ) : (
            <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => { const n = Math.min(7, (t1.dagen ?? 5) + 1); setT2({ pct: Math.round((n * 100) / 7), dagen: n, wat: "" }); }}>+ Tweede bonus (bijv. bij 6 groene dagen)</button>
          )}
          <div className="ff-row">
            <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => setInstellen(false)}>Annuleren</button>
            <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => { actions.setWeekAfspraak(kind.id, t2 && (t2.dagen ?? 0) > (t1.dagen ?? 0) ? [t1, t2] : [t1], zakgeld); setInstellen(false); onToast("Weekbonus opgeslagen"); }}>Opslaan</button>
          </div>
        </div>
      )}
      {vorige.totaal > 0 && !vorige.gesloten && blok(vorige, `Vorige week (vanaf ${datumKort(vorigeMa)})`, true, true)}
      {blok(deze, "Deze week", zondag, false)}
      {!zondag && !deze.gesloten && <span className="ff-small ff-muted">Afsluiten kan op zondag, bij het weekoverleg.</span>}
      <Eerder state={state} kind={kind} ouder />
    </section>
  );
}
