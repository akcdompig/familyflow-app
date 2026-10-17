"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Icon } from "@/components/ui/Icon";
import { RustKeuze, StoplichtKiezer } from "@/components/ui/Stoplicht";
import type { Licht } from "@/lib/methodiek";
import { actions } from "@/lib/store";
import type { ConflictSide, FamilyState, Member } from "@/lib/types";

export const TOPICS = ["Spullen pakken of lenen", "Taken in huis", "Plagen of uitlachen", "Iets eerlijk verdelen", "Fysiek: duwen, slaan, schoppen", "Iets anders"];
/** Tussen ouder en kind: andere onderwerpen, en geen \"fysiek\" (dat hoort bij de veiligheidscheck van de coach). */
export const TOPICS_OUDER = ["Gamen of schermtijd", "Huiswerk", "Taken in huis", "Een huisregel die niet lukt", "Niet naar elkaar luisteren", "Iets anders"];
const FEEL = ["Boos", "Verdrietig", "Oneerlijk behandeld", "Gekwetst", "Schuldig"];
const WANT = ["Sorry horen", "Een eerlijke verdeling", "Met rust gelaten worden", "Het weer goedmaken", "Een huisregel maken"];
export const SOLUTIONS = ["Sorry zeggen, als we het menen", "We spreken een regel af", "Om de beurt", "Het goedmaken met een actie", "Een ouder helpt ons"];

interface Props {
  state: FamilyState;
  me: Member;
  /** Bestaande ruzie om op te reageren. Leeg = zelf een ruzie starten. */
  conflictId?: string;
  onClose: () => void;
  onToast: (m: string) => void;
  /** Na het oplossen: vraag hoe je je nu voelt. */
  onAfter: () => void;
  /** Met wie: broer of zus (standaard voor kinderen), een ouder, of (voor ouders) een kind. */
  met?: "sib" | "ouder" | "kind";
}

export function Ruzie({ state, me, conflictId, onClose, onToast, onAfter, met }: Props) {
  const existing = conflictId ? state.conflicts.find((c) => c.id === conflictId) : undefined;
  const respond = !!existing;
  const kring = met ?? (me.role === "ouder" ? "kind" : "sib");
  const siblings = state.members.filter((m) => m.id !== me.id && m.joined !== false && (kring === "ouder" ? m.role === "ouder" : m.role !== "ouder"));
  const [regel, setRegel] = useState<string | null>(null);
  const metOuder = !!existing && [existing.from, existing.with].some((id) => state.members.find((m) => m.id === id)?.role === "ouder");
  const onderwerpen = kring === "sib" && !metOuder ? TOPICS : TOPICS_OUDER;
  const [step, setStep] = useState(0);
  const [other, setOther] = useState<string>(existing ? existing.from : siblings.length === 1 ? siblings[0].id : "");
  const [topic, setTopic] = useState(existing?.topic ?? "");
  const [licht, setLicht] = useState<Licht | null>(null);
  const [side, setSide] = useState<ConflictSide>({ feel: [], want: [], story: "" });

  const otherM = state.members.find((m) => m.id === other);
  const otherSide = existing?.sides[existing.from];
  const physical = topic.startsWith("Fysiek");
  const total = respond ? 4 : 3;
  const toggle = (k: "feel" | "want", v: string) => setSide((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));

  const send = () => {
    actions.startConflict({ from: me.id, with: other, topic, physical, sides: { [me.id]: side } });
    onToast(`Verstuurd. ${otherM?.name} krijgt een seintje`);
    onClose();
  };
  const solve = (solution: string, afspraak?: string) => {
    if (!existing) return;
    // Een regel afspreken? Dan komt die bij de gezinsafspraken, zodat jullie later kunnen kijken of hij helpt.
    if (afspraak?.trim()) actions.addAfspraak(afspraak, me.id, `ruzie:${existing.topic}`);
    actions.answerConflict(existing.id, me.id, side);
    actions.closeConflict(existing.id, solution);
    onClose();
    if (solution === "Een ouder helpt ons") onToast("Je ouders krijgen een seintje om te helpen");
    else {
      onToast("Knap dat jullie het samen hebben uitgepraat. Gaat het later toch weer mis? Begin gerust opnieuw of vraag een ouder.");
      window.setTimeout(onAfter, 900);
    }
  };

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">Ruzie oplossen</div>
          <h1 className="ff-h2">{respond ? `${otherM?.name} wil het uitpraten` : "Samen oplossen"}</h1>
        </div>
        <button className="ff-iconbtn" onClick={onClose} aria-label="Stoppen"><Icon name="sluit" /></button>
      </header>
      <div className="ff-steps" aria-hidden="true">{Array.from({ length: total }, (_, i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>

      {step === 0 && !respond && (
        <section className="ff-card ff-stack">
          {siblings.length > 1 && (
            <div className="ff-stack-s">
              <span className="ff-eyebrow">Met wie?</span>
              <div className="ff-chips">
                {siblings.map((s) => <button key={s.id} className="ff-chip ff-chip-l" aria-pressed={other === s.id} onClick={() => setOther(s.id)}>{s.name}</button>)}
              </div>
            </div>
          )}
          {siblings.length === 1 && (
            <div className="ff-row">
              <Avatar config={siblings[0].avatar} headOnly size={44} animate={false} label={siblings[0].name} />
              <b>Met {siblings[0].name}</b>
            </div>
          )}
          <div className="ff-stack-s">
            <span className="ff-eyebrow">Waar gaat het over?</span>
            <div className="ff-chips">
              {onderwerpen.map((t) => <button key={t} className="ff-chip" aria-pressed={topic === t} onClick={() => setTopic(t)}>{t}</button>)}
            </div>
          </div>
          {physical && (
            <div className="ff-alert">Ben je gewond of voel je je niet veilig? Ga nu naar een volwassene. Je ouders krijgen hier een melding van.</div>
          )}
          <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!other || !topic} onClick={() => setStep(1)}>Verder</button>
        </section>
      )}

      {step === 0 && respond && existing && (
        <section className="ff-card ff-stack">
          <p>Over: <b>{existing.topic.toLowerCase()}</b></p>
          <div className="ff-quote">
            <span className="ff-eyebrow">Hoe {otherM?.name} zich voelt</span>
            <p>{otherSide?.feel.join(", ") || "-"}</p>
            <span className="ff-eyebrow">Wat {otherM?.name} wil</span>
            <p>{otherSide?.want.join(", ") || "-"}</p>
            {otherSide?.story && (<><span className="ff-eyebrow">Wat er volgens {otherM?.name} gebeurde</span><p>&ldquo;{otherSide.story}&rdquo;</p></>)}
          </div>
          <p className="ff-small ff-muted">Lees het rustig. Je hoeft het er niet mee eens te zijn. Nu vertel jij jouw kant.</p>
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setStep(1)}>Mijn kant vertellen</button>
        </section>
      )}

      {step === 1 && (
        <section className="ff-stack-s">
          <h2 className="ff-h2">Hoe hoog is de spanning bij jou?</h2>
          {!licht && <StoplichtKiezer onPick={(l) => { setLicht(l); if (l !== "rood") setStep(2); }} />}
          {licht === "rood" && <RustKeuze onDone={() => setStep(2)} knop="Ik ben rustig genoeg, verder" />}
        </section>
      )}

      {step === 2 && (
        <section className="ff-card ff-stack">
          <h2 className="ff-h2">Jouw kant</h2>
          <div className="ff-stack-s">
            <span className="ff-eyebrow">Hoe voel je je?</span>
            <div className="ff-chips">{FEEL.map((f) => <button key={f} className="ff-chip" aria-pressed={side.feel.includes(f)} onClick={() => toggle("feel", f)}>{f}</button>)}</div>
          </div>
          <div className="ff-stack-s">
            <span className="ff-eyebrow">Wat wil je dat er gebeurt?</span>
            <div className="ff-chips">{WANT.map((w) => <button key={w} className="ff-chip" aria-pressed={side.want.includes(w)} onClick={() => toggle("want", w)}>{w}</button>)}</div>
          </div>
          <label className="ff-field">
            <span className="ff-eyebrow">Wat gebeurde er volgens jou? Kort, mag leeg</span>
            <textarea value={side.story} onChange={(e) => setSide((s) => ({ ...s, story: e.target.value }))} rows={3} maxLength={200} />
          </label>
          <p className="ff-small ff-muted">{otherM?.name} ziet dit, zodat jullie het samen kunnen oplossen.</p>
          <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!side.feel.length || !side.want.length} onClick={() => (respond ? setStep(3) : send())}>
            {respond ? "Verder" : `Versturen naar ${otherM?.name}`}
          </button>
        </section>
      )}

      {step === 3 && existing && (
        <section className="ff-stack">
          <h2 className="ff-h2">Samen oplossen</h2>
          <div className="ff-outcome">
            <div><span className="ff-eyebrow">{otherM?.name} wil</span><p>{otherSide?.want.join(", ") || "-"}</p></div>
            <div><span className="ff-eyebrow">Jij wilt</span><p>{side.want.join(", ")}</p></div>
          </div>
          <p>Kies samen een oplossing. Praat even met elkaar, of laat dit scherm aan {otherM?.name} zien.</p>
          <div className="ff-stack-s">
            {SOLUTIONS.filter((s) => !(metOuder && s === "Een ouder helpt ons")).map((s) =>
              s === "We spreken een regel af" ? (
                <button key={s} className="ff-choice" aria-pressed={regel !== null} onClick={() => setRegel(regel === null ? "" : null)}>{s}</button>
              ) : <button key={s} className="ff-choice" onClick={() => solve(s)}>{s}</button>,
            )}
          </div>
          {regel !== null && (
            <div className="ff-card ff-stack-s">
              <label className="ff-field">
                <span className="ff-eyebrow">Welke huisregel maken jullie?</span>
                <input value={regel} maxLength={120} onChange={(e) => setRegel(e.target.value)} placeholder="Bijv. we vragen eerst of we iets mogen lenen" />
              </label>
              <p className="ff-small ff-muted">De huisregel komt bij Gezin. Over een week vraagt de app of hij helpt.</p>
              <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!regel.trim()} onClick={() => solve("We spreken een regel af", regel)}>Huisregel bewaren</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
