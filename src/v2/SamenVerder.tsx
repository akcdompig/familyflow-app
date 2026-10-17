"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Overleg } from "@/components/screens/Gezin";
import { LineChart } from "@/components/ui/LineChart";
import { OORDEEL, STANDAARD_HUISREGELS, THEMAS, actief, herhaling, herkomst, laatsteOordeel, teEvalueren, voorstellen } from "@/lib/afspraken";
import { ALGEMENE_HULP } from "@/lib/methodiek";
import { goalSeries, thermSeries } from "@/lib/signals";
import { actions } from "@/lib/store";
import { samenwerken } from "@/lib/samenwerken";
import { uurMin } from "@/lib/scherm";
import type { Afspraak, FamilyState, Member, Oordeel } from "@/lib/types";
import { Groei } from "./Groei";
import { GroeiGezin } from "./GroeiGezin";

/*
  Samen verder: de plek waar het gezin vooruitkomt.
  Probleem → afspraak → actie op Vandaag → na 7 dagen "hielp het?". Bij "nee": een andere aanpak of hulp.
  Alle afspraken en doelen op één plek, het wekelijkse overleg en het weekverhaal.
  Kinderen zien hier alleen wat van hen is: de afspraken, hun groeidoel, hun eigen wens en het weekverhaal.
*/

const DAG = 864e5;
const GOAL_COLORS = ["#d9442f", "#3cc6a0", "#6c8cff"];
const geleden = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAG);
  return d === 0 ? "vandaag" : d === 1 ? "gisteren" : d < 14 ? `${d} dagen geleden` : `${Math.round(d / 7)} weken geleden`;
};

/**
  Huisregels (staat bij Gezin). "Afspraak" is alleen iets in de agenda.
  - Kiezen uit veelgebruikte regels, of zelf typen. Ouders kunnen een regel weghalen.
  - Een kind doet een voorstel; dat telt pas als een ouder hem goedkeurt.
*/
export function Huisregels({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void; onKlussen?: () => void }) {
  const isOuder = me.role === "ouder";
  const [nieuw, setNieuw] = useState("");
  const [weg, setWeg] = useState<string | null>(null);
  const [kiezen, setKiezen] = useState(false);
  const lijst = actief(state).slice().reverse();
  const open = voorstellen(state).filter((a) => isOuder || a.by === me.id);
  const kinderen = state.members.filter((m) => m.role !== "ouder" && m.joined !== false);
  const bestaat = new Set((state.afspraken ?? []).filter((a) => !a.gestopt).map((a) => a.text.toLowerCase()));
  const toevoegen = (tekst: string) => {
    if (!tekst.trim()) return;
    actions.addAfspraak(tekst, me.id, undefined, !isOuder);
    onToast(isOuder ? "Huisregel toegevoegd. Over een week vragen we of hij helpt." : "Voorstel gestuurd. Papa of mama kijkt ernaar.");
  };
  const naamVan = (id: string) => state.members.find((m) => m.id === id)?.name ?? "iemand";
  return (
    <section className="ff-card ff-stack-s" aria-label="Huisregels">
      <b>🏠 Huisregels</b>
      {!lijst.length && <span className="ff-small ff-muted">Nog geen huisregels. Kies er hieronder een paar, of maak er een met de coach.</span>}
      {lijst.map((a) => {
        const o = laatsteOordeel(a);
        return (
          <div key={a.id} className="v2-regel">
            <span className="ff-grow ff-stack-xs">
              <b>{a.text}</b>
              <span className="ff-small ff-muted">{herkomst(a)} · {geleden(a.at)} · <span className={`v2-oordeel-tekst is-${o?.oordeel ?? "open"}`}>{o ? `${OORDEEL[o.oordeel].emoji} ${o.oordeel === "ja" ? "helpt" : o.oordeel === "beetje" ? "helpt een beetje" : "helpt nog niet"}` : "nog niet bekeken"}</span></span>
              {isOuder && weg === a.id && (
                <span className="v2-regel-zeker" role="group" aria-label="Weghalen?">
                  <span className="ff-small">Weghalen?</span>
                  <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => setWeg(null)}>Nee</button>
                  <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => { actions.removeAfspraak(a.id); setWeg(null); onToast("Huisregel weggehaald"); }}>Ja</button>
                </span>
              )}
            </span>
            {isOuder && weg !== a.id && <button className="v2-regel-weg" aria-label={`Huisregel weghalen: ${a.text}`} onClick={() => setWeg(a.id)}>✕</button>}
          </div>
        );
      })}
      {(isOuder ? kinderen : kinderen.filter((k) => k.id === me.id)).filter((k) => state.schermAfspraak?.[k.id]).map((k) => (
        <div key={k.id} className="v2-regel is-vast">
          <span className="ff-grow ff-stack-xs">
            <b>📱 Schermtijd{isOuder ? ` ${k.name}` : ""}</b>
            <span className="ff-small ff-muted">hooguit {uurMin(state.schermAfspraak![k.id].doel)} per dag, eerst je dag af</span>
          </span>
        </div>
      ))}

      {open.length > 0 && (
        <section className="ff-stack-xs" aria-label="Voorstellen">
          <span className="ff-eyebrow">{isOuder ? "Voorstellen van de kinderen" : "Jouw voorstel"}</span>
          {open.map((a) => (
            <div key={a.id} className="v2-regel is-voorstel">
              <span className="ff-grow ff-stack-xs"><b>{a.text}</b><span className="ff-small ff-muted">{isOuder ? `voorstel van ${naamVan(a.by)}` : "wacht op papa of mama"}</span></span>
              {isOuder && (
                <span className="v2-regel-zeker">
                  <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => { actions.removeAfspraak(a.id); onToast("Voorstel niet overgenomen"); }}>Nee</button>
                  <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => { actions.keurHuisregelGoed(a.id); onToast("Goedgekeurd: nu een huisregel"); }}>Goedkeuren</button>
                </span>
              )}
            </div>
          ))}
        </section>
      )}

      {!kiezen ? (
        <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => setKiezen(true)}>{isOuder ? "+ Huisregel toevoegen" : "+ Een huisregel voorstellen"}</button>
      ) : (
        <div className="ff-stack-s v2-regel-kies">
          <span className="ff-small"><b>Kies uit veelgebruikte huisregels</b></span>
          <div className="ff-chips">
            {STANDAARD_HUISREGELS.filter((r) => !bestaat.has(r.toLowerCase())).map((r) => (
              <button key={r} className="ff-chip" onClick={() => toevoegen(r)}>+ {r}</button>
            ))}
          </div>
          <div className="ff-row v2-nieuwe-afspraak">
            <input className="ff-grow" value={nieuw} maxLength={120} onChange={(e) => setNieuw(e.target.value)} placeholder="Of typ zelf een regel" aria-label="Nieuwe huisregel" />
            <button className="ff-btn ff-btn-primary ff-btn-sm" disabled={!nieuw.trim()} onClick={() => { toevoegen(nieuw); setNieuw(""); }}>{isOuder ? "Toevoegen" : "Voorstellen"}</button>
          </div>
          <button className="ff-link ff-small" onClick={() => setKiezen(false)}>Klaar</button>
        </div>
      )}
    </section>
  );
}

/**
  Wat bij de week hoort: "hielp de huisregel?" (na 7 dagen), het weekoverleg, doelen en wensen, en hoe de week ging.
  Staat bij Week. Doelen en wensen zitten achter één klik: ze zijn voor het overleg, niet voor elke dag.
*/
export function WeekVerder({ state, me, onToast, onCoach }: { state: FamilyState; me: Member; onToast: (m: string) => void; onCoach: (id: string) => void }) {
  const isOuder = me.role === "ouder";
  const [overleg, setOverleg] = useState(false);
  const [themas, setThemas] = useState<string[] | null>(null);
  const vragen = teEvalueren(state, me.id);
  // Zei je net "nee, nog niet"? Dan blijft de kaart staan met de volgende stap.
  const vervolg = actief(state).filter((a) => {
    const e = (a.evaluaties ?? []).filter((x) => x.by === me.id).at(-1);
    return e?.oordeel === "nee" && Date.now() - new Date(e.at).getTime() < 3 * DAG && !vragen.includes(a);
  });
  const terug = isOuder ? herhaling(state) : [];
  const doelen = state.goals.filter(Boolean);
  const last = state.meetings[state.meetings.length - 1];

  if (overleg) return <Overleg state={state} onClose={() => setOverleg(false)} onToast={onToast} />;

  return (
    <>
      {vragen.map((a) => <HieltHet key={a.id} a={a} me={me} onCoach={onCoach} onToast={onToast} />)}
      {vervolg.map((a) => <HieltHet key={a.id} a={a} me={me} onCoach={onCoach} onToast={onToast} startNee />)}

      {isOuder && (
        <section className="ff-card v2-overleg" aria-label="Weekoverleg">
          <span className="ff-grow ff-stack-xs">
            <b>🗓️ Weekoverleg</b>
            <span className="ff-small ff-muted">{last ? `Laatste keer ${geleden(last.at)}.` : "Nog niet gedaan."} Een kwartier, iedereen doet mee: wat ging goed, helpen de huisregels, wat pakken we aan.</span>
          </span>
          <button className="ff-btn ff-btn-primary" onClick={() => setOverleg(true)}>Starten</button>
        </section>
      )}

      {terug.length > 0 && (
        <section className="ff-card ff-stack-s v2-herhaling" aria-label="Komt vaker terug">
          <b>🔁 Dit komt vaker terug</b>
          {terug.slice(0, 2).map((h) => (
            <div key={h.thema} className="ff-row">
              <span className="ff-grow"><b>{h.titel}</b> <span className="ff-small ff-muted">{h.aantal}× in 4 weken</span></span>
              <button className="ff-btn ff-btn-ghost ff-btn-sm" onClick={() => onCoach(h.scenario ?? "")}>Aanpak bekijken</button>
            </div>
          ))}
          <span className="ff-small ff-muted">Kijk samen of er een huisregel bij hoort, of dat een bestaande regel anders moet. Loopt het steeds vaker uit de hand, bespreek het dan met de huisarts, het wijkteam of de mentor.</span>
        </section>
      )}

      <details className="v2-meer-details" open={themas !== null || undefined}>
        <summary><b>🎯 Doelen en wensen</b> <span className="ff-small ff-muted">{isOuder ? "waar werken jullie aan, voor het overleg" : "je groeidoel en wat jij thuis beter wilt"}</span></summary>
        <section className="ff-stack-s" aria-label="Waar werken we aan">
          <div className="ff-row">
            <b className="ff-grow">Waar werken we aan</b>
            {isOuder && doelen.length > 0 && themas === null && <button className="ff-link ff-small" onClick={() => setThemas(doelen)}>Wijzigen</button>}
          </div>
          {themas !== null || (isOuder && !doelen.length) ? (
            <>
              <span className="ff-small ff-muted">Kies 1 tot 3 dingen, het liefst samen met de kinderen. Jullie geven er elke week in het overleg een cijfer voor.</span>
              <div className="ff-chips">
                {THEMAS.map((t) => {
                  const gekozen = (themas ?? []).includes(t);
                  return <button key={t} className="ff-chip" aria-pressed={gekozen} disabled={!gekozen && (themas ?? []).length >= 3} onClick={() => setThemas(gekozen ? (themas ?? []).filter((x) => x !== t) : [...(themas ?? []), t])}>{t}</button>;
                })}
              </div>
              <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!(themas ?? []).length} onClick={() => { actions.setGoals(themas ?? []); setThemas(null); onToast("Opgeslagen 🎯"); }}>Opslaan</button>
            </>
          ) : doelen.length ? (
            <>
              <ul className="v2-doelen">{doelen.map((d, i) => <li key={d}><i style={{ background: GOAL_COLORS[i] }} />{d}</li>)}</ul>
              {isOuder && state.meetings.length > 1 && <LineChart series={goalSeries(state)} colors={GOAL_COLORS} dashed={thermSeries(state)} label="Cijfers voor de gezinsdoelen per week" />}
            </>
          ) : (
            <span className="ff-small ff-muted">Je ouders kiezen dit samen met jullie.</span>
          )}
        </section>
        {!isOuder && <Groei state={state} lid={me} me={me} onToast={onToast} />}
        <Wensen state={state} me={me} onToast={onToast} />
      </details>

      {/* Terugkijken zit achter één klik: het verhaal, de groei en eerdere weken. Met een eigen weekkeuze. */}
      <details className="v2-meer-details">
        <summary><b>📖 Terugkijken op de week</b> <span className="ff-small ff-muted">het weekverhaal en wat jullie samen deden</span></summary>
        <GroeiGezin state={state} me={me} onToast={onToast} />
      </details>
    </>
  );
}

/** "Hielp het?" Na een week, voor iedereen. Bij nee meteen een volgende stap. */
function HieltHet({ a, me, onCoach, onToast, startNee = false }: { a: Afspraak; me: Member; onCoach: (id: string) => void; onToast: (m: string) => void; startNee?: boolean }) {
  const [nee, setNee] = useState(startNee);
  const [hulp, setHulp] = useState(false);
  const kies = (o: Oordeel) => {
    actions.evalueerAfspraak(a.id, me.id, o);
    if (o === "nee") setNee(true);
    else onToast(o === "ja" ? "Mooi! Houd het zo vast 👍" : "Eerlijk. Kijk in het overleg wat er beter kan.");
  };
  const coachId = a.scenario && !a.scenario.startsWith("ruzie:") && a.scenario !== "overleg" ? a.scenario : "";
  return (
    <section className="ff-card ff-stack-s v2-hielp" aria-label="Hielp de huisregel?">
      <span className="ff-eyebrow">Jullie huisregel van een week geleden</span>
      <b className="v2-hielp-tekst">“{a.text}”</b>
      {!nee ? (
        <>
          <span>Hielp het?</span>
          <div className="v2-hielp-knoppen">
            {(Object.keys(OORDEEL) as Oordeel[]).map((o) => <button key={o} className="ff-btn ff-btn-ghost" onClick={() => kies(o)}>{OORDEEL[o].emoji} {OORDEEL[o].label}</button>)}
          </div>
        </>
      ) : (
        <>
          <span>Dat is goed om te weten. Wat doen jullie nu?</span>
          <button className="ff-choice" onClick={() => onCoach(coachId)}>Een andere aanpak kiezen <span className="ff-small ff-muted">met de coach</span></button>
          <button className="ff-choice" onClick={() => { actions.stopAfspraak(a.id); onToast("Huisregel losgelaten. Bespreek in het overleg wat jullie in plaats daarvan doen."); }}>Deze huisregel loslaten</button>
          <button className="ff-choice" aria-expanded={hulp} onClick={() => setHulp(!hulp)}>Hulp zoeken</button>
          {hulp && <p className="ff-small">{ALGEMENE_HULP}</p>}
        </>
      )}
    </section>
  );
}

/** Wat zou thuis beter mogen? Eén zin per persoon. Ouders zien die van iedereen, kinderen hun eigen. */
function Wensen({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const mijn = state.doelen?.[me.id]?.wens ?? "";
  const [tekst, setTekst] = useState(mijn);
  const [bewerk, setBewerk] = useState(!mijn);
  const anderen = me.role === "ouder" ? state.members.filter((m) => m.id !== me.id && state.doelen?.[m.id]?.wens) : [];
  return (
    <section className="ff-card ff-stack-s" aria-label="Wat zou thuis beter mogen">
      <b>💬 Wat zou thuis beter mogen?</b>
      {bewerk ? (
        <>
          <span className="ff-small ff-muted">Eén zin, in je eigen woorden. {me.role === "ouder" ? "De kinderen vullen dit ook in." : "Je ouders lezen dit, je broers en zussen niet."}</span>
          <div className="ff-row">
            <input className="ff-grow" value={tekst} maxLength={140} onChange={(e) => setTekst(e.target.value)} placeholder="Bijv. minder schreeuwen" aria-label="Mijn wens" />
            <button className="ff-btn ff-btn-primary ff-btn-sm" disabled={!tekst.trim()} onClick={() => { samenwerken.setWens(me.id, tekst); setBewerk(false); onToast("Dank je! Dit nemen jullie mee in het overleg."); }}>Bewaren</button>
          </div>
        </>
      ) : (
        <div className="ff-row">
          <span className="ff-grow"><b>Jij:</b> {mijn}</span>
          <button className="ff-link ff-small" onClick={() => setBewerk(true)}>Aanpassen</button>
        </div>
      )}
      {anderen.map((m) => (
        <div key={m.id} className="ff-row">
          <Avatar config={m.avatar} headOnly size={26} animate={false} label="" />
          <span className="ff-grow"><b>{m.name}:</b> {state.doelen![m.id].wens}</span>
        </div>
      ))}
    </section>
  );
}
