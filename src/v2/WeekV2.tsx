"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { addDays, iso } from "@/lib/planner";
import { dagStand } from "@/lib/groei";
import { KLUSSEN, kookplan, maandag, werkOp } from "@/lib/huis";
import { IDEEEN } from "@/lib/samen";
import { samenwerken } from "@/lib/samenwerken";
import { lookVoor } from "@/lib/status";
import { verdeling } from "@/lib/verdeling";
import type { FamilyState, Member } from "@/lib/types";
import { PlanSheet } from "./Samen";

/*
  Week: kijk vooruit (morgen trainen met Khloe en Kian) en terug (hoe ging dinsdag?).
  Eén strook met dagen, één dag tegelijk open. Samen staat bovenaan: daar draait het om.
*/

const DAG = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const DAG_LANG = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
const Kop = ({ m, size = 24 }: { m: Member; size?: number }) => <Avatar config={m.avatar} expression="neutraal" headOnly size={size} animate={false} label="" />;
const STAND = { af: { kleur: "is-af", tekst: "dag af" }, half: { kleur: "is-half", tekst: "half" }, niks: { kleur: "is-niks", tekst: "nog veel open" }, leeg: { kleur: "", tekst: "" } } as const;

export function WeekV2({ state, me, onToast, onOpenLid }: { state: FamilyState; me: Member; onToast: (m: string) => void; onOpenLid: (id: string) => void }) {
  const vandaag = iso(new Date());
  const [start, setStart] = useState(maandag(vandaag));
  const [dag, setDag] = useState(vandaag);
  const [plan, setPlan] = useState(false);
  const dagen = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const leden = state.members.filter((m) => m.joined !== false);
  const isOuder = me.role === "ouder";
  // Kinderen zien hun eigen dag-af, ouders van iedereen. Geen vergelijken.
  const zichtbaar = isOuder ? leden : leden.filter((m) => m.id === me.id);
  const verleden = dag < vandaag;
  const toekomst = dag > vandaag;
  const samen = (state.samen ?? []).filter((x) => x.datum === dag || (x.gedaan && iso(new Date(x.gedaan)) === dag)).filter((x, i, a) => a.indexOf(x) === i);
  const v = verdeling(state, dag);
  const kok = kookplan(state, dag);
  const studie = (state.tasks ?? []).filter((t) => t.study && (t.date === dag || t.study.deadline === dag) && (isOuder || t.assignee === me.id));
  const toetsen = studie.filter((t) => t.study!.deadline === dag && /toets/i.test(t.study!.kind));
  const lid = (id?: string) => state.members.find((m) => m.id === id);

  return (
    <div className="ff-stack">
      <div className="v2-week-strook" role="tablist" aria-label="Dagen van de week">
        <button className="v2-week-pijl" aria-label="Vorige week" onClick={() => { setStart(addDays(start, -7)); setDag(addDays(start, -7)); }}>‹</button>
        {dagen.map((d) => {
          const heeftSamen = (state.samen ?? []).some((x) => x.datum === d);
          const mijn = d <= vandaag ? dagStand(state, me.id, d).stand : "leeg";
          return (
            <button key={d} role="tab" aria-selected={dag === d} className={`v2-week-dag${d === vandaag ? " is-vandaag" : ""}`} onClick={() => setDag(d)} aria-label={`${DAG_LANG[new Date(d + "T12:00:00").getDay()]} ${Number(d.slice(8))}`}>
              <span className="ff-small">{DAG[new Date(d + "T12:00:00").getDay()]}</span>
              <b>{Number(d.slice(8))}</b>
              <span className="v2-week-stip" aria-hidden="true">{heeftSamen ? "💞" : mijn === "af" ? "✓" : "·"}</span>
            </button>
          );
        })}
        <button className="v2-week-pijl" aria-label="Volgende week" onClick={() => { setStart(addDays(start, 7)); setDag(addDays(start, 7)); }}>›</button>
      </div>

      <h2 className="ff-h2 v2-week-titel">{dag === vandaag ? "Vandaag" : dag === addDays(vandaag, 1) ? "Morgen" : dag === addDays(vandaag, -1) ? "Gisteren" : DAG_LANG[new Date(dag + "T12:00:00").getDay()]} {Number(dag.slice(8))}/{Number(dag.slice(5, 7))}</h2>

      {/* Samen: altijd bovenaan */}
      <section className="ff-card ff-stack-s v2-week-samen" aria-label="Samen op deze dag">
        <b>💞 Samen</b>
        {samen.length ? samen.map((x) => {
          const wie = x.wie.map(lid).filter(Boolean) as Member[];
          return (
            <div key={x.id} className="v2-gepland">
              <span className="v2-samen-emoji" aria-hidden="true">{IDEEEN.find((i) => i.id === x.soort)?.emoji ?? "✨"}</span>
              <span className="ff-grow ff-stack-xs">
                <b>{x.titel}{x.gedaan ? " ✓" : ""}</b>
                <span className="ff-small ff-muted">{x.tijd ? `${x.tijd.replace(":", ".")} · ` : ""}{wie.map((m) => (m.id === me.id ? "jij" : m.name)).join(", ")}{x.vrienden ? ` + ${x.vrienden}` : ""}</span>
              </span>
              <span className="v2-gepland-koppen">{wie.slice(0, 4).map((m) => <Kop key={m.id} m={m} />)}</span>
              {!x.gedaan && dag <= vandaag && (isOuder || x.wie.includes(me.id)) && <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={() => { samenwerken.gedaan(x.id, me.id); onToast("Leuk! +10 punten voor iedereen 💞"); }}>Gedaan</button>}
            </div>
          );
        }) : <span className="ff-small ff-muted">{verleden ? "Deze dag niks samen gedaan." : "Nog niks gepland."}</span>}
        {!verleden && <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => setPlan(true)}>+ Iets samen plannen op deze dag</button>}
      </section>

      {/* Terugblik of vandaag: hoe ging het? */}
      {!toekomst && (
        <section className="ff-card ff-stack-s" aria-label="Hoe ging deze dag">
          <b>{verleden ? "Hoe ging het?" : "Tot nu toe"}</b>
          {zichtbaar.map((m) => {
            const st = dagStand(state, m.id, dag);
            const gedaan = (state.klusLog ?? []).filter((k) => k.by === m.id && iso(new Date(k.at)) === dag);
            return (
              <button key={m.id} className="v2-week-lid" onClick={() => onOpenLid(m.id)}>
                <Kop m={m} size={28} />
                <span className="ff-grow ff-stack-xs" style={{ textAlign: "left" }}>
                  <b>{m.id === me.id ? "Jij" : m.name}</b>
                  <span className="ff-small ff-muted">{st.af} van {st.totaal} gedaan{gedaan.length ? ` · ${gedaan.map((k) => KLUSSEN.find((x) => x.id === k.klus.split(":")[0])?.emoji ?? "✓").join(" ")}` : ""}</span>
                </span>
                <span className={`v2-stand ${STAND[st.stand].kleur}`}>{STAND[st.stand].tekst}</span>
              </button>
            );
          })}
        </section>
      )}

      {/* Vooruit: werk, school, eten, klussen, toetsen */}
      {!verleden && (
        <section className="ff-card ff-stack-s" aria-label="Wat staat er">
          <b>{toekomst ? "Wat staat er" : "Verder vandaag"}</b>
          {leden.map((m) => {
            const werk = werkOp(state, m.id, dag).filter((w) => !w.vrij);
            // Klussen alleen voor vandaag: die worden pas op de dag zelf eerlijk verdeeld.
            const klussen = toekomst ? [] : Object.entries(v.wie).filter(([, w]) => w === m.id).map(([key]) => key);
            if (!werk.length && !klussen.length) return null;
            return (
              <div key={m.id} className="v2-week-rij">
                <Kop m={m} />
                <span className="ff-grow ff-stack-xs">
                  <b className="ff-small">{m.id === me.id ? "Jij" : m.name}</b>
                  {werk.map((w) => <span key={w.werk.id + w.van} className="ff-small">{lookVoor(w.werk) === "school" ? "🎒" : "💼"} {w.werk.naam} {w.van.replace(":", ".")}–{w.tot.replace(":", ".")}</span>)}
                  {klussen.length > 0 && (
                    <span className="ff-small ff-muted">🧹 {klussen.map((key) => { const k = KLUSSEN.find((x) => x.id === key.split(":")[0]); return k ? (k.perKind ? "kamer" : k.label.split(" (")[0].toLowerCase()) : key; }).join(", ")}</span>
                  )}
                </span>
              </div>
            );
          })}
          {toekomst && <span className="ff-small ff-muted">🧹 Klussen worden op de dag zelf eerlijk verdeeld.</span>}
          {(kok.kok || kok.restjes) && <span className="ff-small">🍳 {kok.restjes ? "Restjes" : `${lid(kok.kok)?.name ?? "Iemand"} kookt`}{kok.wat ? `: ${kok.wat}` : ""}</span>}
          {toetsen.map((t) => <span key={t.id} className="ff-small">📝 Toets {t.study!.subject}{isOuder ? ` (${lid(t.assignee as string)?.name})` : ""}</span>)}
          {studie.filter((t) => !toetsen.includes(t)).slice(0, 4).map((t) => <span key={t.id} className="ff-small">📚 {t.study!.subject}: {t.title}{isOuder ? ` (${lid(t.assignee as string)?.name})` : ""}</span>)}
        </section>
      )}

      <PlanSheet open={plan} datum={dag} state={state} me={me} onClose={() => setPlan(false)} onToast={onToast} />
    </div>
  );
}
