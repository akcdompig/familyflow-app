"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { naamKlus, type KlusStatus } from "@/lib/huis";
import { samenwerken } from "@/lib/samenwerken";
import { actions } from "@/lib/store";
import { todayKey } from "@/lib/tasks";
import {
  HANDEN, beurtTussen, genoegPech, heeftVoorsprong, lotKans, magBeslissen, magDoen, verdeling, winnaar, type Hand,
} from "@/lib/verdeling";
import type { Bezwaar, FamilyState, Member } from "@/lib/types";

/*
  Eén klus: wat, hoe lang, waarom jij. Gedaan afvinken, samen beslissen, of zeggen dat het vandaag niet lukt.
  Samen beslissen is altijd vrijwillig. Er is altijd een neutrale weg (om de beurt) en een ouder kan helpen.
*/

type Manier = "spel" | "loting" | "beurt" | "samen";
type Stap =
  | { s: "menu" }
  | { s: "met" }
  | { s: "akkoord"; b: Member }
  | { s: "manier"; b: Member }
  | { s: "spel"; b: Member; score: [number, number]; beurt: "a" | "b"; keuzeA?: Hand; laatste?: { a: Hand; b: Hand; r: number }; voorsprong?: string }
  | { s: "loting"; b: Member; p: number }
  | { s: "uitslag"; b: Member; doet: string; manier: Manier; uitleg: string }
  | { s: "lukt" };

const Kop = ({ m, size = 28 }: { m: Member; size?: number }) => <Avatar config={m.avatar} expression="neutraal" headOnly size={size} animate={false} label="" />;
const naamVan = (s: FamilyState, id?: string) => s.members.find((m) => m.id === id)?.name ?? "";
const kans = () => {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] / 4294967296;
};

export const REDENEN = ["Te moe", "Toets of veel huiswerk", "Sport of afspraak", "Ik voel me niet lekker", "Ik weet niet hoe het moet"];

/** Laatste vraag ("lukt niet") van vandaag voor deze klus, met het antwoord als dat er is. */
export function vraagVan(s: FamilyState, key: string, door: string): { b: Bezwaar; antwoord?: NonNullable<FamilyState["bezwaarAntwoord"]>[string] } | null {
  const b = [...(s.bezwaren ?? [])].reverse().find((x) => x.klus === key && x.door === door && x.datum === todayKey());
  return b ? { b, antwoord: s.bezwaarAntwoord?.[b.id] } : null;
}
export function antwoordTekst(s: FamilyState, a: NonNullable<FamilyState["bezwaarAntwoord"]>[string]): string {
  const n = naamVan(s, a.door);
  const basis = { ok: `${n}: oké, vandaag niet`, ouder: `${n} doet het zelf`, samen: `${n} doet het samen met je`, toch: `${n}: het moet vandaag toch` }[a.keuze];
  return a.tekst ? `${basis}. "${a.tekst}"` : basis;
}

export function KlusSheet({ state, me, klus, onClose, onToast }: { state: FamilyState; me: Member; klus: KlusStatus | null; onClose: () => void; onToast: (m: string) => void }) {
  const [stap, setStap] = useState<Stap>({ s: "menu" });
  const [reden, setReden] = useState("");
  const [extra, setExtra] = useState("");
  useEffect(() => {
    setStap({ s: "menu" });
    setReden("");
    setExtra("");
  }, [klus?.key]);
  if (!klus) return <Sheet open={false} onClose={onClose} title="Klus">{null}</Sheet>;

  const isOuder = me.role === "ouder";
  const label = naamKlus(klus, me.id);
  const mijnBeurt = klus.beurt?.id === me.id || klus.mee?.id === me.id;
  const vraag = vraagVan(state, klus.key, me.id);
  const d = todayKey();
  const v = verdeling(state, d);
  const anderen = state.members.filter((m) => m.id !== me.id && m.joined !== false && magDoen(state, m, klus.klus) && (v.verwachting[m.id]?.doel ?? 0) > 0);

  const gedaan = (by: string) => {
    actions.klusGedaan(klus.key, by, klus.klus.xp, naamKlus(klus, by));
    onToast(`${klus.klus.label} ✓`);
    onClose();
  };
  const besluit = (b: Member, doet: string, manier: Manier, uitleg: string, voorsprong?: string) => {
    samenwerken.besloten({ klus: klus.key, label: klus.klus.label, spelers: [me.id, b.id], doet, manier, voorsprong });
    setStap({ s: "uitslag", b, doet, manier, uitleg });
  };

  const titel = stap.s === "menu" ? klus.klus.label : stap.s === "lukt" ? "Lukt het vandaag niet?" : "Samen beslissen";
  return (
    <Sheet open={!!klus} onClose={onClose} title={titel}>
      <div className="ff-stack">
        {stap.s === "menu" && (
          <>
            <h2 className="ff-h2">{klus.klus.emoji} {klus.klus.perKind && klus.kind ? `Kamer van ${klus.kind.id === me.id ? "jou" : klus.kind.name}` : klus.klus.label}</h2>
            <div className="ff-klus-info">
              <span>⏱️ ongeveer {klus.minuten} minuten</span>
              {klus.beurt && !klus.vandaagGedaan && (
                <span>
                  👉 <b>{klus.beurt.id === me.id ? "Jij" : klus.beurt.name}</b>{klus.mee ? <> en <b>{klus.mee.id === me.id ? "jij" : klus.mee.name}</b></> : null}
                  {klus.reden ? ` · ${klus.mee ? "doen jullie samen" : klus.reden}` : ""}
                </span>
              )}
              {klus.laatst && <span className="ff-muted">Laatst: {naamVan(state, klus.laatst.by)}, {klus.dagenGeleden === 0 ? "vandaag" : klus.dagenGeleden === 1 ? "gisteren" : `${klus.dagenGeleden} dagen geleden`}</span>}
            </div>
            {vraag && (
              <div className={`ff-vraag-status${vraag.antwoord ? " is-antwoord" : ""}`}>
                {vraag.antwoord ? antwoordTekst(state, vraag.antwoord) : `Je vroeg: "${vraag.b.reden}". Je ouders kijken ernaar.`}
              </div>
            )}
            {!klus.vandaagGedaan && <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => gedaan(me.id)}>Ik heb het gedaan</button>}
            {mijnBeurt && !klus.vandaagGedaan && !klus.mee && anderen.length > 0 && (
              <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => setStap({ s: "met" })}>🤝 Samen beslissen of ruilen</button>
            )}
            {mijnBeurt && !klus.vandaagGedaan && !isOuder && !vraag && (
              <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => setStap({ s: "lukt" })}>🙋 Dit lukt me vandaag niet</button>
            )}
            {isOuder && !klus.vandaagGedaan && (
              <>
                <span className="ff-eyebrow">Anders indelen</span>
                <div className="ff-chips">
                  {state.members.filter((m) => m.joined !== false && m.id !== klus.beurt?.id).map((m) => (
                    <button key={m.id} className="ff-chip ff-chip-l" onClick={() => { samenwerken.wissel(klus.key, m.id); onToast(`${m.name} doet ${klus.klus.label.toLowerCase()}`); onClose(); }}>{m.name}</button>
                  ))}
                </div>
                <span className="ff-eyebrow">Of al gedaan door</span>
                <div className="ff-chips">
                  {state.members.filter((m) => m.id !== me.id && m.joined !== false).map((m) => (
                    <button key={m.id} className="ff-chip ff-chip-l" onClick={() => gedaan(m.id)}>{m.name}</button>
                  ))}
                </div>
              </>
            )}
            {klus.klus.id === "flessen" && <p className="ff-small ff-muted">Statiegeld opgehaald? Zet het bedrag in het gezinspotje.</p>}
          </>
        )}

        {stap.s === "met" && (
          <>
            <p className="ff-muted" style={{ margin: 0 }}>Met wie wil je beslissen wie {label.toLowerCase()} doet? Het is vrijwillig: de ander mag ook nee zeggen.</p>
            {!magBeslissen(state, me.id) ? (
              <p className="ff-vraag-status">Je hebt vandaag al 3 keer samen beslist. Morgen weer, of vraag het aan een ouder.</p>
            ) : (
              <div className="ff-stack-s">
                {anderen.map((m) => (
                  <button key={m.id} className="ff-keuze-rij" onClick={() => setStap({ s: "akkoord", b: m })}>
                    <Kop m={m} size={34} />
                    <b className="ff-grow">{m.name}</b>
                    <span aria-hidden="true">›</span>
                  </button>
                ))}
              </div>
            )}
            <button className="ff-link" onClick={() => setStap({ s: "menu" })}>Terug</button>
          </>
        )}

        {stap.s === "akkoord" && (
          <>
            <div className="ff-center-col">
              <Kop m={stap.b} size={72} />
              <h2 className="ff-h2">{stap.b.name}, doe je mee?</h2>
              <p className="ff-muted" style={{ margin: 0 }}>{me.name} wil samen beslissen wie {label.toLowerCase()} doet. Geef de telefoon even aan {stap.b.name}.</p>
            </div>
            <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setStap({ s: "manier", b: stap.b })}>Ik doe mee</button>
            <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => {
              const doet = beurtTussen(state, klus.key, me.id, stap.b.id, d);
              besluit(stap.b, doet, "beurt", `${stap.b.name} wil geen spel. Dan om de beurt: ${naamVan(state, doet)} deed ${klus.klus.label.toLowerCase()} het langst niet.`);
            }}>Liever niet: doe maar om de beurt</button>
            <button className="ff-link" onClick={() => setStap({ s: "met" })}>Terug</button>
          </>
        )}

        {stap.s === "manier" && (() => {
          const b = stap.b;
          const pech = genoegPech(state, me.id) || genoegPech(state, b.id);
          const vs = heeftVoorsprong(state, me.id) ? me.id : heeftVoorsprong(state, b.id) ? b.id : undefined;
          return (
            <>
              <p className="ff-muted" style={{ margin: 0 }}>Hoe willen jullie het beslissen?</p>
              {vs && <p className="ff-vraag-status">⭐ {naamVan(state, vs)} krijgt deze keer een voorsprong.</p>}
              <div className="ff-manieren">
                <button className="ff-manier" disabled={pech} onClick={() => setStap({ s: "spel", b, score: vs === me.id ? [1, 0] : vs === b.id ? [0, 1] : [0, 0], beurt: "a", voorsprong: vs })}>
                  <span className="ff-manier-emoji" aria-hidden="true">✊✋✌️</span><b>Steen-papier-schaar</b><span className="ff-small ff-muted">Wie het eerst 2 keer wint</span>
                </button>
                <button className="ff-manier" disabled={pech} onClick={() => setStap({ s: "loting", b, p: lotKans(state, me.id, b.id) })}>
                  <span className="ff-manier-emoji" aria-hidden="true">🎡</span><b>Eerlijke loting</b><span className="ff-small ff-muted">Wie de laatste tijd meer deed, heeft minder kans</span>
                </button>
                <button className="ff-manier" onClick={() => {
                  const doet = beurtTussen(state, klus.key, me.id, b.id, d);
                  besluit(b, doet, "beurt", `${naamVan(state, doet)} deed ${klus.klus.label.toLowerCase()} het langst niet.`);
                }}>
                  <span className="ff-manier-emoji" aria-hidden="true">🔁</span><b>Om de beurt</b><span className="ff-small ff-muted">Wie het het langst niet deed</span>
                </button>
                <button className="ff-manier" onClick={() => besluit(b, me.id, "samen", "Jullie doen het samen. Ieder de helft van de punten.")}>
                  <span className="ff-manier-emoji" aria-hidden="true">🤝</span><b>Samen doen</b><span className="ff-small ff-muted">Allebei de helft, sneller klaar</span>
                </button>
              </div>
              {pech && <p className="ff-small ff-muted">Vandaag geen spel of loting meer: er is vandaag al genoeg geloot. Om de beurt of samen kan altijd.</p>}
              <button className="ff-link" onClick={() => setStap({ s: "akkoord", b })}>Terug</button>
            </>
          );
        })()}

        {stap.s === "spel" && <Spel state={state} me={me} stap={stap} setStap={setStap} onKlaar={(doet) => besluit(stap.b, doet, "spel", doet === me.id ? `${stap.b.name} won het spel.` : `${me.name} won het spel.`, stap.voorsprong)} />}

        {stap.s === "loting" && <Loting a={me} b={stap.b} p={stap.p} onKlaar={(doet) => besluit(stap.b, doet, "loting", "De loting heeft gekozen.")} />}

        {stap.s === "uitslag" && (() => {
          const doetLid = state.members.find((m) => m.id === stap.doet)!;
          const samen = stap.manier === "samen";
          return (
            <div className="ff-center-col ff-uitslag">
              <div className="ff-row" style={{ justifyContent: "center", gap: 8 }}>
                <Kop m={doetLid} size={72} />
                {samen && <Kop m={stap.b.id === stap.doet ? me : stap.b} size={72} />}
              </div>
              <h2 className="ff-h2">{samen ? `${me.name} en ${stap.b.name} doen het samen` : `${doetLid.name} doet ${klus.klus.label.toLowerCase()}`}</h2>
              <p className="ff-muted" style={{ margin: 0 }}>{stap.uitleg}</p>
              {(stap.manier === "spel" || stap.manier === "loting") && <p className="ff-vraag-status">Pech hoort erbij. Doe je het netjes, dan krijg je 3 punten extra 💪 En de komende dagen krijg je dan juist minder.</p>}
              <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={onClose}>Oké</button>
            </div>
          );
        })()}

        {stap.s === "lukt" && (
          <>
            <p className="ff-muted" style={{ margin: 0 }}>Geen probleem om te vragen. Je ouders kijken ernaar en laten weten wat het wordt.</p>
            <div className="ff-chips">
              {REDENEN.map((r) => <button key={r} className="ff-chip ff-chip-l" aria-pressed={reden === r} onClick={() => setReden(r)}>{r}</button>)}
            </div>
            <input className="ff-input" placeholder="Wil je iets uitleggen? (mag ook leeg)" value={extra} maxLength={140} onChange={(e) => setExtra(e.target.value)} />
            <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!reden && !extra.trim()} onClick={() => {
              samenwerken.vraag({ klus: klus.key, door: me.id, soort: reden === "Ik weet niet hoe het moet" ? "hulp" : "lukt-niet", reden: [reden, extra.trim()].filter(Boolean).join(": ") });
              onToast("Gevraagd aan je ouders");
              onClose();
            }}>Vraag het aan papa of mama</button>
            <button className="ff-link" onClick={() => setStap({ s: "menu" })}>Terug</button>
          </>
        )}
      </div>
    </Sheet>
  );
}

/** Steen-papier-schaar op één telefoon: om de beurt stiekem kiezen. */
function Spel({ state, me, stap, setStap, onKlaar }: { state: FamilyState; me: Member; stap: Extract<Stap, { s: "spel" }>; setStap: (s: Stap) => void; onKlaar: (doet: string) => void }) {
  const [wacht, setWacht] = useState(false);
  const b = stap.b;
  const wie = stap.beurt === "a" ? me : b;
  const klaar = stap.score[0] >= 2 || stap.score[1] >= 2;
  const klaarRef = useRef(onKlaar);
  klaarRef.current = onKlaar;
  const doet = stap.score[0] >= 2 ? b.id : me.id;
  useEffect(() => {
    if (!klaar) return;
    const t = window.setTimeout(() => klaarRef.current(doet), 1400);
    return () => window.clearTimeout(t);
  }, [klaar, doet]);
  const kies = (h: Hand) => {
    if (stap.beurt === "a") {
      setWacht(true);
      setStap({ ...stap, keuzeA: h, beurt: "b", laatste: undefined });
      return;
    }
    const r = winnaar(stap.keuzeA!, h);
    const score: [number, number] = [stap.score[0] + (r === 1 ? 1 : 0), stap.score[1] + (r === -1 ? 1 : 0)];
    setStap({ ...stap, score, beurt: "a", keuzeA: undefined, laatste: { a: stap.keuzeA!, b: h, r } });
  };
  const emoji = (h: Hand) => HANDEN.find((x) => x.id === h)!.emoji;
  return (
    <div className="ff-spel">
      <div className="ff-spel-score" aria-live="polite">
        <span><Kop m={me} /> <b>{me.name}</b> {stap.score[0]}</span>
        <span className="ff-muted">–</span>
        <span>{stap.score[1]} <b>{b.name}</b> <Kop m={b} /></span>
      </div>
      {stap.laatste && (
        <div className="ff-spel-onthul" aria-live="polite">
          <span className="ff-spel-hand">{emoji(stap.laatste.a)}</span>
          <span className="ff-small">{stap.laatste.r === 0 ? "Gelijk! Nog een keer" : `${stap.laatste.r === 1 ? me.name : b.name} wint deze ronde`}</span>
          <span className="ff-spel-hand">{emoji(stap.laatste.b)}</span>
        </div>
      )}
      {klaar ? (
        <p className="ff-center ff-h2">{stap.score[0] >= 2 ? me.name : b.name} wint! 🎉</p>
      ) : wacht && stap.beurt === "b" ? (
        <div className="ff-center-col">
          <p style={{ margin: 0 }}>✓ {me.name} heeft gekozen. Geef de telefoon aan <b>{b.name}</b>.</p>
          <button className="ff-btn ff-btn-primary" onClick={() => setWacht(false)}>Ik ben {b.name}</button>
        </div>
      ) : (
        <>
          <p className="ff-center" style={{ margin: 0 }}><b>{wie.name}</b>, kies stiekem:</p>
          <div className="ff-spel-knoppen">
            {HANDEN.map((h) => (
              <button key={h.id} className="ff-spel-knop" onClick={() => kies(h.id)} aria-label={h.label}>
                <span aria-hidden="true">{h.emoji}</span><span className="ff-small">{h.label}</span>
              </button>
            ))}
          </div>
          {stap.beurt === "a" && stap.laatste && <p className="ff-small ff-muted ff-center" style={{ margin: 0 }}>Geef de telefoon terug aan {me.name}.</p>}
        </>
      )}
      <span className="ff-small ff-muted ff-center">{state.members.find((m) => m.id === stap.voorsprong) ? `⭐ ${state.members.find((m) => m.id === stap.voorsprong)!.name} begon met een voorsprong` : "Wie het eerst 2 rondes wint"}</span>
    </div>
  );
}

/** Eerlijke loting: de kans staat erbij, en het rad draait even. */
function Loting({ a, b, p, onKlaar }: { a: Member; b: Member; p: number; onKlaar: (doet: string) => void }) {
  const [licht, setLicht] = useState<"a" | "b">("a");
  const [klaar, setKlaar] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const draai = () => {
    setBezig(true);
    const doet = kans() < p ? a.id : b.id;
    const stil = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let n = 0;
    const stappen = stil ? 1 : 14 + (doet === a.id ? 0 : 1);
    const tik = () => {
      n++;
      setLicht(n % 2 ? "b" : "a");
      if (n < stappen) window.setTimeout(tik, 60 + n * 18);
      else {
        setLicht(doet === a.id ? "a" : "b");
        setKlaar(doet);
        window.setTimeout(() => onKlaar(doet), 1200);
      }
    };
    tik();
  };
  return (
    <div className="ff-stack">
      <p className="ff-small ff-muted" style={{ margin: 0 }}>Wie de laatste 2 weken meer deed, heeft minder kans.</p>
      <div className="ff-lot">
        {[{ m: a, k: "a" as const, pct: Math.round(p * 100) }, { m: b, k: "b" as const, pct: 100 - Math.round(p * 100) }].map((x) => (
          <div key={x.k} className={`ff-lot-vak${licht === x.k && bezig ? " is-aan" : ""}${klaar === x.m.id ? " is-gekozen" : ""}`}>
            <Kop m={x.m} size={48} />
            <b>{x.m.name}</b>
            <span className="ff-small ff-muted">{x.pct}% kans</span>
          </div>
        ))}
      </div>
      {!bezig && <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={draai}>Draai 🎡</button>}
      {klaar && <p className="ff-center ff-h2" aria-live="polite">{klaar === a.id ? a.name : b.name}!</p>}
    </div>
  );
}
