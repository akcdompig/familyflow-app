"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Interesses } from "@/components/screens/CoachTip";
import { Herinneringen } from "@/components/screens/Herinneringen";
import { ClaimViering } from "@/components/screens/Viering";
import { BADGES, bijna } from "@/lib/badges";
import { expressionFor } from "@/lib/mood";
import { actions } from "@/lib/store";
import { geclaimd, levelProgress, teClaimen, xpForLevel } from "@/lib/xp";
import type { FamilyState, Member } from "@/lib/types";

/** Ik: je level, schatkist, achievements en je instellingen. Alles wat over jou gaat op één plek. */
export function IkV2({ state, me, onToast, onAvatar, onWerk, onMeer, onOuders, onPrivacy }: { state: FamilyState; me: Member; onToast: (m: string) => void; onAvatar: () => void; onWerk: () => void; onMeer: () => void; onOuders?: () => void; onPrivacy?: () => void }) {
  const xp = geclaimd(state, me.id);
  const lp = levelProgress(xp);
  const kist = teClaimen(state, me.id);
  const [alleBadges, setAlleBadges] = useState(false);
  const [claim, setClaim] = useState<{ van: number; n: number } | null>(null);
  const mijnBadges = (state.badges ?? []).filter((b) => b.who === me.id);
  const voortgang = bijna(state, me.id);
  const isOuder = me.role === "ouder";
  const volgendeBeloning = state.rewards.filter((r) => r.title && r.level > lp.level).sort((a, b) => a.level - b.level)[0];
  const R = 58;
  const omtrek = 2 * Math.PI * R;

  return (
    <div className="ff-screen v2-screen">
      <section className="v2-ik-kop">
        <div className="v2-level">
          <svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true">
            <circle cx="70" cy="70" r={R} fill="none" stroke="var(--v2-ring-bg)" strokeWidth="10" />
            <circle cx="70" cy="70" r={R} fill="none" stroke="var(--ff-koraal-knop)" strokeWidth="10" strokeLinecap="round" strokeDasharray={omtrek} strokeDashoffset={omtrek * (1 - lp.pct / 100)} transform="rotate(-90 70 70)" />
          </svg>
          <div className="v2-level-av"><Avatar config={me.avatar} expression={expressionFor(state.checkins[me.id])} size={96} label={me.name} /></div>
          <span className="v2-level-nr">Lvl {lp.level}</span>
        </div>
        <h1 className="ff-h1">{me.name}</h1>
        <span className="ff-small ff-muted">{xp} punten · nog {lp.left} tot level {lp.level + 1}</span>
        {!isOuder && volgendeBeloning && <span className="ff-small">🎁 Level {volgendeBeloning.level}: {volgendeBeloning.title} <span className="ff-muted">(nog {xpForLevel(volgendeBeloning.level) - xp})</span></span>}
      </section>

      {kist > 0 && (
        <section className="ff-card ff-schatkist">
          <div className="ff-schatkist-bol" aria-hidden="true">💎<b>+{kist}</b></div>
          <div className="ff-grow"><b>Je schatkist</b><span className="ff-small ff-muted ff-block">{kist} punten om te claimen</span></div>
          <button className="ff-btn ff-btn-primary" onClick={() => { const van = geclaimd(state, me.id); const c = actions.claimPunten(me.id); if (c) setClaim({ van, n: c }); }}>Claim</button>
        </section>
      )}

      <section className="ff-card ff-stack-s">
        <b>🏆 Mijn achievements</b>
        <div className="v2-badges">
          {/* Rustig: alleen wat je hebt en wat bijna lukt. De rest pas als je erom vraagt. */}
          {(alleBadges ? BADGES : BADGES.filter((b) => mijnBadges.some((x) => x.badge === b.id) || voortgang.slice(0, 3).some((x) => x.def.id === b.id))).map((b) => {
            const n = mijnBadges.filter((x) => x.badge === b.id).length;
            const v = voortgang.find((x) => x.def.id === b.id);
            return (
              <button key={b.id} className={`v2-badge-tegel${n ? " is-gehaald" : ""}`} title={b.uitleg} onClick={() => onToast(`${b.emoji} ${b.naam}: ${b.uitleg.toLowerCase()} (+${b.punten} punten)`)}>
                <span className="v2-badge-emoji" aria-hidden="true">{b.emoji}</span>
                <b>{b.naam}</b>
                <span className="ff-small ff-muted">{n ? (n > 1 ? `${n}× gehaald` : "Gehaald!") : v ? `${v.n}/${v.doel}` : "nog niet"}</span>
                {!n && v && <span className="ff-bezig-balk"><i style={{ width: `${Math.round((v.n / v.doel) * 100)}%` }} /></span>}
              </button>
            );
          })}
        </div>
        {!alleBadges && <button className="ff-link ff-small" onClick={() => setAlleBadges(true)}>Alle achievements bekijken</button>}
      </section>

      <section className="ff-card ff-stack-s">
        <b>🎯 Waar wil je tips over?</b>
        <Interesses state={state} me={me} onToast={onToast} compact />
      </section>

      <Herinneringen onToast={onToast} />

      <section className="v2-menu">
        <button className="v2-menu-rij" onClick={onAvatar}><span aria-hidden="true">🧑‍🎨</span><b className="ff-grow">Avatar aanpassen</b><span aria-hidden="true">›</span></button>
        <button className="v2-menu-rij" onClick={onWerk}><span aria-hidden="true">{isOuder ? "💼" : "🎒"}</span><b className="ff-grow">{isOuder ? "Werk en roosters" : "School en bijbaan"}</b><span aria-hidden="true">›</span></button>
        <button className="v2-menu-rij" onClick={onMeer}><span aria-hidden="true">🌿</span><b className="ff-grow">Mijn rustplan en meer</b><span aria-hidden="true">›</span></button>
        {onPrivacy && <button className="v2-menu-rij" onClick={onPrivacy}><span aria-hidden="true">🔒</span><b className="ff-grow">Privacy en gegevens</b><span aria-hidden="true">›</span></button>}
        {isOuder && onOuders && <button className="v2-menu-rij" onClick={onOuders}><span aria-hidden="true">👨‍👩‍👧</span><b className="ff-grow">Gezin instellen: uitnodigen, beloningen, bedtijden</b><span aria-hidden="true">›</span></button>}
      </section>

      {claim && <ClaimViering me={me} van={claim.van} n={claim.n} onKlaar={() => setClaim(null)} />}
    </div>
  );
}
