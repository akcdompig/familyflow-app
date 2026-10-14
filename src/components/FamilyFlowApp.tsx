"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { DemoBar } from "@/components/DemoBar";
import { AvatarMaker } from "@/components/screens/AvatarMaker";
import { CalmSheet } from "@/components/screens/CalmSheet";
import { CheckInSheet } from "@/components/screens/CheckInSheet";
import { Huiskamer } from "@/components/screens/Huiskamer";
import { Gezin } from "@/components/screens/Gezin";
import { Ik } from "@/components/screens/Ik";
import { ProApp } from "@/components/screens/Pro";
import { Ruzie } from "@/components/screens/Ruzie";
import { CoachPlay } from "@/components/screens/Coach";
import { CoachNu } from "@/components/screens/CoachNu";
import { Leerplanner } from "@/components/screens/Leerplanner";
import { scenarioById } from "@/lib/coach";
import { features } from "@/lib/unlock";
import { Oefenen } from "@/components/screens/Oefenen";
import { Taken } from "@/components/screens/Taken";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { expressionFor, moodLabel, timeLabel } from "@/lib/mood";
import { actions, isLive, lastSyncError, useFamily } from "@/lib/store";
import { syncSomtoday } from "@/lib/somtoday";
import { slaapt, werktNu } from "@/lib/status";
import { energyOf, isDone, tasksFor } from "@/lib/tasks";
import type { FamilyState } from "@/lib/types";

type Screen = "huis" | "taken" | "oefenen" | "gezin" | "ik" | "maker";

const TOPIC_OPENERS: Record<string, string> = {
  School: "Hoe was het vandaag op school? Was er iets lastigs?",
  Thuis: "Ik merk dat er thuis iets dwarszit. Wil je vertellen wat?",
  Vrienden: "Gaat het goed met je vrienden?",
  "Broer of zus": "Ik hoorde dat het niet lekker liep met je broer of zus. Hoe zie jij het?",
  Online: "Is er online iets gebeurd? Je krijgt geen straf, ik wil het gewoon weten.",
  Slaap: "Je slaapt slecht, hè? Wat houdt je wakker?",
};

const NAV_KIND: { id: Screen; label: string; icon: IconName }[] = [
  { id: "huis", label: "Huiskamer", icon: "huis" },
  { id: "taken", label: "Taken", icon: "taken" },
  { id: "oefenen", label: "Oefenen", icon: "oefenen" },
  { id: "ik", label: "Ik", icon: "ik" },
];
const NAV_OUDER: typeof NAV_KIND = [
  { id: "huis", label: "Huiskamer", icon: "huis" },
  { id: "taken", label: "Taken", icon: "taken" },
  { id: "gezin", label: "Gezin", icon: "gezin" },
  { id: "ik", label: "Ik", icon: "ik" },
];

export function FamilyFlowApp() {
  const raw = useFamily();
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>("huis");
  const [checkIn, setCheckIn] = useState(false);
  const [calm, setCalm] = useState(false);
  const [member, setMember] = useState<string | null>(null);
  const [tips, setTips] = useState<string | null>(null);
  const [who, setWho] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Ruzie-scherm: null = dicht, "" = nieuwe ruzie, anders id van een ruzie om op te reageren.
  const [ruzie, setRuzie] = useState<string | null>(null);
  const [coach, setCoach] = useState<string | null>(null);
  const [coachNu, setCoachNu] = useState<string | null>(null);
  const [planner, setPlanner] = useState(false);

  // Energie van elke avatar komt uit de taken van vandaag.
  const state: FamilyState = useMemo(() => ({ ...raw, members: raw.members.map((m) => ({ ...m, energy: energyOf(raw, m) })) }), [raw]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);
  // Somtoday: bij openen (en terugkomen in de app) nieuwe toetsen en huiswerk inplannen. Hooguit om de 3 uur.
  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "visible") void syncSomtoday().then((m) => m && setToast(m));
    };
    const t = window.setTimeout(run, 1500);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", run);
    };
  }, []);

  const closeCheckIn = useCallback(() => setCheckIn(false), []);
  const closeCalm = useCallback(() => setCalm(false), []);
  const closeMember = useCallback(() => setMember(null), []);
  const closeTips = useCallback(() => setTips(null), []);
  const closeWho = useCallback(() => setWho(false), []);

  if (!mounted) return <div className="ff-app ff-loading" aria-busy="true" />;

  const afterSwitch = () => {
    setScreen("huis");
    setRuzie(null);
    setCoach(null);
    setCoachNu(null);
    setPlanner(false);
    setToast(null);
    window.scrollTo(0, 0);
  };

  const pro = state.pros.find((p) => p.id === state.me);
  if (pro) {
    return (
      <div className="ff-app ff-theme-pro">
        <DemoBar state={state} onSwitch={afterSwitch} />
        <ProApp key={pro.id} state={state} pro={pro} onToast={setToast} />
        {toast && <div className="ff-toast" role="status">{toast.charAt(0).toUpperCase() + toast.slice(1)}</div>}
      </div>
    );
  }

  const me = state.members.find((m) => m.id === state.me) ?? state.members[0];
  const parents = state.members.filter((m) => m.role === "ouder");
  const talkTo = me.role === "ouder" ? parents.find((p) => p.id !== me.id)?.name ?? "iemand die je vertrouwt" : parents.map((p) => p.name.toLowerCase()).join(" of ") || "een ouder";
  const sel = member ? state.members.find((m) => m.id === member) : undefined;
  const selCi = sel ? state.checkins[sel.id] : undefined;
  const canSeeDetails = !!sel && (sel.id === me.id || (me.role === "ouder" && sel.role !== "ouder"));
  const selTasks = sel ? tasksFor(state, sel.id) : [];
  const tipKid = tips ? state.members.find((m) => m.id === tips) : undefined;
  const tipTopics = tipKid ? state.checkins[tipKid.id]?.topics ?? [] : [];
  const openLeft = tasksFor(state, me.id).filter((t) => !isDone(state, t.id)).length;
  const isParent = me.role === "ouder";
  const live = isLive();
  const syncErr = lastSyncError();
  const feat = features(state);
  const nav = isParent ? NAV_OUDER : NAV_KIND.filter((n) => n.id !== "oefenen" || feat.oefenen);
  const hot = state.conflicts.filter((c) => c.status === "hulp" || (c.physical && c.status !== "opgelost")).length;
  const view: Screen = screen === "gezin" && !isParent ? "huis" : screen;

  return (
    <div className={`ff-app ${isParent ? "ff-theme-ouder" : "ff-theme-kind"}`}>
      {screen !== "maker" && !live && <DemoBar state={state} onSwitch={afterSwitch} />}
      {live && syncErr && <div className="ff-syncbar" role="status">Niet opgeslagen: {syncErr}. Ik probeer het zo opnieuw.</div>}
      {planner ? (
        <Leerplanner key={me.id} state={state} me={me} onClose={() => setPlanner(false)} onToast={setToast} />
      ) : coachNu !== null ? (
        <CoachNu
          key={coachNu || "kies"}
          state={state}
          me={me}
          startId={coachNu || undefined}
          onClose={() => setCoachNu(null)}
          onSamen={() => { setCoachNu(null); setRuzie(""); }}
          onToast={setToast}
          onPractice={(id) => {
            setCoachNu(null);
            if (me.role === "ouder") {
              const sc = scenarioById(id);
              for (const k of state.members.filter((m) => m.role !== "ouder")) actions.addQuest({ member: k.id, title: `Oefen: ${sc?.title ?? id}`, scenario: id, skill: sc?.skill, from: "ouder" });
              setToast("De oefening staat bij de kinderen als quest");
            } else setCoach(id);
          }}
        />
      ) : coach !== null ? (
        <CoachPlay key={coach} id={coach} state={state} me={me} onClose={() => setCoach(null)} onToast={setToast} />
      ) : ruzie !== null ? (
        <Ruzie key={ruzie || "nieuw"} state={state} me={me} conflictId={ruzie || undefined} onClose={() => setRuzie(null)} onToast={setToast} onAfter={() => setCheckIn(true)} />
      ) : (
        <>
      {view === "huis" && (
        <Huiskamer state={state} me={me} onCheckIn={() => setCheckIn(true)} onOpenMember={setMember} onTalkTips={setTips} onWho={() => (live ? setScreen("ik") : setWho(true))} onGoTasks={() => setScreen("taken")} onRuzie={(id) => setRuzie(id ?? "")} onGoGezin={() => setScreen("gezin")} onCoachNu={() => setCoachNu("")} />
      )}
      {view === "taken" && <Taken state={state} me={me} onToast={setToast} onPlay={setCoach} onPlanner={() => setPlanner(true)} />}
      {view === "oefenen" && <Oefenen state={state} me={me} onToast={setToast} onCalm={() => setCalm(true)} onRuzie={() => setRuzie("")} onCoach={setCoach} onCoachNu={() => setCoachNu("")} />}
      {view === "gezin" && isParent && <Gezin state={state} me={me} onToast={setToast} onOefenen={() => setScreen("oefenen")} onCoachNu={() => setCoachNu("")} />}
      {view === "ik" && <Ik state={state} me={me} onEditAvatar={() => setScreen("maker")} onCalm={() => setCalm(true)} onToast={setToast} />}
      {view === "maker" && <AvatarMaker key={me.id} member={me} onClose={() => setScreen("ik")} onSaved={setToast} />}
        </>
      )}

      {screen !== "maker" && ruzie === null && coach === null && coachNu === null && !planner && (
        <nav className="ff-nav" aria-label="Hoofdmenu" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
          {nav.map((n) => {
            const cur = screen === n.id || (n.id === "gezin" && screen === "oefenen" && isParent);
            return (
            <button key={n.id} className="ff-nav-item" aria-current={cur ? "page" : undefined} onClick={() => setScreen(n.id)}>
              <Icon name={n.icon} size={26} filled={cur} />
              <span>{n.label}</span>
              {n.id === "taken" && openLeft > 0 && <span className="ff-nav-badge" aria-label={`${openLeft} open`}>{openLeft}</span>}
              {n.id === "gezin" && hot > 0 && <span className="ff-nav-badge" aria-label={`${hot} ruzie die aandacht vraagt`}>!</span>}
            </button>
            );
          })}
        </nav>
      )}

      <CheckInSheet open={checkIn} onClose={closeCheckIn} me={me} current={state.checkins[me.id]} talkTo={talkTo} onDone={setToast} />
      <CalmSheet open={calm} onClose={closeCalm} me={me} plan={state.plans[me.id]} onDone={setToast} />

      <Sheet open={!!sel} onClose={closeMember} title={sel ? sel.name : "Gezinslid"}>
        {sel && (
          <div className="ff-member">
            <Avatar config={sel.avatar} expression={slaapt(state, sel.id) ? "slaap" : expressionFor(selCi)} bezig={slaapt(state, sel.id) ? undefined : werktNu(state, sel.id)?.look} energy={sel.energy} size={130} seed={5} label={sel.name} />
            <h2 className="ff-h2">{sel.id === me.id ? "Jij" : sel.name}</h2>
            <p className="ff-muted">{slaapt(state, sel.id) ? "Slaapt" : werktNu(state, sel.id) ? `Aan het werk · ${werktNu(state, sel.id)!.werk.naam}` : selCi ? `${moodLabel(selCi)} · ${timeLabel(selCi.at)}` : "Nog niet ingecheckt"}</p>
            {canSeeDetails && selCi && selCi.topics.length > 0 && (
              <div className="ff-chips ff-center-row">
                {selCi.topics.map((t) => (
                  <span key={t} className="ff-chip ff-chip-static">{t}</span>
                ))}
              </div>
            )}
            {canSeeDetails && selCi?.wantsTalk && sel.id !== me.id && <p className="ff-strong">{sel.name} wil graag met je praten.</p>}
            {selTasks.length > 0 && (
              <div className="ff-energy">
                <span className="ff-eyebrow">Taken vandaag: {selTasks.filter((t) => isDone(state, t.id)).length} van {selTasks.length}</span>
                <span className="ff-bar"><i style={{ width: `${Math.round(sel.energy * 100)}%` }} /></span>
              </div>
            )}
            {me.role === "ouder" && sel.role !== "ouder" && (
              <button className="ff-btn ff-btn-dark ff-btn-wide" onClick={() => { closeMember(); setTips(sel.id); }}>
                Hoe begin ik het gesprek?
              </button>
            )}
            {(me.role === "ouder" || sel.id === me.id) && (
              slaapt(state, sel.id) ? (
                <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => { actions.wakeUp(sel.id); setToast(`${sel.id === me.id ? "Je bent" : `${sel.name} is`} wakker`); }}>Is wakker</button>
              ) : (
                <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => { actions.goToSleep(sel.id); closeMember(); setToast(sel.id === me.id ? "Welterusten" : `${sel.name} slaapt`); }}>Gaat slapen</button>
              )
            )}
            {sel.id === me.id && (
              <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => { closeMember(); setScreen("maker"); }}>
                Avatar aanpassen
              </button>
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={!!tipKid} onClose={closeTips} title="Hoe begin je het gesprek">
        {tipKid && (
          <div className="ff-stack">
            <h2 className="ff-h2">Praten met {tipKid.name}</h2>
            <div className="ff-script">
              <div className="ff-script-say"><b>Begin zo:</b> {tipTopics.map((t) => TOPIC_OPENERS[t]).find(Boolean) ?? "Ik zag dat je je niet zo lekker voelt. Wil je vertellen wat er is?"}</div>
              <div><b>Doe:</b> naast elkaar in plaats van tegenover elkaar: in de auto, tijdens het koken of een wandeling. Luister, en vat samen wat je hoort.</div>
              <div><b>Wil {tipKid.name} niet praten?</b> Zeg: &ldquo;Oké. Ik ben er als je wilt.&rdquo; En kom er later op terug.</div>
              <div className="ff-script-dont"><b>Liever niet:</b> meteen oplossen, preken of doorvragen als een verhoor.</div>
            </div>
            <p className="ff-small ff-muted">Maak je je langer zorgen? Bespreek het met de mentor of het wijkteam.</p>
          </div>
        )}
      </Sheet>

      <Sheet open={who} onClose={closeWho} title="Wissel van gezinslid">
        <div className="ff-stack">
          <h2 className="ff-h2">Wie gebruikt de app?</h2>
          <p className="ff-small ff-muted">In de echte app logt iedereen in op een eigen telefoon. In deze demo wissel je hier.</p>
          <div className="ff-who-list">
            {state.members.map((m) => (
              <button key={m.id} className="ff-who-item" aria-pressed={m.id === me.id} onClick={() => { actions.switchMe(m.id); closeWho(); afterSwitch(); }}>
                <Avatar config={m.avatar} expression={expressionFor(state.checkins[m.id])} headOnly size={44} animate={false} label={m.name} />
                <span><b>{m.name}</b><br /><span className="ff-small ff-muted">{m.role === "ouder" ? "ouder" : `${m.age} jaar`}</span></span>
              </button>
            ))}
          </div>
          <button className="ff-link" onClick={() => { actions.reset(); closeWho(); setScreen("huis"); setToast("Voorbeeldgezin teruggezet"); }}>
            Demo opnieuw beginnen
          </button>
        </div>
      </Sheet>

      {toast && <div className="ff-toast" role="status">{toast.charAt(0).toUpperCase() + toast.slice(1)}</div>}
    </div>
  );
}
