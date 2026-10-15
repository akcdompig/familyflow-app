"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { addDays, iso } from "@/lib/planner";
import { boomFase, competenties, dagStand, gezinsWeek, gezinsWeken, type CompStand } from "@/lib/groei";
import { maandag } from "@/lib/huis";
import type { FamilyState, Member } from "@/lib/types";

/*
  Groei: zie dat jullie als gezin naar elkaar toe groeien.
  - Bovenaan de gezinsboom: hoe beter de week (samen, structuur, zelfstandig), hoe groter hij wordt.
  - De weken naast elkaar: groei zie je over tijd, niet op één dag.
  - Per persoon 8 competenties, vergeleken met jezelf. Kinderen zien alleen hun eigen kaart.
*/

const DAG = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const Kop = ({ m, size = 28 }: { m: Member; size?: number }) => <Avatar config={m.avatar} expression="blij" headOnly size={size} animate={false} label="" />;

export function GroeiGezin({ state, me }: { state: FamilyState; me: Member }) {
  const isOuder = me.role === "ouder";
  const leden = state.members.filter((m) => m.joined !== false);
  const [wie, setWie] = useState(isOuder ? (leden.find((m) => m.role !== "ouder")?.id ?? me.id) : me.id);
  const weken = gezinsWeken(state, 8);
  const vandaag = iso(new Date());
  // Bovenaan: de laatste 7 dagen tegen de 7 dagen ervoor. Zo is maandag geen "slechte week".
  const deze = gezinsWeek(state, addDays(vandaag, -6));
  const vorige = gezinsWeek(state, addDays(vandaag, -13));
  const boom = boomFase([vorige, deze]);
  const verschil = deze.score - vorige.score;
  const ma = maandag(vandaag);
  const dezeWeek = weken[weken.length - 1];
  const rijen = isOuder ? leden : leden.filter((m) => m.id === me.id);
  const lid = leden.find((m) => m.id === wie) ?? me;
  const comp = competenties(state, lid.id);
  const max = Math.max(50, ...weken.map((w) => w.score));

  return (
    <div className="ff-stack">
      {/* De gezinsboom */}
      <section className="v2-boom" aria-label="Jullie gezin groeit">
        <div className={`v2-boom-plant fase-${boom.fase}`} aria-hidden="true">{boom.emoji}</div>
        <div className="ff-grow ff-stack-xs">
          <span className="ff-eyebrow">Jullie gezin</span>
          <b className="v2-boom-naam">{boom.naam}</b>
          <span className="ff-small">
            Laatste 7 dagen <b>{deze.score}</b>/100
            {verschil > 0 ? ` · ${verschil} meer dan vorige week 🎉` : verschil < 0 ? " · een rustigere week, volgende week weer 💪" : ""}
          </span>
        </div>
      </section>

      <div className="v2-pijlers">
        <div className="v2-pijler"><span aria-hidden="true">💞</span><b>{deze.samen}×</b><span className="ff-small ff-muted">samen (7 dagen)</span></div>
        <div className="v2-pijler"><span aria-hidden="true">✅</span><b>{deze.structuur}%</b><span className="ff-small ff-muted">dagen af</span></div>
        <div className="v2-pijler"><span aria-hidden="true">🚀</span><b>{deze.zelfstandig}×</b><span className="ff-small ff-muted">zelf gedaan</span></div>
      </div>

      {/* De weken naast elkaar */}
      <section className="ff-card ff-stack-s" aria-label="De laatste 8 weken">
        <b>📈 Zo groeien jullie</b>
        <div className="v2-groeigrafiek">
          {weken.map((w, i) => (
            <div key={w.maandag} className={`v2-groeistaaf${i === weken.length - 1 ? " is-nu" : ""}`} title={`Week van ${Number(w.maandag.slice(8))}/${Number(w.maandag.slice(5, 7))}: ${w.score}`}>
              <span className="ff-small v2-groeiwaarde">{w.score || ""}</span>
              <span className="v2-groeibalk"><i style={{ height: `${Math.max(3, (w.score / max) * 100)}%` }} /></span>
              <span className="ff-small ff-muted">{i === weken.length - 1 ? "nu…" : `${Number(w.maandag.slice(8))}/${Number(w.maandag.slice(5, 7))}`}</span>
            </div>
          ))}
        </div>
        <span className="ff-small ff-muted">Per week. De helft is structuur (dagen af), de rest samen-momenten en zelf beginnen. Deze week loopt nog.</span>
      </section>

      {/* Deze week */}
      <section className="ff-card ff-stack-s" aria-label="Deze week">
        <b>🗓️ Deze week</b>
        <div className="v2-weekgrid" style={{ gridTemplateColumns: `minmax(64px, auto) repeat(7, minmax(0, 1fr))` }}>
          <span />
          {DAG.map((d) => <span key={d} className="ff-small ff-muted v2-weekgrid-kop">{d}</span>)}
          {rijen.map((m) => (
            <div key={m.id} className="v2-weekgrid-rij">
              <span className="v2-weekgrid-naam"><Kop m={m} size={22} /><span className="ff-small">{m.id === me.id ? "Jij" : m.name}</span></span>
              {DAG.map((_, i) => {
                const d = addDays(ma, i);
                const st = d <= vandaag ? dagStand(state, m.id, d).stand : "leeg";
                return <span key={d} className={`v2-vakje is-${st}${d === vandaag ? " is-vandaag" : ""}`} title={`${d}: ${st}`} aria-label={`${DAG[i]}: ${st === "af" ? "dag af" : st === "half" ? "half af" : st === "niks" ? "weinig gedaan" : "nog niet"}`} />;
              })}
            </div>
          ))}
        </div>
        <span className="ff-small ff-muted">✓ dag af · ½ half · leeg nog niet. {dezeWeek.klussen} klussen, {dezeWeek.achievements} achievements en {dezeWeek.samen}× samen deze week.</span>
      </section>

      {/* Competenties */}
      <section className="ff-card ff-stack-s" aria-label="Competenties">
        <b>🌱 {lid.id === me.id ? "Waar groei jij in" : `Waar groeit ${lid.name} in`}</b>
        {isOuder && (
          <div className="ff-chips">
            {leden.map((m) => <button key={m.id} className="ff-chip" aria-pressed={wie === m.id} onClick={() => setWie(m.id)}>{m.id === me.id ? "Ik" : m.name}</button>)}
          </div>
        )}
        <span className="ff-small ff-muted">Vergeleken met de 4 weken ervoor. Telt vanzelf, door wat je in de app doet.</span>
        {comp.map((c) => <CompRij key={c.c.id} c={c} />)}
      </section>
    </div>
  );
}

function CompRij({ c }: { c: CompStand }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="v2-comp">
      <button className="v2-comp-kop" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span aria-hidden="true">{c.c.emoji}</span>
        <span className="ff-grow">{c.c.naam}</span>
        <span className="v2-niveau" aria-label={`Niveau ${c.niveau} van 5`}>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= c.niveau ? "is-aan" : ""} />)}</span>
        <span className={`v2-trend is-${c.trend}`} aria-label={c.trend === "omhoog" ? "groeit" : c.trend === "omlaag" ? "minder dan vorige periode" : "gelijk"}>{c.trend === "omhoog" ? "↑" : c.trend === "omlaag" ? "↓" : "→"}</span>
      </button>
      {open && (
        <div className="v2-comp-open ff-small">
          <span className="ff-muted">{c.c.uitleg}. {c.nu} keer in 4 weken{c.vorig ? ` (was ${c.vorig})` : ""}.</span>
          {c.recent.length ? c.recent.map((b, i) => <span key={i}>• {b.tekst} <span className="ff-muted">{Number(b.datum.slice(8))}/{Number(b.datum.slice(5, 7))}</span></span>) : <span className="ff-muted">Nog niks gezien. Komt vanzelf.</span>}
        </div>
      )}
    </div>
  );
}
