"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { ONDERWERPEN, tipVanDeDag, type Recept } from "@/lib/coachtips";
import { actions } from "@/lib/store";
import type { FamilyState, Member } from "@/lib/types";

/** Kies waar je beter in wilt worden. */
export function Interesses({ state, me, onToast, compact = false }: { state: FamilyState; me: Member; onToast?: (m: string) => void; compact?: boolean }) {
  const mijn = state.interesses?.[me.id] ?? [];
  const zet = (id: string) => {
    const nieuw = mijn.includes(id) ? mijn.filter((x) => x !== id) : [...mijn, id];
    actions.setInteresses(me.id, nieuw);
    if (!mijn.includes(id)) onToast?.("Je krijgt hier vanaf nu tips over");
  };
  if (compact)
    return (
      <div className="ff-chips">
        {ONDERWERPEN.map((o) => (
          <button key={o.id} className="ff-chip ff-chip-l" aria-pressed={mijn.includes(o.id)} onClick={() => zet(o.id)}>{o.emoji} {o.label}</button>
        ))}
      </div>
    );
  return (
    <div className="ff-coach-keuze">
      {ONDERWERPEN.map((o) => (
        <button key={o.id} className="ff-coach-optie" aria-pressed={mijn.includes(o.id)} onClick={() => zet(o.id)}>
          <span aria-hidden="true">{o.emoji}</span>
          <span><b>{o.label}</b><span className="ff-small ff-muted ff-block">{o.uitleg}</span></span>
        </button>
      ))}
    </div>
  );
}

/** Coach-tip van vandaag in de huiskamer. Nog niks gekozen? Dan vragen we waar je beter in wilt worden. */
export function CoachTip({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const mijn = state.interesses?.[me.id];
  const [kiezen, setKiezen] = useState(false);
  const [recept, setRecept] = useState<Recept | null>(null);
  const tip = tipVanDeDag(me, mijn ?? []);

  return (
    <>
      {!tip ? (
        <section className="ff-card ff-stack-s">
          <b>🎯 Waar wil je beter in worden?</b>
          <p className="ff-small ff-muted">Kies wat je leuk vindt. Dan krijg je elke dag een tip die bij je past: koken, sport, gezond eten, leren, je hoofd of geld.</p>
          <button className="ff-btn ff-btn-dark ff-btn-wide" onClick={() => setKiezen(true)}>Kiezen</button>
        </section>
      ) : (
        <section className="ff-card ff-coachtip ff-stack-s">
          <div className="ff-row" style={{ justifyContent: "space-between" }}>
            <b>{tip.onderwerp.emoji} Coach-tip · {tip.onderwerp.label.toLowerCase()}</b>
            <button className="ff-link ff-small" onClick={() => setKiezen(true)}>Aanpassen</button>
          </div>
          <p style={{ margin: 0 }}>{tip.tekst}</p>
          {tip.recept && (
            <button className="ff-recept-knop" onClick={() => setRecept(tip.recept!)}>
              <span aria-hidden="true" style={{ fontSize: 28 }}>{tip.recept.emoji}</span>
              <span className="ff-grow"><b>Recept van vandaag: {tip.recept.naam}</b><span className="ff-small ff-muted ff-block">{tip.recept.tijd} minuten · {tip.recept.personen} personen</span></span>
              <span aria-hidden="true">›</span>
            </button>
          )}
        </section>
      )}

      <Sheet open={kiezen} onClose={() => setKiezen(false)} title="Mijn coach">
        <div className="ff-stack">
          <h2 className="ff-h2">Waar wil je beter in worden?</h2>
          <p className="ff-small ff-muted">Kies er een of meer. Je krijgt elke dag een tip, passend bij je leeftijd.</p>
          <Interesses state={state} me={me} onToast={onToast} />
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setKiezen(false)}>Klaar</button>
        </div>
      </Sheet>

      <Sheet open={!!recept} onClose={() => setRecept(null)} title={recept?.naam ?? "Recept"}>
        {recept && (
          <div className="ff-stack">
            <h2 className="ff-h2">{recept.emoji} {recept.naam}</h2>
            <p className="ff-small ff-muted">{recept.tijd} minuten · voor {recept.personen} {recept.personen === 1 ? "persoon" : "personen"}</p>
            <section className="ff-stack-s">
              <b>Wat heb je nodig</b>
              <ul className="ff-recept-lijst">{recept.ingredienten.map((i) => <li key={i}>{i}</li>)}</ul>
            </section>
            <section className="ff-stack-s">
              <b>Zo maak je het</b>
              <ol className="ff-recept-lijst">{recept.stappen.map((st) => <li key={st}>{st}</li>)}</ol>
            </section>
            <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => {
              const d = new Date().toLocaleDateString("sv-SE");
              actions.setKoken(d, (p) => ({ ...p, kok: me.id, wat: recept.naam, restjes: false }));
              setRecept(null);
              onToast(`Jij kookt vanavond: ${recept.naam} 🍳`);
            }}>Ik kook dit vanavond</button>
            <p className="ff-small ff-muted">3 keer koken in een week = Masterchef 👨‍🍳</p>
          </div>
        )}
      </Sheet>
    </>
  );
}
