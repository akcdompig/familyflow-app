"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Flo } from "@/components/ui/Flo";
import { MoodFace } from "@/components/ui/MoodFace";
import { Sheet } from "@/components/ui/Sheet";
import { actions } from "@/lib/store";
import { expressionFor, MOODS, TOPICS } from "@/lib/mood";
import type { CheckIn, Member, MoodLevel } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  me: Member;
  current?: CheckIn;
  talkTo: string;
  onDone: (msg: string) => void;
}

type Draft = { mood: MoodLevel; rest: boolean; topics: string[] };

export function CheckInSheet({ open, onClose, me, current, talkTo, onDone }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState<"mood" | "more">("mood");

  useEffect(() => {
    if (open) {
      setDraft(null);
      setStep("mood");
    }
  }, [open]);

  const isKid = me.role !== "ouder";
  const low = !!draft && (draft.rest || draft.mood <= 2);
  const preview: CheckIn | undefined = draft ? { ...draft, wantsTalk: false, at: "" } : current;

  const pick = (mood: MoodLevel, rest = false) => {
    setDraft({ mood, rest, topics: [] });
    setStep("more");
  };
  const toggleTopic = (t: string) =>
    setDraft((d) => (d ? { ...d, topics: d.topics.includes(t) ? d.topics.filter((x) => x !== t) : [...d.topics, t] } : d));

  const save = (wantsTalk: boolean) => {
    if (!draft) return;
    actions.checkIn(me.id, { ...draft, wantsTalk });
    onClose();
    onDone(wantsTalk ? `${talkTo} krijgt een seintje dat je wilt praten` : draft.rest ? "Oké. Iedereen weet dat je even rust wilt" : "Bedankt voor het delen");
  };

  return (
    <Sheet open={open} onClose={onClose} title="Inchecken">
      <div className="ff-checkin-head">
        <div className="ff-checkin-av">
          <Avatar config={me.avatar} expression={expressionFor(preview)} energy={me.energy} size={92} seed={3} label={`Jouw avatar`} />
        </div>
        <h2 className="ff-h2">{step === "mood" ? (isKid ? "Hoe voel je je nu?" : "Hoe voel jij je?") : low ? "Dank je dat je het zegt" : "Fijn om te horen"}</h2>
      </div>

      {step === "mood" && (
        <>
          <div className="ff-moods" role="group" aria-label="Kies hoe je je voelt">
            {MOODS.map((m) => (
              <button key={m.level} className="ff-mood" onClick={() => pick(m.level)} aria-label={m.label}>
                <MoodFace mood={m.level} size={44} />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
          <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => pick(2, true)}>
            <MoodFace mood="rust" size={26} /> Ik wil even rust
          </button>
          <p className="ff-small ff-muted ff-center">
            {isKid ? "Je ouders zien je gezichtje, het onderwerp en of je wilt praten." : "Je gezin ziet je gezichtje. Ook ouders mogen een zware dag hebben."}
          </p>
        </>
      )}

      {step === "more" && draft && (
        <>
          <div className="ff-flo-bubble">
            <Flo size={40} mood={low ? "rustig" : "blij"} color={low ? "#3cc6a0" : "#ff6b57"} />
            <p>
              {draft.rest
                ? "Prima. Wil je zeggen waar het over gaat? Hoeft niet."
                : low
                  ? "Wat speelt er? Kies wat past, of sla het over."
                  : "Waar komt dat door? Mag je overslaan."}
            </p>
          </div>
          <div className="ff-chips">
            {TOPICS.map((t) => (
              <button key={t} className="ff-chip" aria-pressed={draft.topics.includes(t)} onClick={() => toggleTopic(t)}>
                {t}
              </button>
            ))}
          </div>
          {low ? (
            <div className="ff-stack-s">
              <p className="ff-strong">Wil je erover praten?</p>
              <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => save(true)}>
                Ja, met {talkTo}
              </button>
              <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => save(false)}>
                {draft.rest ? "Nee, ik wil echt even rust" : "Nee, nu niet"}
              </button>
            </div>
          ) : (
            <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => save(false)}>
              Klaar
            </button>
          )}
          <button className="ff-link ff-center" onClick={() => setStep("mood")}>
            Ander gevoel kiezen
          </button>
        </>
      )}
    </Sheet>
  );
}
