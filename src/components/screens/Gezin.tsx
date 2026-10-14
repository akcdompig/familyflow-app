"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Icon } from "@/components/ui/Icon";
import { LineChart } from "@/components/ui/LineChart";
import { expressionFor, timeLabel } from "@/lib/mood";
import { calmThisWeek, conflictsLastWeek, conflictsThisWeek, goalSeries, thermSeries } from "@/lib/signals";
import { actions } from "@/lib/store";
import type { FamilyState, Member, Meeting } from "@/lib/types";

const GOAL_COLORS = ["#d9442f", "#3cc6a0", "#6c8cff"];

interface Props {
  state: FamilyState;
  me: Member;
  onToast: (m: string) => void;
  onOefenen: () => void;
}

export function Gezin({ state, me, onToast, onOefenen }: Props) {
  const [meeting, setMeeting] = useState(false);
  const [editGoals, setEditGoals] = useState(false);
  const name = (id: string) => state.members.find((m) => m.id === id)?.name ?? "?";

  if (meeting) return <Overleg state={state} onClose={() => setMeeting(false)} onToast={onToast} />;

  const now = conflictsThisWeek(state);
  const before = conflictsLastWeek(state);
  const open = state.conflicts.filter((c) => c.status !== "opgelost").reverse();
  const recent = state.conflicts.filter((c) => c.status === "opgelost").slice(-3).reverse();
  const last = state.meetings[state.meetings.length - 1];
  const daysSince = last ? Math.floor((Date.now() - new Date(last.at).getTime()) / 864e5) : 99;

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">{state.family}</div>
          <h1 className="ff-h1">Ons gezin</h1>
        </div>
      </header>

      <section className="ff-card ff-meet-cta">
        <div>
          <b className="ff-h2">Gezinsoverleg</b>
          <p className="ff-small">{last ? `Laatste keer ${daysSince === 0 ? "vandaag" : `${daysSince} dagen geleden`}.` : "Nog niet gedaan."} Een kwartier, één keer per week. Iedereen doet mee.</p>
        </div>
        <button className="ff-btn ff-btn-primary" onClick={() => setMeeting(true)}>Starten</button>
      </section>

      {open.length > 0 && (
        <section className="ff-stack-s" aria-label="Ruzies die nog lopen">
          <h2 className="ff-h2">Loopt nog</h2>
          {open.map((c) => (
            <div key={c.id} className={`ff-card ff-conflict ${c.physical || c.status === "hulp" ? "is-hot" : ""}`}>
              <div className="ff-row" style={{ justifyContent: "space-between" }}>
                <b>{name(c.from)} en {name(c.with)}</b>
                <span className="ff-small ff-muted">{timeLabel(c.at)}</span>
              </div>
              <p className="ff-small">{c.topic}. {c.status === "hulp" ? "Ze vragen om jouw hulp." : `Wacht op ${name(c.with)}.`}</p>
              {(c.physical || c.status === "hulp") && (
                <div className="ff-script">
                  <div><b>Eerst:</b> iedereen veilig en rustig. Pas praten als de boosheid gezakt is.</div>
                  <div><b>Dan:</b> laat ze om de beurt vertellen. Jij vat samen, je kiest geen kant.</div>
                  <div><b>Samen:</b> wat kunnen jullie de volgende keer anders doen?</div>
                </div>
              )}
              {c.status === "hulp" || c.physical ? (
                <button className="ff-btn ff-btn-dark" onClick={() => { actions.parentHelped(c.id); onToast("Mooi. Opgelost met jouw hulp"); }}>We hebben het samen opgelost</button>
              ) : null}
            </div>
          ))}
        </section>
      )}

      <section className="ff-card ff-stack">
        <div className="ff-row" style={{ justifyContent: "space-between" }}>
          <h2 className="ff-h2">Zo gaan we vooruit</h2>
          <button className="ff-link" onClick={() => setEditGoals((v) => !v)}>{editGoals ? "Klaar" : "Doelen wijzigen"}</button>
        </div>
        {editGoals ? (
          <div className="ff-stack-s">
            {[0, 1, 2].map((i) => (
              <label key={i} className="ff-field">
                <span className="ff-eyebrow">Doel {i + 1}</span>
                <input value={state.goals[i] ?? ""} maxLength={50} onChange={(e) => { const g = [...state.goals]; g[i] = e.target.value; actions.setGoals(g); }} placeholder="Bijv. rustige ochtenden" />
              </label>
            ))}
          </div>
        ) : (
          <>
            <LineChart series={goalSeries(state)} colors={GOAL_COLORS} dashed={thermSeries(state)} label="Cijfers voor de gezinsdoelen per week" />
            <ul className="ff-legend">
              {state.goals.map((g, i) => g && <li key={i}><i style={{ background: GOAL_COLORS[i] }} />{g}</li>)}
              <li><i className="ff-legend-dash" />Hoe gaat het thuis (gemiddeld)</li>
            </ul>
          </>
        )}
      </section>

      <section className="ff-stats">
        <div className="ff-stat">
          <b>{now}</b>
          <span>{now === 1 ? "ruzie" : "ruzies"} deze week</span>
          <span className={`ff-trend ${now <= before ? "up" : "down"}`}>{now < before ? `${before - now} minder dan vorige week` : now === before ? "net als vorige week" : `${now - before} meer dan vorige week`}</span>
        </div>
        <div className="ff-stat">
          <b>{state.conflicts.filter((c) => c.status === "opgelost").length}</b>
          <span>zelf opgelost</span>
          <span className="ff-trend up">sinds de start</span>
        </div>
        <div className="ff-stat">
          <b>{calmThisWeek(state)}</b>
          <span>keer rustig geworden</span>
          <span className="ff-trend">deze week</span>
        </div>
      </section>

      {recent.length > 0 && (
        <section className="ff-card ff-stack-s">
          <h2 className="ff-h2">Zelf opgelost</h2>
          {recent.map((c) => (
            <div key={c.id} className="ff-planrow">
              <b>{name(c.from)} en {name(c.with)} · {c.topic.toLowerCase()}</b>
              <span className="ff-small ff-muted">{c.solution} · {timeLabel(c.at)}</span>
            </div>
          ))}
        </section>
      )}

      <section className="ff-card ff-stack">
        <div>
          <h2 className="ff-h2">Beloningen</h2>
          <p className="ff-small ff-muted">Kinderen sparen XP met taken, oefenen en ruzies oplossen. Wat krijgen ze bij elk level?</p>
        </div>
        {state.rewards.map((r, i) => (
          <label key={r.level} className="ff-reward-edit">
            <span className="ff-reward-lvl">Lvl {r.level}</span>
            <input value={r.title} maxLength={50} onChange={(e) => actions.setRewards(state.rewards.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} aria-label={`Beloning bij level ${r.level}`} />
          </label>
        ))}
        <button className="ff-link" onClick={() => actions.setRewards([...state.rewards, { level: (state.rewards[state.rewards.length - 1]?.level ?? 1) + 1, title: "" }])}>+ Level toevoegen</button>
      </section>

      <button className="ff-level" onClick={onOefenen}>
        <span className="ff-choice-l"><Icon name="oefenen" size={18} /></span>
        <span className="ff-grow"><b>Oefeningen bekijken</b><br /><span className="ff-small ff-muted">Zie wat de kinderen oefenen, en probeer ze zelf</span></span>
      </button>

      {me.role === "ouder" && (
        <p className="ff-small ff-muted ff-center">Alleen ouders zien deze pagina.</p>
      )}
    </div>
  );
}

const STEPS = ["Wat ging goed?", "Hoe gaat het thuis?", "Onze doelen", "Eén ding oplossen", "Iets leuks plannen"];

function Overleg({ state, onClose, onToast }: { state: FamilyState; onClose: () => void; onToast: (m: string) => void }) {
  const [step, setStep] = useState(0);
  const [m, setM] = useState<Omit<Meeting, "at">>({ therm: {}, goals: {}, good: "", problem: "", solution: "", fun: "" });
  const last = state.meetings[state.meetings.length - 1];
  const goals = state.goals.filter(Boolean);
  const ok = [true, state.members.every((x) => m.therm[x.id]), goals.every((_, i) => m.goals[i] !== undefined), true, true][step];

  const finish = () => {
    actions.saveMeeting(m);
    onToast("Gezinsoverleg opgeslagen. Goed gedaan, allemaal!");
    onClose();
  };

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">Gezinsoverleg · stap {step + 1} van {STEPS.length}</div>
          <h1 className="ff-h2">{STEPS[step]}</h1>
        </div>
        <button className="ff-iconbtn" onClick={onClose} aria-label="Stoppen"><Icon name="sluit" /></button>
      </header>
      <div className="ff-steps" aria-hidden="true">{STEPS.map((_, i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>

      {step === 0 && (
        <section className="ff-card ff-stack">
          <p>Begin altijd met wat goed ging. Iedereen noemt één ding, ook over een ander.</p>
          <textarea className="ff-text" rows={3} value={m.good} maxLength={200} onChange={(e) => setM({ ...m, good: e.target.value })} placeholder="Bijv. Noah heeft elke dag de tafel gedekt" />
        </section>
      )}

      {step === 1 && (
        <section className="ff-stack">
          <p>Iedereen geeft een cijfer: hoe fijn was het thuis deze week? 1 is heel slecht, 10 is top.</p>
          {state.members.map((x) => (
            <div key={x.id} className="ff-card ff-stack-s">
              <div className="ff-row">
                <Avatar config={x.avatar} expression={expressionFor(state.checkins[x.id])} headOnly size={36} animate={false} label={x.name} />
                <b>{x.name}</b>
                {last?.therm[x.id] !== undefined && <span className="ff-small ff-muted ff-push">vorige keer {last.therm[x.id]}</span>}
              </div>
              <div className="ff-thermo ff-thermo-cool" role="group" aria-label={`Cijfer van ${x.name}`}>
                {Array.from({ length: 10 }, (_, i) => <button key={i} aria-pressed={m.therm[x.id] === i + 1} onClick={() => setM({ ...m, therm: { ...m.therm, [x.id]: i + 1 } })}>{i + 1}</button>)}
              </div>
            </div>
          ))}
        </section>
      )}

      {step === 2 && (
        <section className="ff-stack">
          <p>Waar staan we nu? 1 is nog ver weg, 10 is helemaal gelukt. Kies samen één cijfer.</p>
          {goals.map((g, gi) => (
            <div key={gi} className="ff-card ff-stack-s">
              <div className="ff-row">
                <span className="ff-dot" style={{ background: GOAL_COLORS[gi] }} />
                <b>{g}</b>
                {last?.goals[gi] !== undefined && <span className="ff-small ff-muted ff-push">vorige keer {last.goals[gi]}</span>}
              </div>
              <div className="ff-thermo ff-thermo-cool" role="group" aria-label={`Cijfer voor ${g}`}>
                {Array.from({ length: 10 }, (_, i) => <button key={i} aria-pressed={m.goals[gi] === i + 1} onClick={() => setM({ ...m, goals: { ...m.goals, [gi]: i + 1 } })}>{i + 1}</button>)}
              </div>
            </div>
          ))}
          <p className="ff-small ff-muted">Tip: vraag ook wat er nodig is om één punt hoger te komen.</p>
        </section>
      )}

      {step === 3 && (
        <section className="ff-card ff-stack">
          <p>Kies één ding dat lastig was. Niet meer. Iedereen mag een oplossing noemen, ook de kinderen.</p>
          <label className="ff-field">
            <span className="ff-eyebrow">Wat was lastig?</span>
            <input value={m.problem} maxLength={80} onChange={(e) => setM({ ...m, problem: e.target.value })} placeholder="Bijv. ruzie over de PlayStation" />
          </label>
          <label className="ff-field">
            <span className="ff-eyebrow">Wat spreken we af?</span>
            <input value={m.solution} maxLength={100} onChange={(e) => setM({ ...m, solution: e.target.value })} placeholder="Bijv. een timer: om de beurt 45 minuten" />
          </label>
        </section>
      )}

      {step === 4 && (
        <section className="ff-card ff-stack">
          <p>Sluit af met iets leuks voor deze week. Laat een kind kiezen.</p>
          <div className="ff-chips">
            {["Pannenkoeken bakken", "Spelletjesavond", "Samen fietsen", "Film met popcorn", "Zwemmen"].map((f) => (
              <button key={f} className="ff-chip" aria-pressed={m.fun === f} onClick={() => setM({ ...m, fun: f })}>{f}</button>
            ))}
          </div>
          <label className="ff-field">
            <span className="ff-eyebrow">Of iets anders</span>
            <input value={m.fun} maxLength={60} onChange={(e) => setM({ ...m, fun: e.target.value })} />
          </label>
        </section>
      )}

      <div className="ff-row">
        {step > 0 && <button className="ff-btn ff-btn-ghost" onClick={() => setStep(step - 1)}>Terug</button>}
        <button className="ff-btn ff-btn-primary ff-grow" disabled={!ok} onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : finish())}>
          {step < STEPS.length - 1 ? "Volgende" : "Opslaan"}
        </button>
      </div>
    </div>
  );
}
