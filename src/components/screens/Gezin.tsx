"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Icon } from "@/components/ui/Icon";
import { LineChart } from "@/components/ui/LineChart";
import { expressionFor, timeLabel } from "@/lib/mood";
import { calmThisWeek, conflictsLastWeek, conflictsThisWeek, goalSeries, thermSeries } from "@/lib/signals";
import { actions, isLive } from "@/lib/store";
import { phoneTime } from "@/lib/tasks";
import { Uitnodigen } from "@/components/screens/Uitnodigen";
import { SKILLS, scenarioById, type SkillId } from "@/lib/coach";
import { features } from "@/lib/unlock";
import { levelOf, xpForLevel, XP_UITLEG } from "@/lib/xp";
import type { FamilyState, Member, Meeting } from "@/lib/types";

const GOAL_COLORS = ["#d9442f", "#3cc6a0", "#6c8cff"];

interface Props {
  state: FamilyState;
  me: Member;
  onToast: (m: string) => void;
  onOefenen: () => void;
  onCoachNu: () => void;
}

export function Gezin({ state, me, onToast, onOefenen, onCoachNu }: Props) {
  const [meeting, setMeeting] = useState(false);
  const [editGoals, setEditGoals] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const away = state.members.filter((m) => m.joined === false);
  const feat = features(state);
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

      {isLive() && away.length === 0 && !showInvites && (
        <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => setShowInvites(true)}>Iemand uitgelogd of nieuwe telefoon? Nieuwe code maken</button>
      )}

      {isLive() && (away.length > 0 || showInvites) && (
        <section className="ff-stack-s" aria-label="Gezinsleden uitnodigen">
          <h2 className="ff-h2">Gezinsleden uitnodigen</h2>
          <Uitnodigen state={state} me={me} onToast={onToast} />
        </section>
      )}

      {!feat.overleg && (
        <section className="ff-card ff-stack-s ff-teaser">
          <span className="ff-eyebrow">Week {feat.week} van de start</span>
          <b>Eerst wennen aan inchecken en taken.</b>
          <p className="ff-small">Vanaf week 3 komen het gezinsoverleg en de voortgang erbij{feat.week < 2 ? ", en in week 2 het oefenen voor de kinderen" : ""}. Zo krijgt niemand alles tegelijk.</p>
          <button className="ff-link" style={{ justifySelf: "start" }} onClick={() => { actions.setAllesAan(true); onToast("Alles staat aan"); }}>Toch nu alles aanzetten</button>
        </section>
      )}

      {feat.overleg && (
      <section className="ff-card ff-meet-cta">
        <div>
          <b className="ff-h2">Gezinsoverleg</b>
          <p className="ff-small">{last ? `Laatste keer ${daysSince === 0 ? "vandaag" : `${daysSince} dagen geleden`}.` : "Nog niet gedaan."} Een kwartier, één keer per week. Iedereen doet mee.</p>
        </div>
        <button className="ff-btn ff-btn-primary" onClick={() => setMeeting(true)}>Starten</button>
      </section>
      )}

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

      {feat.overleg && (<>
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
        ) : state.meetings.length === 0 ? (
          <p className="ff-small ff-muted">Na jullie eerste gezinsoverleg zie je hier elke week hoe het gaat met jullie doelen: {state.goals.filter(Boolean).join(", ").toLowerCase()}.</p>
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

      <Vaardigheden state={state} />
      </>)}

      <section className="ff-card ff-stack-s">
        <div className="ff-row" style={{ justifyContent: "space-between" }}>
          <h2 className="ff-h2">Onze afspraken</h2>
          <button className="ff-link" onClick={onCoachNu}>Conflictcoach</button>
        </div>
        {(state.afspraken ?? []).length ? (
          (state.afspraken ?? []).map((a) => (
            <div key={a.id} className="ff-afspraak">
              <span className="ff-grow">{a.text}</span>
              <button className="ff-task-del" aria-label={`Afspraak weghalen: ${a.text}`} onClick={() => { actions.removeAfspraak(a.id); onToast("Afspraak weggehaald"); }}><Icon name="sluit" size={14} /></button>
            </div>
          ))
        ) : (
          <p className="ff-small ff-muted">Afspraken die jullie met de conflictcoach maken, komen hier te staan. Bespreek ze in het gezinsoverleg.</p>
        )}
        {(state.coachLog ?? []).length > 0 && <p className="ff-small ff-muted">Coach deze week {(state.coachLog ?? []).filter((l) => Date.now() - new Date(l.at).getTime() < 7 * 864e5).length} keer gebruikt.</p>}
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

      {(state.feedback ?? []).length > 0 && (
        <section className="ff-card ff-stack-s">
          <h2 className="ff-h2">Feedback van de pilot</h2>
          {(state.feedback ?? []).slice().reverse().slice(0, 12).map((f) => (
            <div key={f.id} className="ff-planrow">
              <b>{f.vibe === "fijn" ? "👍" : "👎"} {name(f.by)} <span className="ff-small ff-muted">· {timeLabel(f.at)}</span></b>
              {f.text && <span className="ff-small">{f.text}</span>}
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
        <details className="ff-details">
          <summary><b>Zo verdienen de kinderen XP</b></summary>
          <ul className="ff-list ff-small">{XP_UITLEG.map(([a, b]) => <li key={a}><b>{a}:</b> {b}</li>)}</ul>
          <p className="ff-small ff-muted">Een kind dat alles doet, haalt zo'n 40 tot 60 XP per dag. Level 2 is na een paar dagen binnen, level 5 na ruim twee weken. Elk level wordt iets zwaarder.</p>
          <p className="ff-small">Levels: {[2, 3, 4, 5, 6].map((l) => `${l} = ${xpForLevel(l)} XP`).join(" · ")}</p>
        </details>
        {state.members.filter((m) => m.role !== "ouder").map((k) => {
          const mins = (state.reading?.[k.id] ?? []).filter((r) => Date.now() - new Date(r.at).getTime() < 7 * 864e5).reduce((a, r) => a + r.min, 0);
          return <p key={k.id} className="ff-small"><b>{k.name}:</b> level {levelOf(state.xp[k.id] ?? 0)} · {state.xp[k.id] ?? 0} XP · {mins} min gelezen deze week</p>;
        })}
      </section>

      <section className="ff-card ff-stack-s">
        <h2 className="ff-h2">Bedtijden</h2>
        <p className="ff-small ff-muted">De telefoon gaat een uur voor bedtijd aan de lader. Die taak past zich vanzelf aan.</p>
        {state.members.filter((m) => m.role !== "ouder").map((k) => (
          <label key={k.id} className="ff-reward-edit">
            <b className="ff-grow">{k.name}</b>
            <span className="ff-small ff-muted">telefoon {phoneTime(k.bedtime ?? "21:30")}</span>
            <input type="time" style={{ flex: "0 0 auto", width: 132 }} value={k.bedtime ?? "21:30"} onChange={(e) => e.target.value && actions.setBedtime(k.id, e.target.value)} aria-label={`Bedtijd van ${k.name}`} />
          </label>
        ))}
      </section>

      {isLive() && away.length === 0 && showInvites && (
        <button className="ff-link" onClick={() => setShowInvites(false)}>Uitnodigen verbergen</button>
      )}

      {feat.oefenen && <button className="ff-level" onClick={onOefenen}>
        <span className="ff-choice-l"><Icon name="oefenen" size={18} /></span>
        <span className="ff-grow"><b>Oefeningen bekijken</b><br /><span className="ff-small ff-muted">Zie wat de kinderen oefenen, en probeer ze zelf</span></span>
      </button>}

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

/** Per kind: welke vaardigheden geoefend zijn, en hoe vaak in het echt gedaan. Geen antwoorden, alleen voortgang. */
export function Vaardigheden({ state, title = "Vaardigheden" }: { state: FamilyState; title?: string }) {
  const kids = state.members.filter((m) => m.role !== "ouder");
  const rows = kids.map((k) => {
    const practiced: Partial<Record<SkillId, number>> = {};
    for (const r of state.coach?.[k.id] ?? []) {
      const sk = scenarioById(r.id)?.skill;
      if (sk) practiced[sk] = (practiced[sk] ?? 0) + 1;
    }
    const real: Partial<Record<SkillId, number>> = {};
    for (const q of state.quests ?? []) if (q.member === k.id && q.done && q.skill && q.skill in SKILLS) real[q.skill as SkillId] = (real[q.skill as SkillId] ?? 0) + 1;
    const skills = [...new Set([...Object.keys(practiced), ...Object.keys(real)])] as SkillId[];
    return { k, practiced, real, skills, open: (state.quests ?? []).filter((q) => q.member === k.id && !q.done).length };
  });
  if (!rows.some((r) => r.skills.length || r.open)) {
    return (
      <section className="ff-card ff-stack-s">
        <h2 className="ff-h2">{title}</h2>
        <p className="ff-small ff-muted">Zodra de kinderen met de conflictcoach oefenen, zie je hier welke vaardigheden ze leren. Hun antwoorden blijven van hen.</p>
      </section>
    );
  }
  return (
    <section className="ff-card ff-stack-s">
      <h2 className="ff-h2">{title}</h2>
      <p className="ff-small ff-muted">Geoefend in de app, en hoe vaak echt gedaan. De antwoorden zelf blijven van de kinderen.</p>
      {rows.map(({ k, practiced, real, skills, open }) => (
        <div key={k.id} className="ff-planrow">
          <b>{k.name}{open ? <span className="ff-small ff-muted"> · {open} open {open === 1 ? "quest" : "quests"}</span> : null}</b>
          {skills.length ? (
            <div className="ff-chips">
              {skills.map((sk) => (
                <span key={sk} className="ff-chip ff-chip-static ff-skill">
                  {SKILLS[sk].short}
                  <span className="ff-skill-n">{practiced[sk] ? `${practiced[sk]}× geoefend` : ""}{practiced[sk] && real[sk] ? " · " : ""}{real[sk] ? `${real[sk]}× echt` : ""}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="ff-small ff-muted">Nog niet geoefend.</span>
          )}
        </div>
      ))}
    </section>
  );
}
