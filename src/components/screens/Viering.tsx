"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { badgeDef } from "@/lib/badges";
import { actions } from "@/lib/store";
import { levelOf } from "@/lib/xp";
import type { FamilyState, Member } from "@/lib/types";

const KLEUREN = ["#ff6b57", "#ffc845", "#3cc6a0", "#8fa6ff", "#ff9ec7", "#ffffff"];

/** Confetti: 40 snippers die naar beneden dwarrelen. */
function Confetti() {
  return (
    <div className="ff-confetti" aria-hidden="true">
      {Array.from({ length: 40 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, background: KLEUREN[i % KLEUREN.length], animationDelay: `${(i % 10) * 0.12}s`, animationDuration: `${2.2 + (i % 5) * 0.35}s`, transform: `rotate(${i * 29}deg)` }} />
      ))}
    </div>
  );
}

function trillen() {
  try {
    navigator.vibrate?.([60, 40, 60, 40, 120]);
  } catch {
    /* */
  }
}

/** Iemand in het gezin heeft een achievement gehaald. Iedereen ziet het één keer, met het poppetje in het midden. */
export function BadgeViering({ state, me }: { state: FamilyState; me: Member }) {
  const grens = Date.now() - 3 * 864e5;
  const b = (state.badges ?? []).find((x) => !x.gezien.includes(me.id) && new Date(x.at).getTime() > grens);
  const wie = b ? state.members.find((m) => m.id === b.who) : undefined;
  const def = b ? badgeDef(b.badge) : undefined;
  const keer = b ? (state.badges ?? []).filter((x) => x.who === b.who && x.badge === b.badge && x.at <= b.at).length : 0;
  useEffect(() => {
    if (b) trillen();
  }, [b?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!b || !wie || !def) return null;
  const ik = wie.id === me.id;
  return (
    <div className="ff-viering" role="alertdialog" aria-label={`${wie.name} heeft ${def.naam} gehaald`}>
      <Confetti />
      <div className="ff-viering-kaart">
        <div className="ff-viering-badge" aria-hidden="true">{def.emoji}</div>
        <div className="ff-viering-pop"><Avatar config={wie.avatar} expression="blij" size={170} label={wie.name} /></div>
        <span className="ff-eyebrow">Achievement unlocked</span>
        <b className="ff-viering-titel">{ik ? "Jij bent" : `${wie.name} is`} {keer > 1 ? "weer " : ""}{def.naam}!</b>
        <p className="ff-muted" style={{ margin: 0 }}>{def.uitleg}{keer > 1 ? ` · al ${keer} keer` : ""}</p>
        <span className="ff-feed-punten">+{def.punten} punten {ik ? "in je schatkist" : `voor ${wie.name}`}</span>
        <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => actions.badgeGezien(b.id, me.id)}>{ik ? "Yes! 🙌" : `Goed bezig ${wie.name}! 👏`}</button>
      </div>
    </div>
  );
}

/** Punten claimen: de schatkist gaat open, je poppetje springt in het midden en de punten tellen op. */
export function ClaimViering({ me, van, n, onKlaar }: { me: Member; van: number; n: number; onKlaar: () => void }) {
  const [teller, setTeller] = useState(0);
  useEffect(() => {
    trillen();
    const start = performance.now();
    let raf = 0;
    const stap = (t: number) => {
      const p = Math.min(1, (t - start) / 1400);
      setTeller(Math.round(n * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(stap);
    };
    raf = requestAnimationFrame(stap);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  const oud = levelOf(van);
  const nieuw = levelOf(van + n);
  return (
    <div className="ff-viering" role="alertdialog" aria-label={`${n} punten geclaimd`}>
      <Confetti />
      <div className="ff-viering-kaart">
        <div className="ff-viering-badge" aria-hidden="true">💎</div>
        <div className="ff-viering-pop"><Avatar config={me.avatar} expression="blij" size={170} label={me.name} /></div>
        <b className="ff-viering-teller">+{teller}</b>
        <span className="ff-muted">punten geclaimd</span>
        {nieuw > oud && <b className="ff-viering-titel">Level {nieuw}! 🎉</b>}
        <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={onKlaar}>Top!</button>
      </div>
    </div>
  );
}
