"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { CATS } from "@/lib/catalog";
import { addDays } from "@/lib/planner";
import { bereik, coachTip, huishoudAandeel, statsVoor, trend, uren, type LidStats, type Periode } from "@/lib/stats";
import type { FamilyState, TaakCat } from "@/lib/types";

const VOLGORDE: TaakCat[] = ["huishouden", "kinderen", "school", "sport", "overig", "werk"];
const DAG = ["ma", "di", "wo", "do", "vr", "za", "zo"];

/** Wie doet wat: verdeling van tijd en taken in het gezin, per week of maand. */
export function WieDoetWat({ state, onClose }: { state: FamilyState; onClose: () => void }) {
  const [periode, setPeriode] = useState<Periode>("week");
  const [open, setOpen] = useState<string | null>(null);
  const [toon, setToon] = useState(false);
  const r = bereik(periode);
  const stats = useMemo(() => statsVoor(state, r.van, r.tot), [state, r.van, r.tot]);
  const aandeel = huishoudAandeel(stats);
  const tip = coachTip(state, stats);
  const max = Math.max(60, ...stats.map((s) => s.min + s.werk));
  const kleur = (id: string) => state.members.find((m) => m.id === id)?.avatar.outfitColor ?? "var(--ff-lucht)";
  const naam = (id: string) => state.members.find((m) => m.id === id)?.name ?? "";

  // Balken groeien na het openen.
  useEffect(() => {
    setToon(false);
    const t = window.setTimeout(() => setToon(true), 60);
    return () => window.clearTimeout(t);
  }, [periode]);

  const totaalHuis = stats.reduce((a, s) => a + s.perCat.huishouden, 0);
  const gekozen = open ? stats.find((s) => s.id === open) : null;

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">{state.family}</div>
          <h1 className="ff-h2">Wie doet wat</h1>
        </div>
        <button className="ff-iconbtn" onClick={onClose} aria-label="Terug"><Icon name="terug" /></button>
      </header>

      <div className="ff-chips">
        {(["week", "vorigeweek", "maand"] as Periode[]).map((p) => (
          <button key={p} className="ff-chip" aria-pressed={periode === p} onClick={() => setPeriode(p)}>{bereik(p).label}</button>
        ))}
      </div>

      {tip && (
        <section className="ff-card ff-wdw-tip">
          <span className="ff-eyebrow">Tip van de coach</span>
          <p>{tip}</p>
        </section>
      )}

      <section className="ff-card ff-stack-s">
        <div className="ff-row" style={{ justifyContent: "space-between" }}>
          <b>Tijd per gezinslid</b>
          <span className="ff-small ff-muted">tik op iemand</span>
        </div>
        {[...stats].sort((a, b) => b.min + b.werk - (a.min + a.werk)).map((s) => (
          <button key={s.id} className="ff-wdw-rij" onClick={() => setOpen(s.id)}>
            <Avatar config={state.members.find((m) => m.id === s.id)!.avatar} headOnly size={32} animate={false} label={naam(s.id)} />
            <div className="ff-wdw-rij-t">
              <div className="ff-row" style={{ justifyContent: "space-between", gap: 6 }}>
                <b>{naam(s.id)}</b>
                <span className="ff-small ff-muted">{uren(s.min)} thuis{s.werk ? ` · ${uren(s.werk)} werk` : ""}</span>
              </div>
              <div className="ff-wdw-balk" aria-hidden="true">
                {VOLGORDE.map((c) =>
                  s.perCat[c] ? <span key={c} className={c === "werk" ? "is-werk" : ""} style={{ width: toon ? `${(s.perCat[c] / max) * 100}%` : 0, background: CATS[c].kleur }} /> : null,
                )}
              </div>
            </div>
          </button>
        ))}
        <div className="ff-maand-legenda ff-small ff-muted">
          {VOLGORDE.map((c) => <span key={c}><i style={{ background: CATS[c].kleur }} /> {CATS[c].label.split(" ")[0]}</span>)}
        </div>
      </section>

      <section className="ff-card ff-stack-s">
        <b>Verdeling huishouden</b>
        {totaalHuis ? (
          <div className="ff-wdw-donut-wrap">
            <Donut delen={stats.filter((s) => s.perCat.huishouden).map((s) => ({ id: s.id, deel: aandeel[s.id], kleur: kleur(s.id) }))} toon={toon} totaal={uren(totaalHuis)} />
            <ul className="ff-wdw-lijst">
              {stats.filter((s) => s.perCat.huishouden).sort((a, b) => aandeel[b.id] - aandeel[a.id]).map((s) => (
                <li key={s.id}><i style={{ background: kleur(s.id) }} /> <b>{naam(s.id)}</b> <span className="ff-muted">{Math.round(aandeel[s.id] * 100)}%</span></li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="ff-small ff-muted">Nog geen huishoudtaken afgevinkt in deze periode.</p>
        )}
      </section>

      {periode !== "maand" && (
        <section className="ff-card ff-stack-s">
          <b>Hoe druk per dag</b>
          <p className="ff-small ff-muted">Alles wat is afgevinkt, werk meegeteld.</p>
          <Drukmeter stats={stats} van={r.van} kleur={kleur} naam={naam} toon={toon} />
        </section>
      )}

      <Sheet open={!!gekozen} onClose={() => setOpen(null)} title={gekozen ? naam(gekozen.id) : ""}>
        {gekozen && <Detail state={state} s={gekozen} naam={naam(gekozen.id)} label={r.label.toLowerCase()} aandeel={aandeel[gekozen.id]} />}
      </Sheet>
    </div>
  );
}

function Donut({ delen, toon, totaal }: { delen: { id: string; deel: number; kleur: string }[]; toon: boolean; totaal: string }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg viewBox="0 0 140 140" className="ff-wdw-donut" role="img" aria-label="Verdeling huishouden">
      <circle cx="70" cy="70" r={R} fill="none" stroke="var(--ff-lijn)" strokeWidth="18" />
      {delen.map((d) => {
        const len = d.deel * C;
        const el = (
          <circle key={d.id} cx="70" cy="70" r={R} fill="none" stroke={d.kleur} strokeWidth="18" strokeDasharray={`${toon ? len : 0} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray 700ms var(--ff-veer, ease)" }} />
        );
        acc += len;
        return el;
      })}
      <text x="70" y="66" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--ff-tekst)">{totaal}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="10" fill="var(--ff-tekst-zacht)">huishouden</text>
    </svg>
  );
}

function Drukmeter({ stats, van, kleur, naam, toon }: { stats: LidStats[]; van: string; kleur: (id: string) => string; naam: (id: string) => string; toon: boolean }) {
  const dagen = Array.from({ length: 7 }, (_, i) => addDays(van, i));
  const max = Math.max(60, ...dagen.flatMap((d) => stats.map((s) => s.perDag[d] ?? 0)));
  const actief = stats.filter((s) => dagen.some((d) => s.perDag[d]));
  if (!actief.length) return <p className="ff-small ff-muted">Nog niks afgevinkt.</p>;
  return (
    <>
      <div className="ff-wdw-druk">
        {dagen.map((d, i) => (
          <div key={d} className="ff-wdw-druk-dag">
            <div className="ff-wdw-druk-kolom">
              {actief.map((s) => (
                <span key={s.id} title={`${naam(s.id)}: ${uren(s.perDag[d] ?? 0)}`} style={{ height: toon ? `${((s.perDag[d] ?? 0) / max) * 100}%` : 0, background: kleur(s.id) }} />
              ))}
            </div>
            <span className="ff-small ff-muted">{DAG[i]}</span>
          </div>
        ))}
      </div>
      <div className="ff-maand-legenda ff-small ff-muted">
        {actief.map((s) => <span key={s.id}><i style={{ background: kleur(s.id) }} /> {naam(s.id)}</span>)}
      </div>
    </>
  );
}

function Detail({ state, s, naam, label, aandeel }: { state: FamilyState; s: LidStats; naam: string; label: string; aandeel: number }) {
  const tr = trend(state, s.id);
  const maxT = Math.max(60, ...tr.map((t) => t.min + t.werk));
  const maxC = Math.max(1, ...VOLGORDE.map((c) => s.perCat[c]));
  return (
    <div className="ff-stack">
      <h2 className="ff-h2">{naam}</h2>
      <div className="ff-wdw-cijfers">
        <div><b>{uren(s.min)}</b><span className="ff-small ff-muted">thuis {label}</span></div>
        {s.werk > 0 && <div><b>{uren(s.werk)}</b><span className="ff-small ff-muted">werk</span></div>}
        <div><b>{s.aantal}</b><span className="ff-small ff-muted">taken af</span></div>
        <div><b>{Math.round(aandeel * 100)}%</b><span className="ff-small ff-muted">van het huishouden</span></div>
      </div>
      <div className="ff-stack-s">
        <b>Waar gaat de tijd heen</b>
        {VOLGORDE.filter((c) => s.perCat[c]).map((c) => (
          <div key={c} className="ff-wdw-cat">
            <span className="ff-small">{CATS[c].label}</span>
            <div className="ff-wdw-balk"><span style={{ width: `${(s.perCat[c] / maxC) * 100}%`, background: CATS[c].kleur }} /></div>
            <span className="ff-small ff-muted">{uren(s.perCat[c])}</span>
          </div>
        ))}
        {!s.aantal && <p className="ff-small ff-muted">Nog niks afgevinkt.</p>}
      </div>
      {s.top.length > 0 && (
        <div className="ff-stack-s">
          <b>Meeste tijd aan</b>
          {s.top.map((t) => <div key={t.title} className="ff-planblok"><span>{t.title}</span><span className="ff-small ff-muted">{t.keer}× · {uren(t.min)}</span></div>)}
        </div>
      )}
      <div className="ff-stack-s">
        <b>Laatste 6 weken</b>
        <div className="ff-wdw-trend">
          {tr.map((t) => (
            <div key={t.label} className="ff-wdw-druk-dag">
              <div className="ff-wdw-druk-kolom is-stapel">
                <span style={{ height: `${(t.werk / maxT) * 100}%`, background: CATS.werk.kleur }} />
                <span style={{ height: `${(t.min / maxT) * 100}%`, background: CATS.huishouden.kleur }} />
              </div>
              <span className="ff-small ff-muted">{t.label}</span>
            </div>
          ))}
        </div>
        <div className="ff-maand-legenda ff-small ff-muted"><span><i style={{ background: CATS.huishouden.kleur }} /> thuis</span><span><i style={{ background: CATS.werk.kleur }} /> werk</span></div>
      </div>
    </div>
  );
}
