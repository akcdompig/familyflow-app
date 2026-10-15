"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { DAGDELEN, DOEL, ETEN, ROUTINE, basisXp, begroeting, dagdeel, dagLog, deadlineUur, gegeten, gezondheid, hygiene, kledingDag, reeks, type Dagdeel } from "@/lib/dag";
import { actions } from "@/lib/store";
import type { FamilyState, Member } from "@/lib/types";

/** Twee balkjes zoals in de Sims: hygiëne en gezondheid. */
export function Meters({ state, id, klein = false }: { state: FamilyState; id: string; klein?: boolean }) {
  const h = hygiene(state, id);
  const g = gezondheid(state, id);
  const kleur = (v: number) => (v >= 70 ? "var(--ff-munt-donker)" : v >= 40 ? "var(--ff-zon)" : "var(--ff-koraal-knop)");
  return (
    <div className={`ff-meters${klein ? " is-klein" : ""}`}>
      <div className="ff-meter" title={`Hygiëne ${h}%`}>
        <span aria-hidden="true">🧼</span>
        {!klein && <span className="ff-small">Hygiëne</span>}
        <span className="ff-meter-bar"><i style={{ width: `${h}%`, background: kleur(h) }} /></span>
        {!klein && <span className="ff-small ff-muted">{h}%</span>}
      </div>
      <div className="ff-meter" title={`Gezondheid ${g}%`}>
        <span aria-hidden="true">💚</span>
        {!klein && <span className="ff-small">Gezondheid</span>}
        <span className="ff-meter-bar"><i style={{ width: `${g}%`, background: kleur(g) }} /></span>
        {!klein && <span className="ff-small ff-muted">{g}%</span>}
      </div>
    </div>
  );
}

/** Mijn dag: ochtend, middag, avond en nacht. Water en fruit lopen de hele dag door. Alles met één tik. */
export function MijnDag({ open, onClose, state, me, onToast }: { open: boolean; onClose: () => void; state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const nu = dagdeel();
  const [deel, setDeel] = useState<Dagdeel>(nu);
  useEffect(() => {
    if (open) setDeel(dagdeel());
  }, [open]);
  const log = dagLog(state, me.id);
  const kind = me.role !== "ouder";
  const kd = kledingDag(state, me.id);
  const r = reeks(state, me.id);
  const nodig = ROUTINE.filter((x) => x.gewicht > 0);
  const klaar = nodig.filter((x) => log.routine.includes(x.id)).length;
  const upd = actions.updateDag.bind(null, me.id);
  const toggle = (id: string) => {
    const aan = !log.routine.includes(id);
    upd((l) => ({ ...l, routine: aan ? [...l.routine, id] : l.routine.filter((x) => x !== id) }));
    if (aan && klaar + 1 === nodig.length && ROUTINE.find((x) => x.id === id)!.gewicht > 0) onToast(kind ? "Ochtendroutine compleet! +5 XP bonus" : "Ochtendroutine compleet!");
  };
  const eetTegel = (id: string) => {
    const e = ETEN.find((x) => x.id === id)!;
    return (
      <button key={id} className="ff-dag-tegel" aria-pressed={gegeten(log, id)} onClick={() => actions.toggleEten(me.id, id)}>
        <span className="ff-dag-emoji" aria-hidden="true">{e.emoji}</span>
        <span>{e.label}</span>
      </button>
    );
  };
  const telling: Record<Dagdeel, string> = {
    ochtend: `${klaar}/${nodig.length}${gegeten(log, "ontbijt") ? " · ontbeten" : ""}`,
    middag: `${["lunch", "tussendoor"].filter((x) => gegeten(log, x)).length}/2`,
    avond: gegeten(log, "avondeten") ? "gegeten" : "",
    nacht: me.bedtime ? `bedtijd ${me.bedtime.replace(":", ".")}` : "",
  };

  return (
    <Sheet open={open} onClose={onClose} title="Mijn dag">
      <div className="ff-stack">
        <div className="ff-row" style={{ justifyContent: "space-between" }}>
          <h2 className="ff-h2">{begroeting()}, {me.name}</h2>
          {r > 0 && <span className="ff-chip ff-chip-static">🔥 {r} {r === 1 ? "dag" : "dagen"}</span>}
        </div>
        <Meters state={state} id={me.id} />

        <div className="ff-dagdelen" role="tablist" aria-label="Dagdelen">
          {DAGDELEN.map((d) => (
            <button key={d.id} role="tab" className={`ff-dagdeel${d.id === nu ? " is-nu" : ""}`} aria-selected={deel === d.id} onClick={() => setDeel(d.id)}>
              <span aria-hidden="true">{d.emoji}</span>
              <b>{d.label}</b>
              <span className="ff-small ff-muted">{d.id === nu ? "nu" : telling[d.id] || "\u00a0"}</span>
            </button>
          ))}
        </div>

        {deel === "ochtend" && (
          <>
            <section className="ff-stack-s">
              <div className="ff-row" style={{ justifyContent: "space-between" }}>
                <b>Ochtendroutine</b>
                <span className="ff-small ff-muted">{klaar} van {nodig.length} · vóór {deadlineUur()}:00</span>
              </div>
              <div className="ff-dag-tegels">
                {ROUTINE.map((x) => (
                  <button key={x.id} className="ff-dag-tegel" aria-pressed={log.routine.includes(x.id)} onClick={() => toggle(x.id)}>
                    <span className="ff-dag-emoji" aria-hidden="true">{x.emoji}</span>
                    <span>{x.label}</span>
                    {x.gewicht === 0 && <span className="ff-small ff-muted">extra</span>}
                  </button>
                ))}
              </div>
            </section>
            <section className="ff-stack-s">
              <b>Kleding</b>
              <div className="ff-chips">
                <button className="ff-chip ff-chip-l" aria-pressed={log.kleding === "nieuw"} onClick={() => upd((l) => ({ ...l, kleding: "nieuw" }))}>👕 Schone set aan</button>
                <button className="ff-chip ff-chip-l" aria-pressed={log.kleding === "zelfde"} onClick={() => upd((l) => ({ ...l, kleding: "zelfde" }))}>Zelfde als gisteren</button>
              </div>
              <p className={`ff-small ${kd >= 3 && log.kleding !== "nieuw" ? "ff-alert" : "ff-muted"}`}>
                {log.kleding === "nieuw" ? "Fris! Dag 1 van deze set." : kd >= 3 ? `Dag ${kd} in dezelfde kleren. Tijd voor een schone set!` : `Dag ${kd} van deze set. Maximaal 2 dagen, dan een schone.`}
              </p>
            </section>
            <section className="ff-stack-s">
              <b>Ontbijt</b>
              <div className="ff-dag-tegels">{eetTegel("ontbijt")}</div>
              <p className="ff-small ff-muted">Mag van alles zijn: een broodje, yoghurt, een smoothie. Als je maar iets eet.</p>
            </section>
          </>
        )}

        {deel === "middag" && (
          <section className="ff-stack-s">
            <b>Eten</b>
            <div className="ff-dag-tegels">{eetTegel("lunch")}{eetTegel("tussendoor")}</div>
            <p className="ff-small ff-muted">Tussendoortje: een bord eten, een stuk fruit of een boterham. Uit de koelkast mag wat jullie hebben afgesproken.</p>
          </section>
        )}

        {deel === "avond" && (
          <section className="ff-stack-s">
            <b>Avondeten</b>
            <div className="ff-dag-tegels">{eetTegel("avondeten")}</div>
            <p className="ff-small ff-muted">Wie er kookt en wie er mee-eet zie je bij Thuis.</p>
          </section>
        )}

        {deel === "nacht" && (
          <section className="ff-stack-s">
            <b>Slapen</b>
            <p className="ff-small ff-muted">{me.bedtime ? `Je bedtijd is ${me.bedtime.replace(":", ".")}. Telefoon een uur eerder aan de lader.` : "Ga op tijd naar bed. Telefoon een uur eerder aan de lader."}</p>
            <button className="ff-btn ff-btn-dark ff-btn-wide" onClick={() => { actions.goToSleep(me.id); onClose(); onToast("Welterusten"); }}>🌙 Ik ga slapen</button>
          </section>
        )}

        <section className="ff-card ff-dag-heledag ff-stack-s">
          <div className="ff-row" style={{ justifyContent: "space-between" }}>
            <b>Hele dag door</b>
            <span className="ff-small ff-muted">water {log.water}/{DOEL.water} · fruit {log.fruit}/{DOEL.fruit}</span>
          </div>
          <div className="ff-dag-glazen" aria-label="Water">
            {Array.from({ length: Math.max(DOEL.water, log.water) }, (_, i) => (
              <button key={i} className="ff-dag-glas" aria-pressed={i < log.water} aria-label={`${i + 1} glazen water`} onClick={() => upd((l) => ({ ...l, water: i < l.water ? i : i + 1 }))}>💧</button>
            ))}
            <button className="ff-dag-glas is-plus" aria-label="Nog een glas" onClick={() => upd((l) => ({ ...l, water: l.water + 1 }))}>+</button>
          </div>
          <div className="ff-dag-glazen" aria-label="Fruit">
            {Array.from({ length: Math.max(DOEL.fruit, log.fruit) }, (_, i) => (
              <button key={i} className="ff-dag-glas" aria-pressed={i < log.fruit} aria-label={`${i + 1} stuks fruit`} onClick={() => upd((l) => ({ ...l, fruit: i < l.fruit ? i : i + 1 }))}>🍎</button>
            ))}
            <button className="ff-dag-glas is-plus" aria-label="Nog een stuk fruit" onClick={() => upd((l) => ({ ...l, fruit: l.fruit + 1 }))}>+</button>
          </div>
          <div className="ff-chips">
            <button className="ff-chip ff-chip-l" aria-pressed={!!log.sport} onClick={() => upd((l) => ({ ...l, sport: !l.sport }))}>🏃 Bewogen vandaag</button>
          </div>
        </section>

        {kind && <p className="ff-small"><b>+{basisXp(log)} XP</b> verdiend vandaag met je basis.</p>}
        <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={onClose}>Klaar</button>
      </div>
    </Sheet>
  );
}
