"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { badgeDef } from "@/lib/badges";
import { actions } from "@/lib/store";
import { levelOf } from "@/lib/xp";
import type { OpenRegel } from "@/lib/herkomst";
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

/**
  Punten claimen: je ziet waarvoor je ze kreeg. De regels komen één voor één binnen en tellen op tot het totaal.
  Snel (hooguit ~2 seconden), en bij "minder beweging" staat alles meteen in beeld.
*/
export function ClaimViering({ me, van, n, regels = [], onKlaar }: { me: Member; van: number; n: number; regels?: OpenRegel[]; onKlaar: () => void }) {
  const lijst = kortLijstje(regels, n);
  const rustig = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [zicht, setZicht] = useState(rustig ? lijst.length : 0);
  useEffect(() => {
    trillen();
  }, []);
  useEffect(() => {
    if (zicht >= lijst.length) return;
    const t = window.setTimeout(() => setZicht((z) => z + 1), zicht === 0 ? 250 : Math.min(320, 1800 / lijst.length));
    return () => window.clearTimeout(t);
  }, [zicht, lijst.length]);
  const klaar = zicht >= lijst.length;
  const teller = klaar ? n : lijst.slice(0, zicht).reduce((a, r) => a + r.n, 0);
  const oud = levelOf(van);
  const nieuw = levelOf(van + n);
  return (
    <div className="ff-viering" role="alertdialog" aria-modal="true" aria-label={`${n} punten geclaimd`}>
      {!rustig && <Confetti />}
      <div className="ff-viering-kaart ff-claim-kaart">
        <div className="ff-viering-badge" aria-hidden="true">💎</div>
        <div className="ff-viering-pop"><Avatar config={me.avatar} expression="blij" size={110} label={me.name} /></div>
        <b className="ff-viering-teller" aria-hidden="true">+{teller}</b>
        {lijst.length > 0 && (
          <ul className="ff-claim-lijst" aria-label="Waarvoor je punten kreeg">
            {lijst.map((r, i) => (
              <li key={r.wat + i} className={`ff-claim-regel${i < zicht ? " is-in" : ""}${r.onbekend ? " is-onbekend" : ""}`} aria-hidden={i >= zicht}>
                <span className="ff-grow">{r.wat}{r.keer > 1 ? <span className="ff-muted"> ×{r.keer}</span> : null}</span>
                <b className="ff-claim-n">+{r.n}</b>
              </li>
            ))}
          </ul>
        )}
        <p className={`ff-claim-totaal${klaar ? " is-in" : ""}`} aria-live="polite">{klaar ? <>Je hebt in totaal <b>{n} punten</b> verdiend</> : " "}</p>
        {klaar && nieuw > oud && <b className="ff-viering-titel">Niveau {nieuw}! 🎉</b>}
        <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={onKlaar}>{klaar ? "Top!" : "Sla over"}</button>
      </div>
    </div>
  );
}

/** Hooguit 7 regels in beeld. De rest samen in één regel, met het echte aantal punten. */
function kortLijstje(regels: OpenRegel[], n: number): OpenRegel[] {
  const max = 7;
  const lijst = regels.length > max ? [...regels.slice(0, max - 1), { wat: `En nog ${regels.length - max + 1} andere dingen`, n: regels.slice(max - 1).reduce((a, r) => a + r.n, 0), keer: 1 }] : regels;
  void n;
  return lijst;
}
