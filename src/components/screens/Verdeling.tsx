"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { alleKlussen, klusById, naamKlus, type KlusStatus } from "@/lib/huis";
import { samenwerken } from "@/lib/samenwerken";
import { todayKey } from "@/lib/tasks";
import { eerlijk, eigenVerwachting, isVastgelegd, klusAan, magDoen, minutenVan, scheef, verdeling } from "@/lib/verdeling";
import type { Bezwaar, FamilyState, Member } from "@/lib/types";

/*
  De verdeling zichtbaar maken:
  - Vandaag: wie doet wat, hoeveel minuten, en waarom (school, vrij, ouders werken). Voor iedereen.
  - Afspraken: wat de ouders hebben vastgelegd, of nog een voorstel van de app.
  - Eerlijkheid over 2 weken en vragen van de kinderen: alleen voor ouders.
*/

const Kop = ({ m, size = 28 }: { m: Member; size?: number }) => <Avatar config={m.avatar} expression="neutraal" headOnly size={size} animate={false} label="" />;
type KlusAfspraak = NonNullable<NonNullable<FamilyState["klusAfspraken"]>["klussen"]>[string];
const naam = (s: FamilyState, id?: string) => s.members.find((m) => m.id === id)?.name ?? "";
const SOORT: Record<string, string> = { school: "🎒", vrij: "🏠", weekend: "🌤️", vakantie: "🏖️", werk: "💼", vrijstelling: "🛋️" };

export function AfsprakenBanner({ state, me, onOpen }: { state: FamilyState; me: Member; onOpen: () => void }) {
  const vast = isVastgelegd(state);
  const isOuder = me.role === "ouder";
  return (
    <button className={`ff-afspraak-banner${vast ? " is-vast" : ""}`} onClick={onOpen}>
      <span aria-hidden="true">{vast ? "📋" : "💡"}</span>
      <span className="ff-grow">
        <b>{vast ? "Afgesproken" : "Voorstel van de app"}</b>
        <span className="ff-small ff-block">{vast ? `Vastgelegd door ${naam(state, state.klusAfspraken?.door)}` : isOuder ? "Bekijk en leg de afspraken vast" : "Je ouders hebben nog niks vastgelegd"}</span>
      </span>
      <span aria-hidden="true">›</span>
    </button>
  );
}

/** Wie doet wat vandaag, in minuten. */
export function VerdelingVandaag({ state, me, lijst, onOpen }: { state: FamilyState; me: Member; lijst: KlusStatus[]; onOpen: (k: KlusStatus) => void }) {
  const d = todayKey();
  const v = verdeling(state, d);
  const leden = state.members.filter((m) => m.joined !== false);
  return (
    <section className="ff-card ff-stack-s" aria-label="Wie doet wat vandaag">
      <b>Vandaag</b>
      {v.nietVerdeeld && me.role === "ouder" && <p className="ff-small v2-let-op" role="note">Nog niet verdeeld. De kinderen krijgen vandaag alleen hun eigen kamer en bed. Tik op <b>Verdeel de taken</b> om de klussen te verdelen.</p>}
      {leden.map((m) => {
        const mijn = lijst.filter((k) => (k.beurt?.id === m.id || k.mee?.id === m.id) && (k.ingedeeld || (k.klus.naKoken && (k.nodig || k.vandaagGedaan))));
        const w = v.verwachting[m.id];
        const af = mijn.filter((k) => k.vandaagGedaan).length;
        if (!mijn.length && m.role === "ouder") return null;
        return (
          <div key={m.id} className="ff-verdeling-rij">
            <Kop m={m} />
            <span className="ff-grow ff-stack-xs">
              <span><b>{m.id === me.id ? "Jij" : m.name}</b> <span className="ff-small ff-muted">{SOORT[w?.soort ?? "vrij"]} {w?.reden}{mijn.length ? ` · ${Math.round(mijn.reduce((a, k) => a + k.minuten / (k.mee ? 2 : 1), 0))} min` : ""}</span></span>
              {mijn.length ? (
                <span className="ff-verdeling-klussen">
                  {mijn.map((k) => (
                    <button key={k.key} className={`ff-mini-klus${k.vandaagGedaan ? " is-klaar" : ""}`} onClick={() => onOpen(k)}>
                      {k.klus.emoji} {k.klus.perKind ? "kamer" : k.klus.label.split(" (")[0].toLowerCase()}{k.mee ? " 🤝" : ""}{k.vandaagGedaan ? " ✓" : ""}
                    </button>
                  ))}
                </span>
              ) : (
                <span className="ff-small ff-muted">{w?.soort === "vrijstelling" ? "Vandaag even niks" : "Vandaag niks ingedeeld"}</span>
              )}
            </span>
            {mijn.length > 0 && <span className={`ff-verdeling-tel${af === mijn.length ? " is-af" : ""}`}>{af === mijn.length ? "✓" : `${af}/${mijn.length}`}</span>}
          </div>
        );
      })}
    </section>
  );
}

/** Alleen ouders: vragen van de kinderen ("lukt me niet", "ik wil hulp"). */
export function Vragen({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const [toch, setToch] = useState<Bezwaar | null>(null);
  const [uitleg, setUitleg] = useState("");
  const open = (state.bezwaren ?? []).filter((b) => !state.bezwaarAntwoord?.[b.id] && b.datum >= new Date(Date.now() - 864e5).toLocaleDateString("sv-SE"));
  if (!open.length || me.role !== "ouder") return null;
  const klusNaam = (key: string) => {
    const k = klusById(state, key);
    return k?.perKind ? `kamer van ${naam(state, key.split(":")[1])}` : (k?.label ?? key).toLowerCase();
  };
  const kies = (b: Bezwaar, keuze: "ok" | "ouder" | "samen" | "toch", tekst?: string) => {
    samenwerken.antwoord(b, keuze, me.id, tekst);
    onToast("Antwoord gestuurd");
  };
  return (
    <section className="ff-card ff-stack-s ff-attn ff-attn-zon" aria-label="Vragen van de kinderen">
      <b>🙋 {open.length === 1 ? "Een vraag" : `${open.length} vragen`} over klussen</b>
      {open.map((b) => (
        <div key={b.id} className="ff-vraag">
          <span><b>{naam(state, b.door)}</b> · {klusNaam(b.klus)}</span>
          <span className="ff-small ff-muted">{b.soort === "hulp" ? "Wil hulp" : "Lukt vandaag niet"}: {b.reden}</span>
          <div className="ff-chips">
            <button className="ff-chip" onClick={() => kies(b, "ok")}>Oké, vandaag niet</button>
            <button className="ff-chip" onClick={() => kies(b, "samen")}>Samen doen</button>
            <button className="ff-chip" onClick={() => kies(b, "ouder")}>Ik doe het</button>
            <button className="ff-chip" onClick={() => { setToch(b); setUitleg(""); }}>Toch doen</button>
          </div>
        </div>
      ))}
      <Sheet open={!!toch} onClose={() => setToch(null)} title="Toch doen">
        {toch && (
          <div className="ff-stack">
            <p className="ff-muted" style={{ margin: 0 }}>Leg even uit waarom, dan snapt {naam(state, toch.door)} het beter.</p>
            <input className="ff-input" value={uitleg} maxLength={140} placeholder="Bijvoorbeeld: lukt het na het eten?" onChange={(e) => setUitleg(e.target.value)} />
            <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => { kies(toch, "toch", uitleg.trim() || undefined); setToch(null); }}>Versturen</button>
          </div>
        )}
      </Sheet>
    </section>
  );
}

/** Alleen ouders: is het eerlijk verdeeld de laatste 2 weken? In minuten, met een signaal als het scheef groeit. */
export function Eerlijkheid({ state, me }: { state: FamilyState; me: Member }) {
  if (me.role !== "ouder") return null;
  const e = eerlijk(state);
  const sig = scheef(state);
  const max = Math.max(30, ...e.map((x) => x.minuten));
  const besluiten = [...(state.uitdagingen ?? [])].reverse().slice(0, 4);
  const manier = { spel: "steen-papier-schaar", loting: "loting", beurt: "om de beurt", samen: "samen gedaan" } as const;
  return (
    <section className="ff-card ff-stack-s" aria-label="Eerlijk verdeeld">
      <b>⚖️ Eerlijk verdeeld? <span className="ff-small ff-muted">laatste 2 weken · alleen ouders zien dit</span></b>
      {sig && <p className="ff-vraag-status">{sig.tekst}</p>}
      {e.map((x) => {
        const m = state.members.find((y) => y.id === x.id)!;
        const vaakst = x.vaakst ? klusById(state, x.vaakst) : undefined;
        return (
          <div key={x.id} className="ff-eerlijk-rij">
            <Kop m={m} size={24} />
            <span className="ff-eerlijk-naam">{m.name}</span>
            <span className="ff-eerlijk-balk"><i style={{ width: `${(x.minuten / max) * 100}%` }} /></span>
            <span className="ff-small ff-eerlijk-min">{x.minuten} min</span>
            {vaakst && <span className="ff-small ff-muted ff-eerlijk-vaak">vaak {vaakst.emoji}</span>}
          </div>
        );
      })}
      {besluiten.length > 0 && (
        <>
          <span className="ff-eyebrow">Samen beslist</span>
          {besluiten.map((u) => (
            <span key={u.id} className="ff-small">{klusById(state, u.klus)?.emoji} {naam(state, u.spelers[0])} en {naam(state, u.spelers[1])}: {manier[u.manier ?? "spel"]} → {u.partner ? "samen" : naam(state, u.verliezer)}</span>
          ))}
        </>
      )}
    </section>
  );
}

/** De afspraken: klussen aan/uit, minuten, wie wat mag, verwachting per kind, vrijstelling vandaag. Kinderen kijken mee. */
export function AfsprakenSheet({ open, onClose, state, me, onToast }: { open: boolean; onClose: () => void; state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const isOuder = me.role === "ouder";
  const kids = state.members.filter((m) => m.role !== "ouder" && m.joined !== false);
  const leden = state.members.filter((m) => m.joined !== false);
  const d = todayKey();
  const [vrijVoor, setVrijVoor] = useState<string | null>(null);
  const zetKlus = (id: string, fn: (k: KlusAfspraak) => KlusAfspraak) =>
    samenwerken.setAfspraken((a) => ({ ...a, klussen: { ...(a.klussen ?? {}), [id]: fn({ ...(a.klussen?.[id] ?? {}) }) } }));
  const wieMag = (klusId: string, m: Member) => {
    const k = klusById(state, klusId)!;
    const mag = magDoen(state, m, k);
    zetKlus(klusId, (a) => {
      const niet = (a.niet ?? []).filter((x) => x !== m.id);
      const wel = (a.wel ?? []).filter((x) => x !== m.id);
      return mag ? { ...a, niet: [...niet, m.id], wel } : { ...a, niet, wel: m.age !== undefined && m.age < k.vanaf ? [...wel, m.id] : wel };
    });
  };
  const verw = (m: Member, veld: "school" | "vrij", delta: number) => {
    const huidig = eigenVerwachting(state, m)[veld];
    samenwerken.setAfspraken((a) => ({ ...a, verwachting: { ...(a.verwachting ?? {}), [m.id]: { ...(a.verwachting?.[m.id] ?? {}), [veld]: Math.max(0, Math.min(120, huidig + delta)) } } }));
  };
  const vast = isVastgelegd(state);
  return (
    <Sheet open={open} onClose={onClose} title="Taken en afspraken">
      <div className="ff-stack">
        <p className={`ff-vraag-status${vast ? " is-antwoord" : ""}`}>
          {vast ? `Afgesproken. Vastgelegd door ${naam(state, state.klusAfspraken?.door)} op ${new Date(state.klusAfspraken!.vastgelegd!).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}.` : "Dit is een voorstel van de app. Pas aan wat niet klopt en leg het vast, dan weet iedereen waar hij aan toe is."}
        </p>

        <b>Hoeveel per dag?</b>
        <span className="ff-small ff-muted">Minuten klussen. Op een vrije dag iets meer; werken jullie allebei, dan nog 10 minuten extra. Rust mag ook: meer dan één extra klus komt er nooit bij.</span>
        {kids.map((m) => {
          const e = eigenVerwachting(state, m);
          return (
            <div key={m.id} className="ff-afspraak-kind">
              <Kop m={m} size={30} />
              <b className="ff-grow">{m.name}</b>
              <span className="ff-afspraak-steppers">
              {(["school", "vrij"] as const).map((veld) => (
                <span key={veld} className="ff-stepper">
                  <span className="ff-small ff-muted">{veld === "school" ? "🎒 school" : "🏠 vrij"}</span>
                  {isOuder && <button className="v2-plusmin" aria-label={`${m.name} ${veld} min 5`} onClick={() => verw(m, veld, -5)}>−</button>}
                  <b>{e[veld]}</b>
                  {isOuder && <button className="v2-plusmin" aria-label={`${m.name} ${veld} plus 5`} onClick={() => verw(m, veld, 5)}>+</button>}
                </span>
              ))}
              </span>
            </div>
          );
        })}

        <b>Taken</b>
        <span className="ff-small ff-muted">Zet aan wat bij jullie gezin past, de rest uit. Tik op een naam om te kiezen wie het wel of niet doet. Leeftijd is een richtlijn: jullie kennen je kinderen het best.</span>
        {[...alleKlussen(state)].sort((a, b) => Number(klusAan(state, b)) - Number(klusAan(state, a))).map((k, i, lijst) => {
          const aan = klusAan(state, k);
          return (
            <div key={k.id} className={`ff-afspraak-klus${aan ? "" : " is-uit"}`}>
              {!aan && (i === 0 || klusAan(state, lijst[i - 1])) && <span className="ff-eyebrow">Bibliotheek: zet aan wat past</span>}
              <div className="ff-row">
                <span aria-hidden="true">{k.emoji}</span>
                <b className="ff-grow">{k.label}{k.begeleiding ? <span className="ff-small ff-muted"> · met begeleiding</span> : null}{k.elke >= 7 ? <span className="ff-small ff-muted"> · wekelijks</span> : k.elke > 1 ? <span className="ff-small ff-muted"> · elke {k.elke} dagen</span> : null}</b>
                {isOuder && <button className="v2-plusmin" aria-label={`${k.label} min 5 minuten`} disabled={!aan} onClick={() => zetKlus(k.id, (a) => ({ ...a, minuten: Math.max(5, minutenVan(state, k) - 5) }))}>−</button>}
                <span className="ff-small"><b>{minutenVan(state, k)}</b> min</span>
                {isOuder && <button className="v2-plusmin" aria-label={`${k.label} plus 5 minuten`} disabled={!aan} onClick={() => zetKlus(k.id, (a) => ({ ...a, minuten: Math.min(90, minutenVan(state, k) + 5) }))}>+</button>}
                {isOuder && <button className="ff-schakel" role="switch" aria-checked={aan} aria-label={`${k.label} ${aan ? "aan" : "uit"}`} onClick={() => zetKlus(k.id, (a) => ({ ...a, aan: !aan }))}><i /></button>}
              </div>
              {aan && k.instructie && <span className="ff-small ff-muted">{k.instructie}</span>}
              {isOuder && k.eigen && <button className="ff-link ff-small" style={{ justifySelf: "start" }} onClick={() => { samenwerken.verwijderEigenTaak(k.id); onToast("Taak weggehaald"); }}>Eigen taak weghalen</button>}
              {aan && (
                <div className="ff-chips">
                  {(k.iedereen ? leden : kids).filter((m) => !k.perKind || m.role !== "ouder").map((m) => {
                    const mag = magDoen(state, m, k);
                    const teJong = m.role !== "ouder" && m.age !== undefined && m.age < k.vanaf && !state.klusAfspraken?.klussen?.[k.id]?.wel?.includes(m.id);
                    return (
                      <button key={m.id} className="ff-chip" aria-pressed={mag} disabled={!isOuder} onClick={() => wieMag(k.id, m)} title={teJong ? `Voorstel: vanaf ${k.vanaf} jaar` : undefined}>
                        {m.name}{teJong ? ` (vanaf ${k.vanaf})` : ""}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {isOuder && <EigenTaakForm onToast={onToast} />}

        {isOuder && <Afwezig state={state} onToast={onToast} />}

        {isOuder && (
          <>
            <b>Vandaag vrijstelling</b>
            <span className="ff-small ff-muted">Ziek, toets of toernooi? Dan vandaag geen klussen. Dat telt niet als achterstand.</span>
            <div className="ff-chips">
              {leden.map((m) => {
                const r = state.vrijstelling?.[d]?.[m.id];
                return (
                  <button key={m.id} className="ff-chip ff-chip-l" aria-pressed={!!r} onClick={() => (r ? samenwerken.vrijstelling(m.id, null) : setVrijVoor(m.id))}>
                    {m.name}{r ? `: ${r}` : ""}
                  </button>
                );
              })}
            </div>
            {vrijVoor && (
              <div className="ff-chips">
                {["Ziek", "Toets", "Toernooi of wedstrijd", "Druk op school", "Even rust"].map((r) => (
                  <button key={r} className="ff-chip" onClick={() => { samenwerken.vrijstelling(vrijVoor, r); onToast(`${naam(state, vrijVoor)}: vandaag vrijstelling`); setVrijVoor(null); }}>{r}</button>
                ))}
              </div>
            )}
            <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => { samenwerken.vastleggen(me.id); onToast("Afspraken vastgelegd 📋"); onClose(); }}>{vast ? "Wijzigingen vastleggen" : "Afspraken vastleggen"}</button>
          </>
        )}
      </div>
    </Sheet>
  );
}

/** Korte tekst voor een klus in een lijst: "Vaatwasser uitruimen · 10 min". */
export const klusRegel = (k: KlusStatus, me: string) => `${naamKlus(k, me)} · ${k.minuten} min`;

const HOE_VAAK = [
  { elke: 1, label: "Elke dag" },
  { elke: 2, label: "Om de dag" },
  { elke: 7, label: "Elke week" },
];

/** Een eigen taak toevoegen: naam, hoe vaak, hoe lang, vanaf welke leeftijd, wat je precies doet. Kort formulier. */
function EigenTaakForm({ onToast }: { onToast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState({ label: "", emoji: "📌", elke: 1, minuten: 10, vanaf: 8, instructie: "", begeleiding: false, iedereen: false });
  if (!open) return <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => setOpen(true)}>+ Eigen taak toevoegen</button>;
  return (
    <div className="ff-card ff-stack-s" aria-label="Eigen taak">
      <b>Eigen taak</b>
      <label className="ff-field"><span className="ff-eyebrow">Wat moet er gebeuren?</span><input value={t.label} maxLength={40} onChange={(e) => setT({ ...t, label: e.target.value })} placeholder="Bijv. hond uitlaten" /></label>
      <div className="ff-chips">{HOE_VAAK.map((h) => <button key={h.elke} className="ff-chip" aria-pressed={t.elke === h.elke} onClick={() => setT({ ...t, elke: h.elke })}>{h.label}</button>)}</div>
      <div className="ff-chips">{[5, 10, 15, 20, 30, 45].map((m) => <button key={m} className="ff-chip" aria-pressed={t.minuten === m} onClick={() => setT({ ...t, minuten: m })}>{m} min</button>)}</div>
      <div className="ff-chips">{[6, 8, 10, 12, 14].map((a) => <button key={a} className="ff-chip" aria-pressed={t.vanaf === a} onClick={() => setT({ ...t, vanaf: a })}>vanaf {a}</button>)}</div>
      <label className="ff-field"><span className="ff-eyebrow">Zo doe je het (kort, concreet)</span><input value={t.instructie} maxLength={160} onChange={(e) => setT({ ...t, instructie: e.target.value })} placeholder="Bijv. rondje park, poep opruimen, water bijvullen" /></label>
      <div className="ff-chips">
        <button className="ff-chip" aria-pressed={t.iedereen} onClick={() => setT({ ...t, iedereen: !t.iedereen })}>Ouders doen ook mee</button>
        <button className="ff-chip" aria-pressed={t.begeleiding} onClick={() => setT({ ...t, begeleiding: !t.begeleiding })}>Alleen met begeleiding</button>
      </div>
      <div className="ff-row">
        <button className="ff-btn ff-btn-ghost" onClick={() => setOpen(false)}>Annuleren</button>
        <button className="ff-btn ff-btn-primary ff-grow" disabled={!t.label.trim()} onClick={() => { samenwerken.eigenTaak({ ...t, label: t.label.trim(), instructie: t.instructie.trim() || undefined, xp: t.minuten >= 20 ? 10 : 5 }); onToast(`${t.label} toegevoegd`); setOpen(false); setT({ ...t, label: "", instructie: "" }); }}>Toevoegen</button>
      </div>
    </div>
  );
}

/** Afwezig voor een periode: logeren, kamp, ziek. Dan geen taken en het telt niet als achterstand. */
function Afwezig({ state, onToast }: { state: FamilyState; onToast: (m: string) => void }) {
  const leden = state.members.filter((m) => m.joined !== false);
  const vandaag = todayKey();
  const [wie, setWie] = useState<string | null>(null);
  const [van, setVan] = useState(vandaag);
  const [tot, setTot] = useState(vandaag);
  return (
    <>
      <b>Afwezig</b>
      <span className="ff-small ff-muted">Logeren, kamp of een week ziek? Dan krijgt die persoon geen taken.</span>
      {leden.flatMap((m) => (state.klusAfspraken?.afwezig?.[m.id] ?? []).filter((p) => p.tot >= vandaag).map((p) => (
        <div key={m.id + p.van} className="ff-row">
          <span className="ff-grow ff-small"><b>{m.name}</b>: {p.van.slice(8)}/{Number(p.van.slice(5, 7))} t/m {p.tot.slice(8)}/{Number(p.tot.slice(5, 7))}{p.reden ? ` · ${p.reden}` : ""}</span>
          <button className="ff-link ff-small" onClick={() => samenwerken.afwezig(m.id, null)}>Weg</button>
        </div>
      )))}
      <div className="ff-chips">{leden.map((m) => <button key={m.id} className="ff-chip" aria-pressed={wie === m.id} onClick={() => setWie(wie === m.id ? null : m.id)}>{m.name}</button>)}</div>
      {wie && (
        <div className="ff-row">
          <label className="ff-field ff-grow"><span className="ff-eyebrow">Van</span><input type="date" value={van} onChange={(e) => setVan(e.target.value)} /></label>
          <label className="ff-field ff-grow"><span className="ff-eyebrow">Tot en met</span><input type="date" value={tot} min={van} onChange={(e) => setTot(e.target.value)} /></label>
          <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={() => { samenwerken.afwezig(wie, { van, tot: tot < van ? van : tot }); onToast("Afwezig gezet"); setWie(null); }}>Zet</button>
        </div>
      )}
    </>
  );
}
