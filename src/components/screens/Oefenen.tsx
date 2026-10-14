"use client";

import { useEffect, useState } from "react";
import { Flo } from "@/components/ui/Flo";
import { Icon } from "@/components/ui/Icon";
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

export function Oefenen({ state, me, onToast, onCalm, onRuzie }: { state: FamilyState; me: Member; onToast: (m: string) => void; onCalm: () => void; onRuzie: () => void }) {
  const [play, setPlay] = useState<Scenario | null>(null);
  const played = state.played[me.id] ?? [];
  const isParent = me.role === "ouder";

  if (play) return <Play scenario={play} me={me} onClose={() => setPlay(null)} onToast={onToast} />;

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">{isParent ? "Zo oefenen de kinderen" : `${played.length} van ${SCENARIOS.length} geoefend`}</div>
          <h1 className="ff-h1">Oefenen</h1>
        </div>
        <Flo size={52} />
      </header>

      <button className="ff-angry" onClick={onCalm}>
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 2-8 1 1 2 2 3 2 0-2 0-4 1-6z" fill="currentColor" /></svg>
        <span><b>Ik word boos</b><br /><span className="ff-small">Open je rustplan</span></span>
      </button>

      {!isParent && state.members.filter((m) => m.role !== "ouder").length > 1 && (
        <button className="ff-angry ff-ruzie-btn" onClick={onRuzie}>
          <Icon name="chat" size={26} />
          <span><b>Ruzie oplossen</b><br /><span className="ff-small">Samen uitpraten, stap voor stap</span></span>
        </button>
      )}

      <p className="ff-muted">Oefen wat je doet als het lastig wordt. Er is geen fout antwoord. {isParent ? "Probeer ze zelf ook eens." : "Je krijgt XP voor het oefenen."}</p>

      <ul className="ff-levels">
        {SCENARIOS.map((s) => {
          const done = played.includes(s.id);
          return (
            <li key={s.id}>
              <button className={`ff-level ${done ? "is-done" : ""}`} onClick={() => setPlay(s)}>
                <span className="ff-level-n">{done ? <Icon name="check" size={20} /> : s.id}</span>
                <span className="ff-level-t"><b>{s.title}</b><span className="ff-small ff-muted">{s.where}{!isParent && !done ? " · +20 XP" : ""}</span></span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Play({ scenario: s, me, onClose, onToast }: { scenario: Scenario; me: Member; onClose: () => void; onToast: (m: string) => void }) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [emo, setEmo] = useState(0);
  const [left, setLeft] = useState(30);
  const [pick, setPick] = useState<number | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 1) return;
    if (left <= 0) {
      setStep(2);
      return;
    }
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, left]);

  const chooseEmo = (v: number) => {
    setEmo(v);
    if (v >= 7) {
      setLeft(30);
      setStep(1);
    } else setStep(2);
  };
  const finish = () => {
    const first = actions.finishScenario(me.id, s.id);
    onToast(first && me.role !== "ouder" ? "Level klaar! +20 XP" : "Goed geoefend");
    onClose();
  };

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">Level {s.id} · {s.where}</div>
          <h1 className="ff-h2">{s.title}</h1>
        </div>
        <button className="ff-iconbtn" onClick={onClose} aria-label="Stoppen"><Icon name="sluit" /></button>
      </header>
      <div className="ff-steps" aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>

      {step === 0 && (
        <section className="ff-card ff-stack">
          <p className="ff-lead">{s.situation}</p>
          <Listen text={s.situation} />
          <p className="ff-strong">Stel je voor dat dit jou overkomt. Hoe boos of gespannen zou je worden?</p>
          <div className="ff-thermo" role="group" aria-label="Van 1, rustig, tot 10, ontploffen">
            {Array.from({ length: 10 }, (_, i) => (
              <button key={i} onClick={() => chooseEmo(i + 1)} aria-label={`${i + 1}`}>{i + 1}</button>
            ))}
          </div>
          <div className="ff-row ff-small ff-muted" style={{ justifyContent: "space-between" }}><span>rustig</span><span>ontploffen</span></div>
        </section>
      )}

      {step === 1 && (
        <section className="ff-card ff-stack ff-calm">
          <h2 className="ff-h2">Eerst afkoelen</h2>
          <p>Bij een {emo} denk je minder helder. Dat geldt voor iedereen. Adem mee: 4 tellen in, 4 tellen uit.</p>
          <div className="ff-breath" aria-live="off"><span>{left}</span></div>
          <button className="ff-btn ff-btn-ghost" onClick={() => setStep(2)}>Ik ben rustig, verder</button>
        </section>
      )}

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
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={finish}>Level klaar</button>
        </section>
      )}
    </div>
  );
}
