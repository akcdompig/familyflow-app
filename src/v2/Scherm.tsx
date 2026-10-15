"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { addDays, iso } from "@/lib/planner";
import { dagAf, doelVan, uurMin, week, weekStand } from "@/lib/scherm";
import { samenwerken } from "@/lib/samenwerken";
import type { FamilyState, Member } from "@/lib/types";

/*
  Schermtijd: eerst je dag, dan je scherm.
  Kind: ziet of de dag af is, en dus of het om extra tijd mag vragen. Plus gisteren, rustig verwoord.
  Ouder: bij een verzoek om meer tijd meteen zien of de dag af is, de week in een balkje, en de getallen invullen.
*/

const DAG = ["zo", "ma", "di", "wo", "do", "vr", "za"];

/** Voor het kind, op Vandaag. */
export function SchermKind({ state, me }: { state: FamilyState; me: Member }) {
  const { af, open } = dagAf(state, me.id);
  const gisteren = state.schermtijd?.[me.id]?.[addDays(iso(new Date()), -1)];
  const doel = doelVan(state, me.id);
  return (
    <section className={`v2-scherm${af ? " is-af" : ""}`} aria-label="Schermtijd">
      <span className="v2-scherm-icoon" aria-hidden="true">{af ? "🔓" : "📱"}</span>
      <span className="ff-grow ff-stack-xs">
        <b>{af ? "Je dag is af! Je mag om extra schermtijd vragen" : "Eerst je dag, dan je scherm"}</b>
        <span className="ff-small">
          {af ? "Vraag het via Schermtijd op je telefoon. Papa of mama ziet dat je dag af is." : `Nog ${open.length === 1 ? "1 ding" : `${open.length} dingen`}: ${open.slice(0, 3).join(", ").toLowerCase()}${open.length > 3 ? " …" : ""}`}
        </span>
        {gisteren && <span className="ff-small ff-muted">Gisteren {uurMin(gisteren.totaal)} op je scherm{gisteren.totaal <= doel ? " · binnen de afspraak 👍" : ` · afspraak is ${uurMin(doel)}`}</span>}
      </span>
    </section>
  );
}

/** Voor ouders: per kind of de dag af is en hoe de schermtijd ervoor staat. */
export function SchermOverzicht({ state, onOpen }: { state: FamilyState; onOpen: (id: string) => void }) {
  const kids = state.members.filter((m) => m.role !== "ouder" && m.joined !== false);
  if (!kids.length) return null;
  const vandaag = iso(new Date());
  return (
    <section className="ff-card ff-stack-s" aria-label="Schermtijd van de kinderen">
      <b>📱 Schermtijd <span className="ff-small ff-muted">eerst de dag, dan het scherm</span></b>
      {kids.map((m) => {
        const { af, open } = dagAf(state, m.id);
        const ws = weekStand(state, m.id);
        const ingevuld = state.schermtijd?.[m.id]?.[vandaag];
        return (
          <button key={m.id} className="v2-voeding-kind" onClick={() => onOpen(m.id)}>
            <Avatar config={m.avatar} expression="neutraal" headOnly size={32} animate={false} label="" />
            <span className="ff-grow ff-stack-xs" style={{ textAlign: "left" }}>
              <b>{m.name} <span className={`v2-scherm-tag${af ? " is-af" : ""}`}>{af ? "dag af ✓" : `nog ${open.length}`}</span></b>
              <span className="ff-small ff-muted">
                {ingevuld ? `Vandaag ${uurMin(ingevuld.totaal)}` : "Vandaag nog niet ingevuld"}
                {ws ? ` · week gem. ${uurMin(ws.gemiddeld)} · ${ws.binnen}/${ws.dagen} dagen binnen ${uurMin(doelVan(state, m.id))}` : ""}
              </span>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        );
      })}
    </section>
  );
}

/** In het scherm van een kind (ouders): week, invullen en de afspraak. */
export function SchermOuder({ state, lid, me, onToast }: { state: FamilyState; lid: Member; me: Member; onToast: (m: string) => void }) {
  const vandaag = iso(new Date());
  const [dag, setDag] = useState(vandaag);
  const huidig = state.schermtijd?.[lid.id]?.[dag];
  const [uur, setUur] = useState("");
  const [min, setMin] = useState("");
  const [soc, setSoc] = useState("");
  const [sleutel, setSleutel] = useState("");
  const k = `${lid.id}-${dag}-${huidig?.at ?? ""}`;
  if (sleutel !== k) {
    setSleutel(k);
    setUur(huidig ? String(Math.floor(huidig.totaal / 60)) : "");
    setMin(huidig ? String(huidig.totaal % 60) : "");
    setSoc(huidig?.sociaal !== undefined ? String(huidig.sociaal) : "");
  }
  const doel = doelVan(state, lid.id);
  const w = week(state, lid.id);
  const max = Math.max(doel * 1.5, ...w.map((x) => x.totaal ?? 0));
  const { af, open } = dagAf(state, lid.id);
  const totaal = (Number(uur) || 0) * 60 + (Number(min) || 0);
  return (
    <section className="ff-stack-s" aria-label={`Schermtijd van ${lid.name}`}>
      <b>📱 Schermtijd</b>
      <span className={`v2-scherm-status${af ? " is-af" : ""}`}>{af ? `${lid.name} heeft de dag af: extra tijd mag ✓` : `Nog niet af: ${open.slice(0, 3).join(", ").toLowerCase()}`}</span>
      <div className="v2-scherm-week" aria-label="Laatste 7 dagen">
        {w.map((x) => (
          <span key={x.d} className="v2-scherm-dag" title={`${x.d}: ${uurMin(x.totaal)}`}>
            <span className="v2-scherm-staaf">
              <i className={x.totaal !== undefined && x.totaal > doel ? "is-over" : ""} style={{ height: `${x.totaal !== undefined ? Math.max(4, (x.totaal / max) * 100) : 0}%` }} />
              <em style={{ bottom: `${(doel / max) * 100}%` }} />
            </span>
            <span className="ff-small ff-muted">{DAG[new Date(x.d + "T12:00:00").getDay()]}</span>
          </span>
        ))}
      </div>
      <span className="ff-small ff-muted">Streep = afspraak ({uurMin(doel)}). Neem de getallen over uit Schermtijd op de telefoon.</span>
      <div className="ff-chips">
        {[vandaag, addDays(vandaag, -1)].map((d) => <button key={d} className="ff-chip" aria-pressed={dag === d} onClick={() => setDag(d)}>{d === vandaag ? "Vandaag" : "Gisteren"}</button>)}
      </div>
      <div className="v2-scherm-invoer">
        <label>Totaal <input className="ff-input" inputMode="numeric" aria-label="Totaal uren" placeholder="u" value={uur} onChange={(e) => setUur(e.target.value.replace(/\D/g, "").slice(0, 2))} /> u <input className="ff-input" inputMode="numeric" aria-label="Totaal minuten" placeholder="m" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, "").slice(0, 2))} /> m</label>
        <label>Sociaal <input className="ff-input" inputMode="numeric" aria-label="Sociaal in minuten" placeholder="min" value={soc} onChange={(e) => setSoc(e.target.value.replace(/\D/g, "").slice(0, 3))} /> min</label>
      </div>
      <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!totaal} onClick={() => { samenwerken.setSchermtijd(lid.id, dag, totaal, soc ? Number(soc) : undefined, me.id); onToast(`Schermtijd van ${lid.name} opgeslagen`); }}>Opslaan</button>
      <div className="ff-row">
        <span className="ff-grow ff-small">Afspraak per dag</span>
        <button className="v2-plusmin" aria-label="Afspraak 15 minuten minder" onClick={() => samenwerken.setSchermDoel(lid.id, doel - 15)}>−</button>
        <b>{uurMin(doel)}</b>
        <button className="v2-plusmin" aria-label="Afspraak 15 minuten meer" onClick={() => samenwerken.setSchermDoel(lid.id, doel + 15)}>+</button>
      </div>
    </section>
  );
}
