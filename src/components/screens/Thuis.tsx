"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { addDays, iso } from "@/lib/planner";
import { actions } from "@/lib/store";
import { timeLabel } from "@/lib/mood";
import {
  BELONINGEN, KLUSSEN, bijdragen, dagKort, eters, euro, isGeregeld, klusStatus, kookplan, naamKlus, magRestjes, maandag, parseEuro, potStand, werkOp, werktTijdensEten, type KlusStatus,
} from "@/lib/huis";
import type { FamilyState, Member } from "@/lib/types";

type Tab = "eten" | "klussen" | "week" | "pot";
const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "eten", label: "Eten", emoji: "🍳" },
  { id: "klussen", label: "Klussen", emoji: "🧹" },
  { id: "week", label: "Week", emoji: "📅" },
  { id: "pot", label: "Potje", emoji: "🐷" },
];

/** Thuis: koken, klussen, de werkweek en het gezinspotje. Geen discussie meer over wie wat doet. */
export function Thuis({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const [tab, setTab] = useState<Tab>("eten");
  const klussen = klusStatus(state);
  const teLaat = klussen.filter((k) => k.teLaat > 0).length;
  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">{state.family}</div>
          <h1 className="ff-h1">Thuis</h1>
        </div>
      </header>
      <div className="ff-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" className="ff-tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            <span aria-hidden="true">{t.emoji}</span> {t.label}
            {t.id === "klussen" && teLaat > 0 && <span className="ff-tab-badge">{teLaat}</span>}
          </button>
        ))}
      </div>
      {tab === "eten" && <Eten state={state} me={me} onToast={onToast} />}
      {tab === "klussen" && <Klussen state={state} me={me} lijst={klussen} onToast={onToast} />}
      {tab === "week" && <Week state={state} me={me} />}
      {tab === "pot" && <Potje state={state} me={me} onToast={onToast} />}
    </div>
  );
}

const naam = (s: FamilyState, id?: string) => s.members.find((m) => m.id === id)?.name ?? "";
const Kop = ({ m, size = 30 }: { m: Member; size?: number }) => <Avatar config={m.avatar} expression="neutraal" headOnly size={size} animate={false} label={m.name} />;

/* ---------- Eten ---------- */

function Eten({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const [dag, setDag] = useState(iso(new Date()));
  const vandaag = iso(new Date());
  const p = kookplan(state, dag);
  const gisteren = kookplan(state, addDays(dag, -1));
  const mag = magRestjes(state, dag);
  const wie = eters(state, dag);
  const leden = state.members.filter((m) => m.joined !== false);
  const set = (fn: Parameters<typeof actions.setKoken>[1]) => actions.setKoken(dag, fn);
  const [wat, setWat] = useState("");
  const dagen = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(vandaag, i));

  return (
    <div className="ff-stack">
      <div className="ff-dagstrip">
        {dagen.map((d) => {
          const k = kookplan(state, d);
          return (
            <button key={d} className="ff-dagstrip-dag" aria-pressed={d === dag} onClick={() => { setDag(d); setWat(""); }}>
              <span className="ff-small">{d === vandaag ? "vandaag" : dagKort(d)}</span>
              <b>{new Date(d + "T12:00:00").getDate()}</b>
              <span aria-hidden="true">{k.restjes ? "♻️" : k.kok ? "🍳" : "·"}</span>
            </button>
          );
        })}
      </div>

      <section className={`ff-card ff-stack-s${!isGeregeld(p) && dag === vandaag && new Date().getHours() >= 15 ? " ff-attn ff-attn-koraal" : ""}`}>
        <b>{dag === vandaag ? "Vanavond" : `${dagKort(dag)} ${new Date(dag + "T12:00:00").getDate()}`}: {p.restjes ? "restjes van gisteren" : p.kok ? `${naam(state, p.kok)} kookt` : "nog niemand kookt"}</b>
        {p.wat && <p style={{ margin: 0 }}>🍲 {p.wat}</p>}
        {!isGeregeld(p) && dag === vandaag && <p className="ff-small ff-muted">Kookt er niemand, dan krijgt de rest honger. Dat zie je in de huiskamer.</p>}

        <span className="ff-eyebrow">Wie kookt?</span>
        <div className="ff-chips">
          {leden.map((m) => (
            <button key={m.id} className="ff-chip ff-chip-l" aria-pressed={p.kok === m.id && !p.restjes} onClick={() => set((x) => ({ ...x, kok: x.kok === m.id ? undefined : m.id, restjes: false }))}>
              {m.id === me.id ? "Ik" : m.name}
            </button>
          ))}
          <button className="ff-chip ff-chip-l" aria-pressed={!!p.restjes} disabled={!mag && !p.restjes} onClick={() => set((x) => ({ ...x, restjes: !x.restjes, kok: undefined }))}>
            ♻️ Restjes
          </button>
        </div>
        {!mag && !p.restjes && <p className="ff-small ff-muted">{gisteren.restjes ? "Gisteren waren het al restjes. Max 2 dagen hetzelfde eten, dus vandaag vers koken." : "Restjes kan als er de dag ervoor gekookt is."}</p>}

        {!p.restjes && (
          <form className="ff-row" onSubmit={(e) => { e.preventDefault(); if (!wat.trim()) return; set((x) => ({ ...x, wat: wat.trim() })); setWat(""); onToast("Staat erin"); }}>
            <input className="ff-input ff-grow" placeholder={p.wat ? `Wat eten we? (${p.wat})` : "Wat eten we? Bv. nasi, pasta"} value={wat} onChange={(e) => setWat(e.target.value)} />
            <button className="ff-btn ff-btn-dark" type="submit">Zet</button>
          </form>
        )}

        <span className="ff-eyebrow">Wie eet er mee? {wie.length + (p.gasten ?? 0)} personen</span>
        <div className="ff-chips">
          {leden.map((m) => {
            const aan = wie.includes(m.id);
            const werkt = werktTijdensEten(state, m.id, dag);
            return (
              <button key={m.id} className="ff-chip" aria-pressed={aan} onClick={() => set((x) => {
                const cur = x.eters ?? wie;
                return { ...x, eters: aan ? cur.filter((i) => i !== m.id) : [...cur, m.id] };
              })}>
                {m.id === me.id ? "Ik" : m.name}{werkt ? " · werkt" : ""}
              </button>
            );
          })}
        </div>
        <div className="ff-row">
          <span className="ff-small">Gasten</span>
          <button className="ff-chip" onClick={() => set((x) => ({ ...x, gasten: Math.max(0, (x.gasten ?? 0) - 1) }))} aria-label="Gast minder">−</button>
          <b>{p.gasten ?? 0}</b>
          <button className="ff-chip" onClick={() => set((x) => ({ ...x, gasten: Math.min(20, (x.gasten ?? 0) + 1) }))} aria-label="Gast erbij">+</button>
        </div>
      </section>
    </div>
  );
}

/* ---------- Klussen ---------- */

function Klussen({ state, me, lijst, onToast }: { state: FamilyState; me: Member; lijst: KlusStatus[]; onToast: (m: string) => void }) {
  const [open, setOpen] = useState<KlusStatus | null>(null);
  const isOuder = me.role === "ouder";
  // Eigen kamer: alleen die van jezelf tonen aan kinderen, ouders zien alles.
  const zicht = lijst.filter((k) => !k.klus.perKind || isOuder || k.kind?.id === me.id);
  const volgorde = [...zicht].sort((a, b) => Number(a.vandaagGedaan) - Number(b.vandaagGedaan) || b.teLaat - a.teLaat || Number(b.nodig) - Number(a.nodig));
  const recent = [...(state.klusLog ?? [])].reverse().slice(0, 12);

  const gedaan = (k: KlusStatus, by: string) => {
    const id = actions.klusGedaan(k.key, by, k.klus.xp, naamKlus(k, by));
    setOpen(null);
    onToast(`${k.klus.label} ✓ +${k.klus.xp} punten`);
    return id;
  };

  return (
    <div className="ff-stack">
      <p className="ff-small ff-muted">Blijft er iets liggen, dan wordt de huiskamer rommelig. Afvinken = weer netjes.</p>
      <div className="ff-klussen">
        {volgorde.map((k) => (
          <button key={k.key} className={`ff-klus${k.vandaagGedaan ? " is-klaar" : k.teLaat > 0 ? " is-laat" : ""}`} onClick={() => setOpen(k)}>
            <span className="ff-klus-emoji" aria-hidden="true">{k.klus.emoji}</span>
            <span className="ff-grow">
              <b>{k.klus.perKind && k.kind ? `Kamer ${k.kind.id === me.id ? "van jou" : k.kind.name}` : k.klus.label}</b>
              <span className="ff-small ff-muted ff-block">
                {k.laatst ? `Laatst: ${k.laatst.by === me.id ? "jij" : naam(state, k.laatst.by)}, ${dagenTekst(k.dagenGeleden!)}` : "Nog niet bijgehouden"}
                {k.klus.elke > 1 ? ` · elke ${k.klus.elke} dagen` : " · elke dag"}{!k.vandaagGedaan && k.teLaat > 0 ? ` · ${k.teLaat} ${k.teLaat === 1 ? "dag" : "dagen"} te laat` : ""}
              </span>
            </span>
            <span className="ff-klus-status">
              {k.vandaagGedaan ? "✓" : k.beurt ? <><Kop m={k.beurt} size={26} /><span className="ff-small">{k.beurt.id === me.id ? "jij" : k.beurt.name}</span></> : null}
            </span>
          </button>
        ))}
      </div>

      {recent.length > 0 && (
        <section className="ff-card ff-stack-s">
          <b>Laatst gedaan</b>
          {recent.map((r) => {
            const base = KLUSSEN.find((k) => k.id === r.klus.split(":")[0]);
            const magWeg = isOuder || r.by === me.id;
            return (
              <div key={r.id} className="ff-row ff-log-rij">
                <span aria-hidden="true">{base?.emoji ?? "✓"}</span>
                <span className="ff-grow ff-small"><b>{r.by === me.id ? "Jij" : naam(state, r.by)}</b> · {base?.perKind ? `kamer ${naam(state, r.klus.split(":")[1])}` : base?.label.toLowerCase()} · {timeLabel(r.at)}</span>
                {magWeg && <button className="ff-link ff-small" onClick={() => { actions.klusWeg(r.id, base?.xp ?? 0); onToast("Weggehaald"); }}>Weg</button>}
              </div>
            );
          })}
        </section>
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.klus.label ?? "Klus"}>
        {open && (
          <div className="ff-stack">
            <h2 className="ff-h2">{open.klus.emoji} {open.klus.perKind && open.kind ? `Kamer van ${open.kind.name}` : open.klus.label}</h2>
            <p className="ff-muted">{open.laatst ? `Laatst gedaan door ${naam(state, open.laatst.by)}, ${dagenTekst(open.dagenGeleden!)}.` : "Nog niet bijgehouden."} {open.beurt && !open.vandaagGedaan ? `Aan de beurt: ${open.beurt.id === me.id ? "jij" : open.beurt.name}.` : ""}</p>
            <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => gedaan(open, me.id)}>Ik heb het gedaan</button>
            {isOuder && (
              <>
                <span className="ff-eyebrow">Of gedaan door</span>
                <div className="ff-chips">
                  {state.members.filter((m) => m.id !== me.id && m.joined !== false).map((m) => (
                    <button key={m.id} className="ff-chip ff-chip-l" onClick={() => gedaan(open, m.id)}>{m.name}</button>
                  ))}
                </div>
              </>
            )}
            {open.klus.id === "flessen" && <p className="ff-small ff-muted">Statiegeld opgehaald? Zet het bedrag in het gezinspotje.</p>}
          </div>
        )}
      </Sheet>
    </div>
  );
}

const dagenTekst = (n: number) => (n === 0 ? "vandaag" : n === 1 ? "gisteren" : `${n} dagen geleden`);

/* ---------- Week ---------- */

function Week({ state, me }: { state: FamilyState; me: Member }) {
  const [start, setStart] = useState(maandag());
  const vandaag = iso(new Date());
  const dagen = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(start, i));
  const leden = state.members.filter((m) => m.joined !== false);
  const zonderWerk = leden.filter((m) => m.role === "ouder" && !(state.werk?.[m.id]?.length));
  const vak = (id: string, d: string) => (state.vakanties?.[id] ?? []).find((v) => d >= v.van && d <= v.tot);

  return (
    <div className="ff-stack">
      <div className="ff-row" style={{ justifyContent: "space-between" }}>
        <button className="ff-chip" onClick={() => setStart(addDays(start, -7))}>‹ Vorige</button>
        <b>Week van {new Date(start + "T12:00:00").getDate()}/{new Date(start + "T12:00:00").getMonth() + 1}</b>
        <button className="ff-chip" onClick={() => setStart(addDays(start, 7))}>Volgende ›</button>
      </div>
      <p className="ff-small ff-muted">Vast werk staat er vanzelf in. Vrij genomen? Tik erop, dan streep je het weg.</p>
      {zonderWerk.length > 0 && me.role === "ouder" && (
        <p className="ff-small ff-alert">{zonderWerk.map((m) => m.name).join(" en ")} {zonderWerk.length > 1 ? "hebben" : "heeft"} nog geen vast werk. Zet het bij Ik › Werk en roosters, dan staat het hier elke week klaar.</p>
      )}
      {dagen.map((d) => (
        <section key={d} className={`ff-card ff-week-dag${d === vandaag ? " is-vandaag" : ""}`}>
          <div className="ff-week-kop"><b>{dagKort(d)} {new Date(d + "T12:00:00").getDate()}</b>{d === vandaag && <span className="ff-small"> vandaag</span>}</div>
          <div className="ff-stack-s">
            {leden.map((m) => {
              const werk = werkOp(state, m.id, d);
              const v = m.role !== "ouder" ? vak(m.id, d) : undefined;
              if (!werk.length && !v) return null;
              const magKlikken = me.role === "ouder" || m.id === me.id;
              return (
                <div key={m.id} className="ff-row ff-week-rij">
                  <Kop m={m} size={24} />
                  <span className="ff-small" style={{ minWidth: 52 }}>{m.id === me.id ? "Jij" : m.name}</span>
                  <span className="ff-chips">
                    {v && <span className="ff-chip ff-chip-static">🏖️ {v.naam}</span>}
                    {werk.map((w) => (
                      <button
                        key={w.werk.id + w.van}
                        className={`ff-chip ff-werk-chip${w.vrij ? " is-vrij" : ""}`}
                        disabled={!magKlikken || !!w.dienstId}
                        onClick={() => actions.toggleVrij(d, m.id, w.werk.id)}
                        aria-label={`${w.werk.naam} ${w.van}–${w.tot}${w.vrij ? ", vrij genomen" : ""}`}
                      >
                        {w.vrij ? "🌴 vrij · " : ""}{w.werk.naam} {w.van.replace(":", ".")}–{w.tot.replace(":", ".")}
                      </button>
                    ))}
                  </span>
                </div>
              );
            })}
            {leden.every((m) => !werkOp(state, m.id, d).length && !(m.role !== "ouder" && vak(m.id, d))) && <span className="ff-small ff-muted">Niemand werkt</span>}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------- Gezinspotje ---------- */

function Potje({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const isOuder = me.role === "ouder";
  const pot = state.pot;
  const stand = potStand(state);
  const pct = pot?.cents ? Math.min(100, Math.round((stand / pot.cents) * 100)) : 0;
  const [bedrag, setBedrag] = useState("");
  const [soort, setSoort] = useState<"statiegeld" | "inleg" | "uitgave">("statiegeld");
  const [doelOpen, setDoelOpen] = useState(false);
  const [doel, setDoel] = useState(pot?.doel ?? "");
  const [doelBedrag, setDoelBedrag] = useState(pot?.cents ? String(pot.cents / 100) : "");
  const [beloon, setBeloon] = useState<string | null>(null);
  const kids = state.members.filter((m) => m.role !== "ouder" && m.joined !== false);
  const bij = bijdragen(state);
  const items = [...(pot?.items ?? [])].reverse().slice(0, 15);

  const erin = () => {
    const c = parseEuro(bedrag);
    if (!c) return onToast("Vul een bedrag in, bv. 2,50");
    actions.addPot({ cents: c, soort, reden: soort === "statiegeld" ? "Statiegeld" : soort === "uitgave" ? "Uitgegeven" : "Inleg", by: me.id, voor: soort === "uitgave" ? undefined : me.id });
    setBedrag("");
    onToast(soort === "uitgave" ? `${euro(c)} eruit` : `${euro(c)} in het potje 🐷`);
  };

  return (
    <div className="ff-stack">
      <section className="ff-card ff-pot ff-stack-s">
        <div className="ff-pot-varken" aria-hidden="true">🐷</div>
        <b className="ff-h2">{euro(stand)}</b>
        {pot?.doel ? (
          <>
            <span className="ff-small">Sparen voor: <b>{pot.doel}</b>{pot.cents ? ` · nog ${euro(Math.max(0, pot.cents - stand))}` : ""}</span>
            {pot.cents > 0 && <span className="ff-bar"><i style={{ width: `${pct}%` }} /></span>}
          </>
        ) : (
          <span className="ff-small ff-muted">Nog geen gezinsdoel. Bv. pizza-avond, bioscoop, een dagje uit.</span>
        )}
        {isOuder && <button className="ff-link" onClick={() => setDoelOpen(true)}>{pot?.doel ? "Doel aanpassen" : "Doel kiezen"}</button>}
      </section>

      {isOuder && kids.length > 0 && (
        <section className="ff-card ff-stack-s">
          <b>Belonen</b>
          <p className="ff-small ff-muted">Goed bezig met huiswerk, leren of de app? Vul het potje namens een kind.</p>
          <div className="ff-chips">
            {kids.map((k) => <button key={k.id} className="ff-chip ff-chip-l" aria-pressed={beloon === k.id} onClick={() => setBeloon(beloon === k.id ? null : k.id)}>{k.name}</button>)}
          </div>
          {beloon && (
            <div className="ff-chips">
              {BELONINGEN.map((b) => (
                <button key={b.reden} className="ff-chip" onClick={() => { actions.addPot({ cents: b.cents, soort: "beloning", reden: b.reden, by: me.id, voor: beloon }); onToast(`${naam(state, beloon)}: ${b.reden.toLowerCase()} · ${euro(b.cents)}`); }}>
                  {b.emoji} {b.reden} · {euro(b.cents)}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="ff-card ff-stack-s">
        <b>Geld erin{isOuder ? " of eruit" : ""}</b>
        <div className="ff-chips">
          <button className="ff-chip" aria-pressed={soort === "statiegeld"} onClick={() => setSoort("statiegeld")}>🍾 Statiegeld</button>
          <button className="ff-chip" aria-pressed={soort === "inleg"} onClick={() => setSoort("inleg")}>🪙 Inleg</button>
          {isOuder && <button className="ff-chip" aria-pressed={soort === "uitgave"} onClick={() => setSoort("uitgave")}>🎉 Uitgegeven</button>}
        </div>
        <form className="ff-row" onSubmit={(e) => { e.preventDefault(); erin(); }}>
          <input className="ff-input ff-grow" inputMode="decimal" placeholder="Bedrag, bv. 3,75" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
          <button className="ff-btn ff-btn-primary" type="submit">{soort === "uitgave" ? "Eruit" : "Erin"}</button>
        </form>
      </section>

      {Object.keys(bij).length > 0 && (
        <section className="ff-card ff-stack-s">
          <b>Wie spaart er mee</b>
          {Object.entries(bij).sort((a, b) => b[1] - a[1]).map(([id, c]) => (
            <div key={id} className="ff-row"><span className="ff-grow">{id === me.id ? "Jij" : naam(state, id)}</span><b>{euro(c)}</b></div>
          ))}
        </section>
      )}

      {items.length > 0 && (
        <section className="ff-card ff-stack-s">
          <b>Laatste</b>
          {items.map((x) => (
            <div key={x.id} className="ff-row ff-log-rij">
              <span className="ff-grow ff-small">
                <b>{x.soort === "uitgave" ? "−" : "+"}{euro(x.cents)}</b> · {x.reden}{x.voor && x.soort === "beloning" ? ` (${naam(state, x.voor)})` : x.soort !== "uitgave" ? ` · ${naam(state, x.voor ?? x.by)}` : ""} · {timeLabel(x.at)}
              </span>
              {(isOuder || x.by === me.id) && <button className="ff-link ff-small" onClick={() => { actions.removePot(x.id); onToast("Weggehaald"); }}>Weg</button>}
            </div>
          ))}
        </section>
      )}

      <Sheet open={doelOpen} onClose={() => setDoelOpen(false)} title="Gezinsdoel">
        <form className="ff-stack" onSubmit={(e) => { e.preventDefault(); if (!doel.trim()) return onToast("Waar sparen jullie voor?"); actions.setPotDoel(doel.trim(), parseEuro(doelBedrag)); setDoelOpen(false); onToast("Doel staat erin"); }}>
          <h2 className="ff-h2">Waar sparen we voor?</h2>
          <input className="ff-input" placeholder="Bv. bowlen met z'n allen" value={doel} onChange={(e) => setDoel(e.target.value)} />
          <input className="ff-input" inputMode="decimal" placeholder="Hoeveel? Bv. 60" value={doelBedrag} onChange={(e) => setDoelBedrag(e.target.value)} />
          <button className="ff-btn ff-btn-primary ff-btn-wide" type="submit">Opslaan</button>
        </form>
      </Sheet>
    </div>
  );
}

