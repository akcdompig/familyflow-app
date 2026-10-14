"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { CATEGORY_LABEL, CONFLICTS, type ConflictScenario } from "@/lib/conflicts";
import {
  ALGEMENE_HULP,
  GEEN_SORRY_DWANG,
  HULP,
  INTENTIE_IMPACT,
  RUST_OPTIES,
  STAPPEN,
  STIL_NOTE,
  STOPLICHT,
  TIME_OUT_NOTE,
  VEILIGHEID,
  VEILIGHEIDSVRAGEN,
  VERDER_WANNEER,
  type Gevaar,
  type Licht,
} from "@/lib/methodiek";
import { actions } from "@/lib/store";
import type { FamilyState, Member } from "@/lib/types";

type Stage = "wie" | "samen" | "kies" | "veilig" | "gevaar" | "s1" | "s2" | "s3" | "s4" | "s5" | "s6";
const STEP_OF: Partial<Record<Stage, number>> = { s1: 1, s2: 2, s3: 3, s4: 4, s5: 5, s6: 6 };

/**
 * Conflictcoach voor een échte situatie. Zes vaste stappen, één ding per scherm.
 * Er wordt niks opgeslagen over wat er gebeurde; alleen een afspraak als je die zelf bewaart.
 */
const WIE: { id: string; label: string; ids: string[] }[] = [
  { id: "sib", label: "Met mijn broer of zus", ids: ["in-de-weg", "oneerlijk"] },
  { id: "ouder", label: "Met papa of mama", ids: ["gamen", "brutaal-antwoord", "doordrijven", "advies"] },
  { id: "vriend", label: "Met een vriend of iemand van school", ids: ["voetbal", "oneerlijk"] },
  { id: "online", label: "Online, in een app of game", ids: ["groepsapp"] },
];

export function CoachNu({ state, me, onClose, onToast, onPractice, onSamen, startId }: { state: FamilyState; me: Member; onClose: () => void; onToast: (m: string) => void; onPractice: (id: string) => void; onSamen?: () => void; startId?: string }) {
  const ouder = me.role === "ouder";
  const heeftSib = state.members.some((m) => m.role !== "ouder" && m.id !== me.id);
  const [filter, setFilter] = useState<string[] | null>(null);
  const [stage, setStage] = useState<Stage>(startId ? "veilig" : ouder ? "kies" : "wie");
  const [sc, setSc] = useState<ConflictScenario | null>(startId ? CONFLICTS.find((c) => c.id === startId) ?? null : null);
  const [gevaar, setGevaar] = useState<Gevaar | null>(null);
  const [licht, setLicht] = useState<Licht | null>(null);
  const [rust, setRust] = useState<string>("");
  const [wanneer, setWanneer] = useState("");
  const [adem, setAdem] = useState(0);
  const [q, setQ] = useState(0);
  const [afspraak, setAfspraak] = useState("");
  const [bewaard, setBewaard] = useState(false);
  const [mee, setMee] = useState<string[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage, q]);
  useEffect(() => {
    if (adem <= 0) return;
    const t = window.setTimeout(() => setAdem((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [adem]);

  const rol = ouder ? "ouder" : "kind";
  const step = STEP_OF[stage];
  const toggle = (v: string) => setMee((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]));
  const finish = () => {
    if (sc) actions.logCoach(me.id, sc.id, licht ?? "groen");
    onToast(bewaard ? "Goed gedaan. De afspraak staat bij Gezin" : "Goed gedaan, allemaal");
    onClose();
  };

  return (
    <div className="ff-screen ff-coachnu">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">{step ? `Stap ${step} van 6 · ${STAPPEN[step - 1].titel}` : "Hulp bij een ruzie"}</div>
          <h1 className="ff-h2">{sc ? sc.title : "Wat is er aan de hand?"}</h1>
        </div>
        <button className="ff-iconbtn" onClick={onClose} aria-label="Stoppen"><Icon name="sluit" /></button>
      </header>
      {step && <div className="ff-steps" aria-hidden="true">{STAPPEN.map((s) => <i key={s.n} className={s.n <= step ? "on" : ""} />)}</div>}

      {/* Kind: eerst met wie */}
      {stage === "wie" && (
        <section className="ff-stack-s">
          <h2 className="ff-h2">Met wie is het gedoe?</h2>
          {WIE.map((w) => (
            <button
              key={w.id}
              className="ff-choice"
              onClick={() => {
                if (w.id === "sib" && heeftSib && onSamen) return setStage("samen");
                if (w.ids.length === 1) {
                  setSc(CONFLICTS.find((c) => c.id === w.ids[0]) ?? null);
                  return setStage("veilig");
                }
                setFilter(w.ids);
                setStage("kies");
              }}
            >
              {w.label}
            </button>
          ))}
          <button className="ff-link" onClick={() => { setFilter(null); setStage("kies"); }}>Iets anders</button>
        </section>
      )}

      {stage === "samen" && (
        <section className="ff-stack-s">
          <h2 className="ff-h2">Wat wil je doen?</h2>
          <button className="ff-choice" onClick={onSamen}>
            <span className="ff-grow"><b>Samen uitpraten</b><br /><span className="ff-small ff-muted">Jullie vertellen allebei jullie kant in de app en kiezen samen een oplossing</span></span>
          </button>
          <button className="ff-choice" onClick={() => { setFilter(WIE[0].ids); setStage("kies"); }}>
            <span className="ff-grow"><b>Eerst zelf hulp van de coach</b><br /><span className="ff-small ff-muted">Stap voor stap: rustig worden, praten, goedmaken</span></span>
          </button>
        </section>
      )}

      {/* Situatie kiezen */}
      {stage === "kies" && (
        <section className="ff-stack-s">
          <p className="ff-muted">{ouder ? "Kies de situatie die er het meest op lijkt. De coach helpt u stap voor stap." : "Kies wat er het meest op lijkt. De coach helpt je stap voor stap."}</p>
          {(filter ? CONFLICTS.filter((c) => filter.includes(c.id)) : CONFLICTS).map((c) => (
            <button key={c.id} className="ff-choice" onClick={() => { setSc(c); setStage("veilig"); }}>
              <span className="ff-grow"><span className="ff-coachcard-tag">{CATEGORY_LABEL[c.category]}</span><br /><b>{c.title}</b></span>
            </button>
          ))}
        </section>
      )}

      {/* Veiligheid eerst */}
      {stage === "veilig" && sc && (
        <section className="ff-stack">
          <div className="ff-card ff-stack-s">
            <h2 className="ff-h2">Eerst even checken</h2>
            <p className="ff-small ff-muted">Tik aan als één van deze dingen klopt.</p>
            {VEILIGHEIDSVRAGEN.map((v) => (
              <button key={v.id} className="ff-safe-q" onClick={() => { setGevaar(v.id); setStage("gevaar"); actions.logCoach(me.id, sc.id, "veilig"); }}>
                <span className="ff-grow">{v[rol]}</span>
                <span className="ff-safe-ja">Ja</span>
              </button>
            ))}
          </div>
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setStage("s1")}>Nee, niks hiervan</button>
        </section>
      )}

      {stage === "gevaar" && gevaar && (
        <section className="ff-stack">
          <div className="ff-card ff-stack-s ff-danger">
            <h2 className="ff-h2">{VEILIGHEID[gevaar].titel}</h2>
            <ul className="ff-list">{VEILIGHEID[gevaar][rol].map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
          <div className="ff-stack-s">
            {VEILIGHEID[gevaar].hulp.map((k) => {
              const h = HULP[k];
              return (
                <div key={k} className="ff-card ff-hulp">
                  <div className="ff-grow"><b>{h.naam}</b><br /><span className="ff-small ff-muted">{h.wat}</span></div>
                  <div className="ff-hulp-btns">
                    {"tel" in h && h.tel && <a className="ff-btn ff-btn-dark" href={`tel:${h.tel.replace(/-/g, "")}`}>Bel {h.tel}</a>}
                    {"web" in h && h.web && <a className="ff-btn ff-btn-ghost" href={h.web} target="_blank" rel="noreferrer">Website</a>}
                  </div>
                </div>
              );
            })}
          </div>
          {VEILIGHEID[gevaar].verderMag ? (
            <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => setStage("s1")}>Iedereen is nu veilig. Verder met de coach</button>
          ) : (
            <p className="ff-small ff-muted">In deze situatie gaat de gewone conflictcoach niet verder. Hulp en veiligheid gaan nu voor.</p>
          )}
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={onClose}>Terug</button>
        </section>
      )}

      {/* Stap 1: situatie herkennen */}
      {stage === "s1" && sc && (
        <section className="ff-stack">
          <button className="ff-angry" onClick={() => { setLicht("rood"); setStage("s3"); }}>
            <Icon name="schild" size={24} />
            <span><b>Is het nu te heftig?</b><br /><span className="ff-small">Dan eerst rust. Praten komt later.</span></span>
          </button>
          <div className="ff-card ff-stack-s">
            <p>{sc.description}</p>
            <p className="ff-small ff-muted">Kijk naar wat er echt gebeurde, wat iemand voelde en wat iemand ervan maakte. Dat zijn drie verschillende dingen.</p>
          </div>
          <div className="ff-card ff-stack-s">
            <b>Wat kan er meespelen?</b>
            <p className="ff-small ff-muted">Geen oordeel en geen diagnose. Tik aan wat misschien klopt. Dit wordt niet bewaard.</p>
            <div className="ff-chips">{sc.possible_factors.map((f) => <button key={f} className="ff-chip" aria-pressed={mee.includes(f)} onClick={() => toggle(f)}>{f}</button>)}</div>
          </div>
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setStage("s2")}>Verder</button>
        </section>
      )}

      {/* Stap 2: spanning herkennen (stoplicht) */}
      {stage === "s2" && sc && (
        <section className="ff-stack-s">
          <h2 className="ff-h2">Hoe hoog is de spanning nu?</h2>
          {(["rood", "oranje", "groen"] as Licht[]).map((l) => (
            <button key={l} className={`ff-licht ff-licht-${l}`} onClick={() => { setLicht(l); setStage(l === "groen" ? "s4" : "s3"); }}>
              <span className="ff-licht-dot" />
              <span className="ff-grow"><b>{l[0].toUpperCase() + l.slice(1)}: {STOPLICHT[l].titel.toLowerCase()}</b><br /><span className="ff-small">{STOPLICHT[l].signalen.slice(0, 3).join(" · ")}</span></span>
            </button>
          ))}
          <p className="ff-small ff-muted">{STIL_NOTE}</p>
          <details className="ff-card ff-details">
            <summary><b>Signalen bij deze situatie</b></summary>
            <ul className="ff-list ff-small">{sc.early_signs.map((e) => <li key={e}>{e}</li>)}</ul>
          </details>
        </section>
      )}

      {/* Stap 3: eerst rust */}
      {stage === "s3" && sc && licht && (
        <section className="ff-stack">
          <div className={`ff-card ff-stack-s ff-licht-card ff-licht-${licht}`}>
            <b>{STOPLICHT[licht].titel}</b>
            <p>{STOPLICHT[licht][rol]}</p>
            {ouder && <div className="ff-script"><div className="ff-script-say"><b>Zeg bijvoorbeeld:</b> &ldquo;{STOPLICHT[licht].zin}&rdquo;</div></div>}
          </div>
          <div className="ff-card ff-stack-s">
            <b>{ouder ? "Bied een keuze aan. Niks is verplicht." : "Wat helpt jou nu? Kies er één."}</b>
            <div className="ff-chips">
              {[...sc.calming_options, ...RUST_OPTIES.map((r) => r.label)].filter((v, i, a) => a.indexOf(v) === i).slice(0, 7).map((o) => (
                <button key={o} className="ff-chip" aria-pressed={rust === o} onClick={() => { setRust(o); if (o === "Ademhalen met de app") setAdem(30); }}>{o}</button>
              ))}
            </div>
            {adem > 0 && (
              <div className="ff-calm ff-stack-s" style={{ borderRadius: 18, padding: 12 }}>
                <p className="ff-small">4 tellen in, 4 tellen uit. Stoppen mag altijd.</p>
                <div className="ff-breath"><span>{adem}</span></div>
              </div>
            )}
          </div>
          <div className="ff-card ff-stack-s">
            <b>Wanneer praten jullie verder?</b>
            <div className="ff-chips">{VERDER_WANNEER.map((w) => <button key={w} className="ff-chip" aria-pressed={wanneer === w} onClick={() => setWanneer(w)}>{w}</button>)}</div>
            <p className="ff-small ff-muted">{TIME_OUT_NOTE}</p>
          </div>
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setStage("s4")}>We zijn rustig genoeg om te praten</button>
          <button
            className="ff-btn ff-btn-ghost ff-btn-wide"
            onClick={() => {
              actions.logCoach(me.id, sc.id, licht);
              onToast(wanneer ? `Afgesproken: ${wanneer.toLowerCase()} verder praten` : "Neem de tijd. Je kunt de coach later weer openen");
              onClose();
            }}
          >
            Later verder
          </button>
        </section>
      )}

      {/* Stap 4: het gesprek */}
      {stage === "s4" && sc && (
        <section className="ff-stack">
          <div className="ff-card ff-stack-s">
            <b>{ouder ? "Zo begeleidt u het gesprek" : "Zo pak je het aan"}</b>
            <ol className="ff-list">{(ouder ? sc.parent_guidance : sc.child_guidance).map((t) => <li key={t}>{t}</li>)}</ol>
          </div>
          <div className="ff-script">
            {sc.dialogue_examples[rol].map((z) => <div key={z} className="ff-script-say"><b>Zeg bijvoorbeeld:</b> &ldquo;{z}&rdquo;</div>)}
          </div>
          <div className="ff-card ff-stack-s ff-question">
            <span className="ff-eyebrow">Vraag {q + 1} van {sc.coach_questions.length}{ouder ? " · stel er één tegelijk" : ""}</span>
            <p className="ff-q-big">{sc.coach_questions[q]}</p>
            <div className="ff-row">
              {q > 0 && <button className="ff-btn ff-btn-ghost" onClick={() => setQ(q - 1)}>Vorige</button>}
              {q < sc.coach_questions.length - 1 ? <button className="ff-btn ff-btn-dark ff-grow" onClick={() => setQ(q + 1)}>Volgende vraag</button> : null}
            </div>
          </div>
          <p className="ff-small ff-muted">{INTENTIE_IMPACT}</p>
          {ouder && sc.safety_check.length > 0 && (
            <div className="ff-card ff-stack-s"><b>Vraag ook</b><ul className="ff-list ff-small">{sc.safety_check.map((t) => <li key={t}>{t}</li>)}</ul></div>
          )}
          {ouder && (
            <>
              <details className="ff-card ff-details">
                <summary><b>Leeftijd</b></summary>
                <p className="ff-small"><b>Ongeveer 10 tot 14:</b> {sc.age_adaptations.jong}</p>
                <p className="ff-small"><b>Ongeveer 15 tot 17:</b> {sc.age_adaptations.tiener}</p>
              </details>
              <details className="ff-card ff-details">
                <summary><b>Bij ADHD- of ADD-kenmerken</b></summary>
                <ul className="ff-list ff-small">{sc.adhd_add_considerations.map((t) => <li key={t}>{t}</li>)}</ul>
                <p className="ff-small ff-muted">Niet elk kind is hetzelfde, en niet elk conflict komt door ADHD.</p>
              </details>
            </>
          )}
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setStage("s5")}>Verder: herstellen</button>
        </section>
      )}

      {/* Stap 5: herstel en afspraak */}
      {stage === "s5" && sc && (
        <section className="ff-stack">
          <div className="ff-card ff-stack-s">
            <b>Wat is nodig om het goed te maken?</b>
            <ul className="ff-list">{sc.repair_steps.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="ff-small ff-muted">{GEEN_SORRY_DWANG}</p>
          </div>
          <div className="ff-card ff-stack-s">
            <b>Welke afspraak maken jullie?</b>
            <p className="ff-small ff-muted">Kies er één, of schrijf je eigen. Klein en haalbaar.</p>
            <div className="ff-stack-s">
              {sc.prevention.map((p) => <button key={p} className="ff-choice" aria-pressed={afspraak === p} onClick={() => setAfspraak(p)}>{p}</button>)}
            </div>
            <label className="ff-field">
              <span className="ff-eyebrow">Of eigen afspraak</span>
              <input value={afspraak} maxLength={120} onChange={(e) => setAfspraak(e.target.value)} placeholder="Bijv. bij oranje zeggen we: pauze" />
            </label>
            <button
              className="ff-btn ff-btn-dark"
              disabled={!afspraak.trim() || bewaard}
              onClick={() => { actions.addAfspraak(afspraak, me.id, sc.id); setBewaard(true); onToast("Afspraak bewaard bij Gezin"); }}
            >
              {bewaard ? "Bewaard als gezinsafspraak" : "Bewaar als gezinsafspraak"}
            </button>
          </div>
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setStage("s6")}>Verder</button>
        </section>
      )}

      {/* Stap 6: leren voor de volgende keer */}
      {stage === "s6" && sc && (
        <section className="ff-stack">
          <div className="ff-card ff-stack-s">
            <b>Wat kunnen we de volgende keer eerder herkennen?</b>
            <div className="ff-chips">{sc.early_signs.map((e) => <span key={e} className="ff-chip ff-chip-static">{e}</span>)}</div>
          </div>
          <div className="ff-card ff-stack-s">
            <b>Wat doen we als de spanning weer oploopt?</b>
            <p className="ff-small">{bewaard && afspraak ? `Jullie afspraak: ${afspraak}` : "Bij oranje: even pauze. Bij rood: eerst rust, later praten."}</p>
          </div>
          {sc.practice && (
            <button className="ff-level" onClick={() => onPractice(sc.practice!)}>
              <span className="ff-choice-l"><Icon name="oefenen" size={18} /></span>
              <span className="ff-grow"><b>{ouder ? "Laat je kind dit oefenen" : "Oefen dit in de conflictcoach"}</b><br /><span className="ff-small ff-muted">Kies en zie wat het doet, zonder dat het echt is</span></span>
            </button>
          )}
          {ouder && (
            <details className="ff-card ff-details">
              <summary><b>Wanneer extra hulp?</b></summary>
              <ul className="ff-list ff-small">{sc.professional_support.map((t) => <li key={t}>{t}</li>)}</ul>
              <p className="ff-small ff-muted">{ALGEMENE_HULP}</p>
            </details>
          )}
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={finish}>Klaar</button>
        </section>
      )}
    </div>
  );
}
