"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { AfspraakSheet } from "@/components/screens/Afspraak";
import { KlusKiezer } from "@/components/screens/KlusKiezer";
import { PlanSheet } from "@/v2/Samen";
import { CATALOGUS, CATS, type CatalogTaak } from "@/lib/catalog";
import { huistaakVoor } from "@/lib/huis";
import { addDays, iso } from "@/lib/planner";
import { actions } from "@/lib/store";
import type { FamilyState, Member, TaakCat, Task } from "@/lib/types";

/*
  Eén plek om iets toe te voegen (3.12). Eerst kies je wát:
  - Taak: iets wat je gaat doen, zonder vaste tijd (boodschappen, gymtas inpakken). Komt in de lijst op Vandaag.
  - Afspraak: iets op een tijd (huisarts, ontbijten met Akram).
  - Samen iets doen: met gezinsleden (trainen, filmavond).
  - Klus voor het huis: terugkerend huishoudelijk werk dat eerlijk verdeeld wordt (alleen ouders).
  Een taak kies je uit een lijst of typ je zelf. Een tijd mag, maar hoeft niet.
*/

type Stap = "kies" | "taak" | "afspraak" | "samen" | "klus";
type Wanneer = "vandaag" | "morgen" | "dag" | "elke" | "vast";
const DAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];

export function Toevoegen({ open, onClose, state, me, onToast, datum }: { open: boolean; onClose: () => void; state: FamilyState; me: Member; onToast: (m: string) => void; datum?: string }) {
  const [stap, setStap] = useState<Stap>("kies");
  const isOuder = me.role === "ouder";
  useEffect(() => { if (open) setStap("kies"); }, [open]);
  const sluit = () => { setStap("kies"); onClose(); };

  const keuze = (s: Stap, emoji: string, titel: string, uitleg: string) => (
    <button className="v2-toevoeg-keuze" onClick={() => setStap(s)}>
      <span className="v2-toevoeg-emoji" aria-hidden="true">{emoji}</span>
      <span className="ff-grow ff-stack-xs"><b>{titel}</b><span className="ff-small ff-muted">{uitleg}</span></span>
      <span aria-hidden="true">›</span>
    </button>
  );

  return (
    <>
      <Sheet open={open && (stap === "kies" || stap === "taak")} onClose={sluit} title={stap === "taak" ? "Taak toevoegen" : "Toevoegen"}>
        {stap === "kies" ? (
          <div className="ff-stack-s">
            <h2 className="ff-h2">Wat wil je toevoegen?</h2>
            {keuze("taak", "✅", "Taak", "Iets wat je gaat doen, zonder vaste tijd. Bijv. boodschappen doen of gymtas inpakken.")}
            {keuze("afspraak", "📅", "Afspraak", "Iets op een vaste tijd. Bijv. huisarts, tandarts, ontbijten met iemand.")}
            {keuze("samen", "💞", "Samen iets doen", "Met iemand uit het gezin. Bijv. samen trainen of een filmavond.")}
            {isOuder && keuze("klus", "🧹", "Klus voor het huis", "Iets wat steeds terugkomt en eerlijk verdeeld wordt. Bijv. stofzuigen.")}
          </div>
        ) : (
          <TaakForm state={state} me={me} datum={datum} onTerug={() => setStap("kies")} onKlaar={(m) => { onToast(m); sluit(); }} />
        )}
      </Sheet>
      <AfspraakSheet open={open && stap === "afspraak"} me={me} datum={datum ?? iso(new Date())} onClose={sluit} onToast={onToast} />
      <PlanSheet open={open && stap === "samen"} datum={datum} state={state} me={me} onClose={sluit} onToast={onToast} />
      {isOuder && <KlusKiezer open={open && stap === "klus"} onClose={sluit} state={state} onToast={onToast} />}
    </>
  );
}

function TaakForm({ state, me, datum, onTerug, onKlaar }: { state: FamilyState; me: Member; datum?: string; onTerug: () => void; onKlaar: (m: string) => void }) {
  const isOuder = me.role === "ouder";
  const vandaag = iso(new Date());
  const groepen: TaakCat[] = isOuder ? ["huishouden", "overig", "kinderen", "school", "sport", "werk"] : ["school", "sport", "huishouden", "overig"];
  const [groep, setGroep] = useState<TaakCat>(groepen[0]);
  const [titel, setTitel] = useState("");
  const [gekozen, setGekozen] = useState<CatalogTaak | null>(null);
  const [voor, setVoor] = useState(me.id);
  const [wanneer, setWanneer] = useState<Wanneer>(datum && datum !== vandaag ? "dag" : "vandaag");
  const [dag, setDag] = useState(datum ?? addDays(vandaag, 2));
  const [dagen, setDagen] = useState<number[]>([]);
  const [tijd, setTijd] = useState("");
  const leden = state.members.filter((m) => m.joined !== false);
  const mag = (c: CatalogTaak) => groepen.includes(c.cat) && (isOuder || !c.ouder) && (c.pet ? state.pet.has : true);
  const lijst = CATALOGUS.filter((c) => c.cat === groep && mag(c));
  // Zoeken: in alle soorten tegelijk, zonder eerst een tab te kiezen.
  const zoekt = !!titel.trim() && !gekozen;
  const gevonden = zoekt ? zoekTaken(titel, CATALOGUS.filter(mag)) : [];
  const kies = (c: CatalogTaak) => { setTitel(c.title); setGekozen(c); setGroep(c.cat); };
  const klus = huistaakVoor(state, titel);
  const voorLid = leden.find((m) => m.id === voor);
  const ok = !!titel.trim() && !klus && (wanneer !== "vast" || dagen.length > 0) && (wanneer !== "dag" || !!dag);

  const opslaan = () => {
    if (!ok) return;
    const voorOuder = voorLid?.role === "ouder";
    // Punten: een kind dat zelf iets toevoegt krijgt er weinig voor (geen punten "farmen"); taken van ouders geven geen punten.
    const xp = voorOuder ? 0 : !isOuder ? 2 : gekozen?.xp ?? 10;
    const t: Omit<Task, "id"> = {
      title: titel.trim(), icon: gekozen?.icon ?? (groep === "school" ? "pen" : groep === "sport" ? "sport" : groep === "overig" ? "post" : "huis"),
      assignee: voor, xp, cat: gekozen?.cat ?? groep, min: gekozen?.min ?? 15, createdBy: me.id,
      repeat: wanneer === "elke" ? "dagelijks" : wanneer === "vast" ? "wekelijks" : "eenmalig",
      ...(wanneer === "vast" ? { days: [...dagen].sort() } : {}),
      ...(wanneer === "vandaag" ? { date: vandaag } : wanneer === "morgen" ? { date: addDays(vandaag, 1) } : wanneer === "dag" ? { date: dag } : {}),
      ...(tijd ? { tijd } : {}),
    };
    actions.addTask(t);
    const wie = voor === me.id ? "" : ` voor ${voorLid?.name}`;
    const wan = wanneer === "vandaag" ? "vandaag" : wanneer === "morgen" ? "morgen" : wanneer === "dag" ? new Date(dag + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }) : wanneer === "elke" ? "elke dag" : dagen.map((d) => DAGEN[d]).join(", ");
    onKlaar(`${titel.trim()}${wie}: ${wan}${tijd ? ` om ${tijd.replace(":", ".")}` : ""} ✓`);
  };

  return (
    <div className="ff-stack-s">
      <button className="v2-terug" onClick={onTerug}>‹ Iets anders toevoegen</button>
      <h2 className="ff-h2">Taak toevoegen</h2>
      <span className="ff-small ff-muted">Zoek, kies er een of typ zelf. Een tijd hoeft niet.</span>
      <label className="ff-field"><span className="ff-eyebrow">Zoek of typ zelf</span><input type="search" value={titel} maxLength={60} onChange={(e) => { setTitel(e.target.value); setGekozen(null); }} placeholder="Bijv. was, gym, tandarts" aria-label="Wat moet er gebeuren?" /></label>
      {zoekt ? (
        gevonden.length ? (
          <div className="ff-chips v2-taak-keuzes" aria-label="Gevonden taken">
            {gevonden.map((c) => <button key={c.title} className="ff-chip" onClick={() => kies(c)}>+ {c.title}</button>)}
          </div>
        ) : !klus && <p className="ff-small ff-muted">Niks gevonden in de lijst. Je voegt "{titel.trim()}" toe als eigen taak.</p>
      ) : (
        <>
          <div className="v2-cat-tabs" role="tablist" aria-label="Soort taak">
            {groepen.map((g) => <button key={g} role="tab" aria-selected={groep === g} className="v2-cat-tab" onClick={() => setGroep(g)}>{g === "overig" ? "Regelen en overig" : g === "huishouden" ? "Huishouden en boodschappen" : CATS[g].label}</button>)}
          </div>
          <div className="ff-chips v2-taak-keuzes" aria-label="Kies een taak">
            {lijst.map((c) => <button key={c.title} className="ff-chip" aria-pressed={titel === c.title} onClick={() => kies(c)}>{titel === c.title ? "✓ " : "+ "}{c.title}</button>)}
          </div>
        </>
      )}
      {klus && <p className="ff-small v2-let-op">Dit is een klus voor het huis ({klus.label.toLowerCase()}). Die staat al bij Gezin en wordt eerlijk verdeeld.</p>}

      {isOuder && (
        <>
          <span className="ff-eyebrow">Voor wie?</span>
          <div className="ff-chips">{leden.map((m) => <button key={m.id} className="ff-chip" aria-pressed={voor === m.id} onClick={() => setVoor(m.id)}>{m.id === me.id ? "Mij" : m.name}</button>)}</div>
        </>
      )}

      <span className="ff-eyebrow">Wanneer?</span>
      <div className="ff-chips">
        {([["vandaag", "Vandaag"], ["morgen", "Morgen"], ["dag", "Andere dag"], ["elke", "Elke dag"], ["vast", "Vaste dagen"]] as [Wanneer, string][]).map(([w, l]) => (
          <button key={w} className="ff-chip" aria-pressed={wanneer === w} onClick={() => setWanneer(w)}>{l}</button>
        ))}
      </div>
      {wanneer === "dag" && <label className="ff-field"><span className="ff-eyebrow">Welke dag?</span><input type="date" value={dag} min={vandaag} onChange={(e) => setDag(e.target.value)} /></label>}
      {wanneer === "vast" && <div className="ff-chips">{[1, 2, 3, 4, 5, 6, 0].map((d) => <button key={d} className="ff-chip" aria-pressed={dagen.includes(d)} onClick={() => setDagen(dagen.includes(d) ? dagen.filter((x) => x !== d) : [...dagen, d])}>{DAGEN[d]}</button>)}</div>}

      <label className="ff-field"><span className="ff-eyebrow">Hoe laat? <span className="ff-muted">(hoeft niet)</span></span><input type="time" value={tijd} onChange={(e) => setTijd(e.target.value)} aria-label="Hoe laat (hoeft niet)" /></label>
      {tijd && <button className="ff-link ff-small" style={{ justifySelf: "start" }} onClick={() => setTijd("")}>Geen tijd</button>}

      <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!ok} onClick={opslaan}>Taak toevoegen</button>
    </div>
  );
}

/** Zoeken zonder hoofdletters en accenten; elk woord moet ergens in de naam staan. Wat met je woord begint, komt eerst. */
export function zoekTaken(q: string, lijst: CatalogTaak[]): CatalogTaak[] {
  const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const woorden = norm(q).split(/\s+/).filter(Boolean);
  if (!woorden.length) return [];
  return lijst
    .filter((c) => woorden.every((w) => norm(c.title).includes(w)))
    .sort((a, b) => Number(!norm(a.title).startsWith(woorden[0])) - Number(!norm(b.title).startsWith(woorden[0])) || a.title.localeCompare(b.title))
    .slice(0, 12);
}
