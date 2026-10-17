"use client";

import { useState } from "react";
import { Attention, Inbox, NetGedaan, Row } from "@/components/screens/Huiskamer";
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
import { dagLijst, dagStand } from "@/lib/groei";
import { iso } from "@/lib/planner";

type Tab = "nu" | "week" | "samen" | "klussen" | "eten";
const TABS: { id: Tab; label: string }[] = [
  { id: "nu", label: "Nu" },
  { id: "week", label: "Week" },
  { id: "samen", label: "Samen" },
  { id: "klussen", label: "Taken" },
  { id: "eten", label: "Eten" },
];
// Kinderen (en zeker met ADHD) hebben baat bij minder keuzes: 3 tabbladen. Groei staat sinds 3.0 bij Samen verder.
const KIND_TABS: Tab[] = ["nu", "klussen", "samen"];

const ROMMEL_PLEK = [
  { left: "8%", bottom: "6%" }, { right: "9%", bottom: "8%" }, { left: "30%", bottom: "2%" },
  { right: "28%", bottom: "3%" }, { left: "4%", bottom: "30%" }, { right: "4%", bottom: "31%" },
];

function tijdVanDag() {
  const h = new Date().getHours();
  return h >= 6 && h < 17 ? "dag" : h >= 17 && h < 21 ? "avond" : "nacht";
}

/** Gezin: de huiskamer met iedereen, en alles van het huis (eten, klussen, potje, planning). */
export function GezinV2({ state, me, onToast, onOuders, onOpenLid, onTips, onRuzie, onCheckIn, startTab }: { startTab?: string; state: FamilyState; me: Member; onToast: (m: string) => void; onOuders: () => void; onOpenLid: (id: string) => void; onTips: (id: string) => void; onRuzie: (id?: string) => void; onCheckIn: () => void }) {
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === startTab) ? (startTab as Tab) : "nu");
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
            {troep.length > 0 && <button className="ff-rommel-knop" onClick={() => setTab("klussen")}>{troep.length >= 3 ? "Even opruimen?" : "Er blijft iets liggen"}</button>}
            <Row members={state.members.filter((m) => m.role === "ouder")} row="achter" state={state} me={me} onOpen={onOpenLid} />
            <Row members={state.members.filter((m) => m.role !== "ouder")} row="voor" state={state} me={me} onOpen={onOpenLid} />
          </section>
          <Attention state={state} me={me} onTalkTips={onTips} onCheckIn={onCheckIn} onGoTasks={() => setTab(isOuder ? "week" : "klussen")} onRuzie={onRuzie} onGoGezin={onOuders} />
          <Vragen state={state} me={me} onToast={onToast} />
          {isOuder && <SchermOverzicht state={state} onOpen={onOpenLid} />}
          {isOuder && <VoedingOverzicht state={state} onOpen={onOpenLid} />}
          <Inbox state={state} me={me} />
          {isOuder && <NetGedaan state={state} me={me} />}
          <SamenVandaag state={state} me={me} onOpen={onOpenLid} />
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
            // Huistaken van vandaag horen er ook bij: zelfde telling als Vandaag (dagLijst), alleen lezen.
            const huis = dagLijst(state, m.id, iso(new Date())).filter((x) => x.soort === "klus");
            if (!lijst.length && !huis.length) return null;
            return (
              <section key={m.id} className="ff-card v2-plan-lid">
                <div className="ff-row">
                  <Avatar config={m.avatar} expression={expressionFor(state.checkins[m.id])} headOnly size={30} animate={false} label={m.name} />
                  <b className="ff-grow">{m.id === me.id ? "Jij" : m.name}</b>
                  <span className="ff-small ff-muted">{lijst.filter((t) => isDone(state, t.id)).length + huis.filter((x) => x.klaar).length}/{lijst.length + huis.length}</span>
                </div>
                <ul className="ff-tasklist">
                  {lijst.map((t) => (
                    <TaskRow key={t.id} task={t} state={state} who={m.id} canToggle={m.id === me.id || isOuder} onToggle={() => actions.toggleTask(t, m.id)} onConfirm={isOuder && m.id !== me.id ? () => { actions.confirmTask(t, me.id); onToast(`Bevestigd, ${m.name} krijgt +${t.xp} punten`); } : undefined} showXp={false} onRemove={isOuder ? () => { actions.removeTask(t.id); onToast("Taak verwijderd"); } : undefined} />
                  ))}
                </ul>
                {huis.length > 0 && (
                  <ul className="ff-lijst-dag" aria-label={`Huistaken van ${m.name}`}>
                    {huis.map((x, i) => <li key={x.titel + i} className={x.klaar ? "is-af" : ""}><span aria-hidden="true">{x.klaar ? "✅" : x.emoji}</span><span className="ff-lijst-titel">{x.titel}</span><span className="ff-lijst-soort">huistaak · afvinken bij Taken</span></li>)}
                  </ul>
                )}
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

/** In plaats van een ranglijst: hoe ver zijn we samen vandaag? Geen volgorde, geen medailles. */
function SamenVandaag({ state, me, onOpen }: { state: FamilyState; me: Member; onOpen: (id: string) => void }) {
  const vandaag = iso(new Date());
  const leden = state.members.filter((m) => m.joined !== false);
  if (leden.length < 2) return null;
  const st = leden.map((m) => ({ m, ...dagStand(state, m.id, vandaag) }));
  const klaar = st.filter((x) => x.stand === "af").length;
  return (
    <section className="ff-card ff-stack-s" aria-label="Samen vandaag">
      <div className="ff-row">
        <b className="ff-grow">Samen vandaag</b>
        <span className="ff-small ff-muted">{klaar} van {leden.length} {klaar === 1 ? "heeft" : "hebben"} de dag af</span>
      </div>
      <div className="v2-samen-koppen">
        {st.map((x) => (
          <button key={x.m.id} className={`v2-samen-kop${x.stand === "af" ? " is-af" : ""}`} onClick={() => onOpen(x.m.id)} aria-label={`${x.m.id === me.id ? "Jij" : x.m.name}${x.stand === "af" ? ": dag af" : ""}`}>
            <Avatar config={x.m.avatar} expression={x.stand === "af" ? "blij" : "neutraal"} headOnly size={36} animate={false} label="" />
            {x.stand === "af" && <span className="v2-samen-vink" aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
      <span className="ff-small ff-muted">{klaar === leden.length ? "Iedereen heeft zijn dag af. Gezinsdag! 🎉" : "Helpt iedereen een beetje mee, dan halen jullie het samen."}</span>
      {/* Elke teller is uit te klappen: wat telt er mee, voor wie, vandaag. */}
      <details className="v2-teller-uitleg">
        <summary className="ff-small"><b>Wat telt er mee?</b> <span className="ff-muted">vandaag, per persoon</span></summary>
        <div className="ff-stack-s">
          <span className="ff-small ff-muted">Telt: ochtendroutine, eetmomenten, taken en huistaken van vandaag. Werk, school en afspraken tellen niet: die vink je niet af.</span>
          {st.map((x) => (
            <div key={x.m.id} className="ff-stack-xs">
              <b className="ff-small">{x.m.id === me.id ? "Jij" : x.m.name}: {x.af} van {x.totaal}</b>
              <ul className="ff-lijst-dag">
                {x.items.filter((it) => me.role === "ouder" || x.m.id === me.id || (it.soort !== "routine" && it.soort !== "eten")).map((it, i) => <li key={it.titel + i} className={it.klaar ? "is-af" : ""}><span aria-hidden="true">{it.klaar ? "✅" : "⬜"}</span><span className="ff-lijst-titel">{it.titel}</span></li>)}
                {me.role !== "ouder" && x.m.id !== me.id && x.items.some((it) => it.soort === "routine" || it.soort === "eten") && <li className="ff-small ff-muted">+ routine en eten (alleen voor {x.m.name} zelf)</li>}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
