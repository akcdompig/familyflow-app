"use client";

import { useState } from "react";
import type { Member } from "@/lib/types";

/*
  Uitleg op het juiste moment.
  - Eerste keer: één korte kaart per tabblad. "Snap ik" sluit hem, "Meer uitleg" opent de uitlegpagina.
  - Info-knopje (ⓘ): één zin, alleen waar iets niet vanzelf spreekt. Geen pop-up: de zin komt eronder.
  - Uitlegpagina "Hoe werkt de app?": de belangrijkste dingen in gewone woorden, met een voorbeeld.
  Wat je al gezien hebt, onthoudt deze telefoon (per persoon). Is dat niet beschikbaar, dan zie je de kaart gewoon weer.
*/

export type UitlegTab = "vandaag" | "gezin" | "samen" | "hulp" | "ik";

const EERSTE: Record<UitlegTab, { titel: string; tekst: (ouder: boolean) => string }> = {
  vandaag: { titel: "Dit is je dag", tekst: (o) => `Tik op het rondje als iets af is: dat geeft punten. Onderin vind je Week (je week en de agenda), Gezin (wie is waar, de huisregels) en Ik (je punten en instellingen). Boos of ruzie? Tik op Rust, rechtsonder.${o ? " Bovenaan zie je de kinderen: tik er een aan voor zijn dag." : ""}` },
  gezin: { titel: "Hier zie je het hele gezin", tekst: (o) => (o ? "Wie is thuis, wie werkt, wie heeft iets nodig. Onder Week staat de planning, onder Taken wie wat doet in huis." : "Wie is er thuis en wie is bezig. Onder Taken staan jouw klussen.") },
  samen: { titel: "Huisregels", tekst: () => "Hier staan jullie huisregels. Na een week vraagt de app: hielp het?" },
  hulp: { titel: "Rust", tekst: () => "Word je boos of is er ruzie? Begin hier, stap voor stap." },
  ik: { titel: "Jouw plek", tekst: () => "Je punten, wat je deed deze week en je instellingen. Punten die je verdient wachten in je schatkist tot je op Claim tikt." },
};

const sleutel = (id: string) => `familyflow:uitleg:${id}`;
function gezien(id: string): UitlegTab[] {
  try {
    return JSON.parse(window.localStorage.getItem(sleutel(id)) ?? "[]");
  } catch {
    return [];
  }
}
function bewaar(id: string, lijst: UitlegTab[]) {
  try {
    window.localStorage.setItem(sleutel(id), JSON.stringify(lijst));
  } catch {
    /* geen opslag: dan zie je de uitleg nog een keer, niet erg */
  }
}
export function uitlegOpnieuw(id: string) {
  bewaar(id, []);
}

/** Korte uitleg bovenaan een tabblad, alleen de eerste keer. */
export function EersteKeer({ tab, me, onMeer }: { tab: UitlegTab; me: Member; onMeer: () => void }) {
  const [weg, setWeg] = useState<UitlegTab[]>(() => (typeof window === "undefined" ? [] : gezien(me.id)));
  if (weg.includes(tab)) return null;
  const e = EERSTE[tab];
  const sluit = () => {
    const nieuw = [...weg, tab];
    bewaar(me.id, nieuw);
    setWeg(nieuw);
  };
  return (
    <div className="v2-eerste-wrap">
      <section className="ff-card v2-eerste" aria-label={`Uitleg: ${e.titel}`}>
        <span className="v2-eerste-icoon" aria-hidden="true">💡</span>
        <span className="ff-grow ff-stack-xs">
          <b>{e.titel}</b>
          <span className="ff-small">{e.tekst(me.role === "ouder")}</span>
          <span className="ff-row v2-eerste-knoppen">
            <button className="ff-btn ff-btn-primary ff-btn-s" onClick={sluit}>Snap ik</button>
            <button className="ff-link" onClick={() => { sluit(); onMeer(); }}>Meer uitleg</button>
          </span>
        </span>
      </section>
    </div>
  );
}

/** Info-knopje: één zin uitleg eronder, tik nog eens om te verbergen. */
export function Info({ tekst, label = "Wat is dit?" }: { tekst: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="ff-info">
      <button className="ff-info-knop" aria-expanded={open} aria-label={label} onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>i</button>
      {open && <span className="ff-info-tekst" role="note">{tekst}</span>}
    </span>
  );
}

const ROUTES: { titel: string; emoji: string; tekst: string; voorbeeld?: string }[] = [
  { emoji: "☀️", titel: "Je dag bekijken", tekst: "Open Vandaag. Bovenaan staat je lijst van nu. Wat je als eerste kunt doen, heeft een gele rand. Andere dagdelen klap je open met een tik." },
  { emoji: "✅", titel: "Een taak afronden", tekst: "Tik op het rondje voor de taak. Er komt een vinkje. Per ongeluk? Tik nog een keer, dan staat hij weer open.", voorbeeld: "Lunch gegeten? Tik op het rondje bij Lunch." },
  { emoji: "📅", titel: "Een afspraak toevoegen", tekst: "Op Vandaag, helemaal onderaan: Afspraak toevoegen. Vul in wat, welke dag en hoe laat. Je hoeft je werk niet eerst in te vullen.", voorbeeld: "Een gesprek op school, de huisarts, of ontbijten met Akram." },
  { emoji: "🗓️", titel: "De week bekijken", tekst: "Tik onderin op Week. Tik op een dag om te zien wat er staat. Ging iets samen anders dan gepland? Tik op Aanpassen, of bij iets wat al gedaan is op Klopt niet? Terugzetten.", voorbeeld: "Kian kon toch niet mee sporten: bij Gedaan tik je hem weg, dan krijgt hij geen punten." },
  { emoji: "👀", titel: "Zien wat aandacht nodig heeft", tekst: "Ga naar Gezin. Onder de huiskamer staan kaartjes, bijvoorbeeld als iemand even rust wil of nog iets moet doen." },
  { emoji: "💎", titel: "Punten en beloningen", tekst: "Punten die je verdient komen in je schatkist. Tik op Claim en je ziet waarvoor je ze kreeg. Bij Ik staat: Waar komen mijn punten vandaan?" },
  { emoji: "💰", titel: "Zakgeld en weekbonus", tekst: "Zakgeld krijg je altijd. De weekbonus komt erbovenop: haal je deze week bijvoorbeeld 70%, dan krijg je de eerste trede; haal je 85%, dan de hele bonus. Bij Week zie je hoeveel vinkjes je nog nodig hebt. Zondag sluit papa of mama de week af en betaalt uit.", voorbeeld: "Nog 4 vinkjes tot € 2,50, nog 9 tot € 5." },
  { emoji: "🧭", titel: "Een oefening met de coach", tekst: "Tik rechtsonder op Rust en kies een oefening. Aan het eind zie je wat er gebeurde en wat je de volgende keer kunt proberen." },
  { emoji: "📈", titel: "Hoe het gaat", tekst: "Tik onderin op Week. Daar staat hoe jullie week ging, en of de huisregels helpen." },
  { emoji: "🌋", titel: "Boos of ruzie", tekst: "Tik rechtsonder op Rust (op elk scherm) en kies Ik word boos of Ruzie of gedoe. De app helpt stap voor stap. Je hoeft niks op te lossen als je nog boos bent." },
];

/** Hoe werkt de app? Altijd terug te vinden via Ik. */
export function UitlegPagina({ me, onClose, onToast }: { me: Member; onClose: () => void; onToast: (m: string) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="ff-screen v2-screen">
      <button className="v2-terug" onClick={onClose}>‹ Terug</button>
      <header className="ff-stack-xs">
        <div className="ff-eyebrow">Uitleg</div>
        <h1 className="ff-h1">Hoe werkt de app?</h1>
        <p className="ff-small ff-muted">Kies waar je hulp bij wilt. Je kunt deze uitleg altijd terugvinden bij Ik.</p>
      </header>
      <div className="ff-stack-s">
        {ROUTES.map((r, i) => (
          <section key={r.titel} className="ff-card v2-uitleg">
            <button className="v2-uitleg-kop" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <span aria-hidden="true">{r.emoji}</span>
              <b className="ff-grow">{r.titel}</b>
              <span aria-hidden="true">{open === i ? "▴" : "▾"}</span>
            </button>
            {open === i && (
              <div className="ff-stack-xs v2-uitleg-tekst">
                <p>{r.tekst}</p>
                {r.voorbeeld && <p className="ff-small ff-muted">Bijvoorbeeld: {r.voorbeeld}</p>}
              </div>
            )}
          </section>
        ))}
      </div>
      <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => { uitlegOpnieuw(me.id); onToast("De uitleg per scherm komt weer terug"); onClose(); }}>Laat de uitleg per scherm opnieuw zien</button>
      <p className="ff-small ff-muted">Kom je er niet uit? Vraag het aan iemand in je gezin. Samen leren gaat vaak het snelst.</p>
    </div>
  );
}
