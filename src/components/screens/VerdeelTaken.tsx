"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Icon } from "@/components/ui/Icon";
import { isKamer, klusById, maandag } from "@/lib/huis";
import { addDays, iso } from "@/lib/planner";
import { samenwerken } from "@/lib/samenwerken";
import { maakPlan, mijnWeek as mijnWeekVeilig, minutenInPlan, wijzigingen, type Plan } from "@/lib/takenplan";
import { magDoen, verwachting } from "@/lib/verdeling";
import type { FamilyState, Member } from "@/lib/types";

/*
  "Verdeel de taken": één knop voor ouders. Kies de week, bekijk het voorstel, wissel wat niet klopt, bevestig.
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
  const voorstel = useMemo(() => maakPlan(state, start, dagen), [state, start, dagen]);
  const [eigen, setEigen] = useState<Record<string, Plan>>({});
  const plan: Plan = eigen[`${start}|${dagen}`] ?? voorstel;
  const [open, setOpen] = useState<string | null>(null);
  const [check, setCheck] = useState(false);
  const leden = state.members.filter((m) => m.joined !== false);
  const naam = (id?: string) => (id === me.id ? "Jij" : leden.find((m) => m.id === id)?.name ?? "");
  const min = minutenInPlan(state, plan);
  const veranderd = wijzigingen(state, plan);

  const wissel = (d: string, key: string, wie: string) => {
    const nieuw: Plan = { ...plan, [d]: { ...plan[d], [key]: { wie, reden: `aangepast door ${me.name.toLowerCase()}` } } };
    setEigen({ ...eigen, [`${start}|${dagen}`]: nieuw });
    setOpen(null);
  };
  const bevestig = () => {
    samenwerken.bevestigPlan(plan, me.id);
    onToast("Taken verdeeld 📋 Iedereen ziet het meteen");
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
            <button className="ff-chip ff-chip-l" aria-pressed={periode === "deze"} onClick={() => setPeriode("deze")}>Deze week</button>
            <button className="ff-chip ff-chip-l" aria-pressed={periode === "volgende"} onClick={() => setPeriode("volgende")}>Volgende week</button>
            <button className="ff-chip ff-chip-l" aria-pressed={periode === "opnieuw"} onClick={() => setPeriode("opnieuw")}>Er verandert iets: opnieuw vanaf morgen</button>
          </div>
          <p className="ff-small ff-muted">Eerlijk naar tijd: wie het recent deed, krijgt het niet weer. Met school, werk, afwezigheid en leeftijd. Tik op een taak om te wisselen.</p>

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

          {Object.keys(plan).sort().map((d) => {
            const regels = Object.entries(plan[d]).sort((a, b) => a[0].localeCompare(b[0]));
            return (
              <section key={d} className="ff-card ff-stack-s" aria-label={dagNaam(d)}>
                <b>{dagNaam(d)}{state.klusAfspraken?.planning?.[d] ? <span className="ff-small ff-muted"> · al bevestigd</span> : null}</b>
                {!regels.length && <span className="ff-small ff-muted">Niks nodig vandaag.</span>}
                {regels.map(([key, r]) => {
                  const k = klusById(state, key);
                  if (!k) return null;
                  const id = `${d}|${key}`;
                  const kunnen = leden.filter((m) => (k.perKind ? m.id === key.split(":")[1] : magDoen(state, m, k)) && verwachting(state, m, d).doel > 0);
                  return (
                    <div key={key} className="v2-verdeel-rij">
                      <button className="v2-verdeel-taak" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
                        <span aria-hidden="true">{k.emoji}</span>
                        <span className="ff-grow ff-stack-xs" style={{ textAlign: "left" }}>
                          <b>{isKamer(k) ? `Kamer ${naam(key.split(":")[1])}` : k.label}</b>
                          <span className="ff-small ff-muted">{r.reden}</span>
                        </span>
                        <span className="v2-verdeel-wie">{naam(r.wie)}{r.mee ? ` + ${naam(r.mee)}` : ""}</span>
                      </button>
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

          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => (veranderd.length ? setCheck(true) : bevestig())}>Bevestigen</button>
        </>
      ) : (
        <section className="ff-card ff-stack-s" aria-label="Dit verandert">
          <b>Dit verandert aan de planning die al stond</b>
          {veranderd.map((w) => (
            <span key={w.datum + w.key}>{dagNaam(w.datum)} {(klusById(state, w.key)?.label ?? w.key).toLowerCase()}: {w.van ? `${naam(w.van)} → ` : ""}<b>{naam(w.naar)}</b></span>
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
