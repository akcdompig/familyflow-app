"use client";

import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Icon } from "@/components/ui/Icon";
import { MoodFace } from "@/components/ui/MoodFace";
import { actions } from "@/lib/store";
import { expressionFor, moodDot, moodLabel, timeLabel } from "@/lib/mood";
import { isDone, tasksFor } from "@/lib/tasks";
import type { FamilyState, Member } from "@/lib/types";

interface Props {
  state: FamilyState;
  me: Member;
  onCheckIn: () => void;
  onOpenMember: (id: string) => void;
  onTalkTips: (id: string) => void;
  onWho: () => void;
  onGoTasks: () => void;
  onRuzie: (id?: string) => void;
  onGoGezin: () => void;
  onCoachNu: () => void;
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return "dag";
  if (h >= 17 && h < 21) return "avond";
  return "nacht";
}

export function Huiskamer({ state, me, onCheckIn, onOpenMember, onTalkTips, onWho, onGoTasks, onRuzie, onGoGezin, onCoachNu }: Props) {
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

      <Attention state={state} me={me} onTalkTips={onTalkTips} onCheckIn={onCheckIn} onGoTasks={onGoTasks} onRuzie={onRuzie} onGoGezin={onGoGezin} />
      <Inbox state={state} me={me} />

      <button className="ff-coachnu-btn" onClick={onCoachNu}>
        <Icon name="chat" size={22} />
        <span className="ff-grow"><b>Ruzie of gedoe?</b><br /><span className="ff-small">De coach helpt je stap voor stap</span></span>
        <span className="ff-chev"><Icon name="terug" size={18} /></span>
      </button>

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
          <button key={m.id} className={`ff-slot ff-slot-${row} ${m.joined === false ? "is-away" : ""}`} style={style} onClick={() => onOpen(m.id)} aria-label={`${m.name}: ${moodLabel(c)}`}>
            <Avatar config={m.avatar} expression={expressionFor(c)} energy={m.energy} size={row === "voor" ? 112 : 100} seed={i * 3 + (row === "voor" ? 2 : 0)} label={m.name} />
            <span className="ff-tag">
              <span className="ff-tag-name">
                <span className="ff-dot" style={{ background: moodDot(c) }} />
                {m.id === me.id ? "Jij" : m.name}
              </span>
              <span className="ff-tag-mood">{m.joined === false ? "nog niet aangemeld" : moodLabel(c)}</span>
            </span>
            {c?.wantsTalk && <span className="ff-bubble" aria-hidden="true"><Icon name="chat" size={16} /></span>}
          </button>
        );
      })}
    </>
  );
}

function Attention({ state, me, onTalkTips, onCheckIn, onGoTasks, onRuzie, onGoGezin }: { state: FamilyState; me: Member; onTalkTips: (id: string) => void; onCheckIn: () => void; onGoTasks: () => void; onRuzie: (id?: string) => void; onGoGezin: () => void }) {
  const kids = state.members.filter((m) => m.role !== "ouder");
  const parents = state.members.filter((m) => m.role === "ouder");
  const ci = (m: Member) => state.checkins[m.id];
  const today = (m: Member) => {
    const c = ci(m);
    return !!c && new Date(c.at).toDateString() === new Date().toDateString();
  };

  const name = (id: string) => state.members.find((m) => m.id === id)?.name ?? "";

  if (me.role === "ouder") {
    const hot = state.conflicts.find((c) => c.status === "hulp" || (c.physical && c.status !== "opgelost"));
    if (hot) {
      return (
        <Card tone="koraal" title={hot.physical ? `Ruzie met fysiek contact: ${name(hot.from)} en ${name(hot.with)}` : `${name(hot.from)} en ${name(hot.with)} vragen om hulp`} meta={timeLabel(hot.at)}>
          <p>{hot.physical ? "Kijk eerst of iedereen veilig is. Praat pas als het rustig is." : "Ze kwamen er samen niet uit. Help ze, zonder een kant te kiezen."}</p>
          <button className="ff-btn ff-btn-primary" onClick={onGoGezin}>Zo pak je het aan</button>
        </Card>
      );
    }
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
    const missing = kids.filter((k) => k.joined !== false && !today(k));
    if (missing.length) {
      return (
        <Card tone="wolk" title={`${missing.map((m) => m.name).join(" en ")} ${missing.length > 1 ? "hebben" : "heeft"} nog niet ingecheckt`}>
          <p>Geen zorgen. Herinner er luchtig aan, bijvoorbeeld bij het eten.</p>
        </Card>
      );
    }
    const away = state.members.filter((m) => m.joined === false);
    if (away.length) {
      return (
        <Card tone="wolk" title={`${away.map((m) => m.name).join(" en ")} ${away.length > 1 ? "doen" : "doet"} nog niet mee`}>
          <p>Stuur een uitnodiging met een code. Daarin staat ook hoe ze de app installeren.</p>
          <button className="ff-btn ff-btn-dark" onClick={onGoGezin}>Uitnodigen</button>
        </Card>
      );
    }
    return (
      <Card tone="munt" title="Iedereen zit goed vandaag">
        <p>Mooi moment om iets leuks samen te plannen.</p>
      </Card>
    );
  }

  const invite = state.conflicts.find((c) => c.status === "wacht" && c.with === me.id);
  if (invite) {
    return (
      <Card tone="lucht" title={`${name(invite.from)} wil een ruzie uitpraten`} meta={timeLabel(invite.at)}>
        <p>Over: {invite.topic.toLowerCase()}. Lees wat {name(invite.from)} zegt en vertel jouw kant. Lukt het samen, dan krijgen jullie allebei XP.</p>
        <button className="ff-btn ff-btn-primary" onClick={() => onRuzie(invite.id)}>Bekijken</button>
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
  const left = tasksFor(state, me.id).filter((t) => !isDone(state, t.id));
  if (left.length) {
    return (
      <Card tone="zon" title={`Nog ${left.length} ${left.length === 1 ? "taak" : "taken"} voor vandaag`}>
        <p>Volgende: {left[0].title.toLowerCase()}.</p>
        <button className="ff-btn ff-btn-primary" onClick={onGoTasks}>Naar mijn taken</button>
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
      <p>Ingecheckt en je taken zijn af. Lekker!</p>
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

/** Berichten van school of zorg voor mij. */
function Inbox({ state, me }: { state: FamilyState; me: Member }) {
  const forMe = (to: string) => to === "gezin" || to === me.id || (to === "ouders" && me.role === "ouder");
  const unread = state.messages.filter((m) => !m.read && forMe(m.to));
  if (!unread.length) return null;
  return (
    <>
      {unread.map((m) => {
        const pro = state.pros.find((p) => p.id === m.from);
        return (
          <section key={m.id} className={`ff-card ff-msg ff-msg-${m.from}`}>
            <div className="ff-attn-head">
              <span className={`ff-pro-badge ff-pro-${m.from} ff-pro-badge-s`}><Icon name={m.from} size={16} /></span>
              <b>{pro?.name ?? (m.from === "school" ? "School" : "Coach")}</b>
              <span className="ff-small ff-muted ff-push">{timeLabel(m.at)}</span>
            </div>
            <p>{m.text}</p>
            <button className="ff-link" style={{ justifySelf: "start" }} onClick={() => actions.readMessage(m.id)}>Gelezen</button>
          </section>
        );
      })}
    </>
  );
}
