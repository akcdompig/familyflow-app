"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { ClaimViering } from "@/components/screens/Viering";
import { AfspraakSheet, AfsprakenOpDag } from "@/components/screens/Afspraak";
import { Info } from "@/components/screens/Uitleg";
import { Herinneringen } from "@/components/screens/Herinneringen";
import { DAGDELEN, DOEL, begroeting, dagLog, dagdeel, datumTijd, reeks, type Dagdeel } from "@/lib/dag";
import { dagprogramma, nuDoen, voortgang, type Stap } from "@/lib/dagprogramma";
import { expressionFor } from "@/lib/mood";
import { actions } from "@/lib/store";
import type { OpenRegel } from "@/lib/herkomst";
import { teClaimen } from "@/lib/xp";
import { OngezondKnop } from "./Voeding";
import { dagStand } from "@/lib/groei";
import { SchermKind } from "./Scherm";
import { WeekRegel } from "@/components/screens/WeekKaart";
import { slaapt } from "@/lib/status";
import { KlusSheet, antwoordTekst, vraagVan } from "@/components/screens/KlusSheet";
import { klusStatus } from "@/lib/huis";
import { iso } from "@/lib/planner";
import { DUUR, gedaanVandaag, oefeningVanVandaag } from "@/lib/oefendag";
import { OEFENINGEN_PER_WEEK, oefeningenDezeWeek } from "@/lib/week";
import type { FamilyState, Member, MoodLevel } from "@/lib/types";

const GEVOEL_WOORD: Record<MoodLevel, string> = { 1: "slecht", 2: "niet zo goed", 3: "oké", 4: "goed", 5: "top" };
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
export function Vandaag({ state, me, onToast, onMeerGevoel, onWie, onPlanner, onWeek, onDagOefening, onLid }: { state: FamilyState; me: Member; onToast: (m: string) => void; onMeerGevoel: () => void; onWie: () => void; onSamenVerder?: () => void; onPlanner?: () => void; onWeek?: () => void; onDagOefening?: () => void; onLid?: (id: string) => void }) {
  const [, tik] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tik((n) => n + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const nuDeel = dagdeel();
  const [open, setOpen] = useState<Dagdeel>(nuDeel);
  const [pop, setPop] = useState<{ id: string; n: number } | null>(null);
  const [nieuweAfspraak, setNieuweAfspraak] = useState(false);
  const [claim, setClaim] = useState<{ van: number; n: number; regels: OpenRegel[] } | null>(null);
  const [klusOpen, setKlusOpen] = useState<string | null>(null);
  const [pushLater, setPushLater] = useState(() => {
    try {
      return Date.now() - Number(localStorage.getItem("familyflow:push-later") ?? 0) < 3 * 864e5;
    } catch {
      return false;
    }
  });
  // Wat een ouder op "overgeslagen" of "ging niet door" zette, staat niet meer in je lijst en telt niet mee.
  const status = state.taakStatus?.[me.id]?.[iso(new Date())] ?? {};
  const stappen = dagprogramma(state, me.id).filter((st) => st.klaar || !status[st.id]);
  const v = voortgang(stappen);
  // "Nu doen" komt bij voorkeur uit het dagdeel van nu: dat staat open. Anders het eerste open ding van eerder vandaag.
  const volgende = nuDoen(stappen.filter((st) => st.deel === dagdeel())) ?? nuDoen(stappen);
  const log = dagLog(state, me.id);
  const ci = state.checkins[me.id];
  const vandaagIn = !!ci && new Date(ci.at).toDateString() === new Date().toDateString();
  // Vaste momenten: 's ochtends "Ben je op?", 's avonds "Welterusten". Tien seconden, op een vast moment: zo wordt het een gewoonte.
  const nuMin = new Date().getHours() * 60 + new Date().getMinutes();
  const ochtendStart = !vandaagIn && nuMin >= 5 * 60 && nuMin < 12 * 60;
  const bedMin = (() => { const [h, m] = (me.bedtime ?? (me.role === "ouder" ? "23:00" : "21:30")).split(":").map(Number); return h * 60 + m; })();
  const avond = nuMin >= Math.min(bedMin - 90, 21 * 60) || nuMin < 4 * 60;
  const gevoelSectie = (
      <section className={`v2-gevoel${ochtendStart ? " is-ochtend" : ""}`} aria-label="Hoe voel je je?">
        <span className="ff-small"><b>{ochtendStart ? "☀️ Goedemorgen! Ben je op? Tik hoe je je voelt" : vandaagIn ? "Je voelt je" : "Hoe voel je je?"}</b>{vandaagIn && ci && !ci.rest && MOODS.find((x) => x.m === ci.mood) ? <span className="v2-gevoel-woord"> {GEVOEL_WOORD[ci.mood]}</span> : null}</span>
        <div className="v2-gevoel-rij">
          {MOODS.map((x) => (
            <button key={x.m} className="v2-face" aria-pressed={vandaagIn && ci?.mood === x.m && !ci.rest} aria-label={x.l} onClick={() => { actions.checkIn(me.id, { mood: x.m, rest: false, topics: [], wantsTalk: false }); if (x.m <= 2) onMeerGevoel(); else onToast(vandaagIn ? "Bijgewerkt" : "Ingecheckt ✓"); }}>{x.e}</button>
          ))}
          <button className="v2-face is-meer" onClick={onMeerGevoel} aria-label="Meer: rust, praten">⋯</button>
        </div>
      </section>
  );
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

  // De lijst van het dagdeel van nu staat bovenaan. Het volgende ding om te doen krijgt een rand; geen aparte "Nu doen"-kaart meer.
  const dagLijstJsx = (
    <div className="v2-dag" aria-label="Je dag">
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
                {lijst.map((st) => {
                  const isVolgende = !bezigStap && volgende?.id === st.id;
                  return (
                    <li key={st.id} className={`v2-stap${st.klaar ? " is-klaar" : ""}${st.later ? " is-later" : ""}${st.bezig !== undefined ? " is-bezig" : ""}${isVolgende ? " is-volgende" : ""}`}>
                      <button className="v2-check" disabled={st.vanzelf} aria-pressed={st.klaar} onClick={() => vink(st)} aria-label={`${st.titel}${st.klaar ? ": klaar" : ""}`}>
                        {st.klaar ? "✓" : st.vanzelf ? st.emoji : ""}
                        {pop?.id === st.id && <span className="v2-pop">+{pop.n}</span>}
                      </button>
                      <span className="ff-grow v2-stap-t">
                        {isVolgende && <span className="v2-volgende-label">Nu doen</span>}
                        <span><span aria-hidden="true">{st.vanzelf ? "" : `${st.emoji} `}</span><b className="v2-stap-titel">{st.titel}</b></span>
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
                              <button key={x.id} className={`v2-sub-knop${isVolgende && x.id === volgendeSub?.id ? " is-volgende" : ""}`} aria-pressed={x.klaar} onClick={() => vinkSub(x.id)}>
                                <span aria-hidden="true">{x.emoji}</span> {x.label}
                                {pop?.id === `sub:${x.id}` && <span className="v2-pop">+2</span>}
                              </button>
                            ))}
                          </span>
                        )}
                      </span>
                      {st.soort === "klus" && !st.klaar && <button className="v2-meer" onClick={() => setKlusOpen(st.klusKey!)} aria-label={`${st.titel}: ruilen, samen beslissen of lukt niet`}>⋯</button>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );

  return (
    <div className="ff-screen v2-screen">
      <header className="v2-top">
        <div>
          <div className="ff-eyebrow">{datumTijd()}</div>
          <h1 className="ff-h1">{begroeting()}, {me.name}</h1>
          {!ochtendStart && (
            <button className="v2-gevoel-chip" onClick={onMeerGevoel} aria-label={vandaagIn && ci && !ci.rest ? `Je voelt je ${GEVOEL_WOORD[ci.mood]}. Aanpassen` : "Hoe voel je je? Inchecken"}>
              {vandaagIn && ci && !ci.rest ? <>{MOODS.find((x) => x.m === ci.mood)?.e} Je voelt je {GEVOEL_WOORD[ci.mood]} <span className="ff-muted">· aanpassen</span></> : <>🙂 Hoe voel je je? <span className="ff-muted">· tik</span></>}
            </button>
          )}
        </div>
        <button className="v2-plus-afspraak" onClick={() => setNieuweAfspraak(true)} aria-label="Afspraak toevoegen">＋</button>
        <button className="v2-ik" onClick={onWie} aria-label={`Je bent ${me.name}`}>
          <Avatar config={me.avatar} expression={expressionFor(ci)} size={40} headOnly animate={false} label={me.name} />
        </button>
      </header>

      {/* Ouders openen de app vooral om naar de kinderen te kijken: die staan bovenaan. */}
      {me.role === "ouder" && onLid && <KinderRij state={state} onLid={onLid} />}

      {/* Hoe ver ben je vandaag: één getal. Punten ophalen kan, maar staat niet meer in de weg. */}
      <section className="v2-hero is-compact">
        <div className="v2-ring" aria-label={`${v.klaar} van ${v.totaal} klaar`}>
          <svg viewBox="0 0 110 110" width="76" height="76" aria-hidden="true">
            <circle cx="55" cy="55" r={R} fill="none" stroke="var(--v2-ring-bg)" strokeWidth="10" />
            <circle cx="55" cy="55" r={R} fill="none" stroke="url(#v2g)" strokeWidth="10" strokeLinecap="round" strokeDasharray={omtrek} strokeDashoffset={omtrek * (1 - pct)} transform="rotate(-90 55 55)" style={{ transition: "stroke-dashoffset .6s ease" }} />
            <defs>
              <linearGradient id="v2g" x1="0" x2="1"><stop offset="0" stopColor="#ffc845" /><stop offset="1" stopColor="#3cc6a0" /></linearGradient>
            </defs>
          </svg>
          <div className="v2-ring-av"><Avatar config={me.avatar} expression={pct >= 1 ? "blij" : expressionFor(ci)} size={44} headOnly animate={false} label="" /></div>
        </div>
        <div className="v2-hero-t">
          <b className="v2-groot">{v.klaar}<span className="ff-muted">/{v.totaal}</span></b>
          <span className="ff-small ff-muted">{pct >= 1 ? "Alles af! Topdag 🎉" : "klaar vandaag"}{r > 1 ? ` · 🔥 ${r} dagen` : ""} <Info label="Wat betekent dit getal?" tekst={`Zoveel dingen van je lijst zijn af: routine, eten, taken en klussen.${r > 1 ? " 🔥 = zoveel dagen op rij je ochtendroutine af." : ""} Elk vinkje geeft punten. Die haal je op met de knop eronder of bij Ik.`} /></span>
          {kist > 0 && (
            <button className="v2-ophalen" onClick={() => { const c = actions.claim(me.id); if (c) setClaim({ van: c.van, n: c.totaal, regels: c.regels }); }}>
              💎 {kist} punten ophalen
            </button>
          )}
        </div>
      </section>

      {ochtendStart && gevoelSectie}
      {avond && <Welterusten state={state} me={me} onToast={onToast} />}

      {/* Aan het werk of op school: dat is nu je "ding". */}
      {bezigStap && (
        <section className="v2-nu is-bezig is-klein">
          <div className="v2-nu-rij">
            <span className="v2-nu-emoji" aria-hidden="true">{bezigStap.emoji}</span>
            <span className="ff-grow">
              <b>{bezigStap.titel}</b>
              <span className="ff-bezig-balk" style={{ marginTop: 6 }}><i style={{ width: `${Math.round((bezigStap.bezig ?? 0) * 100)}%` }} /></span>
            </span>
          </div>
        </section>
      )}

      {dagLijstJsx}

      {/* Daarna pas de rest. Eerst wat het afvinken oplevert: je scherm en je week. */}
      {me.role !== "ouder" && <SchermKind state={state} me={me} />}
      {me.role !== "ouder" && onWeek && <WeekRegel state={state} me={me} onWeek={onWeek} />}

      <Drinken state={state} me={me} onToast={onToast} />


      {/* Oefening van vandaag en een klaarstaande oefentoets. */}
      {me.role !== "ouder" && onDagOefening && <DagOefeningKaart state={state} me={me} onStart={onDagOefening} onToast={onToast} />}
      {me.role !== "ouder" && onPlanner && (state.oefentoetsen?.[me.id] ?? []).filter((t) => !t.pogingen?.length).slice(0, 1).map((t) => (
        <button key={t.id} className="v2-menu-rij v2-toets-klaar" onClick={onPlanner}><span aria-hidden="true">📝</span><b className="ff-grow">Oefentoets klaar: {t.titel}</b><span aria-hidden="true">›</span></button>
      ))}

      {/* Losse afspraken van vandaag: alleen als je er hebt. */}
      {(state.agenda?.[me.id] ?? []).some((a) => a.datum === iso(new Date())) && (
        <AfsprakenOpDag state={state} me={me} datum={iso(new Date())} onToast={onToast} alleenIk toevoegen={false} titel="📅 Jouw afspraken vandaag" />
      )}

      {!pushLater && <Herinneringen compact onToast={onToast} onWeg={() => { setPushLater(true); try { localStorage.setItem("familyflow:push-later", String(Date.now())); } catch { /* */ } }} />}

      {/* 3.11: week en huiswerk staan bij Week; een afspraak zet je met het plusje bovenaan. */}
      <AfspraakSheet open={nieuweAfspraak} me={me} datum={iso(new Date())} onClose={() => setNieuweAfspraak(false)} onToast={onToast} />

      {claim && <ClaimViering me={me} van={claim.van} n={claim.n} regels={claim.regels} onKlaar={() => setClaim(null)} />}
      <KlusSheet state={state} me={me} klus={klusOpen ? klusStatus(state).find((k) => k.key === klusOpen) ?? null : null} onClose={() => setKlusOpen(null)} onToast={onToast} />
    </div>
  );
}

/** Ouders: elk kind in één rij. Tik = de dag van dat kind (afvinken, overslaan, week). */
function KinderRij({ state, onLid }: { state: FamilyState; onLid: (id: string) => void }) {
  const kinderen = state.members.filter((m) => m.role !== "ouder");
  if (!kinderen.length) return null;
  return (
    <section className="v2-kinderrij" aria-label="De kinderen vandaag">
      {kinderen.map((k) => {
        const stand = dagStand(state, k.id, iso(new Date()));
        const ci = state.checkins[k.id];
        return (
          <button key={k.id} className={`v2-kind-knop${stand.af >= stand.totaal && stand.totaal > 0 ? " is-af" : ""}`} onClick={() => onLid(k.id)} aria-label={`${k.name}: ${stand.af} van ${stand.totaal} gedaan. Bekijk de dag`}>
            <Avatar config={k.avatar} expression={expressionFor(ci)} size={40} headOnly animate={false} label="" />
            <span className="v2-kind-t"><b>{k.name}</b><span className="ff-small">{stand.af} van {stand.totaal}</span></span>
            <span className="v2-kind-balk" aria-hidden="true"><i style={{ width: `${stand.totaal ? Math.round((stand.af / stand.totaal) * 100) : 0}%` }} /></span>
          </button>
        );
      })}
    </section>
  );
}

/** Water en fruit, altijd zichtbaar. 6 glazen = 1,5 liter. Per ongeluk te veel? Tik op het laatste glas. */
function Drinken({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const log = dagLog(state, me.id);
  const zet = (soort: "water" | "fruit", i: number) =>
    actions.updateDag(me.id, (l) => {
      const nu = l[soort];
      return { ...l, [soort]: i < nu ? i : i + 1 };
    });
  const glazen = Math.max(DOEL.water, log.water);
  return (
    <section className="ff-card v2-drinken" aria-label="Water en fruit">
      <div className="v2-drinken-rij">
        <span className="v2-drinken-kop"><b>💧 Water</b><span className="ff-small ff-muted"> {log.water} van {DOEL.water} glazen · 1,5 liter</span></span>
        <div className="v2-glazen" role="group" aria-label="Glazen water">
          {Array.from({ length: glazen }, (_, i) => (
            <button key={i} className="ff-dag-glas" aria-pressed={i < log.water} aria-label={i < log.water && i === log.water - 1 ? `${i + 1} glazen water, tik om er één af te halen` : `${i + 1} ${i ? "glazen" : "glas"} water`} onClick={() => { zet("water", i); if (i + 1 === DOEL.water && log.water < DOEL.water) onToast("1,5 liter! Je brein is je dankbaar 💧"); }}>💧</button>
          ))}
          <button className="ff-dag-glas is-plus" aria-label="Nog een glas water" onClick={() => actions.updateDag(me.id, (l) => ({ ...l, water: l.water + 1 }))}>+</button>
        </div>
      </div>
      <div className="v2-drinken-rij">
        <span className="v2-drinken-kop"><b>🍎 Fruit</b><span className="ff-small ff-muted"> {log.fruit} van {DOEL.fruit} stuks</span></span>
        <div className="v2-glazen" role="group" aria-label="Stuks fruit">
          {Array.from({ length: Math.max(DOEL.fruit, log.fruit) }, (_, i) => (
            <button key={i} className="ff-dag-glas" aria-pressed={i < log.fruit} aria-label={`${i + 1} ${i ? "stuks" : "stuk"} fruit`} onClick={() => zet("fruit", i)}>🍎</button>
          ))}
          <button className="ff-dag-glas is-plus" aria-label="Nog een stuk fruit" onClick={() => actions.updateDag(me.id, (l) => ({ ...l, fruit: l.fruit + 1 }))}>+</button>
          <OngezondKnop state={state} me={me} onToast={onToast} />
        </div>
      </div>
    </section>
  );
}

/** "Jouw oefening van vandaag": welke, waarom, hoe lang, en of hij af is. Af? Dan kun je het ook ongedaan maken. */
function DagOefeningKaart({ state, me, onStart, onToast }: { state: FamilyState; me: Member; onStart: () => void; onToast: (m: string) => void }) {
  const d = iso(new Date());
  const sc = oefeningVanVandaag(state, me.id, d);
  const af = gedaanVandaag(state, me.id, d);
  const [terug, setTerug] = useState(false);
  const [toch, setToch] = useState(false);
  // Weekritme: 3 per week, jij kiest wanneer. Een dag overslaan bestaat dus niet.
  const n = oefeningenDezeWeek(state, me.id);
  if (!af && n >= OEFENINGEN_PER_WEEK && !toch) {
    return (
      <section className="ff-card v2-dagoef is-af" aria-label="Oefening van vandaag">
        <span className="v2-dagoef-icoon" aria-hidden="true">🎯</span>
        <span className="ff-grow ff-stack-xs">
          <b>{n} van {OEFENINGEN_PER_WEEK} oefeningen deze week ✓</b>
          <span className="ff-small ff-muted">Je weekdoel is gehaald. Zin in nog eentje? Mag, hoeft niet.</span>
          <button className="ff-link ff-small v2-dagoef-terug" onClick={() => setToch(true)}>Nog een oefening doen</button>
        </span>
      </section>
    );
  }
  if (af) {
    return (
      <section className="ff-card v2-dagoef is-af" aria-label="Oefening van vandaag">
        <span className="v2-dagoef-icoon" aria-hidden="true">✅</span>
        <span className="ff-grow ff-stack-xs">
          <b>Oefening van vandaag gedaan</b>
          <span className="ff-small ff-muted">{sc.title} · {Math.min(n, OEFENINGEN_PER_WEEK)} van {OEFENINGEN_PER_WEEK} deze week.</span>
          {!terug ? (
            <button className="ff-link ff-small v2-dagoef-terug" onClick={() => setTerug(true)}>Per ongeluk? Ongedaan maken</button>
          ) : (
            <span className="ff-row v2-dagoef-terug">
              <span className="ff-small ff-grow">Terugdraaien? De punten gaan er weer af.</span>
              <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => setTerug(false)}>Nee</button>
              <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => { actions.dagOefeningTerug(me.id); setTerug(false); onToast("Teruggedraaid. De oefening staat weer klaar"); }}>Ja</button>
            </span>
          )}
        </span>
      </section>
    );
  }
  return (
    <section className="ff-card v2-dagoef" aria-label="Oefening van vandaag">
      <span className="v2-dagoef-icoon" aria-hidden="true">🎯</span>
      <span className="ff-grow ff-stack-xs">
        <span className="ff-eyebrow">Oefening · {Math.min(n, OEFENINGEN_PER_WEEK)} van {OEFENINGEN_PER_WEEK} deze week · {DUUR}</span>
        <span className="ff-row v2-dagoef-rij"><b className="ff-grow">{sc.title}</b><button className="ff-btn ff-btn-primary ff-btn-s" onClick={onStart}>Start oefening</button></span>
      </span>
    </section>
  );
}

/** 's Avonds: telefoon aan de lader en welterusten. Eén tik. Slaap je al? Dan kun je je weer wakker tikken. */
function Welterusten({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const zzz = slaapt(state, me.id);
  if (zzz) {
    return (
      <section className="ff-card v2-avond is-slaap" aria-label="Welterusten">
        <span className="v2-dagoef-icoon" aria-hidden="true">😴</span>
        <span className="ff-grow ff-stack-xs"><b>Slaap lekker</b><span className="ff-small ff-muted">Morgen staat je dag weer klaar.</span></span>
        <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => actions.wakeUp(me.id)}>Toch wakker</button>
      </section>
    );
  }
  return (
    <section className="ff-card v2-avond" aria-label="Welterusten">
      <span className="v2-dagoef-icoon" aria-hidden="true">🌙</span>
      <span className="ff-grow ff-stack-xs">
        <b>Bijna bedtijd{me.bedtime ? ` (${me.bedtime.replace(":", ".")})` : ""}</b>
        <span className="ff-small">Nog iets gedaan maar vergeten af te vinken? Doe het nu. Daarna telefoon aan de lader.</span>
        <button className="ff-btn ff-btn-primary ff-btn-s v2-dagoef-start" onClick={() => { actions.goToSleep(me.id); onToast("Welterusten 🌙"); }}>Welterusten</button>
      </span>
    </section>
  );
}
