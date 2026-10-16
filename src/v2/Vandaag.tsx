"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { ClaimViering } from "@/components/screens/Viering";
import { Herinneringen } from "@/components/screens/Herinneringen";
import { DAGDELEN, DOEL, begroeting, dagLog, dagdeel, datumTijd, reeks, type Dagdeel } from "@/lib/dag";
import { dagprogramma, nuDoen, voortgang, type Stap } from "@/lib/dagprogramma";
import { expressionFor } from "@/lib/mood";
import { actions } from "@/lib/store";
import { geclaimd, teClaimen } from "@/lib/xp";
import { OngezondKnop } from "./Voeding";
import { SchermKind } from "./Scherm";
import { KlusSheet, antwoordTekst, vraagVan } from "@/components/screens/KlusSheet";
import { klusStatus } from "@/lib/huis";
import type { FamilyState, Member, MoodLevel, Oordeel } from "@/lib/types";
import { OORDEEL, actief, teEvalueren } from "@/lib/afspraken";

const MOODS: { m: MoodLevel; e: string; l: string }[] = [
  { m: 1, e: "😣", l: "Slecht" },
  { m: 2, e: "🙁", l: "Niet zo" },
  { m: 3, e: "😐", l: "Gaat wel" },
  { m: 4, e: "🙂", l: "Goed" },
  { m: 5, e: "😄", l: "Top" },
];

/**
  Vandaag: jouw dagprogramma. Bovenaan hoe ver je bent, je schatkist, water, fruit en hoe je je voelt.
  Dan "Nu doen": één ding tegelijk. Daaronder de hele dag, per dagdeel.
*/
export function Vandaag({ state, me, onToast, onMeerGevoel, onWie, onSamenVerder, onPlanner }: { state: FamilyState; me: Member; onToast: (m: string) => void; onMeerGevoel: () => void; onWie: () => void; onSamenVerder?: () => void; onPlanner?: () => void }) {
  const [tellers, setTellers] = useState(false);
  const [, tik] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tik((n) => n + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const nuDeel = dagdeel();
  const [open, setOpen] = useState<Dagdeel>(nuDeel);
  const [pop, setPop] = useState<{ id: string; n: number } | null>(null);
  const [claim, setClaim] = useState<{ van: number; n: number } | null>(null);
  const [klusOpen, setKlusOpen] = useState<string | null>(null);
  const [pushLater, setPushLater] = useState(() => {
    try {
      return Date.now() - Number(localStorage.getItem("familyflow:push-later") ?? 0) < 3 * 864e5;
    } catch {
      return false;
    }
  });
  const stappen = dagprogramma(state, me.id);
  const v = voortgang(stappen);
  const volgende = nuDoen(stappen);
  const log = dagLog(state, me.id);
  const ci = state.checkins[me.id];
  const vandaagIn = !!ci && new Date(ci.at).toDateString() === new Date().toDateString();
  const kist = teClaimen(state, me.id);
  const r = reeks(state, me.id);

  const punten = (id: string, n?: number) => {
    if (!n) return;
    setPop({ id, n });
    window.setTimeout(() => setPop((p) => (p?.id === id ? null : p)), 900);
  };

  /** Afvinken of terugzetten. */
  const vink = (st: Stap) => {
    if (st.vanzelf) return;
    const aan = !st.klaar;
    switch (st.soort) {
      case "routine":
        actions.updateDag(me.id, (l) => ({ ...l, routine: aan ? [...new Set([...l.routine, "douchen", "tanden", "deo", "haar", "lotion"])] : [], kleding: aan ? l.kleding ?? "nieuw" : l.kleding }));
        break;
      case "eten":
        actions.toggleEten(me.id, st.id.slice(5));
        break;
      case "taak":
        if (st.task) actions.toggleTask(st.task, me.id);
        break;
      case "klus":
        if (aan) actions.klusGedaan(st.klusKey!, me.id, st.klusXp ?? 0, st.titel);
        else {
          const vandaag = new Date().toDateString();
          const mijn = [...(state.klusLog ?? [])].reverse().find((k) => k.klus === st.klusKey && k.by === me.id && new Date(k.at).toDateString() === vandaag);
          if (mijn) actions.klusWeg(mijn.id, st.klusXp ?? 0);
        }
        break;
      case "slapen":
        if (aan) {
          actions.goToSleep(me.id);
          onToast("Welterusten 🌙");
        } else actions.wakeUp(me.id);
        return;
    }
    if (aan) punten(st.id, st.punten);
  };
  const vinkSub = (id: string) => {
    if (id === "kleding") return actions.updateDag(me.id, (l) => ({ ...l, kleding: l.kleding ? undefined : "nieuw" }));
    const aan = !log.routine.includes(id);
    actions.updateDag(me.id, (l) => ({ ...l, routine: aan ? [...l.routine, id] : l.routine.filter((x) => x !== id) }));
    if (aan) punten(`sub:${id}`, 2);
  };

  const bezigStap = stappen.find((s) => s.bezig !== undefined);
  const volgendeSub = volgende?.soort === "routine" ? volgende.sub?.find((x) => !x.klaar) : undefined;
  const pct = v.totaal ? v.klaar / v.totaal : 0;
  const R = 46;
  const omtrek = 2 * Math.PI * R;

  return (
    <div className="ff-screen v2-screen">
      <header className="v2-top">
        <div>
          <div className="ff-eyebrow">{datumTijd()}</div>
          <h1 className="ff-h1">{begroeting()}, {me.name}</h1>
        </div>
        <button className="v2-ik" onClick={onWie} aria-label={`Je bent ${me.name}`}>
          <Avatar config={me.avatar} expression={expressionFor(ci)} size={40} headOnly animate={false} label={me.name} />
        </button>
      </header>

      {!pushLater && <Herinneringen compact onToast={onToast} onWeg={() => { setPushLater(true); try { localStorage.setItem("familyflow:push-later", String(Date.now())); } catch { /* */ } }} />}

      {/* Hoe ver ben je vandaag */}
      <section className="v2-hero">
        <div className="v2-ring" aria-label={`${v.klaar} van ${v.totaal} klaar`}>
          <svg viewBox="0 0 110 110" width="110" height="110" aria-hidden="true">
            <circle cx="55" cy="55" r={R} fill="none" stroke="var(--v2-ring-bg)" strokeWidth="10" />
            <circle cx="55" cy="55" r={R} fill="none" stroke="url(#v2g)" strokeWidth="10" strokeLinecap="round" strokeDasharray={omtrek} strokeDashoffset={omtrek * (1 - pct)} transform="rotate(-90 55 55)" style={{ transition: "stroke-dashoffset .6s ease" }} />
            <defs>
              <linearGradient id="v2g" x1="0" x2="1"><stop offset="0" stopColor="#ffc845" /><stop offset="1" stopColor="#3cc6a0" /></linearGradient>
            </defs>
          </svg>
          <div className="v2-ring-av"><Avatar config={me.avatar} expression={pct >= 1 ? "blij" : expressionFor(ci)} size={64} headOnly animate={false} label="" /></div>
        </div>
        <div className="v2-hero-t">
          <b className="v2-groot">{v.klaar}<span className="ff-muted">/{v.totaal}</span></b>
          <span className="ff-small ff-muted">{pct >= 1 ? "Alles af! Topdag 🎉" : "klaar vandaag"}{r > 1 ? ` · 🔥 ${r} dagen` : ""}</span>
          <div className="v2-tellers">
            {/* Water, fruit en snoep zitten achter één knop: minder prikkels boven "Nu doen". */}
            <button className="v2-teller" aria-expanded={tellers} onClick={() => setTellers(!tellers)} aria-label={`Eten en drinken: water ${log.water} van ${DOEL.water}, fruit ${log.fruit} van ${DOEL.fruit}`}>
              💧🍎 Eten en drinken <b>{log.water + log.fruit}</b>/{DOEL.water + DOEL.fruit} {tellers ? "▴" : "▾"}
            </button>
            {kist > 0 && (
              <button className="v2-teller is-kist" onClick={() => { const van = geclaimd(state, me.id); const c = actions.claimPunten(me.id); if (c) setClaim({ van, n: c }); }}>
                💎 <b>+{kist}</b> claim
              </button>
            )}
          </div>
          {tellers && (
            <div className="v2-tellers">
              <button className="v2-teller" onClick={() => { actions.updateDag(me.id, (l) => ({ ...l, water: l.water + 1 })); }} aria-label={`Water: ${log.water} van ${DOEL.water}. Tik voor een glas erbij`}>
                💧 <b>{log.water}</b>/{DOEL.water}
              </button>
              <button className="v2-teller" onClick={() => { actions.updateDag(me.id, (l) => ({ ...l, fruit: l.fruit + 1 })); }} aria-label={`Fruit: ${log.fruit} van ${DOEL.fruit}. Tik voor een stuk erbij`}>
                🍎 <b>{log.fruit}</b>/{DOEL.fruit}
              </button>
              <OngezondKnop state={state} me={me} onToast={onToast} />
            </div>
          )}
        </div>
      </section>

      {/* Eerst: het ene ding dat nu moet. Pas daarna gevoel en schermtijd. */}
      {/* Aan het werk of op school: dat is nu je "ding". Daarna gaat het lijstje verder. */}
      {bezigStap && (
        <section className="v2-nu is-bezig">
          <span className="ff-eyebrow">Nu bezig</span>
          <div className="v2-nu-rij">
            <span className="v2-nu-emoji" aria-hidden="true">{bezigStap.emoji}</span>
            <span className="ff-grow">
              <b className="v2-nu-titel">{bezigStap.titel}</b>
              <span className="ff-bezig-balk" style={{ marginTop: 8 }}><i style={{ width: `${Math.round((bezigStap.bezig ?? 0) * 100)}%` }} /></span>
              {volgende && <span className="ff-small ff-muted ff-block" style={{ marginTop: 6 }}>Straks: {volgendeSub?.label ?? volgende.titel}</span>}
            </span>
          </div>
        </section>
      )}

      {/* Nu doen: één ding tegelijk */}
      {volgende && !bezigStap && (
        <section className="v2-nu">
          <span className="ff-eyebrow">Nu doen</span>
          <div className="v2-nu-rij">
            <span className="v2-nu-emoji" aria-hidden="true">{volgendeSub?.emoji ?? volgende.emoji}</span>
            <span className="ff-grow">
              <b className="v2-nu-titel">{volgendeSub?.label ?? volgende.titel}</b>
              {volgendeSub && <span className="ff-small ff-muted ff-block">Ochtendroutine · {volgende.sub!.filter((x) => x.klaar).length}/{volgende.sub!.length}</span>}
            </span>
            <button className="v2-check is-groot" onClick={() => (volgendeSub ? vinkSub(volgendeSub.id) : vink(volgende))} aria-label={`${volgendeSub?.label ?? volgende.titel} afvinken`}>✓</button>
          </div>
        </section>
      )}

      {/* Onze afspraak: de actie uit de afsprakenlus. Na een week meteen "hielp het?". */}
      {(() => {
        const vraag = teEvalueren(state, me.id)[0];
        const lopend = actief(state).slice(-1)[0];
        if (vraag) {
          return (
            <section className="v2-afspraak-kaart" aria-label="Hielp de afspraak?">
              <span className="ff-small"><b>🤝 Hielp jullie afspraak?</b> “{vraag.text}”</span>
              <div className="v2-hielp-knoppen is-klein">
                {(Object.keys(OORDEEL) as Oordeel[]).map((o) => (
                  <button key={o} className="ff-chip" onClick={() => { actions.evalueerAfspraak(vraag.id, me.id, o); if (o === "nee") onSamenVerder?.(); else onToast("Dank je!"); }}>{OORDEEL[o].emoji} {OORDEEL[o].label}</button>
                ))}
              </div>
            </section>
          );
        }
        if (!lopend) return null;
        return (
          <button className="v2-afspraak-kaart" onClick={onSamenVerder}>
            <span className="ff-small"><b>🤝 Onze afspraak:</b> {lopend.text}</span>
          </button>
        );
      })()}

      {/* Hoe voel je je: één tik */}
      <section className="v2-gevoel" aria-label="Hoe voel je je?">
        <span className="ff-small"><b>{vandaagIn ? "Je voelt je" : "Hoe voel je je?"}</b></span>
        <div className="v2-gevoel-rij">
          {MOODS.map((x) => (
            <button key={x.m} className="v2-face" aria-pressed={vandaagIn && ci?.mood === x.m && !ci.rest} aria-label={x.l} onClick={() => { actions.checkIn(me.id, { mood: x.m, rest: false, topics: [], wantsTalk: false }); if (x.m <= 2) onMeerGevoel(); else onToast(vandaagIn ? "Bijgewerkt" : "Ingecheckt ✓"); }}>{x.e}</button>
          ))}
          <button className="v2-face is-meer" onClick={onMeerGevoel} aria-label="Meer: rust, praten">⋯</button>
        </div>
      </section>

      {me.role !== "ouder" && <SchermKind state={state} me={me} />}

      {/* De hele dag, per dagdeel */}
      <div className="v2-dag">
        {DAGDELEN.map((d) => {
          const lijst = stappen.filter((s) => s.deel === d.id);
          if (!lijst.length) return null;
          const af = lijst.filter((s) => s.klaar).length;
          const isOpen = open === d.id;
          return (
            <section key={d.id} className={`v2-deel${d.id === nuDeel ? " is-nu" : ""}`}>
              <button className="v2-deel-kop" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? ("" as Dagdeel) : d.id)}>
                <span aria-hidden="true">{d.emoji}</span>
                <b className="ff-grow">{d.label}{d.id === nuDeel ? <span className="v2-nu-label">nu</span> : null}</b>
                <span className={`v2-deel-telling${af === lijst.length ? " is-af" : ""}`}>{af === lijst.length ? "✓" : `${af}/${lijst.length}`}</span>
              </button>
              {isOpen && (
                <ul className="v2-lijst">
                  {lijst.map((st) => (
                    <li key={st.id} className={`v2-stap${st.klaar ? " is-klaar" : ""}${st.later ? " is-later" : ""}${st.bezig !== undefined ? " is-bezig" : ""}`}>
                      <button className="v2-check" disabled={st.vanzelf} aria-pressed={st.klaar} onClick={() => vink(st)} aria-label={`${st.titel}${st.klaar ? ": klaar" : ""}`}>
                        {st.klaar ? "✓" : st.vanzelf ? st.emoji : ""}
                        {pop?.id === st.id && <span className="v2-pop">+{pop.n}</span>}
                      </button>
                      <span className="ff-grow v2-stap-t">
                        <span><span aria-hidden="true">{st.vanzelf ? "" : `${st.emoji} `}</span><b>{st.titel}</b></span>
                        {st.tijd && st.soort !== "slapen" && <span className="ff-small ff-muted"> {st.tijd.replace(":", ".")}</span>}
                        {st.later && <span className="ff-small ff-muted ff-block">na je werk of school</span>}
                        {st.soort === "klus" && !st.klaar && (() => {
                          const vr = vraagVan(state, st.klusKey!, me.id);
                          return (
                            <span className="ff-small ff-muted ff-block">
                              {st.minuten} min{st.samenMet ? ` · samen met ${st.samenMet} 🤝` : ""}
                              {vr ? ` · ${vr.antwoord ? antwoordTekst(state, vr.antwoord) : "vraag gestuurd"}` : ""}
                            </span>
                          );
                        })()}
                        {st.bezig !== undefined && <span className="ff-bezig-balk" style={{ marginTop: 6 }}><i style={{ width: `${Math.round(st.bezig * 100)}%` }} /></span>}
                        {st.sub && !st.klaar && (
                          <span className="v2-sub">
                            {st.sub.map((x) => (
                              <button key={x.id} className="v2-sub-knop" aria-pressed={x.klaar} onClick={() => vinkSub(x.id)}>
                                <span aria-hidden="true">{x.emoji}</span> {x.label}
                                {pop?.id === `sub:${x.id}` && <span className="v2-pop">+2</span>}
                              </button>
                            ))}
                          </span>
                        )}
                      </span>
                      {!!st.punten && !st.klaar && !st.vanzelf && <span className="v2-punten">+{st.punten}</span>}
                      {st.soort === "klus" && !st.klaar && <button className="v2-meer" onClick={() => setKlusOpen(st.klusKey!)} aria-label={`${st.titel}: ruilen, samen beslissen of lukt niet`}>⋯</button>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {me.role !== "ouder" && onPlanner && (
        <button className="v2-menu-rij" onClick={onPlanner}><span aria-hidden="true">📚</span><b className="ff-grow">Huiswerk en toetsen plannen</b><span aria-hidden="true">›</span></button>
      )}

      {claim && <ClaimViering me={me} van={claim.van} n={claim.n} onKlaar={() => setClaim(null)} />}
      <KlusSheet state={state} me={me} klus={klusOpen ? klusStatus(state).find((k) => k.key === klusOpen) ?? null : null} onClose={() => setKlusOpen(null)} onToast={onToast} />
    </div>
  );
}
