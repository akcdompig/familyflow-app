"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { restTekst, slaapt, werktNu, type Bezigheid } from "@/lib/status";
import { DAGDELEN, DOEL, ETEN, ROUTINE, begroeting, dagdeel, dagLog, dagscore, datumTijd, dorst, gegeten, reeks, tipVanNu, walm } from "@/lib/dag";
import { honger, isGeregeld, klusStatus, kookplan, naamKlus, rommel } from "@/lib/huis";
import { Meters } from "@/components/screens/MijnDag";
import { Herinneringen } from "@/components/screens/Herinneringen";
import { ClaimViering } from "@/components/screens/Viering";
import { CoachTip } from "@/components/screens/CoachTip";
import { bijna } from "@/lib/badges";
import { geclaimd, teClaimen } from "@/lib/xp";
import { Icon } from "@/components/ui/Icon";
import { MoodFace } from "@/components/ui/MoodFace";
import { actions } from "@/lib/store";
import { expressionFor, moodDot, moodLabel, timeLabel } from "@/lib/mood";
import { isDone, takenPct, tasksFor } from "@/lib/tasks";
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
  onMijnDag: () => void;
  onGoThuis: () => void;
  onToast: (m: string) => void;
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return "dag";
  if (h >= 17 && h < 21) return "avond";
  return "nacht";
}

export function Huiskamer({ state, me, onCheckIn, onOpenMember, onTalkTips, onWho, onGoTasks, onRuzie, onGoGezin, onCoachNu, onMijnDag, onGoThuis, onToast }: Props) {
  const back = state.members.filter((m) => m.role === "ouder");
  const front = state.members.filter((m) => m.role !== "ouder");
  const tod = timeOfDay();
  const mine = state.checkins[me.id];
  const [, tik] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tik((n) => n + 1), 60_000); // werk en slaap volgen de klok
    return () => window.clearInterval(t);
  }, []);
  const ikSlaap = slaapt(state, me.id);
  const [pushWeg, setPushWeg] = useState(() => {
    try {
      return Date.now() - Number(localStorage.getItem("familyflow:push-later") ?? 0) < 3 * 864e5;
    } catch {
      return false;
    }
  });
  const troep = rommel(state);
  const stof = klusStatus(state).some((k) => k.klus.id === "stofzuigen" && k.teLaat > 0);
  const iedereenSlaapt = state.members.filter((m) => m.joined !== false).every((m) => slaapt(state, m.id));

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">{datumTijd()}</div>
          <h1 className="ff-h1">{begroeting()}, {me.name}</h1>
        </div>
        <button className="ff-who" onClick={onWho} aria-label={`Je bent ${me.name}. Wissel van gezinslid`}>
          <Avatar config={me.avatar} expression={expressionFor(mine)} size={40} headOnly animate={false} label={me.name} />
        </button>
      </header>

      <div className="ff-tip" role="note"><span aria-hidden="true">💡</span><span>{tipVanNu()}</span></div>

      <section className={`ff-room ff-room-${iedereenSlaapt ? "nacht" : tod}${iedereenSlaapt ? " is-iedereen-slaapt" : ""}${troep.length >= 3 ? " is-rommelig" : ""}`} aria-label="De huiskamer met het hele gezin">
        <div className="ff-room-wall" />
        <div className="ff-room-window"><div className="ff-room-sky" /><div className="ff-room-sun" /></div>
        <div className="ff-room-frame" />
        <div className="ff-room-lamp"><div className="ff-room-shade" /><div className="ff-room-pole" /></div>
        <div className="ff-room-plant"><div className="ff-room-leaf a" /><div className="ff-room-leaf b" /><div className="ff-room-leaf c" /><div className="ff-room-pot" /></div>
        <div className="ff-room-floor" />
        <div className="ff-room-sofa" />
        <div className="ff-room-rug" />
        {stof && <div className="ff-room-stof" aria-hidden="true" />}
        {troep.map((t, i) => (
          <span key={i} className="ff-room-rommel" aria-hidden="true" style={ROMMEL_PLEK[i]}>{t}</span>
        ))}
        {troep.length > 0 && <button className="ff-rommel-knop" onClick={onGoThuis}>{troep.length >= 3 ? "Wat een troep! Opruimen?" : "Er blijft iets liggen"}</button>}

        <Row members={back} row="achter" state={state} me={me} onOpen={onOpenMember} />
        <Row members={front} row="voor" state={state} me={me} onOpen={onOpenMember} />
      </section>

      {!pushWeg && <Herinneringen compact onToast={onToast} onWeg={() => { setPushWeg(true); try { localStorage.setItem("familyflow:push-later", String(Date.now())); } catch { /* */ } }} />}
      {!ikSlaap && <JouwDag state={state} me={me} onOpen={onMijnDag} onGoThuis={onGoThuis} />}
      {!ikSlaap && <Schatkist state={state} me={me} />}
      {!ikSlaap && <KlussenVandaag state={state} me={me} onGoThuis={onGoThuis} />}
      {!ikSlaap && <CoachTip state={state} me={me} onToast={onToast} />}
      <Klassement state={state} me={me} onOpen={onOpenMember} />
      <NetGedaan state={state} me={me} />

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
          <b>{ikSlaap ? "Welterusten" : "Hoe voel jij je?"}</b>
          <span className="ff-small ff-muted">{ikSlaap ? "Check morgen in, dan word je wakker" : mine ? `${moodLabel(mine)} · ${timeLabel(mine.at)}` : "Nog niet ingecheckt"}</span>
        </div>
        {ikSlaap ? (
          <button className="ff-btn ff-btn-dark" onClick={onCheckIn}>Ik ben wakker</button>
        ) : (
          <>
            {tod !== "dag" && <button className="ff-btn ff-btn-ghost" onClick={() => actions.goToSleep(me.id)}>Slapen</button>}
            <button className="ff-btn ff-btn-dark" onClick={onCheckIn}>
              {mine ? "Wijzig" : "Inchecken"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function Row({ members, row, state, me, onOpen }: { members: Member[]; row: "achter" | "voor"; state: FamilyState; me: Member; onOpen: (id: string) => void }) {
  return (
    <>
      {members.map((m, i) => {
        const c = state.checkins[m.id];
        const zzz = slaapt(state, m.id);
        const werk = zzz ? null : werktNu(state, m.id);
        const stinkt = !zzz && m.joined !== false && walm(state, m.id);
        const dorstig = !zzz && m.joined !== false && dorst(state, m.id);
        const hongerig = !zzz && !werk && m.joined !== false && honger(state, m.id);
        const spread = Math.min(46, 92 / members.length);
        const left = 50 + (i - (members.length - 1) / 2) * spread;
        const style = { left: `${left}%` } as CSSProperties;
        return (
          <button key={m.id} className={`ff-slot ff-slot-${row} ${m.joined === false ? "is-away" : ""}`} style={style} onClick={() => onOpen(m.id)} aria-label={`${m.name}: ${zzz ? "slaapt" : werk ? `${werk.look === "school" ? "op school" : `aan het werk bij ${werk.werk.naam}`}, ${restTekst(werk.rest)}` : moodLabel(c)}`}>
            <Avatar config={m.avatar} expression={zzz ? "slaap" : expressionFor(c)} bezig={werk?.look} walm={stinkt} dorst={dorstig} honger={hongerig} energy={m.energy} size={row === "voor" ? 112 : 100} seed={i * 3 + (row === "voor" ? 2 : 0)} label={m.name} />
            <span className="ff-tag">
              <span className="ff-tag-name">
                <span className="ff-dot" style={{ background: moodDot(c) }} />
                {m.id === me.id ? "Jij" : m.name}
              </span>
              <span className={`ff-tag-mood${zzz ? " is-slaap" : werk ? " is-werk" : ""}`}>{m.joined === false ? "nog niet aangemeld" : zzz ? "slaapt" : werk ? `${werk.look === "school" ? "op school" : werk.werk.naam} · ${restTekst(werk.rest)}` : stinkt ? "pfoe, nog niet gedoucht?" : hongerig ? "heeft honger…" : moodLabel(c)}</span>
              {werk ? <BezigBalk b={werk} klein /> : m.joined !== false && !zzz && <Meters state={state} id={m.id} klein />}
            </span>
            {c?.wantsTalk && <span className="ff-bubble" aria-hidden="true"><Icon name="chat" size={16} /></span>}
          </button>
        );
      })}
    </>
  );
}

export function Attention({ state, me, onTalkTips, onCheckIn, onGoTasks, onRuzie, onGoGezin }: { state: FamilyState; me: Member; onTalkTips: (id: string) => void; onCheckIn: () => void; onGoTasks: () => void; onRuzie: (id?: string) => void; onGoGezin: () => void }) {
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
export function Inbox({ state, me }: { state: FamilyState; me: Member }) {
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

const ROMMEL_PLEK: CSSProperties[] = [
  { left: "8%", bottom: "6%" }, { right: "9%", bottom: "8%" }, { left: "30%", bottom: "2%" },
  { right: "28%", bottom: "3%" }, { left: "4%", bottom: "30%" }, { right: "4%", bottom: "31%" },
];

/** Jouw dag: wat er NU speelt. Ochtend = routine, middag = lunch, avond = eten. Plus jouw klussen. */
function JouwDag({ state, me, onOpen, onGoThuis }: { state: FamilyState; me: Member; onOpen: () => void; onGoThuis: () => void }) {
  const log = dagLog(state, me.id);
  const deel = dagdeel();
  const info = DAGDELEN.find((d) => d.id === deel)!;
  const nodig = ROUTINE.filter((x) => x.gewicht > 0);
  const klaar = nodig.filter((x) => log.routine.includes(x.id)).length;
  const r = reeks(state, me.id);
  const momenten = ETEN.filter((e) => e.deel === deel);
  const plan = kookplan(state);
  const bezig = werktNu(state, me.id);
  return (
    <section className="ff-card ff-stack-s">
      <div className="ff-row" style={{ justifyContent: "space-between" }}>
        <b>{info.emoji} {deel === "ochtend" && klaar < nodig.length ? "Je ochtendroutine" : `Jouw ${info.label.toLowerCase()}`}</b>
        {r > 0 && <span className="ff-small">🔥 {r} {r === 1 ? "dag" : "dagen"} op rij</span>}
      </div>
      {bezig && (
        <div className="ff-bezig">
          <span><b>{bezig.look === "school" ? "🎒 Op school" : `💼 ${bezig.werk.naam}`}</b> · {bezig.van.replace(":", ".")}–{bezig.tot.replace(":", ".")} · {restTekst(bezig.rest)}</span>
          <BezigBalk b={bezig} />
        </div>
      )}
      <Meters state={state} id={me.id} />
      {deel === "ochtend" && <p className="ff-small ff-muted">Routine {klaar}/{nodig.length}{gegeten(log, "ontbijt") ? " · ontbeten" : ""}</p>}
      {momenten.length > 0 && (
        <div className="ff-moment-rij">
          {momenten.map((e) => (
            <button key={e.id} className="ff-chip ff-chip-l" aria-pressed={gegeten(log, e.id)} onClick={() => actions.toggleEten(me.id, e.id)}>
              {e.emoji} {gegeten(log, e.id) ? `${e.label} ✓` : `${e.label}?`}
            </button>
          ))}
        </div>
      )}
      <p className="ff-small ff-muted">Hele dag: water {log.water}/{DOEL.water} · fruit {log.fruit}/{DOEL.fruit}</p>
      {(deel === "middag" || deel === "avond") && (
        <button className={`ff-kook-regel${isGeregeld(plan) ? "" : " is-open"}`} onClick={onGoThuis}>
          🍳 Vanavond: {plan.restjes ? "restjes" : plan.kok ? `${plan.kok === me.id ? "jij kookt" : `${state.members.find((m) => m.id === plan.kok)?.name ?? ""} kookt`}${plan.wat ? ` · ${plan.wat}` : ""}` : "nog niemand kookt. Wie pakt het op?"}
        </button>
      )}
      <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={onOpen}>{deel === "ochtend" && klaar < nodig.length ? "Ochtendroutine afvinken" : "Mijn dag bijwerken"}</button>
    </section>
  );
}

/** Klassement van vandaag: wie is het meest bezig? Competitief, maar gezellig. */
export function Klassement({ state, me, onOpen }: { state: FamilyState; me: Member; onOpen: (id: string) => void }) {
  const leden = state.members.filter((m) => m.joined !== false);
  if (leden.length < 2) return null;
  const rij = leden
    .map((m) => {
      return { m, score: dagscore(state, m.id, takenPct(state, m.id) ?? 0) };
    })
    .sort((a, b) => b.score - a.score);
  const medaille = ["🥇", "🥈", "🥉"];
  return (
    <section className="ff-card ff-stack-s">
      <div className="ff-row" style={{ justifyContent: "space-between" }}>
        <b>Klassement van vandaag</b>
        <span className="ff-small ff-muted">hygiëne · gezondheid · taken</span>
      </div>
      <div className="ff-klassement">
        {rij.map(({ m, score }, i) => (
          <button key={m.id} className="ff-klassement-rij" onClick={() => onOpen(m.id)}>
            <span className="ff-plek">{medaille[i] ?? i + 1}</span>
            <Avatar config={m.avatar} expression={slaapt(state, m.id) ? "slaap" : expressionFor(state.checkins[m.id])} headOnly size={32} animate={false} label={m.name} />
            <span><b>{m.id === me.id ? "Jij" : m.name}</b>{walm(state, m.id) && !slaapt(state, m.id) ? <span className="ff-small ff-muted"> · moet nog douchen</span> : null}</span>
            <span className="ff-score">{score}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Net gedaan: wat iedereen vandaag heeft afgevinkt. Geen melding per actie, wel zichtbaar voor het hele gezin. */
export function NetGedaan({ state, me }: { state: FamilyState; me: Member }) {
  const vandaag = new Date().toDateString();
  const lijst = (state.feed ?? []).filter((f) => new Date(f.at).toDateString() === vandaag).slice(-6).reverse();
  if (!lijst.length) return null;
  return (
    <section className="ff-card ff-stack-s">
      <b>Net gedaan</b>
      {lijst.map((f) => {
        const m = state.members.find((x) => x.id === f.who);
        if (!m) return null;
        return (
          <div key={f.id} className="ff-row ff-feed-rij">
            <Avatar config={m.avatar} expression="blij" headOnly size={28} animate={false} label={m.name} />
            <span className="ff-grow ff-small"><b>{m.id === me.id ? "Jij" : m.name}</b> {m.id === me.id ? f.tekst.replace(/^heeft /, "hebt ").replace(/^kookt /, "kookt ") : f.tekst}</span>
            {f.punten > 0 && <span className="ff-feed-punten">+{f.punten}</span>}
            <span className="ff-small ff-muted">{new Date(f.at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        );
      })}
    </section>
  );
}

/** Balkje: hoe ver is het werk of de schooldag. */
export function BezigBalk({ b, klein = false }: { b: Bezigheid; klein?: boolean }) {
  return (
    <span className={`ff-bezig-balk${klein ? " is-klein" : ""}`} role="progressbar" aria-valuenow={Math.round(b.pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${b.werk.naam} ${Math.round(b.pct * 100)}%`}>
      <i style={{ width: `${Math.round(b.pct * 100)}%` }} />
    </span>
  );
}

/**
  Klussen van vandaag: een eigen kaart, los van je dag.
  - Bovenaan wat jij moet doen. Ben je aan het werk of op school, dan staat het "voor straks".
  - Daaronder kort wat er voor de rest nog openstaat, met wie aan de beurt is.
  Alleen klussen die vandaag echt moeten. Wat nooit is bijgehouden telt alleen mee als het een dagelijkse klus is.
*/
function KlussenVandaag({ state, me, onGoThuis }: { state: FamilyState; me: Member; onGoThuis: () => void }) {
  const bezig = werktNu(state, me.id);
  const open = klusStatus(state).filter((k) => !k.vandaagGedaan && k.nodig && (k.laatst || k.klus.elke === 1 || k.klus.naKoken) && (!k.klus.perKind || me.role === "ouder" || k.kind?.id === me.id));
  if (!open.length) return null;
  const mijn = open.filter((k) => k.beurt?.id === me.id).slice(0, 3);
  const rest = open.filter((k) => k.beurt?.id !== me.id).slice(0, 5);
  return (
    <section className="ff-card ff-stack-s">
      <div className="ff-row" style={{ justifyContent: "space-between" }}>
        <b>🧹 Klussen vandaag</b>
        <button className="ff-link ff-small" onClick={onGoThuis}>Alles</button>
      </div>
      {mijn.length > 0 && (
        <div className="ff-stack-s">
          <span className="ff-eyebrow">{bezig ? `Voor na ${bezig.look === "school" ? "school" : "je werk"} (${bezig.tot.replace(":", ".")})` : "Jij bent aan de beurt"}</span>
          {mijn.map((k) => (
            <div key={k.key} className={`ff-row ff-log-rij${bezig ? " is-straks" : ""}`}>
              <span aria-hidden="true">{k.klus.emoji}</span>
              <span className="ff-grow ff-small"><b>{naamKlus(k, me.id)}</b>{k.teLaat > 0 ? <span className="ff-alert"> · blijft liggen</span> : null}</span>
              {!bezig && <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => actions.klusGedaan(k.key, me.id, k.klus.xp, naamKlus(k, me.id))}>Gedaan</button>}
            </div>
          ))}
        </div>
      )}
      {rest.length > 0 && (
        <div className="ff-chips">
          {rest.map((k) => (
            <button key={k.key} className={`ff-chip${k.teLaat > 0 ? " is-laat" : ""}`} onClick={onGoThuis}>
              {k.klus.emoji} {k.klus.perKind && k.kind ? `Kamer ${k.kind.name}` : k.klus.label.split(" (")[0]}{k.beurt ? ` · ${k.beurt.name}` : ""}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/**
  Schatkist: je punten sparen zich op en jij claimt ze zelf. Hoe langer je wacht, hoe groter de bol.
  Daaronder: welk achievement je bijna hebt.
*/
function Schatkist({ state, me }: { state: FamilyState; me: Member }) {
  const n = teClaimen(state, me.id);
  const [viering, setViering] = useState<{ van: number; n: number } | null>(null);
  const volgende = bijna(state, me.id).slice(0, 2);
  if (!n && !volgende.length && !viering) return null;
  return (
    <section className="ff-card ff-stack-s">
      {n > 0 && (
        <div className="ff-schatkist">
          <div className="ff-schatkist-bol" aria-hidden="true">💎<b>+{n}</b></div>
          <div className="ff-grow">
            <b>Je schatkist</b>
            <span className="ff-small ff-muted ff-block">{n} punten gespaard. Claim ze als je wilt, of spaar door.</span>
          </div>
          <button className="ff-btn ff-btn-primary" onClick={() => { const van = geclaimd(state, me.id); const c = actions.claimPunten(me.id); if (c) setViering({ van, n: c }); }}>Claim</button>
        </div>
      )}
      {volgende.map((v) => (
        <div key={v.def.id} className="ff-bijna">
          <span aria-hidden="true" style={{ fontSize: 20 }}>{v.def.emoji}</span>
          <span>
            <b>{v.def.naam}</b> <span className="ff-muted">· {v.def.uitleg.toLowerCase()}</span>
            <span className="ff-bezig-balk" style={{ marginTop: 4 }}><i style={{ width: `${Math.round((v.n / v.doel) * 100)}%` }} /></span>
          </span>
          <span className="ff-small ff-muted">{v.n}/{v.doel}</span>
        </div>
      ))}
      {viering && <ClaimViering me={me} van={viering.van} n={viering.n} onKlaar={() => setViering(null)} />}
    </section>
  );
}
