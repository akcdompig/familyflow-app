"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { MijnWeekKort } from "@/components/screens/WeekKaart";
import { AddTaskSheet, TaskRow } from "@/components/screens/Taken";
import { Week as WerkWeek } from "@/components/screens/Thuis";
import { dagLijst } from "@/lib/groei";
import { expressionFor } from "@/lib/mood";
import { iso } from "@/lib/planner";
import { actions } from "@/lib/store";
import { isDone, tasksFor } from "@/lib/tasks";
import { weekKaart } from "@/lib/week";
import type { FamilyState, Member } from "@/lib/types";
import { WeekV2 } from "./WeekV2";
import { WeekVerder } from "./SamenVerder";

/*
  Week (3.9): alles wat over de week gaat op één plek.
  Bovenaan hoe de week ervoor staat (kind: je weekkaart; ouder: elk kind, tik = afsluiten en details).
  Dan de dagen van de week, "hielp de huisregel?", het weekoverleg en hoe de week ging.
*/
export function WeekTab({ state, me, onToast, onOpenLid, onCoach, onPlanner }: { state: FamilyState; me: Member; onToast: (m: string) => void; onOpenLid: (id: string) => void; onCoach: (id: string) => void; onPlanner?: () => void }) {
  const isOuder = me.role === "ouder";
  const kinderen = state.members.filter((m) => m.role !== "ouder" && m.joined !== false);
  const [adding, setAdding] = useState(false);
  return (
    <div className="ff-screen v2-screen">
      <header className="v2-top">
        <div>
          <div className="ff-eyebrow">{state.family}</div>
          <h1 className="ff-h1">Week</h1>
        </div>
      </header>

      {!isOuder && <MijnWeekKort state={state} me={me} />}
      {isOuder && kinderen.length > 0 && (
        <section className="ff-card ff-stack-s" aria-label="Weekkaart per kind">
          <b>Hoe staat de week ervoor?</b>
          {kinderen.map((k) => {
            const w = weekKaart(state, k.id);
            return (
              <button key={k.id} className="v2-weekrij" onClick={() => onOpenLid(k.id)} aria-label={`${k.name}: ${w.pct}% van de week, doel ${w.drempel}%. Openen om af te vinken, af te sluiten of de bonus in te stellen`}>
                <Avatar config={k.avatar} expression={expressionFor(state.checkins[k.id])} headOnly size={32} animate={false} label="" />
                <span className="ff-grow ff-stack-xs">
                  <span className="ff-row"><b className="ff-grow">{k.name}</b><span className="ff-small ff-muted">{w.gesloten ? (w.gesloten.gehaald ? `🔒 ${w.gesloten.beloning ?? "gehaald"}${w.gesloten.betaald ? " · betaald" : ""}` : "🔒 afgesloten") : `${w.pct}% · ${w.behaald >= 0 ? `${w.treden[w.behaald].wat || "bonus"} binnen` : `doel ${w.drempel}%`}`}</span></span>
                  <span className="v2-weekbalk" aria-hidden="true"><i style={{ width: `${Math.min(100, w.pct)}%` }} />{w.treden.map((t) => <b key={t.pct} style={{ left: `${t.pct}%` }} />)}</span>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            );
          })}
          <span className="ff-small ff-muted">Tik op een kind om af te vinken, de weekbonus in te stellen of op zondag de week af te sluiten.</span>
        </section>
      )}

      <WeekV2 state={state} me={me} onToast={onToast} onOpenLid={onOpenLid} />

      {onPlanner && <button className="v2-menu-rij" onClick={onPlanner}><span aria-hidden="true">📚</span><b className="ff-grow">{isOuder ? "Huiswerk en oefentoetsen van de kinderen" : "Huiswerk en toetsen plannen"}</b><span aria-hidden="true">›</span></button>}

      <WeekVerder state={state} me={me} onToast={onToast} onCoach={onCoach} />

      {isOuder && (
        <details className="v2-meer-details">
          <summary><b>Taken en roosters</b> <span className="ff-small ff-muted">taken toevoegen, werk vrij wegklikken</span></summary>
          <div className="ff-row" style={{ justifyContent: "space-between" }}>
            <b>Taken vandaag</b>
            <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={() => setAdding(true)}>+ Taak</button>
          </div>
          {state.members.map((m) => {
            const lijst = tasksFor(state, m.id).filter((t) => !(t.cat === "werk" && /^werkdag$/i.test(t.title)));
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
                    <TaskRow key={t.id} task={t} state={state} who={m.id} canToggle onToggle={() => actions.toggleTask(t, m.id)} onConfirm={m.id !== me.id ? () => { actions.confirmTask(t, me.id); onToast(`Bevestigd, ${m.name} krijgt +${t.xp} punten`); } : undefined} showXp={false} onRemove={() => { actions.removeTask(t.id); onToast("Taak verwijderd"); }} />
                  ))}
                </ul>
                {huis.length > 0 && (
                  <ul className="ff-lijst-dag" aria-label={`Huistaken van ${m.name}`}>
                    {huis.map((x, i) => <li key={x.titel + i} className={x.klaar ? "is-af" : ""}><span aria-hidden="true">{x.klaar ? "✅" : x.emoji}</span><span className="ff-lijst-titel">{x.titel}</span><span className="ff-lijst-soort">huistaak</span></li>)}
                  </ul>
                )}
              </section>
            );
          })}
          <b>Werk en school deze week</b>
          <WerkWeek state={state} me={me} />
        </details>
      )}
      <AddTaskSheet open={adding} onClose={() => setAdding(false)} state={state} me={me} onAdded={onToast} />
    </div>
  );
}
