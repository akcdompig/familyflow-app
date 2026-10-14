"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Icon } from "@/components/ui/Icon";
import type { Expression } from "@/lib/mood";
import { actions } from "@/lib/store";
import {
  COACH_SCENARIOS,
  OUTCOME_INFO,
  SKILLS,
  TYPE_INFO,
  WHERE_LABEL,
  type CoachChoice,
  type CoachNode,
  type CoachScenario,
  type End,
  type Feel,
} from "@/lib/coach";
import type { AvatarConfig, FamilyState, Member } from "@/lib/types";

/* ---------- Wie is "de ander" in dit scenario? ---------- */
const FRIEND_AVATAR: AvatarConfig = { skin: "s3", hair: "opgeschoren", hairColor: "#2b1b14", extras: [], outfit: "hoodie", outfitColor: "#3cc6a0" };

function otherFor(s: CoachScenario, state: FamilyState, me: Member): { name: string; avatar: AvatarConfig } {
  if (s.with === "vriend") return { name: s.otherName ?? "Je vriend", avatar: FRIEND_AVATAR };
  const pool = s.with === "ouder" ? state.members.filter((m) => m.role === "ouder" && m.id !== me.id) : state.members.filter((m) => m.role !== "ouder" && m.id !== me.id);
  const m = pool[0];
  if (m) return { name: m.name, avatar: m.avatar };
  return s.with === "ouder" ? { name: "Mama", avatar: { ...FRIEND_AVATAR, hair: "lang", outfit: "trui" } } : { name: "Je zus", avatar: { ...FRIEND_AVATAR, hair: "knot" } };
}

const fill = (t: string, name: string) => t.replace(/\{ander\}/g, name);
const exprOf = (f: Feel): Expression => f;

/** Vaste volgorde per scenario, zodat de goede keuze niet steeds onderaan staat. */
function order<T>(list: T[], seed: string): T[] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Lijst ---------- */
export function CoachList({ state, me, onPlay }: { state: FamilyState; me: Member; onPlay: (id: string) => void }) {
  const runs = state.coach?.[me.id] ?? [];
  return (
    <section className="ff-stack-s" aria-label="Conflictcoach">
      <div className="ff-row" style={{ justifyContent: "space-between" }}>
        <h2 className="ff-h2">Conflictcoach</h2>
        <span className="ff-small ff-muted">{new Set(runs.map((r) => r.id)).size} van {COACH_SCENARIOS.length}</span>
      </div>
      <p className="ff-small ff-muted">Echte situaties. Jij kiest, en je ziet wat het doet met jou en met de ander.</p>
      <ul className="ff-coachlist">
        {COACH_SCENARIOS.map((s) => {
          const mine = runs.filter((r) => r.id === s.id);
          const best = mine.some((r) => r.outcome === "opgelost") ? "opgelost" : mine.length ? "geoefend" : "";
          return (
            <li key={s.id}>
              <button className={`ff-coachcard ${best ? "is-" + best : ""}`} onClick={() => onPlay(s.id)}>
                <span className="ff-coachcard-tag">{WHERE_LABEL[s.where]}</span>
                <b>{s.title}</b>
                <span className="ff-small ff-muted">{SKILLS[s.skill].label}</span>
                {best && <span className="ff-coachcard-done"><Icon name="check" size={14} /> {best === "opgelost" ? "Opgelost" : "Geoefend"}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- Spelen ---------- */
interface Step {
  node: CoachNode;
  choice: CoachChoice;
  alts: CoachChoice[];
}
type Stage = "intro" | "voel" | "adem" | "kies" | "reactie" | "einde" | "terug";

export function CoachPlay({ id, state, me, onClose, onToast }: { id: string; state: FamilyState; me: Member; onClose: () => void; onToast: (m: string) => void }) {
  const s = COACH_SCENARIOS.find((x) => x.id === id)!;
  const other = useMemo(() => otherFor(s, state, me), [s, state, me]);
  const t = (x: string) => fill(x, other.name);

  const [stage, setStage] = useState<Stage>("intro");
  const [node, setNode] = useState<CoachNode>(s.start);
  const [steps, setSteps] = useState<Step[]>([]);
  const [self, setSelf] = useState(s.selfStart);
  const [otherT, setOtherT] = useState(s.otherStart);
  const [otherFeel, setOtherFeel] = useState<Feel>(s.start.feel);
  const [startSelf, setStartSelf] = useState(s.selfStart);
  const [end, setEnd] = useState<End | null>(null);
  const [left, setLeft] = useState(0);
  const [questTaken, setQuestTaken] = useState(() => (state.quests ?? []).some((q) => q.member === me.id && q.title === s.advice.quest && !q.done));

  useEffect(() => {
    if (stage !== "adem" || left <= 0) return;
    const tm = window.setTimeout(() => {
      setLeft((n) => n - 1);
      if (left === 1) setStage("kies");
    }, 1000);
    return () => window.clearTimeout(tm);
  }, [stage, left]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);

  const last = steps[steps.length - 1];

  const choose = (c: CoachChoice) => {
    setSteps((l) => [...l, { node, choice: c, alts: node.choices.filter((x) => x !== c) }]);
    setSelf(c.self);
    setOtherT(c.other);
    setOtherFeel(c.feel);
    setStage("reactie");
  };

  const next = () => {
    const c = last.choice;
    if (c.end) {
      setEnd(c.end);
      setStage("einde");
      actions.coachDone(me.id, { id: s.id, path: [...steps.map((x) => x.choice.type)], outcome: c.end.outcome });
    } else if (c.next) {
      const n = s.nodes[c.next];
      setNode(n);
      setOtherFeel(n.feel);
      setStage("kies");
    }
  };

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">Conflictcoach · {WHERE_LABEL[s.where]}</div>
          <h1 className="ff-h2">{s.title}</h1>
        </div>
        <button className="ff-iconbtn" onClick={onClose} aria-label="Stoppen"><Icon name="sluit" /></button>
      </header>

      {stage !== "terug" && (
        <Stage2
          me={me}
          other={other}
          selfT={stage === "intro" || stage === "voel" ? startSelf : self}
          otherT={otherT}
          otherFeel={otherFeel}
          bubble={stage === "reactie" ? t(last.choice.says) : stage === "kies" || stage === "intro" || stage === "voel" || stage === "adem" ? t(node.says) : ""}
          myLine={stage === "reactie" ? t(last.choice.text) : ""}
        />
      )}

      {stage === "intro" && (
        <section className="ff-card ff-stack">
          <p className="ff-coach-sit">{t(s.situation)}</p>
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setStage("voel")}>Verder</button>
        </section>
      )}

      {stage === "voel" && (
        <section className="ff-card ff-stack">
          <h2 className="ff-h2">Hoe boos ben jij nu?</h2>
          <p className="ff-small ff-muted">Stel je voor dat dit nu echt gebeurt.</p>
          <div className="ff-thermo" role="group" aria-label="Van 1, rustig, tot 10, ontploffen">
            {Array.from({ length: 10 }, (_, i) => (
              <button
                key={i}
                aria-pressed={startSelf === i + 1}
                onClick={() => {
                  setStartSelf(i + 1);
                  setSelf(i + 1);
                  if (i + 1 >= 7) {
                    setLeft(20);
                    setStage("adem");
                  } else setStage("kies");
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </section>
      )}

      {stage === "adem" && (
        <section className="ff-card ff-stack ff-calm">
          <b>Stop. Eerst ademen.</b>
          <p className="ff-small">Boven de 7 denk je minder helder. Adem mee: 4 tellen in, 4 tellen uit. Wat wil je eigenlijk bereiken?</p>
          <div className="ff-breath"><span>{left}</span></div>
          <button className="ff-btn ff-btn-ghost" onClick={() => { setLeft(0); setStage("kies"); }}>Ik ben rustiger, verder</button>
        </section>
      )}

      {stage === "kies" && (
        <section className="ff-stack-s">
          {node.text && <p className="ff-coach-sit">{t(node.text)}</p>}
          <p className="ff-eyebrow">Wat doe jij?</p>
          {order(node.choices, s.id + steps.length).map((c, i) => (
            <button key={i} className="ff-choice" onClick={() => choose(c)}>
              <span className="ff-choice-l">{String.fromCharCode(65 + i)}</span>
              <span>{t(c.text)}</span>
            </button>
          ))}
        </section>
      )}

      {stage === "reactie" && last && (
        <section className="ff-card ff-stack-s">
          <span className={`ff-typebadge ff-type-${last.choice.type}`}>{TYPE_INFO[last.choice.type].label}</span>
          {last.choice.what && <p>{t(last.choice.what)}</p>}
          {!last.choice.what && last.choice.end && <p>{t(last.choice.end.text)}</p>}
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={next}>{last.choice.end ? "Hoe liep het af?" : "Verder"}</button>
        </section>
      )}

      {stage === "einde" && end && (
        <section className={`ff-card ff-stack ff-attn ff-attn-${OUTCOME_INFO[end.outcome].tone}`}>
          <div className="ff-attn-head"><span className="ff-attn-dot" /><b>{OUTCOME_INFO[end.outcome].label}</b></div>
          <p>{t(end.text)}</p>
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setStage("terug")}>Terugkijken met de coach</button>
        </section>
      )}

      {stage === "terug" && end && (
        <Terugblik
          s={s}
          me={me}
          other={other}
          steps={steps}
          end={end}
          startSelf={startSelf}
          t={t}
          questTaken={questTaken}
          onQuest={() => {
            actions.addQuest({ member: me.id, title: s.advice.quest, skill: s.skill, from: "coach" });
            setQuestTaken(true);
            onToast("Opdracht staat bij je taken");
          }}
          onAgain={() => {
            setNode(s.start);
            setSteps([]);
            setSelf(s.selfStart);
            setOtherT(s.otherStart);
            setOtherFeel(s.start.feel);
            setEnd(null);
            setStage("kies");
          }}
          onClose={onClose}
        />
      )}
    </div>
  );
}

function Thermo({ v, label }: { v: number; label: string }) {
  const tone = v >= 7 ? "hot" : v >= 4 ? "warm" : "cool";
  return (
    <span className="ff-mini-thermo" role="img" aria-label={`${label}: ${v} van 10`}>
      <i className={tone} style={{ width: `${Math.max(6, v * 10)}%` }} />
    </span>
  );
}

function Stage2({ me, other, selfT, otherT, otherFeel, bubble, myLine }: { me: Member; other: { name: string; avatar: AvatarConfig }; selfT: number; otherT: number; otherFeel: Feel; bubble: string; myLine: string }) {
  const myFeel: Feel = selfT >= 7 ? "boos" : selfT >= 5 ? "neutraal" : "goed";
  return (
    <section className="ff-coach-stage" aria-live="polite">
      <div className="ff-coach-bubbles">
        {myLine && <div className="ff-say ff-say-me">{myLine}</div>}
        {bubble ? <div className="ff-say ff-say-other"><b>{other.name}:</b> {bubble}</div> : <div className="ff-say ff-say-quiet">{other.name} zegt niks.</div>}
      </div>
      <div className="ff-coach-people">
        <div className="ff-coach-person">
          <Avatar config={me.avatar} expression={exprOf(myFeel)} size={92} seed={1} label="Jij" />
          <b className="ff-small">Jij</b>
          <Thermo v={selfT} label="Jouw boosheid" />
        </div>
        <div className="ff-coach-person">
          <Avatar key={otherFeel} config={other.avatar} expression={exprOf(otherFeel)} size={92} seed={4} label={other.name} />
          <b className="ff-small">{other.name}</b>
          <Thermo v={otherT} label={`Boosheid van ${other.name}`} />
        </div>
      </div>
    </section>
  );
}

function Terugblik({
  s, other, steps, end, startSelf, t, questTaken, onQuest, onAgain, onClose,
}: {
  s: CoachScenario; me: Member; other: { name: string }; steps: Step[]; end: End; startSelf: number; t: (x: string) => string;
  questTaken: boolean; onQuest: () => void; onAgain: () => void; onClose: () => void;
}) {
  const first = steps[0];
  const usedGood = steps.some((x) => x.choice.type === "opkomen");
  return (
    <div className="ff-stack">
      <section className="ff-card ff-stack-s">
        <h2 className="ff-h2">Wat er gebeurde</h2>
        <ol className="ff-timeline">
          <li>
            <span className="ff-tl-dot" />
            <div><b>Begin</b><p className="ff-small">{t(s.start.says ? `${other.name} zei: "${s.start.says}"` : s.situation)}</p><p className="ff-small ff-muted">Jij: {startSelf}/10 · {other.name}: {s.otherStart}/10</p></div>
          </li>
          {steps.map((x, i) => (
            <li key={i}>
              <span className={`ff-tl-dot ff-type-${x.choice.type}`} />
              <div>
                <b>Jij koos: {TYPE_INFO[x.choice.type].label.toLowerCase()}</b>
                <p className="ff-small">{t(x.choice.text)}</p>
                <p className="ff-small ff-muted">Jij: {x.choice.self}/10 · {other.name}: {x.choice.other}/10{x.choice.says ? ` · "${t(x.choice.says)}"` : ""}</p>
              </div>
            </li>
          ))}
          <li>
            <span className={`ff-tl-dot ff-out-${end.outcome}`} />
            <div><b>{OUTCOME_INFO[end.outcome].label}</b></div>
          </li>
        </ol>
      </section>

      <section className="ff-card ff-stack-s">
        <h2 className="ff-h2">Wat als je iets anders had gekozen?</h2>
        {first.alts.map((a, i) => (
          <div key={i} className="ff-whatif">
            <span className={`ff-typebadge ff-type-${a.type}`}>{TYPE_INFO[a.type].label}</span>
            <p className="ff-small">{t(a.text)}</p>
            <p className="ff-small"><b>{other.name}:</b> {a.says ? `"${t(a.says)}"` : "zegt niks"} <span className="ff-muted">· boosheid {a.other}/10</span></p>
            {a.end && <p className="ff-small ff-muted">Afloop: {OUTCOME_INFO[a.end.outcome].label.toLowerCase()}.</p>}
          </div>
        ))}
      </section>

      <section className="ff-card ff-stack-s ff-advice">
        <span className="ff-eyebrow">De coach zegt</span>
        <p>{usedGood ? "Goed dat je voor jezelf opkwam. " : "Dit was lastig, en dat is precies waarom we het oefenen. "}{t(s.advice.coach)}</p>
        <span className="ff-eyebrow">Waarom werkt dit?</span>
        <p className="ff-small">{t(s.advice.psy)}</p>
        <span className="ff-eyebrow">Wat deden jouw keuzes?</span>
        {[...new Set(steps.map((x) => x.choice.type))].map((ty) => <p key={ty} className="ff-small"><b>{TYPE_INFO[ty].label}:</b> {TYPE_INFO[ty].uitleg}</p>)}
      </section>

      <section className="ff-card ff-stack-s ff-quest-card">
        <span className="ff-eyebrow">Opdracht voor het echte leven · {SKILLS[s.skill].label}</span>
        <p><b>{t(s.advice.quest)}</b></p>
        <button className="ff-btn ff-btn-primary" disabled={questTaken} onClick={onQuest}>{questTaken ? "Staat bij je taken" : "Ik neem deze opdracht aan"}</button>
      </section>

      <div className="ff-row">
        <button className="ff-btn ff-btn-ghost ff-grow" onClick={onAgain}>Nog een keer</button>
        <button className="ff-btn ff-btn-dark ff-grow" onClick={onClose}>Klaar</button>
      </div>
    </div>
  );
}
