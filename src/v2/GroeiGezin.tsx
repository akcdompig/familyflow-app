"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { addDays, iso } from "@/lib/planner";
import { FASE, boomFase, competenties, dagStand, gezinsWeek, gezinsWeken, type CompStand } from "@/lib/groei";
import { maandag } from "@/lib/huis";
import { klein, weekRapport } from "@/lib/rapport";
import { IDEEEN } from "@/lib/samen";
import type { FamilyState, Member } from "@/lib/types";
import { PlanSheet } from "./Samen";

/*
  Groei: het weekverhaal (wat deden we, wat oefenden we, wat nu?), de gezinsboom over de weken,
  en per persoon wat geoefend en toegepast is. Geen ranglijsten, geen oordeel.
*/

const DAG = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const Kop = ({ m, size = 28 }: { m: Member; size?: number }) => <Avatar config={m.avatar} expression="blij" headOnly size={size} animate={false} label="" />;
const datum = (d: string) => `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`;

export function GroeiGezin({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const isOuder = me.role === "ouder";
  const vandaag = iso(new Date());
  const leden = state.members.filter((m) => m.joined !== false);
  const [ma, setMa] = useState(maandag(vandaag));
  const [wie, setWie] = useState(isOuder ? (leden.find((m) => m.role !== "ouder")?.id ?? me.id) : me.id);
  const [plan, setPlan] = useState(false);
  const [alleComp, setAlleComp] = useState(false);
  const r = weekRapport(state, me, ma);
  const huidig = ma === maandag(vandaag);
  const rijen = isOuder ? leden : leden.filter((m) => m.id === me.id);
  const lid = leden.find((m) => m.id === wie) ?? me;
  const comp = competenties(state, lid.id);
  const weken = gezinsWeken(state, 8);
  const max = Math.max(50, ...weken.map((w) => w.score));
  const deze = gezinsWeek(state, addDays(vandaag, -6));
  const vorige = gezinsWeek(state, addDays(vandaag, -13));
  const boom = boomFase([vorige, deze]);
  const naam = (m: Member) => (m.id === me.id ? "Jij" : m.name);

  return (
    <div className="ff-stack">
      {/* Weeknavigatie */}
      <div className="v2-rapport-nav">
        <button className="v2-week-pijl" aria-label="Vorige week" onClick={() => setMa(addDays(ma, -7))}>‹</button>
        <b>{huidig ? "Deze week" : ma === addDays(maandag(vandaag), -7) ? "Vorige week" : `Week van ${datum(ma)}`} <span className="ff-small ff-muted">{datum(ma)} – {datum(r.zo)}</span></b>
        <button className="v2-week-pijl" aria-label="Volgende week" disabled={huidig} onClick={() => setMa(addDays(ma, 7))}>›</button>
      </div>

      {/* Het verhaal van de week */}
      <section className="v2-verhaal" aria-label="Het verhaal van de week">
        <span className="ff-eyebrow">{huidig ? "Jullie week tot nu toe" : "Jullie week"}</span>
        {r.genoeg ? r.verhaal.map((z, i) => <p key={i}>{z}</p>) : (
          <p>Er staat nog te weinig in de app om echt terug te kijken. {huidig ? "Vink deze week dingen af en doe iets samen, dan staat hier straks jullie verhaal." : "Geen probleem: deze week begint gewoon opnieuw."}</p>
        )}
      </section>

      {/* E. Volgende week */}
      <section className="ff-card ff-stack-s v2-vooruit" aria-label="Volgende week">
        <b>➡️ {huidig ? "Voor de rest van de week" : "Voor volgende week"}</b>
        {r.vooruit.punten.map((p, i) => <span key={i} className="ff-small">• {p}</span>)}
        {r.vooruit.persoonlijk && <span className="ff-small">🎯 <b>Jouw doel:</b> {r.vooruit.persoonlijk.tip}</span>}
        {r.vooruit.idee && (
          <div className="v2-gepland">
            <span className="v2-samen-emoji" aria-hidden="true">{r.vooruit.idee.idee.emoji}</span>
            <span className="ff-grow ff-small">Idee: <b>{klein(r.vooruit.idee.idee.titel)}</b> met {r.vooruit.idee.met.name}</span>
            <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={() => setPlan(true)}>Plannen</button>
          </div>
        )}
      </section>

      {/* A. Samen ondernomen */}
      <section className="ff-card ff-stack-s" aria-label="Samen ondernomen">
        <b>💞 Samen ondernomen</b>
        {!r.samen.gedaan.length && !r.samen.gepland.length && !r.samen.nietGedaan.length && <span className="ff-small ff-muted">Deze week niks samen vastgelegd.</span>}
        {r.samen.gedaan.map((x) => <SamenRij key={x.id} x={x} state={state} status="gedaan" me={me} />)}
        {r.samen.gepland.map((x) => <SamenRij key={x.id} x={x} state={state} status="gepland" me={me} />)}
        {r.samen.nietGedaan.map((x) => <SamenRij key={x.id} x={x} state={state} status="open" me={me} />)}
      </section>

      {/* De gezinsboom over de weken */}
      <section className="v2-boom" aria-label="Jullie gezin groeit">
        <div className={`v2-boom-plant fase-${boom.fase}`} aria-hidden="true">{boom.emoji}</div>
        <div className="ff-grow ff-stack-xs">
          <span className="ff-eyebrow">Jullie gezin</span>
          <b className="v2-boom-naam">{boom.naam}</b>
          <span className="ff-small">Groeit mee met samen-momenten, dagen af en zelf beginnen.</span>
        </div>
      </section>
      {/* De rest: voor wie meer wil zien. Standaard dicht, zodat het rustig blijft. */}
      <details className="v2-meer-details">
        <summary><b>Meer bekijken</b> <span className="ff-small ff-muted">geoefend, dag voor dag, 8 weken, groei per persoon</span></summary>
        <div className="ff-stack">
        {/* B. Vaardigheden geoefend */}
        <section className="ff-card ff-stack-s" aria-label="Vaardigheden geoefend">
          <b>🌱 Geoefend deze week</b>
          {r.geoefend.length ? (
            <div className="v2-geoefend">
              {r.geoefend.slice(0, 6).map((g) => (
                <div key={g.c.id} className="v2-geoefend-rij">
                  <span className="v2-geoefend-kop"><span aria-hidden="true">{g.c.emoji}</span> <b>{g.c.naam}</b>{isOuder && g.wie.length ? <span className="ff-small ff-muted"> · {g.wie.join(", ")}</span> : null}</span>
                  <span className="ff-small ff-muted">{g.waar.join(" · ")}</span>
                </div>
              ))}
            </div>
          ) : <span className="ff-small ff-muted">Nog niks gezien deze week. Het komt vanzelf, door wat jullie in de app doen.</span>}
          {r.verderOefenen.length > 0 && <span className="ff-small"><b>Verder oefenen:</b> {r.verderOefenen.map((x) => `${naam(x.lid)}: ${klein(x.c.naam)}`).join(" · ")}</span>}
        </section>

        {/* C en D. Mooie momenten en wat jullie er zelf van vonden */}
        {(r.voorbeelden.length > 0 || r.zelf.length > 0) && (
          <section className="ff-card ff-stack-s" aria-label="Mooie momenten">
            <b>✨ Mooie momenten</b>
            {r.voorbeelden.map((v, i) => (
              <div key={i} className="v2-moment"><Kop m={v.lid} size={22} /><span className="ff-small"><b>{naam(v.lid)}</b>: {klein(v.b.tekst)} <span className="ff-muted">{dagKort(v.b.datum)}</span></span></div>
            ))}
            {r.zelf.length > 0 && (
              <>
                <span className="ff-eyebrow">Zelf aangegeven</span>
                {r.zelf.map((z, i) => <div key={i} className="v2-moment"><Kop m={z.lid} size={22} /><span className="ff-small">{z.tekst}</span></div>)}
              </>
            )}
          </section>
        )}

        {/* De week per dag */}
        <section className="ff-card ff-stack-s" aria-label="De week per dag">
          <b>🗓️ Dag voor dag</b>
          <div className="v2-weekgrid" style={{ gridTemplateColumns: `minmax(64px, auto) repeat(7, minmax(0, 1fr))` }}>
            <span />
            {DAG.map((d) => <span key={d} className="ff-small ff-muted v2-weekgrid-kop">{d}</span>)}
            {rijen.map((m) => (
              <div key={m.id} className="v2-weekgrid-rij">
                <span className="v2-weekgrid-naam"><Kop m={m} size={22} /><span className="ff-small">{naam(m)}</span></span>
                {DAG.map((_, i) => {
                  const d = addDays(ma, i);
                  const st = d <= vandaag ? dagStand(state, m.id, d).stand : "leeg";
                  const heeftSamen = (state.samen ?? []).some((x) => x.gedaan && iso(new Date(x.gedaan)) === d && x.wie.includes(m.id));
                  return <span key={d} className={`v2-vakje is-${st}${d === vandaag ? " is-vandaag" : ""}${heeftSamen ? " is-samen" : ""}`} title={`${d}: ${st}`} aria-label={`${DAG[i]}: ${st === "af" ? "dag af" : st === "half" ? "half af" : st === "niks" ? "nog veel open" : "nog niet"}${heeftSamen ? ", samen iets gedaan" : ""}`} />;
                })}
              </div>
            ))}
          </div>
          <span className="ff-small ff-muted">✓ dag af · ½ half · 💞 samen iets gedaan. {r.dagenAf.af ? `${r.dagenAf.af} ${r.dagenAf.af === 1 ? "dag" : "dagen"} helemaal af.` : ""}</span>
        </section>

        <section className="ff-card ff-stack-s" aria-label="De laatste 8 weken">
          <b>📈 De laatste 8 weken</b>
          <div className="v2-groeigrafiek">
            {weken.map((w, i) => (
              <button key={w.maandag} className={`v2-groeistaaf${w.maandag === ma ? " is-nu" : ""}`} onClick={() => setMa(w.maandag)} aria-label={`Week van ${datum(w.maandag)} bekijken`}>
                <span className="v2-groeibalk"><i style={{ height: `${Math.max(3, (w.score / max) * 100)}%` }} /></span>
                <span className="ff-small ff-muted">{i === weken.length - 1 ? "nu" : datum(w.maandag)}</span>
              </button>
            ))}
          </div>
          <span className="ff-small ff-muted">Hoger = meer samen, meer dagen af en vaker zelf begonnen. Tik op een week om die terug te kijken.</span>
        </section>

        {/* Per persoon */}
        <section className="ff-card ff-stack-s" aria-label="Competenties">
          <b>🌱 {lid.id === me.id ? "Waar groei jij in" : `Waar groeit ${lid.name} in`}</b>
          {isOuder && (
            <div className="ff-chips">
              {leden.map((m) => <button key={m.id} className="ff-chip" aria-pressed={wie === m.id} onClick={() => setWie(m.id)}>{m.id === me.id ? "Ik" : m.name}</button>)}
            </div>
          )}
          <span className="ff-small ff-muted">De bolletjes zijn de laatste 4 weken. Telt vanzelf, door wat je in de app doet. Dit is geen cijfer of beoordeling.</span>
          {(alleComp ? comp : comp.filter((c) => c.fase !== "nog-niet")).map((c) => <CompRij key={c.c.id} c={c} />)}
          {!alleComp && <button className="ff-link ff-small" onClick={() => setAlleComp(true)}>Alle {comp.length} laten zien</button>}
        </section>

        </div>
      </details>

      <PlanSheet open={plan} idee={r.vooruit.idee?.idee} met={r.vooruit.idee?.met.id} state={state} me={me} onClose={() => setPlan(false)} onToast={onToast} />
    </div>
  );
}

const DAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const dagKort = (d: string) => DAGEN[new Date(d + "T12:00:00").getDay()];

function SamenRij({ x, state, status, me }: { x: NonNullable<FamilyState["samen"]>[number]; state: FamilyState; status: "gedaan" | "gepland" | "open"; me: Member }) {
  const wie = x.wie.map((id) => state.members.find((m) => m.id === id)).filter(Boolean) as Member[];
  const reacties = Object.values(x.reactie ?? {}).join("");
  return (
    <div className="v2-gepland">
      <span className="v2-samen-emoji" aria-hidden="true">{IDEEEN.find((i) => i.id === x.soort)?.emoji ?? "✨"}</span>
      <span className="ff-grow ff-stack-xs">
        <b className="ff-small">{x.titel}</b>
        <span className="ff-small ff-muted">{dagKort(x.datum)} · {wie.map((m) => (m.id === me.id ? "jij" : m.name)).join(", ")}{x.vrienden ? ` + ${x.vrienden}` : ""}{reacties ? ` · ${reacties}` : ""}</span>
      </span>
      <span className={`v2-status is-${status}`}>{status === "gedaan" ? "gedaan ✓" : status === "gepland" ? "gepland" : "nog afvinken"}</span>
    </div>
  );
}

function CompRij({ c }: { c: CompStand }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="v2-comp">
      <button className="v2-comp-kop" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span aria-hidden="true">{c.c.emoji}</span>
        <span className="ff-grow ff-stack-xs"><span>{c.c.naam}</span><span className={`v2-fase is-${c.fase}`}>{FASE[c.fase]}</span></span>
        <span className="v2-niveau" aria-label={`In ${c.weken.filter(Boolean).length} van de laatste 4 weken`}>{c.weken.map((w, i) => <i key={i} className={w ? "is-aan" : ""} />)}</span>
      </button>
      {open && (
        <div className="v2-comp-open ff-small">
          <span className="ff-muted">{c.c.uitleg}. Laatste 4 weken: {c.oefenen}× geoefend, {c.toepassen}× toegepast.</span>
          {c.recent.length ? c.recent.map((b, i) => <span key={i}>• {b.tekst}{b.bron === "zelf" ? " (zelf aangegeven)" : ""} <span className="ff-muted">{datum(b.datum)}</span></span>) : <span className="ff-muted">Nog niks gezien. Komt vanzelf.</span>}
        </div>
      )}
    </div>
  );
}
