"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { actions } from "@/lib/store";
import type { CalmPlan, Member } from "@/lib/types";

const EMPTY: CalmPlan = { signals: [], helps: [], needs: [], place: "" };

/** "Ik word boos": ademhalen met je avatar en je eigen rustplan erbij. */
export function CalmSheet({ open, onClose, me, plan, onDone }: { open: boolean; onClose: () => void; me: Member; plan?: CalmPlan; onDone: (m: string) => void }) {
  const [left, setLeft] = useState(60);
  const [help, setHelp] = useState(false);
  const p = plan ?? EMPTY;

  useEffect(() => {
    if (open) {
      setLeft(60);
      setHelp(false);
    }
  }, [open]);
  useEffect(() => {
    if (!open || left <= 0) return;
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [open, left]);

  const phase = Math.floor((60 - left) / 4) % 2 === 0 ? "Adem in…" : "Adem uit…";

  return (
    <Sheet open={open} onClose={onClose} title="Even rustig worden">
      <div className="ff-calm-sheet">
        <h2 className="ff-h2 ff-center">Goed dat je even stopt</h2>
        <div className="ff-calm-ring">
          <div className="ff-calm-ring-in">
            <Avatar config={me.avatar} expression="rust" size={110} label="Jouw avatar ademt rustig" />
          </div>
        </div>
        <p className="ff-calm-phase" aria-live="polite">{left > 0 ? phase : "Hoe gaat het nu?"}</p>
        <p className="ff-small ff-muted ff-center">4 tellen in, 4 tellen uit{left > 0 ? ` · nog ${left} sec` : ""}</p>
        {left > 0 && <button className="ff-link ff-center" onClick={() => setLeft(0)}>Stoppen met tellen</button>}

        {(p.helps.length > 0 || p.place || p.needs.length > 0) ? (
          <div className="ff-card ff-stack-s">
            <span className="ff-eyebrow">Jouw rustplan</span>
            {p.place && <p><b>Rustplek:</b> {p.place}</p>}
            {p.helps.length > 0 && <p><b>Wat helpt:</b> {p.helps.join(", ").toLowerCase()}</p>}
            {p.needs.length > 0 && <p><b>Ik heb nodig:</b> {p.needs.join(", ").toLowerCase()}</p>}
          </div>
        ) : (
          <p className="ff-small ff-muted ff-center">Je hebt nog geen rustplan. Maak er samen met een ouder een bij Ik.</p>
        )}

        <button
          className="ff-btn ff-btn-dark ff-btn-wide"
          onClick={() => {
            actions.calmDone(me.id);
            onDone(me.role === "ouder" ? "Goed gedaan. Ook voor ouders werkt dit" : "Knap! Rustig worden is een echte skill. +5 punten");
            onClose();
          }}
        >
          Ik ben weer rustig
        </button>
        <button className="ff-link ff-center" onClick={() => setHelp((h) => !h)}>Hulp nodig?</button>
        {help && (
          <div className="ff-card ff-stack-s">
            <p>Praat erover met iemand die je vertrouwt: je vader, moeder, mentor of een andere volwassene.</p>
            <p><b>Kindertelefoon</b>, gratis en anoniem: <b>0800-0432</b> of kindertelefoon.nl</p>
            <p>Ben je in gevaar? Bel <b>112</b>.</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
