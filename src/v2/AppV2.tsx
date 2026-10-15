"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { DemoBar } from "@/components/DemoBar";
import { PorPopup } from "@/components/FamilyFlowApp";
import { AvatarMaker } from "@/components/screens/AvatarMaker";
import { CalmSheet } from "@/components/screens/CalmSheet";
import { CheckInSheet } from "@/components/screens/CheckInSheet";
import { CoachPlay } from "@/components/screens/Coach";
import { CoachNu } from "@/components/screens/CoachNu";
import { CoachTip } from "@/components/screens/CoachTip";
import { Gezin } from "@/components/screens/Gezin";
import { Ik } from "@/components/screens/Ik";
import { Leerplanner } from "@/components/screens/Leerplanner";
import { MijnWerk } from "@/components/screens/MijnWerk";
import { Oefenen } from "@/components/screens/Oefenen";
import { ProApp } from "@/components/screens/Pro";
import { Privacy } from "@/components/screens/Privacy";
import { Ruzie } from "@/components/screens/Ruzie";
import { BadgeViering } from "@/components/screens/Viering";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Meters } from "@/components/screens/MijnDag";
import { scenarioById } from "@/lib/coach";
import { dorst, walm } from "@/lib/dag";
import { honger } from "@/lib/huis";
import { expressionFor, moodLabel, timeLabel } from "@/lib/mood";
import { restTekst, slaapt, werktNu } from "@/lib/status";
import { actions, isLive, useFamily } from "@/lib/store";
import { syncSomtoday } from "@/lib/somtoday";
import { energyOf } from "@/lib/tasks";
import type { FamilyState } from "@/lib/types";
import { GezinV2 } from "./GezinV2";
import { IkV2 } from "./IkV2";
import { Vandaag } from "./Vandaag";
import { VoedingKaart } from "./Voeding";
import { Groei } from "./Groei";

type Tab = "vandaag" | "gezin" | "hulp" | "ik";
type Pagina = null | "avatar" | "werk" | "meer" | "ouders" | "planner" | "privacy";

const NAV: { id: Tab; label: string; icon: IconName }[] = [
  { id: "vandaag", label: "Vandaag", icon: "taken" },
  { id: "gezin", label: "Gezin", icon: "huis" },
  { id: "hulp", label: "Hulp", icon: "chat" },
  { id: "ik", label: "Ik", icon: "ik" },
];

const OPENERS: Record<string, string> = {
  School: "Hoe was het vandaag op school? Was er iets lastigs?",
  Thuis: "Ik merk dat er thuis iets dwarszit. Wil je vertellen wat?",
  Vrienden: "Gaat het goed met je vrienden?",
  "Broer of zus": "Ik hoorde dat het niet lekker liep met je broer of zus. Hoe zie jij het?",
  Online: "Is er online iets gebeurd? Je krijgt geen straf, ik wil het gewoon weten.",
  Slaap: "Je slaapt slecht, hè? Wat houdt je wakker?",
};

/**
  FamilyFlow 2.0 (acceptatie): vier tabbladen.
  - Vandaag: jouw dagprogramma, één ding tegelijk.
  - Gezin: de huiskamer, eten, klussen, potje, planning.
  - Hulp: rust, ruzie, oefenen en je coach-tip.
  - Ik: level, schatkist, achievements, instellingen.
*/
export function AppV2() {
  const raw = useFamily();
  const state: FamilyState = useMemo(() => ({ ...raw, members: raw.members.map((m) => ({ ...m, energy: energyOf(raw, m) })) }), [raw]);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("vandaag");
  const [pagina, setPagina] = useState<Pagina>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState(false);
  const [calm, setCalm] = useState(false);
  const [lid, setLid] = useState<string | null>(null);
  const [tips, setTips] = useState<string | null>(null);
  const [wie, setWie] = useState(false);
  const [ruzie, setRuzie] = useState<string | null>(null);
  const [coach, setCoach] = useState<string | null>(null);
  const [coachNu, setCoachNu] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);
  useEffect(() => window.scrollTo(0, 0), [tab, pagina]);
  useEffect(() => {
    const run = () => document.visibilityState === "visible" && void syncSomtoday().then((m) => m && setToast(m));
    const t = window.setTimeout(run, 1500);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", run);
    };
  }, []);

  if (!mounted) return <div className="ff-app ff-loading" aria-busy="true" />;
  // Demo: school of zorg kijkt mee (met toestemming van de ouders).
  const pro = state.pros.find((p) => p.id === state.me);
  if (pro) {
    return (
      <div className="ff-app ff-theme-pro">
        {!isLive() && <DemoBar state={state} onSwitch={() => setTab("vandaag")} />}
        <ProApp key={pro.id} state={state} pro={pro} onToast={setToast} />
        {toast && <div className="ff-toast" role="status">{toast.charAt(0).toUpperCase() + toast.slice(1)}</div>}
      </div>
    );
  }
  const me = state.members.find((m) => m.id === state.me) ?? state.members[0];
  const isOuder = me.role === "ouder";
  const live = isLive();
  const ouders = state.members.filter((m) => m.role === "ouder");
  const talkTo = isOuder ? ouders.find((p) => p.id !== me.id)?.name ?? "iemand die je vertrouwt" : ouders.map((p) => p.name.toLowerCase()).join(" of ") || "een ouder";
  const sel = lid ? state.members.find((m) => m.id === lid) : undefined;
  const tipKind = tips ? state.members.find((m) => m.id === tips) : undefined;
  const reset = () => {
    setTab("vandaag");
    setPagina(null);
    setRuzie(null);
    setCoach(null);
    setCoachNu(null);
  };

  // Volledige schermen die de navigatie verbergen.
  let vol: ReactElement | null = null;
  if (coachNu !== null) {
    vol = (
      <CoachNu key={coachNu || "kies"} state={state} me={me} startId={coachNu || undefined} onClose={() => setCoachNu(null)} onSamen={() => { setCoachNu(null); setRuzie(""); }} onToast={setToast}
        onPractice={(id) => {
          setCoachNu(null);
          if (isOuder) {
            const sc = scenarioById(id);
            for (const k of state.members.filter((m) => m.role !== "ouder")) actions.addQuest({ member: k.id, title: `Oefen: ${sc?.title ?? id}`, scenario: id, skill: sc?.skill, from: "ouder" });
            setToast("De oefening staat bij de kinderen als quest");
          } else setCoach(id);
        }} />
    );
  } else if (coach !== null) vol = <CoachPlay key={coach} id={coach} state={state} me={me} onClose={() => setCoach(null)} onToast={setToast} />;
  else if (ruzie !== null) vol = <Ruzie key={ruzie || "nieuw"} state={state} me={me} conflictId={ruzie || undefined} onClose={() => setRuzie(null)} onToast={setToast} onAfter={() => setCheckIn(true)} />;
  else if (pagina === "avatar") vol = <AvatarMaker key={me.id} member={me} onClose={() => setPagina(null)} onSaved={setToast} />;
  else if (pagina === "werk") vol = <MijnWerk state={state} me={me} onClose={() => setPagina(null)} onToast={setToast} />;
  else if (pagina === "planner") vol = <Leerplanner key={me.id} state={state} me={me} onClose={() => setPagina(null)} onToast={setToast} />;

  const terug = (inhoud: ReactElement) => (
    <>
      <button className="v2-terug" onClick={() => setPagina(null)}>‹ Terug</button>
      {inhoud}
    </>
  );

  return (
    <div className={`ff-app v2 ${isOuder ? "ff-theme-ouder" : "ff-theme-kind"}`}>
      {!live && !vol && <DemoBar state={state} onSwitch={reset} />}
      {vol ?? (
        <>
          {pagina === "meer" && terug(<Ik state={state} me={me} onEditAvatar={() => setPagina("avatar")} onCalm={() => setCalm(true)} onToast={setToast} />)}
          {pagina === "privacy" && <Privacy state={state} me={me} onToast={setToast} onTerug={() => setPagina(null)} />}
          {pagina === "ouders" && terug(<Gezin state={state} me={me} onToast={setToast} onOefenen={() => { setPagina(null); setTab("hulp"); }} onCoachNu={() => setCoachNu("")} />)}
          {!pagina && tab === "vandaag" && <Vandaag state={state} me={me} onToast={setToast} onMeerGevoel={() => setCheckIn(true)} onWie={() => (live ? setTab("ik") : setWie(true))} />}
          {!pagina && tab === "gezin" && <GezinV2 state={state} me={me} onToast={setToast} onOuders={() => setPagina("ouders")} onOpenLid={setLid} onTips={setTips} onRuzie={(id) => setRuzie(id ?? "")} onCheckIn={() => setCheckIn(true)} />}
          {!pagina && tab === "hulp" && (
            <Oefenen state={state} me={me} titel="Hulp" onToast={setToast} onCalm={() => setCalm(true)} onRuzie={() => setRuzie("")} onCoach={setCoach} onCoachNu={() => setCoachNu("")}
              onder={<>
                <CoachTip state={state} me={me} onToast={setToast} />
                {!isOuder && <button className="v2-menu-rij" onClick={() => setPagina("planner")}><span aria-hidden="true">📚</span><b className="ff-grow">Leerplanner: toetsen en huiswerk plannen</b><span aria-hidden="true">›</span></button>}
              </>} />
          )}
          {!pagina && tab === "ik" && <IkV2 state={state} me={me} onToast={setToast} onAvatar={() => setPagina("avatar")} onWerk={() => setPagina("werk")} onMeer={() => setPagina("meer")} onPrivacy={() => setPagina("privacy")} onOuders={isOuder ? () => setPagina("ouders") : undefined} />}

          <nav className="ff-nav v2-nav" aria-label="Hoofdmenu" style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}>
            {NAV.map((n) => {
              const cur = tab === n.id && !pagina;
              return (
                <button key={n.id} className="ff-nav-item" aria-current={cur ? "page" : undefined} onClick={() => { setPagina(null); setTab(n.id); }}>
                  <Icon name={n.icon} size={26} filled={cur} />
                  <span>{n.label}</span>
                </button>
              );
            })}
          </nav>
        </>
      )}

      <CheckInSheet open={checkIn} onClose={() => setCheckIn(false)} me={me} current={state.checkins[me.id]} talkTo={talkTo} onDone={setToast} />
      <CalmSheet open={calm} onClose={() => setCalm(false)} me={me} plan={state.plans[me.id]} onDone={setToast} />
      <PorPopup state={state} me={me} />
      <BadgeViering state={state} me={me} />

      {/* Gezinslid: status en porren */}
      <Sheet open={!!sel} onClose={() => setLid(null)} title={sel?.name ?? "Gezinslid"}>
        {sel && (() => {
          const zzz = slaapt(state, sel.id);
          const werk = zzz ? null : werktNu(state, sel.id);
          const ci = state.checkins[sel.id];
          return (
            <div className="ff-member">
              <Avatar config={sel.avatar} expression={zzz ? "slaap" : expressionFor(ci)} bezig={werk?.look} walm={!zzz && walm(state, sel.id)} dorst={!zzz && dorst(state, sel.id)} honger={!zzz && !werk && honger(state, sel.id)} energy={sel.energy} size={130} seed={5} label={sel.name} />
              <h2 className="ff-h2">{sel.id === me.id ? "Jij" : sel.name}</h2>
              <p className="ff-muted">{zzz ? "Slaapt" : werk ? `${werk.look === "school" ? "Op school" : werk.werk.naam} · ${restTekst(werk.rest)}` : ci ? `${moodLabel(ci)} · ${timeLabel(ci.at)}` : "Nog niet ingecheckt"}</p>
              {sel.joined !== false && <div style={{ width: "100%" }}><Meters state={state} id={sel.id} /></div>}
              {sel.joined !== false && (isOuder || sel.id === me.id) && <div style={{ width: "100%" }}><VoedingKaart state={state} id={sel.id} kanAanpassen={isOuder || sel.id === me.id} /></div>}
              {sel.joined !== false && sel.role !== "ouder" && (isOuder || sel.id === me.id) && <div className="v2-groei-kaart" style={{ width: "100%" }}><Groei state={state} lid={sel} me={me} onToast={setToast} compact /></div>}
              {sel.id !== me.id && !zzz && (
                <div className="ff-chips ff-center-row">
                  {["Ochtendroutine doen! 🚿", "Drink water 💧", "Pak fruit 🍎", "Kom helpen 🙌", "Goed bezig! 💪"].map((t) => (
                    <button key={t} className="ff-chip" onClick={() => setToast(actions.por(me.id, sel.id, t) ? `${sel.name} is gepord` : "Je hebt net al gepord")}>{t}</button>
                  ))}
                </div>
              )}
              {isOuder && sel.role !== "ouder" && <button className="ff-btn ff-btn-dark ff-btn-wide" onClick={() => { setLid(null); setTips(sel.id); }}>Hoe begin ik het gesprek?</button>}
              {(isOuder || sel.id === me.id) && (zzz
                ? <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => actions.wakeUp(sel.id)}>Is wakker</button>
                : <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => { actions.goToSleep(sel.id); setLid(null); }}>Gaat slapen</button>)}
            </div>
          );
        })()}
      </Sheet>

      <Sheet open={!!tipKind} onClose={() => setTips(null)} title="Hoe begin je het gesprek">
        {tipKind && (
          <div className="ff-stack">
            <h2 className="ff-h2">Praten met {tipKind.name}</h2>
            <div className="ff-script">
              <div className="ff-script-say"><b>Begin zo:</b> {(state.checkins[tipKind.id]?.topics ?? []).map((t) => OPENERS[t]).find(Boolean) ?? "Ik zag dat je je niet zo lekker voelt. Wil je vertellen wat er is?"}</div>
              <div><b>Doe:</b> naast elkaar in plaats van tegenover elkaar: in de auto, tijdens het koken of een wandeling. Luister, en vat samen wat je hoort.</div>
              <div><b>Wil {tipKind.name} niet praten?</b> Zeg: &ldquo;Oké. Ik ben er als je wilt.&rdquo; En kom er later op terug.</div>
              <div className="ff-script-dont"><b>Liever niet:</b> meteen oplossen, preken of doorvragen als een verhoor.</div>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={wie} onClose={() => setWie(false)} title="Wissel van gezinslid">
        <div className="ff-who-list">
          {state.members.map((m) => (
            <button key={m.id} className="ff-who-item" aria-pressed={m.id === me.id} onClick={() => { actions.switchMe(m.id); setWie(false); reset(); }}>
              <Avatar config={m.avatar} expression={expressionFor(state.checkins[m.id])} headOnly size={44} animate={false} label={m.name} />
              <span><b>{m.name}</b><br /><span className="ff-small ff-muted">{m.role === "ouder" ? "ouder" : `${m.age} jaar`}</span></span>
            </button>
          ))}
        </div>
        <button className="ff-link" onClick={() => { actions.reset(); setWie(false); reset(); setToast("Voorbeeldgezin teruggezet"); }}>Demo opnieuw beginnen</button>
      </Sheet>

      {toast && <div className="ff-toast" role="status">{toast.charAt(0).toUpperCase() + toast.slice(1)}</div>}
    </div>
  );
}
