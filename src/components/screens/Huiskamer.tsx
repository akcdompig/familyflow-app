"use client";

import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Icon } from "@/components/ui/Icon";
import { MoodFace } from "@/components/ui/MoodFace";
import { actions } from "@/lib/store";
import { expressionFor, moodDot, moodLabel, timeLabel } from "@/lib/mood";
import type { FamilyState, Member } from "@/lib/types";

interface Props {
  state: FamilyState;
  me: Member;
  onCheckIn: () => void;
  onOpenMember: (id: string) => void;
  onTalkTips: (id: string) => void;
  onWho: () => void;
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return "dag";
  if (h >= 17 && h < 21) return "avond";
  return "nacht";
}

export function Huiskamer({ state, me, onCheckIn, onOpenMember, onTalkTips, onWho }: Props) {
  const back = state.members.filter((m) => m.role === "ouder");
  const front = state.members.filter((m) => m.role !== "ouder");
  const tod = timeOfDay();
  const mine = state.checkins[me.id];

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">{state.family}</div>
          <h1 className="ff-h1">Zo gaat het thuis</h1>
        </div>
        <button className="ff-who" onClick={onWho} aria-label={`Je bent ${me.name}. Wissel van gezinslid`}>
          <Avatar config={me.avatar} expression={expressionFor(mine)} size={40} headOnly animate={false} label={me.name} />
        </button>
      </header>

      <section className={`ff-room ff-room-${tod}`} aria-label="De huiskamer met het hele gezin">
        <div className="ff-room-wall" />
        <div className="ff-room-window"><div className="ff-room-sky" /><div className="ff-room-sun" /></div>
        <div className="ff-room-frame" />
        <div className="ff-room-lamp"><div className="ff-room-shade" /><div className="ff-room-pole" /></div>
        <div className="ff-room-plant"><div className="ff-room-leaf a" /><div className="ff-room-leaf b" /><div className="ff-room-leaf c" /><div className="ff-room-pot" /></div>
        <div className="ff-room-floor" />
        <div className="ff-room-sofa" />
        <div className="ff-room-rug" />

        <Row members={back} row="achter" state={state} me={me} onOpen={onOpenMember} />
        <Row members={front} row="voor" state={state} me={me} onOpen={onOpenMember} />
      </section>

      <Attention state={state} me={me} onTalkTips={onTalkTips} onCheckIn={onCheckIn} />

      <div className="ff-mybar">
        <MoodFace mood={mine ? (mine.rest ? "rust" : mine.mood) : 3} size={36} />
        <div className="ff-mybar-t">
          <b>Hoe voel jij je?</b>
          <span className="ff-small ff-muted">{mine ? `${moodLabel(mine)} · ${timeLabel(mine.at)}` : "Nog niet ingecheckt"}</span>
        </div>
        <button className="ff-btn ff-btn-dark" onClick={onCheckIn}>
          {mine ? "Wijzig" : "Inchecken"}
        </button>
      </div>
    </div>
  );
}

function Row({ members, row, state, me, onOpen }: { members: Member[]; row: "achter" | "voor"; state: FamilyState; me: Member; onOpen: (id: string) => void }) {
  return (
    <>
      {members.map((m, i) => {
        const c = state.checkins[m.id];
        const spread = Math.min(46, 92 / members.length);
        const left = 50 + (i - (members.length - 1) / 2) * spread;
        const style = { left: `${left}%` } as CSSProperties;
        return (
          <button key={m.id} className={`ff-slot ff-slot-${row}`} style={style} onClick={() => onOpen(m.id)} aria-label={`${m.name}: ${moodLabel(c)}`}>
            <Avatar config={m.avatar} expression={expressionFor(c)} energy={m.energy} size={row === "voor" ? 112 : 100} seed={i * 3 + (row === "voor" ? 2 : 0)} label={m.name} />
            <span className="ff-tag">
              <span className="ff-tag-name">
                <span className="ff-dot" style={{ background: moodDot(c) }} />
                {m.id === me.id ? "Jij" : m.name}
              </span>
              <span className="ff-tag-mood">{moodLabel(c)}</span>
            </span>
            {c?.wantsTalk && <span className="ff-bubble" aria-hidden="true"><Icon name="chat" size={16} /></span>}
          </button>
        );
      })}
    </>
  );
}

function Attention({ state, me, onTalkTips, onCheckIn }: { state: FamilyState; me: Member; onTalkTips: (id: string) => void; onCheckIn: () => void }) {
  const kids = state.members.filter((m) => m.role !== "ouder");
  const parents = state.members.filter((m) => m.role === "ouder");
  const ci = (m: Member) => state.checkins[m.id];
  const today = (m: Member) => {
    const c = ci(m);
    return !!c && new Date(c.at).toDateString() === new Date().toDateString();
  };

  if (me.role === "ouder") {
    const talk = kids.find((k) => ci(k)?.wantsTalk);
    if (talk) {
      const c = ci(talk)!;
      return (
        <Card tone="koraal" title={`${talk.name} wil met je praten`} meta={timeLabel(c.at)}>
          <p>Gaat over: {c.topics.length ? c.topics.join(", ").toLowerCase() : "nog niet gezegd"}. Zoek een rustig moment, liefst vandaag nog.</p>
          <div className="ff-row">
            <button className="ff-btn ff-btn-primary" onClick={() => actions.acknowledgeTalk(talk.id)}>
              Ik ga met {talk.name} praten
            </button>
            <button className="ff-link" onClick={() => onTalkTips(talk.id)}>Tips</button>
          </div>
        </Card>
      );
    }
    const rest = kids.find((k) => ci(k)?.rest);
    if (rest) {
      return (
        <Card tone="lucht" title={`${rest.name} wil even rust`} meta={`sinds ${timeLabel(ci(rest)!.at).replace("vandaag ", "")}`}>
          <p>Geef ruimte. Kom later terug met een naast-elkaar-moment, zoals samen koken of de hond uitlaten.</p>
          <button className="ff-link" onClick={() => onTalkTips(rest.id)}>Hoe begin ik het gesprek?</button>
        </Card>
      );
    }
    const low = kids.find((k) => (ci(k)?.mood ?? 5) <= 2);
    if (low) {
      return (
        <Card tone="zon" title={`Het gaat niet zo goed met ${low.name}`} meta={timeLabel(ci(low)!.at)}>
          <p>Gaat over: {ci(low)!.topics.join(", ").toLowerCase() || "niet gezegd"}. Vraag open hoe het gaat en luister vooral.</p>
          <button className="ff-link" onClick={() => onTalkTips(low.id)}>Hoe begin ik het gesprek?</button>
        </Card>
      );
    }
    const missing = kids.filter((k) => !today(k));
    if (missing.length) {
      return (
        <Card tone="wolk" title={`${missing.map((m) => m.name).join(" en ")} ${missing.length > 1 ? "hebben" : "heeft"} nog niet ingecheckt`}>
          <p>Geen zorgen. Herinner er luchtig aan, bijvoorbeeld bij het eten.</p>
        </Card>
      );
    }
    return (
      <Card tone="munt" title="Iedereen zit goed vandaag">
        <p>Mooi moment om iets leuks samen te plannen.</p>
      </Card>
    );
  }

  if (!today(me)) {
    return (
      <Card tone="koraal" title={`Hoi ${me.name}, hoe gaat het?`}>
        <p>Check even in. Het duurt 5 seconden.</p>
        <button className="ff-btn ff-btn-primary" onClick={onCheckIn}>Inchecken</button>
      </Card>
    );
  }
  const tired = parents.find((p) => (ci(p)?.mood ?? 5) <= 3);
  if (tired) {
    return (
      <Card tone="zon" title={`${tired.name} heeft een zware dag`}>
        <p>Een knuffel, iets lekkers of even helpen in huis doet wonderen.</p>
      </Card>
    );
  }
  return (
    <Card tone="munt" title="Goed bezig vandaag">
      <p>Je hebt ingecheckt. Je quests komen hier straks bij.</p>
    </Card>
  );
}

function Card({ tone, title, meta, children }: { tone: "koraal" | "lucht" | "zon" | "munt" | "wolk"; title: string; meta?: string; children: ReactNode }) {
  return (
    <section className={`ff-card ff-attn ff-attn-${tone}`} aria-live="polite">
      <div className="ff-attn-head">
        <span className="ff-attn-dot" />
        <b>{title}</b>
        {meta && <span className="ff-small ff-muted ff-push">{meta}</span>}
      </div>
      <div className="ff-attn-body">{children}</div>
    </section>
  );
}
