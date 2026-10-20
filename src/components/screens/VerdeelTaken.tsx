"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Icon } from "@/components/ui/Icon";
import { isKamer, klusById, maandag } from "@/lib/huis";
import { addDays, iso } from "@/lib/planner";
import { samenwerken } from "@/lib/samenwerken";
import { maakPlan, mijnWeek as mijnWeekVeilig, minutenInPlan, startPlan, teBewaren, wijzigingen, zonderTaak, type Plan } from "@/lib/takenplan";
import { magDoen, verwachting } from "@/lib/verdeling";
import type { FamilyState, Member } from "@/lib/types";

/*
  "Verdeel de taken": één knop voor ouders. Kies de week, bekijk het voorstel, wissel wat niet klopt, bevestig.
  Niet eens met een taak? ✕ haalt hem weg. Een dag (of meer dagen aangevinkt) kun je resetten: die verdeling wordt gewist.
  Wat al bevestigd was, wordt niet zomaar overschreven: eerst zie je precies wat er verandert.
*/

const DAG = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const dagNaam = (d: string) => `${DAG[new Date(d + "T12:00:00").getDay()]} ${Number(d.slice(8))}/${Number(d.slice(5, 7))}`;
type Periode = "deze" | "volgende" | "opnieuw";

export function VerdeelTaken({ state, me, onClose, onToast }: { state: FamilyState; me: Member; onClose: () => void; onToast: (m: string) => void }) {
  const vandaag = iso(new Date());
  const [periode, setPeriode] = useState<Periode>("deze");
  const start = periode === "deze" ? vandaag : periode === "volgende" ? addDays(maandag(vandaag), 7) : addDays(vandaag, 1);
  const dagen = periode === "deze" ? Math.max(1, 7 - ((new Date(vandaag + "T12:00:00").getDay() + 6) % 7)) : 7;
  const sleutel = `${periode}|${start}|${dagen}`;
  const voorstel = useMemo(() => maakPlan(state, start, dagen), [state, start, dagen]);
  // Wat al bevestigd is, zie je zoals het staat (dan kun je het wegkruisen). "Opnieuw vanaf morgen" rekent alles opnieuw.
  const basis = useMemo(() => (periode === "opnieuw" ? voorstel : startPlan(state, voorstel)), [periode, state, voorstel]);
  const [eigen, setEigen] = useState<Record<string, Plan>>({});
  const plan: Plan = eigen[sleutel] ?? basis;
  const [gewist, setGewist] = useState<Set<string>>(new Set());
  const [gekozen, setGekozen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [check, setCheck] = useState(false);
  const leden = state.members.filter((m) => m.joined !== false);
  const naam = (id?: string) => (id === me.id ? "Jij" : leden.find((m) => m.id === id)?.name ?? "");
  const bevestigd = state.klusAfspraken?.planning ?? {};
  const datums = Object.keys(plan).sort();
  const zichtbaar: Plan = Object.fromEntries(datums.map((d) => [d, gewist.has(d) ? {} : plan[d]]));
  const min = minutenInPlan(state, zichtbaar);
  const teWissen = datums.filter((d) => gewist.has(d) && bevestigd[d]);
  const veranderd = wijzigingen(state, Object.fromEntries(datums.filter((d) => !gewist.has(d)).map((d) => [d, plan[d]])));
  const bewaren = teBewaren(state, plan, gewist);
  const nietsTeDoen = !Object.keys(bewaren).length && !teWissen.length;

  const zetPlan = (nieuw: Plan) => { setEigen({ ...eigen, [sleutel]: nieuw }); setOpen(null); };
  const wissel = (d: string, key: string, wie: string) => zetPlan({ ...plan, [d]: { ...plan[d], [key]: { wie, reden: `aangepast door ${me.name.toLowerCase()}` } } });
  const kruis = (d: string, key: string) => zetPlan(zonderTaak(plan, d, key));
  const kies = (d: string) => { const n = new Set(gekozen); if (n.has(d)) n.delete(d); else n.add(d); setGekozen(n); };
  const alles = datums.length > 0 && datums.every((d) => gekozen.has(d));
  const reset = () => {
    setGewist(new Set([...gewist, ...gekozen]));
    // Weggekruiste of gewisselde taken van die dagen ook vergeten: na een reset begin je die dag opnieuw.
    if (eigen[sleutel]) zetPlan({ ...plan, ...Object.fromEntries([...gekozen].map((d) => [d, basis[d] ?? {}])) });
    onToast(gekozen.size === 1 ? "Dag gereset. Tik op Bevestigen om het door te voeren" : `${gekozen.size} dagen gereset. Tik op Bevestigen om het door te voeren`);
    setGekozen(new Set());
  };
  const terugzetten = (d: string) => { const n = new Set(gewist); n.delete(d); setGewist(n); };
  const kiesPeriode = (p: Periode) => { setPeriode(p); setGekozen(new Set()); setGewist(new Set()); };
  const bevestig = () => {
    if (Object.keys(bewaren).length) samenwerken.bevestigPlan(bewaren, me.id);
    if (teWissen.length) samenwerken.wisPlan(teWissen, me.id);
    onToast(nietsTeDoen ? "Niks veranderd" : teWissen.length && !Object.keys(bewaren).length ? "Verdeling gewist. Die dagen kun je opnieuw verdelen" : "Taken verdeeld 📋 Iedereen ziet het meteen");
    onClose();
  };

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">Huishoudelijke taken</div>
          <h1 className="ff-h2">Verdeel de taken</h1>
        </div>
        <button className="ff-iconbtn" onClick={onClose} aria-label="Sluiten"><Icon name="sluit" /></button>
      </header>

      {!check ? (
        <>
          <div className="ff-chips" role="group" aria-label="Voor welke dagen?">
            <button className="ff-chip ff-chip-l" aria-pressed={periode === "deze"} onClick={() => kiesPeriode("deze")}>Deze week</button>
            <button className="ff-chip ff-chip-l" aria-pressed={periode === "volgende"} onClick={() => kiesPeriode("volgende")}>Volgende week</button>
            <button className="ff-chip ff-chip-l" aria-pressed={periode === "opnieuw"} onClick={() => kiesPeriode("opnieuw")}>Er verandert iets: opnieuw vanaf morgen</button>
          </div>
          <p className="ff-small ff-muted">Tik op een taak om te wisselen, op ✕ om hem weg te halen. Vink dagen aan om ze te resetten.</p>

          <section className="ff-card ff-stack-s" aria-label="Minuten per persoon">
            <b>Zo verdeeld deze dagen</b>
            <div className="v2-verdeel-min">
              {leden.filter((m) => min[m.id] || m.role !== "ouder").map((m) => (
                <span key={m.id} className="v2-verdeel-lid">
                  <Avatar config={m.avatar} headOnly size={30} animate={false} label="" />
                  <span className="ff-small"><b>{naam(m.id)}</b><br />{Math.round(min[m.id] ?? 0)} min</span>
                </span>
              ))}
            </div>
          </section>

          <div className="v2-verdeel-reset" role="group" aria-label="Dagen resetten">
            <label className="v2-verdeel-vink">
              <input type="checkbox" checked={alles} onChange={() => setGekozen(alles ? new Set() : new Set(datums))} />
              <span className="ff-small">Alle dagen</span>
            </label>
            <button className="ff-btn ff-btn-ghost ff-btn-sm" disabled={!gekozen.size} onClick={reset}>↺ Reset{gekozen.size ? ` (${gekozen.size})` : ""}</button>
          </div>

          {datums.map((d) => {
            const isGewist = gewist.has(d);
            const regels = isGewist ? [] : Object.entries(plan[d]).sort((a, b) => a[0].localeCompare(b[0]));
            return (
              <section key={d} className={`ff-card ff-stack-s${isGewist ? " v2-verdeel-gewist" : ""}`} aria-label={dagNaam(d)}>
                <label className="v2-verdeel-vink">
                  <input type="checkbox" checked={gekozen.has(d)} onChange={() => kies(d)} aria-label={`${dagNaam(d)} aanvinken`} />
                  <b>{dagNaam(d)}{bevestigd[d] && !isGewist ? <span className="ff-small ff-muted"> · al bevestigd</span> : null}</b>
                </label>
                {isGewist ? (
                  <span className="ff-row">
                    <span className="ff-small ff-muted ff-grow">{bevestigd[d] ? "Gereset: de verdeling van deze dag wordt gewist." : "Gereset: deze dag wordt niet verdeeld."}</span>
                    <button className="ff-link ff-small" onClick={() => terugzetten(d)}>Ongedaan</button>
                  </span>
                ) : !regels.length ? <span className="ff-small ff-muted">Geen taken deze dag.</span> : null}
                {regels.map(([key, r]) => {
                  const k = klusById(state, key);
                  if (!k) return null;
                  const id = `${d}|${key}`;
                  const titel = isKamer(k) ? `Kamer ${naam(key.split(":")[1])}` : k.label;
                  const kunnen = leden.filter((m) => (k.perKind ? m.id === key.split(":")[1] : magDoen(state, m, k)) && verwachting(state, m, d).doel > 0);
                  return (
                    <div key={key} className="v2-verdeel-rij">
                      <div className="v2-verdeel-regel">
                        <button className="v2-verdeel-taak" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
                          <span aria-hidden="true">{k.emoji}</span>
                          <span className="ff-grow ff-stack-xs" style={{ textAlign: "left" }}>
                            <b>{titel}</b>
                            <span className="ff-small ff-muted">{r.reden}</span>
                          </span>
                          <span className="v2-verdeel-wie">{naam(r.wie)}{r.mee ? ` + ${naam(r.mee)}` : ""}</span>
                        </button>
                        <button className="v2-verdeel-kruis" onClick={() => kruis(d, key)} aria-label={`${titel} weghalen op ${dagNaam(d)}`}>✕</button>
                      </div>
                      {open === id && (
                        <div className="ff-chips">
                          {kunnen.map((m) => <button key={m.id} className="ff-chip" aria-pressed={m.id === r.wie} onClick={() => wissel(d, key, m.id)}>{naam(m.id)}</button>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}

          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => (veranderd.length || teWissen.length ? setCheck(true) : bevestig())}>Bevestigen</button>
        </>
      ) : (
        <section className="ff-card ff-stack-s" aria-label="Dit verandert">
          <b>Dit verandert aan de planning die al stond</b>
          {teWissen.map((d) => <span key={d}>{dagNaam(d)}: <b>verdeling gewist</b></span>)}
          {veranderd.map((w) => (
            <span key={w.datum + w.key}>{dagNaam(w.datum)} {(klusById(state, w.key)?.label ?? w.key).toLowerCase()}: {w.naar ? <>{w.van ? `${naam(w.van)} → ` : ""}<b>{naam(w.naar)}</b></> : <><b>weggehaald</b>{w.van ? ` (was ${naam(w.van)})` : ""}</>}</span>
          ))}
          <p className="ff-small ff-muted">Iedereen ziet het daarna meteen. Het komt ook in het logboek.</p>
          <div className="ff-row">
            <button className="ff-btn ff-btn-ghost" onClick={() => setCheck(false)}>Terug</button>
            <button className="ff-btn ff-btn-primary ff-grow" onClick={bevestig}>Ja, doorvoeren</button>
          </div>
        </section>
      )}
    </div>
  );
}

/** Mijn week: welke taken heb ik de komende dagen? Uit de bevestigde planning, of een voorstel. */
export function MijnWeek({ state, me }: { state: FamilyState; me: Member }) {
  const morgen = addDays(iso(new Date()), 1);
  const lijst = useMemo(() => {
    try {
      return mijnWeekVeilig(state, me.id, morgen);
    } catch {
      return [];
    }
  }, [state, me.id, morgen]);
  const naam = (id?: string) => state.members.find((m) => m.id === id)?.name ?? "";
  return (
    <section className="ff-card ff-stack-s" aria-label="Mijn week">
      <b>📅 {me.role === "ouder" ? "Jouw taken" : "Mijn week"} <span className="ff-small ff-muted">vanaf morgen</span></b>
      {!lijst.length && <span className="ff-small ff-muted">Geen taken de komende dagen.</span>}
      {lijst.slice(0, 8).map((x) => {
        const k = klusById(state, x.key);
        return (
          <div key={x.datum + x.key} className="v2-mijnweek-rij">
            <span className="v2-mijnweek-dag">{dagNaam(x.datum)}</span>
            <span aria-hidden="true">{k?.emoji}</span>
            <span className="ff-grow">{k?.perKind ? "Je kamer" : k?.label}{x.regel.mee && x.regel.mee !== me.id ? <span className="ff-small ff-muted"> · samen met {naam(x.regel.mee)}</span> : x.regel.mee === me.id ? <span className="ff-small ff-muted"> · samen met {naam(x.regel.wie)}</span> : null}</span>
            {!x.bevestigd && <span className="v2-oordeel is-open">voorstel</span>}
          </div>
        );
      })}
    </section>
  );
}

/** Voor ouders: staat er een bevestigde planning, en wat is er veranderd? */
export function PlanStatus({ state }: { state: FamilyState }) {
  const p = state.klusAfspraken?.planning ?? {};
  const vandaag = iso(new Date());
  const tot = Object.keys(p).filter((d) => d >= vandaag).sort().at(-1);
  const log = (state.klusAfspraken?.planLog ?? []).slice(-5).reverse();
  const naam = (id?: string) => state.members.find((m) => m.id === id)?.name ?? "";
  return (
    <details className="v2-meer-details">
      <summary>
        <b>{tot ? `Planning bevestigd t/m ${dagNaam(tot)}` : "Nog geen weekplanning"}</b>{" "}
        <span className="ff-small ff-muted">{tot ? "eerdere verdelingen en wijzigingen" : "de kinderen krijgen pas klussen als jij ze verdeelt"}</span>
      </summary>
      <div className="ff-stack-s">
        {!log.length && <span className="ff-small ff-muted">Nog niks veranderd.</span>}
        {log.map((l, i) => <span key={i} className="ff-small"><b>{naam(l.door)}</b> {l.tekst} <span className="ff-muted">· {new Date(l.at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span></span>)}
      </div>
    </details>
  );
}
