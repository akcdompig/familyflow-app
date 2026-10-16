"use client";

import { useState, type ReactNode } from "react";
import { Flo } from "@/components/ui/Flo";
import { Icon } from "@/components/ui/Icon";
import { CoachList } from "@/components/screens/Coach";
import { COACH_SCENARIOS, SKILLS } from "@/lib/coach";
import { RustKeuze, StoplichtKiezer } from "@/components/ui/Stoplicht";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import { actions } from "@/lib/store";
import type { FamilyState, Member } from "@/lib/types";

const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
function speak(text: string) {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "nl-NL";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    /* voorlezen niet beschikbaar */
  }
}

function Listen({ text }: { text: string }) {
  if (!canSpeak()) return null;
  return (
    <button className="ff-listen" onClick={() => speak(text)}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6" /></svg>
      Voorlezen
    </button>
  );
}

export function Oefenen({ state, me, onToast, onCalm, onRuzie, onCoach, onCoachNu, titel, onder }: { state: FamilyState; me: Member; onToast: (m: string) => void; onCalm: () => void; onRuzie: () => void; onCoach: (id: string) => void; onCoachNu: () => void; titel?: string; onder?: ReactNode }) {
  const [play, setPlay] = useState<Scenario | null>(null);
  const played = state.played[me.id] ?? [];
  const isParent = me.role === "ouder";

  if (play) return <Play scenario={play} me={me} onClose={() => setPlay(null)} onToast={onToast} />;

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">{isParent ? "Rust, ruzie en opvoedvragen" : "Leren omgaan met boosheid en ruzie"}</div>
          <h1 className="ff-h1">{titel ?? "Oefenen"}</h1>
        </div>
        <Flo size={52} />
      </header>

      <div className="ff-two-btns">
        <button className="ff-bigbtn ff-bigbtn-rust" onClick={onCalm}>
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 2-8 1 1 2 2 3 2 0-2 0-4 1-6z" fill="currentColor" /></svg>
          <b>Ik word boos</b>
          <span className="ff-small">Eerst rust</span>
        </button>
        <button className="ff-bigbtn ff-bigbtn-ruzie" onClick={onCoachNu}>
          <Icon name="chat" size={30} />
          <b>Ruzie of gedoe</b>
          <span className="ff-small">Hulp, stap voor stap</span>
        </button>
      </div>

      {onder}
      <Aanrader state={state} me={me} onPlay={onCoach} />

      <details className="ff-card ff-details">
        <summary><b>Alle oefeningen</b></summary>
        <CoachList state={state} me={me} onPlay={onCoach} />
        <details className="ff-details ff-more">
          <summary><b>Meer korte oefeningen</b></summary>
          <ul className="ff-levels">
            {SCENARIOS.map((sc) => {
              const done = played.includes(sc.id);
              return (
                <li key={sc.id}>
                  <button className={`ff-level ${done ? "is-done" : ""}`} onClick={() => setPlay(sc)}>
                    <span className="ff-level-n">{done ? <Icon name="check" size={20} /> : sc.id}</span>
                    <span className="ff-level-t"><b>{sc.title}</b><span className="ff-small ff-muted">{sc.where}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      </details>
    </div>
  );
}

/** Eén duidelijke volgende stap: een opdracht van coach of ouder, of het eerstvolgende scenario. */
function Aanrader({ state, me, onPlay }: { state: FamilyState; me: Member; onPlay: (id: string) => void }) {
  const runs = state.coach?.[me.id] ?? [];
  const solved = new Set(runs.filter((r) => r.outcome === "opgelost").map((r) => r.id));
  const quest = (state.quests ?? []).find((q) => q.member === me.id && !q.done && q.scenario);
  const next = quest?.scenario ? COACH_SCENARIOS.find((c) => c.id === quest.scenario) : COACH_SCENARIOS.find((c) => !solved.has(c.id));
  if (!next) {
    return (
      <section className="ff-card ff-aanrader ff-stack-s">
        <span className="ff-eyebrow">Jouw doel</span>
        <b className="ff-h2">Alles een keer goed opgelost!</b>
        <p className="ff-small">Nu het echte werk: probeer het thuis. Je opdrachten staan bij Taken.</p>
      </section>
    );
  }
  return (
    <button className="ff-card ff-aanrader" onClick={() => onPlay(next.id)}>
      <span className="ff-eyebrow">{quest ? "Opdracht voor jou" : "Volgende oefening"} · {SKILLS[next.skill].label}</span>
      <b className="ff-h2">{next.title}</b>
      <span className="ff-small">{solved.size} van {COACH_SCENARIOS.length} goed opgelost · 3 minuten</span>
      <span className="ff-btn ff-btn-primary">Start</span>
    </button>
  );
}

function Play({ scenario: s, me, onClose, onToast }: { scenario: Scenario; me: Member; onClose: () => void; onToast: (m: string) => void }) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [pick, setPick] = useState<number | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  const finish = () => {
    const first = actions.finishScenario(me.id, s.id);
    onToast(first ? "Klaar! +10 punten" : "Goed geoefend");
    onClose();
  };

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">Oefening {s.id} · {s.where}</div>
          <h1 className="ff-h2">{s.title}</h1>
        </div>
        <button className="ff-iconbtn" onClick={onClose} aria-label="Stoppen"><Icon name="sluit" /></button>
      </header>
      <div className="ff-steps" aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>

      {step === 0 && (
        <section className="ff-card ff-stack">
          <p className="ff-lead">{s.situation}</p>
          <Listen text={s.situation} />
          <p className="ff-strong">Stel je voor dat dit jou overkomt. Hoe hoog zou je spanning worden?</p>
          <StoplichtKiezer kort onPick={(l) => setStep(l === "rood" ? 1 : 2)} />
        </section>
      )}

      {step === 1 && <RustKeuze onDone={() => setStep(2)} />}

      {step === 2 && (
        <section className="ff-stack">
          <h2 className="ff-h2">Wat doe jij?</h2>
          <div className="ff-stack-s">
            {s.choices.map((c, i) => (
              <button key={i} className="ff-choice" aria-pressed={pick === i} onClick={() => setPick(i)}>
                <span className="ff-choice-l">{"ABCD"[i]}</span>{c[0]}
              </button>
            ))}
          </div>
          {pick !== null && (
            <div className="ff-stack ff-rise">
              <div className="ff-outcome">
                <div><span className="ff-eyebrow">Wat er met jou gebeurt</span><p>{s.choices[pick][1]}</p></div>
                <div><span className="ff-eyebrow">Wat de ander voelt</span><p>{s.choices[pick][2]}</p></div>
              </div>
              <Listen text={`${s.choices[pick][1]} ${s.choices[pick][2]}`} />
              <p className="ff-small ff-muted">Probeer ook eens een andere keuze.</p>
              <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setStep(3)}>Verder</button>
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="ff-card ff-stack">
          <h2 className="ff-h2">{s.question}</h2>
          <Listen text={s.question} />
          <div className="ff-chips">
            {s.answers.map((a) => (
              <button key={a} className="ff-chip ff-chip-l" aria-pressed={answer === a} onClick={() => setAnswer(a)}>{a}</button>
            ))}
          </div>
          <p className="ff-small ff-muted">Dit antwoord is alleen voor jou.</p>
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={finish}>Oefening klaar</button>
        </section>
      )}
    </div>
  );
}
