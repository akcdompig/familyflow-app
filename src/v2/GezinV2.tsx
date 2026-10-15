"use client";

import { useState } from "react";
import { Attention, Inbox, Klassement, NetGedaan, Row } from "@/components/screens/Huiskamer";
import { Eten, Klussen, Potje, Week } from "@/components/screens/Thuis";
import { AddTaskSheet, TaskRow } from "@/components/screens/Taken";
import { Avatar } from "@/components/avatar/Avatar";
import { klusStatus, rommel } from "@/lib/huis";
import { expressionFor } from "@/lib/mood";
import { slaapt } from "@/lib/status";
import { actions } from "@/lib/store";
import { isDone, tasksFor } from "@/lib/tasks";
import type { FamilyState, Member } from "@/lib/types";
import { VoedingOverzicht } from "./Voeding";
import { SamenTab } from "./Samen";
import { SchermOverzicht } from "./Scherm";
import { Vragen } from "@/components/screens/Verdeling";
import { WeekV2 } from "./WeekV2";
import { GroeiGezin } from "./GroeiGezin";

type Tab = "nu" | "week" | "samen" | "klussen" | "eten" | "groei";
const TABS: { id: Tab; label: string }[] = [
  { id: "nu", label: "Nu" },
  { id: "week", label: "Week" },
  { id: "samen", label: "Samen" },
  { id: "klussen", label: "Klussen" },
  { id: "eten", label: "Eten" },
  { id: "groei", label: "Groei" },
];
// Kinderen (en zeker met ADHD) hebben baat bij minder keuzes: 4 tabbladen in plaats van 6.
const KIND_TABS: Tab[] = ["nu", "klussen", "samen", "groei"];

const ROMMEL_PLEK = [
  { left: "8%", bottom: "6%" }, { right: "9%", bottom: "8%" }, { left: "30%", bottom: "2%" },
  { right: "28%", bottom: "3%" }, { left: "4%", bottom: "30%" }, { right: "4%", bottom: "31%" },
];

function tijdVanDag() {
  const h = new Date().getHours();
  return h >= 6 && h < 17 ? "dag" : h >= 17 && h < 21 ? "avond" : "nacht";
}

/** Gezin: de huiskamer met iedereen, en alles van het huis (eten, klussen, potje, planning). */
export function GezinV2({ state, me, onToast, onOuders, onOpenLid, onTips, onRuzie, onCheckIn }: { state: FamilyState; me: Member; onToast: (m: string) => void; onOuders: () => void; onOpenLid: (id: string) => void; onTips: (id: string) => void; onRuzie: (id?: string) => void; onCheckIn: () => void }) {
  const [tab, setTab] = useState<Tab>("nu");
  const [adding, setAdding] = useState(false);
  const klussen = klusStatus(state);
  const teLaat = klussen.filter((k) => k.teLaat > 0).length;
  const troep = rommel(state);
  const tod = tijdVanDag();
  const iedereenSlaapt = state.members.filter((m) => m.joined !== false).every((m) => slaapt(state, m.id));
  const isOuder = me.role === "ouder";

  return (
    <div className="ff-screen v2-screen">
      <header className="v2-top">
        <div>
          <div className="ff-eyebrow">{state.family}</div>
          <h1 className="ff-h1">Gezin</h1>
        </div>
      </header>
      <div className="ff-seg v2-seg" role="tablist">
        {TABS.filter((t) => isOuder || KIND_TABS.includes(t.id)).map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}{t.id === "klussen" && teLaat > 0 ? <span className="v2-badge">{teLaat}</span> : null}
          </button>
        ))}
      </div>

      {tab === "nu" && (
        <>
          <section className={`ff-room v2-room ff-room-${iedereenSlaapt ? "nacht" : tod}${troep.length >= 3 ? " is-rommelig" : ""}`} aria-label="De huiskamer">
            <div className="ff-room-wall" />
            <div className="ff-room-window"><div className="ff-room-sky" /><div className="ff-room-sun" /></div>
            <div className="ff-room-lamp"><div className="ff-room-shade" /><div className="ff-room-pole" /></div>
            <div className="ff-room-plant"><div className="ff-room-leaf a" /><div className="ff-room-leaf b" /><div className="ff-room-leaf c" /><div className="ff-room-pot" /></div>
            <div className="ff-room-floor" />
            <div className="ff-room-sofa" />
            <div className="ff-room-rug" />
            {troep.map((t, i) => <span key={i} className="ff-room-rommel" aria-hidden="true" style={ROMMEL_PLEK[i]}>{t}</span>)}
            {troep.length > 0 && <button className="ff-rommel-knop" onClick={() => setTab("klussen")}>{troep.length >= 3 ? "Wat een troep! Opruimen?" : "Er blijft iets liggen"}</button>}
            <Row members={state.members.filter((m) => m.role === "ouder")} row="achter" state={state} me={me} onOpen={onOpenLid} />
            <Row members={state.members.filter((m) => m.role !== "ouder")} row="voor" state={state} me={me} onOpen={onOpenLid} />
          </section>
          <Attention state={state} me={me} onTalkTips={onTips} onCheckIn={onCheckIn} onGoTasks={() => setTab(isOuder ? "week" : "klussen")} onRuzie={onRuzie} onGoGezin={onOuders} />
          <Vragen state={state} me={me} onToast={onToast} />
          {isOuder && <SchermOverzicht state={state} onOpen={onOpenLid} />}
          {isOuder && <VoedingOverzicht state={state} onOpen={onOpenLid} />}
          <Inbox state={state} me={me} />
          {isOuder && <NetGedaan state={state} me={me} />}
          <Klassement state={state} me={me} onOpen={onOpenLid} />
        </>
      )}
      {tab === "samen" && (
        <div className="ff-stack">
          <SamenTab state={state} me={me} onToast={onToast} />
          <b>🐷 Gezinspotje <span className="ff-small ff-muted">samen sparen voor iets leuks</span></b>
          <Potje state={state} me={me} onToast={onToast} />
        </div>
      )}
      {tab === "eten" && <Eten state={state} me={me} onToast={onToast} />}
      {tab === "klussen" && <Klussen state={state} me={me} lijst={klussen} onToast={onToast} simpel={!isOuder} />}
      {tab === "groei" && <GroeiGezin state={state} me={me} onToast={onToast} />}
      {tab === "week" && (
        <div className="ff-stack">
          <WeekV2 state={state} me={me} onToast={onToast} onOpenLid={onOpenLid} />
          <details className="v2-meer-details">
            <summary><b>Taken en roosters</b> <span className="ff-small ff-muted">taken van vandaag, werk vrij wegklikken</span></summary>
          <div className="ff-row" style={{ justifyContent: "space-between" }}>
            <b>Taken vandaag</b>
            {isOuder && <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={() => setAdding(true)}>+ Taak</button>}
          </div>
          {state.members.map((m) => {
            const lijst = tasksFor(state, m.id).filter((t) => !(t.cat === "werk" && /^werkdag$/i.test(t.title)));
            if (!lijst.length) return null;
            return (
              <section key={m.id} className="ff-card v2-plan-lid">
                <div className="ff-row">
                  <Avatar config={m.avatar} expression={expressionFor(state.checkins[m.id])} headOnly size={30} animate={false} label={m.name} />
                  <b className="ff-grow">{m.id === me.id ? "Jij" : m.name}</b>
                  <span className="ff-small ff-muted">{lijst.filter((t) => isDone(state, t.id)).length}/{lijst.length}</span>
                </div>
                <ul className="ff-tasklist">
                  {lijst.map((t) => (
                    <TaskRow key={t.id} task={t} state={state} who={m.id} canToggle={m.id === me.id || isOuder} onToggle={() => actions.toggleTask(t, m.id)} onConfirm={isOuder && m.id !== me.id ? () => { actions.confirmTask(t, me.id); onToast(`Bevestigd, ${m.name} krijgt +${t.xp} punten`); } : undefined} showXp={false} onRemove={isOuder ? () => { actions.removeTask(t.id); onToast("Taak verwijderd"); } : undefined} />
                  ))}
                </ul>
              </section>
            );
          })}
          <b>Werk en school deze week</b>
          <Week state={state} me={me} />
          </details>
          <AddTaskSheet open={adding} onClose={() => setAdding(false)} state={state} me={me} onAdded={onToast} />
        </div>
      )}
    </div>
  );
}
