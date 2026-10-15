"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { addDays, iso } from "@/lib/planner";
import { BUDGET, IDEEEN, TIJD, band, dezeMaand, gepland, suggestie, type Energie, type Idee, type Tijd } from "@/lib/samen";
import { samenwerken } from "@/lib/samenwerken";
import type { FamilyState, Member, SamenMoment } from "@/lib/types";

/*
  Samen: iets samen doen. Vrijblijvend, voor de leuke kant van het gezinsleven.
  Geen doelen, geen reeksen, geen ranglijst. Alleen ideeën, plannen, en achteraf: hoe was het?
*/

const Kop = ({ m, size = 28 }: { m: Member; size?: number }) => <Avatar config={m.avatar} expression="blij" headOnly size={size} animate={false} label="" />;
const DAG = ["zo", "ma", "di", "wo", "do", "vr", "za"];
function datumTekst(d: string, tijd?: string) {
  const vandaag = iso(new Date());
  const t = tijd ? ` ${tijd.replace(":", ".")}` : "";
  if (d === vandaag) return `vandaag${t}`;
  if (d === addDays(vandaag, 1)) return `morgen${t}`;
  if (d < vandaag) return `${DAG[new Date(d + "T12:00:00").getDay()]} ${Number(d.slice(8))}${t} (geweest)`;
  return `${DAG[new Date(d + "T12:00:00").getDay()]} ${Number(d.slice(8))}${t}`;
}
const HARTJES = (n: number) => "💞".repeat(n) + "🤍".repeat(5 - n);

export function SamenTab({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const [plan, setPlan] = useState<{ idee?: Idee; met?: string } | null>(null);
  const [tijd, setTijd] = useState<Tijd | "">("");
  const [budget, setBudget] = useState<number | -1>(-1);
  const [energie, setEnergie] = useState<Energie | "">("");
  const [vrienden, setVrienden] = useState(false);
  const [meer, setMeer] = useState(false);
  const anderen = state.members.filter((m) => m.id !== me.id && m.joined !== false);
  const sug = suggestie(state, me);
  const lijst = gepland(state);
  const terug = (state.samen ?? []).filter((x) => x.gedaan && x.wie.includes(me.id) && Date.now() - new Date(x.gedaan).getTime() < 14 * 864e5).reverse();
  const ideeen = IDEEEN.filter((i) => (!tijd || i.tijd === tijd) && (budget < 0 || i.budget <= budget) && (!energie || i.energie === energie) && (!vrienden || i.vrienden) && (i.vanaf ?? 0) <= (me.age ?? 99));
  const n = dezeMaand(state);

  return (
    <div className="ff-stack">
      <section className="ff-card v2-samen-kop">
        <span className="v2-samen-getal" aria-hidden="true">💞</span>
        <span className="ff-grow">
          <b>{n ? `${n}× samen iets gedaan deze maand` : "Samen iets leuks doen"}</b>
          <span className="ff-small ff-muted ff-block">Geen moeten. Gewoon tijd voor elkaar: koken, de stad in, een spelletje.</span>
        </span>
      </section>

      {sug && (
        <section className="ff-card v2-samen-idee">
          <span className="ff-eyebrow">Idee voor jou</span>
          <div className="ff-row">
            <span className="v2-samen-emoji" aria-hidden="true">{sug.idee.emoji}</span>
            <span className="ff-grow"><b>{sug.idee.titel}</b><span className="ff-small ff-muted ff-block">met {sug.met.name} · {TIJD[sug.idee.tijd]} · {BUDGET[sug.idee.budget]}</span></span>
            <Kop m={sug.met} size={36} />
          </div>
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setPlan({ idee: sug.idee, met: sug.met.id })}>Plannen</button>
        </section>
      )}

      {lijst.length > 0 && (
        <section className="ff-card ff-stack-s" aria-label="Gepland">
          <b>Gepland</b>
          {lijst.map((x) => <Gepland key={x.id} x={x} state={state} me={me} onToast={onToast} />)}
        </section>
      )}

      {terug.some((x) => !x.reactie?.[me.id]) && (
        <section className="ff-card ff-stack-s" aria-label="Hoe was het?">
          <b>Hoe was het?</b>
          {terug.filter((x) => !x.reactie?.[me.id]).slice(0, 3).map((x) => (
            <div key={x.id} className="ff-row">
              <span aria-hidden="true">{IDEEEN.find((i) => i.id === x.soort)?.emoji ?? "✨"}</span>
              <span className="ff-grow ff-small">{x.titel}</span>
              {(["😐", "🙂", "😍"] as const).map((r) => (
                <button key={r} className="v2-face" aria-label={`${x.titel}: ${r}`} onClick={() => { samenwerken.reactie(x.id, me.id, r); onToast("Dank je!"); }}>{r}</button>
              ))}
            </div>
          ))}
        </section>
      )}

      <section className="ff-card ff-stack-s" aria-label="Ideeën">
        <b>Ideeën</b>
        {meer && (
          <>
            <div className="ff-chips">
              {(["", "kort", "uur", "middag"] as const).map((t) => <button key={t || "alle"} className="ff-chip" aria-pressed={tijd === t} onClick={() => setTijd(t)}>{t ? TIJD[t] : "elke duur"}</button>)}
            </div>
            <div className="ff-chips">
              {[-1, 0, 1, 2].map((b) => <button key={b} className="ff-chip" aria-pressed={budget === b} onClick={() => setBudget(b)}>{b < 0 ? "elk budget" : b === 0 ? "gratis" : `tot ${BUDGET[b]}`}</button>)}
              {(["rustig", "actief"] as const).map((e) => <button key={e} className="ff-chip" aria-pressed={energie === e} onClick={() => setEnergie(energie === e ? "" : e)}>{e === "rustig" ? "😌 rustig" : "⚡ actief"}</button>)}
              <button className="ff-chip" aria-pressed={vrienden} onClick={() => setVrienden(!vrienden)}>👫 met vrienden</button>
            </div>
          </>
        )}
        <div className="v2-ideeen">
          {(meer ? ideeen : ideeen.slice(0, 5)).map((i) => (
            <button key={i.id} className="v2-idee" onClick={() => setPlan({ idee: i })}>
              <span className="v2-samen-emoji" aria-hidden="true">{i.emoji}</span>
              <b>{i.titel}</b>
              <span className="ff-small ff-muted">{TIJD[i.tijd]} · {BUDGET[i.budget]}</span>
            </button>
          ))}
          <button className="v2-idee is-anders" onClick={() => setPlan({})}>
            <span className="v2-samen-emoji" aria-hidden="true">✨</span>
            <b>Iets anders</b>
            <span className="ff-small ff-muted">zelf bedenken</span>
          </button>
        </div>
        {!ideeen.length && <span className="ff-small ff-muted">Niks dat hier precies bij past. Kies "Iets anders".</span>}
        {!meer && ideeen.length > 5 && <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => setMeer(true)}>Meer ideeën</button>}
      </section>

      {anderen.length > 0 && (
        <section className="ff-card ff-stack-s" aria-label="Jouw band">
          <b>Jouw band <span className="ff-small ff-muted">alleen jij ziet dit</span></b>
          {anderen.map((m) => (
            <div key={m.id} className="ff-row">
              <Kop m={m} />
              <span className="ff-grow">{m.name}</span>
              <span className="v2-hartjes" aria-label={`${band(state, me.id, m.id)} van 5`}>{HARTJES(band(state, me.id, m.id))}</span>
            </div>
          ))}
          <span className="ff-small ff-muted">Elke keer dat jullie samen iets doen, groeit het. Na een maand begint het weer opnieuw.</span>
        </section>
      )}

      <PlanSheet open={!!plan} idee={plan?.idee} met={plan?.met} state={state} me={me} onClose={() => setPlan(null)} onToast={onToast} />
    </div>
  );
}

function Gepland({ x, state, me, onToast }: { x: SamenMoment; state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const isOuder = me.role === "ouder";
  const mag = isOuder || x.wie.includes(me.id) || x.door === me.id;
  const wie = x.wie.map((id) => state.members.find((m) => m.id === id)).filter(Boolean) as Member[];
  return (
    <div className="v2-gepland">
      <span className="v2-samen-emoji" aria-hidden="true">{IDEEEN.find((i) => i.id === x.soort)?.emoji ?? "✨"}</span>
      <span className="ff-grow ff-stack-xs">
        <b>{x.titel}</b>
        <span className="ff-small ff-muted">{datumTekst(x.datum, x.tijd)} · {wie.map((m) => (m.id === me.id ? "jij" : m.name)).join(", ")}{x.vrienden ? ` + ${x.vrienden}` : ""}</span>
      </span>
      <span className="v2-gepland-koppen">{wie.slice(0, 3).map((m) => <Kop key={m.id} m={m} size={24} />)}</span>
      {mag && <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={() => { samenwerken.gedaan(x.id, me.id); onToast("Leuk! +10 punten voor iedereen 💞"); }}>Gedaan</button>}
      {mag && <button className="ff-link ff-small" aria-label={`${x.titel} weghalen`} onClick={() => { samenwerken.weg(x.id); onToast("Weggehaald"); }}>✕</button>}
    </div>
  );
}

export function PlanSheet({ open, idee, met, datum: startDatum, state, me, onClose, onToast }: { open: boolean; idee?: Idee; met?: string; datum?: string; state: FamilyState; me: Member; onClose: () => void; onToast: (m: string) => void }) {
  const vandaag = iso(new Date());
  const [titel, setTitel] = useState("");
  const [wie, setWie] = useState<string[]>([]);
  const [vrienden, setVrienden] = useState("");
  const [datum, setDatum] = useState(vandaag);
  const [tijd, setTijd] = useState("");
  const [sleutel, setSleutel] = useState("");
  const k = `${open}-${idee?.id ?? "x"}-${met ?? ""}-${startDatum ?? ""}`;
  if (open && sleutel !== k) {
    setSleutel(k);
    setTitel(idee?.titel ?? "");
    setWie([me.id, ...(met ? [met] : [])]);
    setVrienden("");
    setDatum(startDatum && startDatum >= vandaag ? startDatum : vandaag);
    setTijd("");
  }
  const leden = state.members.filter((m) => m.joined !== false);
  const wd = new Date().getDay();
  const zaterdag = addDays(vandaag, (6 - wd + 7) % 7 || 7);
  const dagen = [{ d: vandaag, l: "Vandaag" }, { d: addDays(vandaag, 1), l: "Morgen" }, { d: zaterdag, l: "Zaterdag" }, { d: addDays(zaterdag, 1), l: "Zondag" }];
  const klaar = titel.trim().length > 1 && (wie.length >= 2 || (wie.length >= 1 && vrienden.trim().length > 0));
  return (
    <Sheet open={open} onClose={onClose} title="Samen iets plannen">
      <div className="ff-stack">
        <input className="ff-input" placeholder="Wat gaan jullie doen?" value={titel} maxLength={60} onChange={(e) => setTitel(e.target.value)} />
        <span className="ff-eyebrow">Met wie</span>
        <div className="ff-chips">
          {leden.map((m) => (
            <button key={m.id} className="ff-chip ff-chip-l" aria-pressed={wie.includes(m.id)} onClick={() => setWie(wie.includes(m.id) ? wie.filter((x) => x !== m.id) : [...wie, m.id])}>{m.id === me.id ? "Ik" : m.name}</button>
          ))}
        </div>
        <input className="ff-input" placeholder="Vrienden of vriendinnen erbij? Namen (mag leeg)" value={vrienden} maxLength={60} onChange={(e) => setVrienden(e.target.value)} />
        <span className="ff-eyebrow">Wanneer</span>
        <div className="ff-chips">
          {dagen.map((x) => <button key={x.l} className="ff-chip" aria-pressed={datum === x.d} onClick={() => setDatum(x.d)}>{x.l}</button>)}
        </div>
        <div className="ff-row">
          <input className="ff-input" type="date" aria-label="Datum" value={datum} min={vandaag} onChange={(e) => setDatum(e.target.value || vandaag)} />
          <input className="ff-input" type="time" aria-label="Tijd (mag leeg)" value={tijd} onChange={(e) => setTijd(e.target.value)} />
        </div>
        <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!klaar} onClick={() => {
          samenwerken.plan({ soort: idee?.id ?? "anders", titel: titel.trim(), wie, vrienden: vrienden.trim() || undefined, datum, tijd: tijd || undefined, door: me.id });
          onToast("Gepland 📅");
          onClose();
        }}>Plannen</button>
        {!klaar && <span className="ff-small ff-muted">Kies wat en met wie (minstens twee, of vrienden erbij).</span>}
      </div>
    </Sheet>
  );
}
