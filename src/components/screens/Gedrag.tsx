"use client";

import { useState } from "react";
import { actions } from "@/lib/store";
import { addDays, iso } from "@/lib/planner";
import { maandag } from "@/lib/huis";
import { MAX_TURVEN_PER_DAG, STANDAARD_AVOND, STERREN_VOOR_EXTRA, afspraakVan, avondVan, gedragWeek, magGoedmaken, redenen, schermStraf, sterOp, strafZin, turvenOp, turvenVan } from "@/lib/gedrag";
import type { FamilyState, Member, Turf } from "@/lib/types";

/*
  Turven en sterren (3.14).
  - Ouders: bij een kind een turf geven (reden kiezen, vandaag of gisteren), goedmaken (1 per week) of weghalen bij een vergissing.
    Aanzetten per kind, met de avondtijden en een extra beloning bij 6 of 7 sterren.
  - Kind: alleen de eigen week. Wat er is gebeurd, wat het gevolg is (scherm, weekscore) en hoe dicht de extra beloning is.
  Broers en zussen zien elkaars turven en sterren niet (ook niet in de database: ff_voor_kind).
*/

const DAGEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const turven = (n: number) => `${n} ${n === 1 ? "turf" : "turven"}`;
const dagNaam = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
const tijd = (at: string) => new Date(at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
const EXTRA = ["Zaterdag later naar bed", "Film kiezen", "Kiezen wat we eten", "€ 1 extra"];

/** Ma t/m zo: ster, turf of nog niet. */
function WeekSterren({ state, id }: { state: FamilyState; id: string }) {
  const vandaag = iso(new Date());
  const ma = maandag(vandaag);
  return (
    <ol className="v2-sterren" aria-label="Deze week">
      {DAGEN.map((dn, i) => {
        const d = addDays(ma, i);
        const n = d <= vandaag ? turvenOp(state, id, d) : 0;
        const ster = sterOp(state, id, d, vandaag);
        const label = d > vandaag ? "nog niet" : ster ? "ster" : n ? turven(n) : d === vandaag ? "vandaag, nog bezig" : "geen ster";
        return (
          <li key={d} className={ster ? "is-ster" : n ? "is-turf" : ""} aria-label={`${dn}: ${label}`}>
            <span aria-hidden="true">{ster ? "⭐" : n ? "✕".repeat(Math.min(n, 3)) : d === vandaag ? "…" : "·"}</span>
            <small>{dn}</small>
          </li>
        );
      })}
    </ol>
  );
}

function Stand({ state, id }: { state: FamilyState; id: string }) {
  const g = gedragWeek(state, id, maandag(iso(new Date())));
  const extra = afspraakVan(state, id)?.extra;
  const nog = Math.max(0, STERREN_VOOR_EXTRA - g.sterren);
  return (
    <span className="ff-small">
      ⭐ {g.sterren} {g.sterren === 1 ? "dag" : "dagen"} zonder turf · {turven(g.turven)}
      {extra ? (g.extra ? ` · ${extra} verdiend 🎉` : ` · nog ${nog} ${nog === 1 ? "dag" : "dagen"} zonder turf tot: ${extra.toLowerCase()}`) : ""}
    </span>
  );
}

/** Voor ouders, in het blad van een kind. */
export function GedragOuder({ state, kind, me, onToast }: { state: FamilyState; kind: Member; me: Member; onToast: (m: string) => void }) {
  const a = afspraakVan(state, kind.id);
  const [geven, setGeven] = useState(false);
  const [instellen, setInstellen] = useState(false);
  if (!a || instellen) return <GedragInstellen state={state} kind={kind} bestaand={!!a} onKlaar={(m) => { setInstellen(false); if (m) onToast(m); }} />;
  const vandaag = iso(new Date());
  const ma = maandag(vandaag);
  const deze = turvenVan(state, kind.id).filter((t) => t.datum >= ma).sort((x, y) => y.at.localeCompare(x.at));
  const straf = schermStraf(state, kind.id);
  return (
    <section className="ff-card ff-stack-s v2-gedrag" aria-label={`Turven en sterren van ${kind.name}`}>
      <div className="ff-row"><b className="ff-grow">⭐ Turven en sterren</b><button className="ff-link ff-small" onClick={() => setInstellen(true)}>Instellen</button></div>
      <WeekSterren state={state} id={kind.id} />
      <Stand state={state} id={kind.id} />
      {straf.turven > 0 && <span className="ff-small v2-straf">Vandaag: {strafZin(straf)} ({turven(straf.turven)} gisteren)</span>}
      {!geven ? (
        <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => setGeven(true)}>＋ Turf geven</button>
      ) : (
        <TurfGeven state={state} kind={kind} me={me} onKlaar={(m) => { setGeven(false); if (m) onToast(m); }} />
      )}
      {deze.length > 0 && (
        <ul className="v2-turflijst" aria-label="Turven deze week">
          {deze.map((t) => <TurfRij key={t.id} t={t} state={state} kind={kind} me={me} onToast={onToast} />)}
        </ul>
      )}
      <span className="ff-small ff-muted">Elke dag begint opnieuw. Zakgeld blijft altijd staan. {kind.name} ziet alleen de eigen turven en sterren.</span>
    </section>
  );
}

function TurfRij({ t, state, kind, me, onToast }: { t: Turf; state: FamilyState; kind: Member; me: Member; onToast: (m: string) => void }) {
  const [zeker, setZeker] = useState(false);
  const kan = !t.weg && magGoedmaken(state, kind.id, t.datum);
  return (
    <li className={t.weg ? "is-weg" : ""}>
      <span className="ff-grow ff-stack-xs">
        <b>{t.reden}{t.n === 2 ? " (telt dubbel)" : ""}</b>
        <span className="ff-small ff-muted">{dagNaam(t.datum)} · {tijd(t.at)}{t.weg ? " · goedgemaakt ✓" : ""}</span>
      </span>
      {kan && <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => { if (actions.turfGoedgemaakt(kind.id, t.id, me.id)) onToast(`Goedgemaakt. Deze turf telt niet meer.`); }}>Goedgemaakt</button>}
      {!zeker ? <button className="ff-link ff-small" onClick={() => setZeker(true)}>Vergissing?</button> : <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => { actions.turfWeghalen(kind.id, t.id); onToast("Turf weggehaald"); }}>Weghalen</button>}
    </li>
  );
}

function TurfGeven({ state, kind, me, onKlaar }: { state: FamilyState; kind: Member; me: Member; onKlaar: (m?: string) => void }) {
  const [reden, setReden] = useState<{ tekst: string; n: 1 | 2 } | null>(null);
  const [eigen, setEigen] = useState("");
  const [gisteren, setGisteren] = useState(false);
  const lijst = redenen(state, kind.id);
  const tekst = reden?.tekst ?? eigen.trim();
  const geef = () => {
    if (!tekst) return;
    const datum = gisteren ? addDays(iso(new Date()), -1) : iso(new Date());
    const id = actions.turf(kind.id, tekst, reden?.n ?? 1, me.id, datum);
    if (!id) return onKlaar("Die week is al afgesloten");
    const n = turvenOp(state, kind.id, datum) + (reden?.n ?? 1);
    const morgen = n >= MAX_TURVEN_PER_DAG ? "geen scherm in de avond" : `${n * 15} minuten minder scherm`;
    onKlaar(`Turf voor ${kind.name}: ${tekst}. ${gisteren ? "Vandaag" : "Morgen"} ${morgen}.`);
  };
  return (
    <div className="ff-stack-s v2-turf-geven">
      <span className="ff-eyebrow">Waarom?</span>
      <div className="ff-chips">
        {lijst.map((r) => <button key={r.tekst} className="ff-chip" aria-pressed={reden?.tekst === r.tekst} onClick={() => { setReden(r); setEigen(""); }}>{r.tekst}{r.n === 2 ? " (×2)" : ""}</button>)}
      </div>
      <label className="ff-field"><span className="ff-eyebrow">Of iets anders</span><input value={eigen} maxLength={80} onChange={(e) => { setEigen(e.target.value); setReden(null); }} placeholder="Alleen voor een afgesproken regel" aria-label="Andere reden" /></label>
      <div className="ff-chips">
        <button className="ff-chip" aria-pressed={!gisteren} onClick={() => setGisteren(false)}>Vandaag</button>
        <button className="ff-chip" aria-pressed={gisteren} onClick={() => setGisteren(true)}>Gisteren</button>
      </div>
      <div className="ff-row">
        <button className="ff-btn ff-btn-ghost" onClick={() => onKlaar()}>Annuleren</button>
        <button className="ff-btn ff-btn-primary ff-grow" disabled={!tekst} onClick={geef}>Turf geven</button>
      </div>
    </div>
  );
}

function GedragInstellen({ state, kind, bestaand, onKlaar }: { state: FamilyState; kind: Member; bestaand: boolean; onKlaar: (m?: string) => void }) {
  const a = afspraakVan(state, kind.id);
  const av = avondVan(state, kind.id);
  const [snack, setSnack] = useState(av.snack);
  const [douchen, setDouchen] = useState(av.douchen);
  const [lader, setLader] = useState(av.lader);
  const [extra, setExtra] = useState(a?.extra ?? EXTRA[0]);
  const bewaar = () => {
    actions.setGedragAfspraak(kind.id, { sinds: a?.sinds ?? iso(new Date()), extra: extra.trim() || undefined, avond: { snack, douchen, lader } });
    onKlaar(bestaand ? "Opgeslagen" : `Turven en sterren staan aan voor ${kind.name}`);
  };
  return (
    <section className="ff-card ff-stack-s v2-gedrag" aria-label={`Turven en sterren instellen voor ${kind.name}`}>
      <b>⭐ Turven en sterren{bestaand ? "" : ` voor ${kind.name}?`}</b>
      {!bestaand && (
        <ul className="v2-weekregels ff-small">
          <li><span className="ff-grow">Afgesproken regel niet gehaald</span><b>turf</b></li>
          <li><span className="ff-grow">Gelogen</span><b>2 turven</b></li>
          <li><span className="ff-grow">Gevolg morgen</span><b>15 / 30 min minder scherm, bij 3: geen scherm 's avonds</b></li>
          <li><span className="ff-grow">Dag met een turf</span><b>wordt niet groen (telt niet voor de weekbonus)</b></li>
          <li><span className="ff-grow">Dag zonder turf</span><b>⭐ telt voor de extra beloning</b></li>
          <li><span className="ff-grow">Goedmaken (sorry + extra klus)</span><b>1 per week</b></li>
        </ul>
      )}
      <span className="ff-eyebrow">Avondtijden van {kind.name}</span>
      <div className="v2-avondtijden">
        <label className="ff-field"><span className="ff-small">Laatste snack</span><input type="time" value={snack} onChange={(e) => setSnack(e.target.value || STANDAARD_AVOND.snack)} /></label>
        <label className="ff-field"><span className="ff-small">Douchen</span><input type="time" value={douchen} onChange={(e) => setDouchen(e.target.value || STANDAARD_AVOND.douchen)} /></label>
        <label className="ff-field"><span className="ff-small">Telefoon aan de lader</span><input type="time" value={lader} onChange={(e) => setLader(e.target.value || STANDAARD_AVOND.lader)} /></label>
      </div>
      <span className="ff-eyebrow">Extra bij {STERREN_VOOR_EXTRA} of 7 dagen zonder turf</span>
      <div className="ff-chips">{EXTRA.map((x) => <button key={x} className="ff-chip" aria-pressed={extra === x} onClick={() => setExtra(x)}>{x}</button>)}</div>
      <label className="ff-field"><span className="ff-small">Of zelf</span><input value={extra} maxLength={40} onChange={(e) => setExtra(e.target.value)} aria-label="Extra beloning" /></label>
      <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={bewaar}>{bestaand ? "Opslaan" : "Aanzetten"}</button>
      {bestaand && (
        <div className="ff-row">
          <button className="ff-btn ff-btn-ghost ff-grow" onClick={() => onKlaar()}>Terug</button>
          <button className="ff-link ff-small" onClick={() => { actions.setGedragAfspraak(kind.id, null); onKlaar("Turven en sterren staan uit"); }}>Uitzetten</button>
        </div>
      )}
    </section>
  );
}

/** Voor het kind zelf (Week): mijn sterren en turven. */
export function GedragKind({ state, me }: { state: FamilyState; me: Member }) {
  if (!afspraakVan(state, me.id)) return null;
  const ma = maandag(iso(new Date()));
  const deze = turvenVan(state, me.id).filter((t) => t.datum >= ma).sort((x, y) => y.at.localeCompare(x.at));
  const straf = schermStraf(state, me.id);
  const av = avondVan(state, me.id);
  return (
    <section className="ff-card ff-stack-s v2-gedrag" aria-label="Mijn turven">
      <b>✕ Mijn turven</b>
      <Stand state={state} id={me.id} />
      {straf.turven > 0 && <span className="ff-small v2-straf">Vandaag: {strafZin(straf)} ({turven(straf.turven)} gisteren)</span>}
      {deze.length > 0 && (
        <ul className="v2-turflijst" aria-label="Mijn turven deze week">
          {deze.map((t) => <li key={t.id} className={t.weg ? "is-weg" : ""}><span className="ff-grow ff-stack-xs"><b>{t.reden}{t.n === 2 ? " (telt dubbel)" : ""}</b><span className="ff-small ff-muted">{dagNaam(t.datum)} · {tijd(t.at)}{t.weg ? " · goedgemaakt ✓" : ""}</span></span></li>)}
        </ul>
      )}
      <span className="ff-small ff-muted">Avond: {av.snack} laatste snack · {av.douchen} douchen · {av.lader} telefoon aan de lader. Roepen papa of mama? Binnen 2 minuten. Een turf goedmaken kan 1 keer per week: sorry zeggen en een extra klus.</span>
    </section>
  );
}

/** Op Vandaag (kind), 's avonds of als er vandaag iets is: de avondregels en wat er speelt. */
export function AvondRegels({ state, me, nu = new Date() }: { state: FamilyState; me: Member; nu?: Date }) {
  if (!afspraakVan(state, me.id)) return null;
  const av = avondVan(state, me.id);
  const vandaag = iso(nu);
  const hm = nu.toTimeString().slice(0, 5);
  const straf = schermStraf(state, me.id, vandaag);
  const vandaagTurven = turvenVan(state, me.id).filter((t) => t.datum === vandaag && !t.weg);
  const avond = hm >= "18:30" && hm <= "21:30";
  if (!avond && !vandaagTurven.length && !straf.turven) return null;
  const regels = [{ t: av.snack, w: "laatste snack" }, { t: av.douchen, w: "douchen" }, { t: av.lader, w: "telefoon aan de lader" }];
  const volgende = regels.find((r) => r.t >= hm);
  return (
    <section className="ff-card ff-stack-xs v2-avondregels" aria-label="Avondregels">
      {avond && (
        <>
          <b>🌙 Vanavond</b>
          <ul className="v2-avondlijst">{regels.map((r) => <li key={r.w} className={r === volgende ? "is-volgende" : r.t < hm ? "is-voorbij" : ""}><b>{r.t}</b> {r.w}</li>)}</ul>
        </>
      )}
      {straf.turven > 0 && <span className="ff-small v2-straf">Vandaag {strafZin(straf)}.</span>}
      {vandaagTurven.map((t) => <span key={t.id} className="ff-small v2-straf">Turf: {t.reden.toLowerCase()} ({tijd(t.at)})</span>)}
    </section>
  );
}
