"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { iso } from "@/lib/planner";
import { duur, uren } from "@/lib/stats";
import { actions } from "@/lib/store";
import type { FamilyState, Member, WerkItem } from "@/lib/types";

const DAG = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const nieuwId = () => "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

const SJABLONEN: { label: string; uitleg: string; item: Omit<WerkItem, "id"> }[] = [
  { label: "Vaste baan", uitleg: "Elke week dezelfde dagen", item: { naam: "", soort: "vast", days: [1, 2, 3, 4, 5], van: "09:00", tot: "17:00", inkomen: true } },
  { label: "Training of les geven", uitleg: "Vaste dag en tijd", item: { naam: "", soort: "vast", days: [2], van: "17:00", tot: "18:00", inkomen: true } },
  { label: "Diensten volgens rooster", uitleg: "Bijvoorbeeld security", item: { naam: "", soort: "wisselend", inkomen: true } },
  { label: "Eigen bedrijf of klussen", uitleg: "Wisselende uren", item: { naam: "", soort: "wisselend", inkomen: true } },
];

const perWeek = (w: WerkItem) => (w.soort === "vast" ? (w.days?.length ?? 0) * duur(w.van, w.tot) : 0);

/** Werk en roosters per gezinslid. Vast werk telt vanzelf mee, losse diensten voeg je toe. */
export function MijnWerk({ state, me, onClose, onToast }: { state: FamilyState; me: Member; onClose: () => void; onToast: (m: string) => void }) {
  const kanKiezen = me.role === "ouder";
  const [wie, setWie] = useState(me.id);
  const [bewerk, setBewerk] = useState<WerkItem | null>(null);
  const [dienstVoor, setDienstVoor] = useState<string | null>(null);
  const [dDatum, setDDatum] = useState(iso(new Date()));
  const [dVan, setDVan] = useState("20:00");
  const [dTot, setDTot] = useState("02:00");
  const lijst = state.werk?.[wie] ?? [];
  const lid = state.members.find((m) => m.id === wie)!;
  const vandaag = iso(new Date());
  const diensten = (state.diensten ?? []).filter((d) => d.member === wie).sort((a, b) => a.date.localeCompare(b.date));

  const opslaan = (w: WerkItem) => {
    if (!w.naam.trim()) return onToast("Geef het werk een naam");
    if (w.soort === "vast" && (!w.days?.length || !w.van || !w.tot)) return onToast("Kies de dagen en tijden");
    const rest = lijst.filter((x) => x.id !== w.id);
    actions.setWerk(wie, [...rest, { ...w, naam: w.naam.trim() }]);
    setBewerk(null);
    onToast("Opgeslagen");
  };

  if (bewerk) {
    const set = (p: Partial<WerkItem>) => setBewerk({ ...bewerk, ...p });
    return (
      <div className="ff-screen">
        <header className="ff-top">
          <div>
            <div className="ff-eyebrow">Werk · {lid.name}</div>
            <h1 className="ff-h2">{lijst.some((x) => x.id === bewerk.id) ? "Werk aanpassen" : "Werk toevoegen"}</h1>
          </div>
          <button className="ff-iconbtn" onClick={() => setBewerk(null)} aria-label="Terug"><Icon name="terug" /></button>
        </header>
        <section className="ff-card ff-stack">
          <label className="ff-field">
            <span className="ff-eyebrow">Naam</span>
            <input id="werk-naam" value={bewerk.naam} onChange={(e) => set({ naam: e.target.value })} placeholder="Bijv. ING, Gemeente, Bootcamp Loenen, Security" maxLength={40} />
          </label>
          <div className="ff-stack-s">
            <span className="ff-eyebrow">Hoe gaat het rooster?</span>
            <div className="ff-chips">
              <button className="ff-chip" aria-pressed={bewerk.soort === "vast"} onClick={() => set({ soort: "vast", days: bewerk.days ?? [1, 2, 3, 4, 5], van: bewerk.van ?? "09:00", tot: bewerk.tot ?? "17:00" })}>Vaste dagen en tijden</button>
              <button className="ff-chip" aria-pressed={bewerk.soort === "wisselend"} onClick={() => set({ soort: "wisselend" })}>Wisselend (diensten)</button>
            </div>
          </div>
          {bewerk.soort === "vast" && (
            <>
              <div className="ff-stack-s">
                <span className="ff-eyebrow">Welke dagen?</span>
                <div className="ff-chips">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <button key={d} className="ff-chip" aria-pressed={!!bewerk.days?.includes(d)} onClick={() => set({ days: bewerk.days?.includes(d) ? bewerk.days.filter((x) => x !== d) : [...(bewerk.days ?? []), d] })}>{DAG[d]}</button>
                  ))}
                </div>
              </div>
              <div className="ff-row">
                <label className="ff-field" style={{ flex: 1 }}><span className="ff-eyebrow">Van</span><input id="werk-van" type="time" value={bewerk.van ?? ""} onChange={(e) => set({ van: e.target.value })} /></label>
                <label className="ff-field" style={{ flex: 1 }}><span className="ff-eyebrow">Tot</span><input id="werk-tot" type="time" value={bewerk.tot ?? ""} onChange={(e) => set({ tot: e.target.value })} /></label>
              </div>
              <p className="ff-small ff-muted">{uren(perWeek(bewerk))} per week. Dit telt vanzelf mee bij Wie doet wat, je hoeft niks af te vinken.</p>
            </>
          )}
          {bewerk.soort === "wisselend" && <p className="ff-small ff-muted">Na het opslaan voeg je hier je diensten toe, met datum en tijden.</p>}
          <button className="ff-chip ff-chip-l" aria-pressed={!!bewerk.inkomen} onClick={() => set({ inkomen: !bewerk.inkomen })}>Hier verdien ik mee</button>
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => opslaan(bewerk)}>Opslaan</button>
          {lijst.some((x) => x.id === bewerk.id) && (
            <button className="ff-link" onClick={() => { actions.setWerk(wie, lijst.filter((x) => x.id !== bewerk.id)); setBewerk(null); onToast("Verwijderd"); }}>Verwijderen</button>
          )}
        </section>
      </div>
    );
  }

  const totaalVast = lijst.reduce((a, w) => a + perWeek(w), 0);

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">Werk en roosters</div>
          <h1 className="ff-h2">{wie === me.id ? "Mijn werk" : `Werk van ${lid.name}`}</h1>
        </div>
        <button className="ff-iconbtn" onClick={onClose} aria-label="Terug"><Icon name="terug" /></button>
      </header>

      {kanKiezen && (
        <div className="ff-chips">
          {state.members.filter((m) => m.role !== "kind").map((m) => <button key={m.id} className="ff-chip" aria-pressed={wie === m.id} onClick={() => setWie(m.id)}>{m.id === me.id ? "Ik" : m.name}</button>)}
        </div>
      )}

      {lijst.length > 0 && (
        <section className="ff-stack-s">
          {lijst.map((w) => {
            const komend = diensten.filter((d) => d.werkId === w.id && d.date >= vandaag);
            return (
              <div key={w.id} className="ff-card ff-stack-s">
                <div className="ff-row" style={{ justifyContent: "space-between" }}>
                  <b>{w.naam}{w.inkomen ? <span className="ff-small ff-muted"> · inkomen</span> : null}</b>
                  <button className="ff-link" onClick={() => setBewerk(w)}>Aanpassen</button>
                </div>
                {w.soort === "vast" ? (
                  <p className="ff-small ff-muted">{[1, 2, 3, 4, 5, 6, 0].filter((d) => w.days?.includes(d)).map((d) => DAG[d]).join(", ")} · {w.van}–{w.tot} · {uren(perWeek(w))} per week</p>
                ) : (
                  <>
                    <p className="ff-small ff-muted">Wisselend · {komend.length ? `${komend.length} ${komend.length === 1 ? "dienst" : "diensten"} gepland` : "nog geen diensten gepland"}</p>
                    {komend.slice(0, 6).map((d) => (
                      <div key={d.id} className="ff-planblok">
                        <span>{new Date(d.date + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })} · {d.van}–{d.tot}</span>
                        <button className="ff-task-del" aria-label="Dienst weghalen" onClick={() => actions.removeDienst(d.id)}><Icon name="sluit" size={14} /></button>
                      </div>
                    ))}
                    {dienstVoor === w.id ? (
                      <div className="ff-stack-s">
                        <div className="ff-row">
                          <label className="ff-field" style={{ flex: "1 1 8rem" }}><span className="ff-eyebrow">Datum</span><input id="dienst-datum" type="date" value={dDatum} onChange={(e) => setDDatum(e.target.value)} /></label>
                          <label className="ff-field" style={{ flex: "1 1 5rem" }}><span className="ff-eyebrow">Van</span><input id="dienst-van" type="time" value={dVan} onChange={(e) => setDVan(e.target.value)} /></label>
                          <label className="ff-field" style={{ flex: "1 1 5rem" }}><span className="ff-eyebrow">Tot</span><input id="dienst-tot" type="time" value={dTot} onChange={(e) => setDTot(e.target.value)} /></label>
                        </div>
                        <button className="ff-btn ff-btn-primary" onClick={() => { actions.addDienst({ member: wie, werkId: w.id, date: dDatum, van: dVan, tot: dTot }); onToast(`Dienst toegevoegd: ${uren(duur(dVan, dTot))}`); }}>Dienst toevoegen</button>
                        <button className="ff-link" onClick={() => setDienstVoor(null)}>Klaar</button>
                      </div>
                    ) : (
                      <button className="ff-btn ff-btn-ghost" onClick={() => setDienstVoor(w.id)}>+ Dienst toevoegen</button>
                    )}
                  </>
                )}
              </div>
            );
          })}
          {totaalVast > 0 && <p className="ff-small ff-muted">Vast werk: {uren(totaalVast)} per week, plus de losse diensten.</p>}
        </section>
      )}

      <section className="ff-stack-s">
        <b>{lijst.length ? "Nog iets toevoegen" : "Wat voor werk is het?"}</b>
        {SJABLONEN.map((s) => (
          <button key={s.label} className="ff-level" onClick={() => setBewerk({ ...s.item, id: nieuwId() })}>
            <span className="ff-grow"><b>{s.label}</b><br /><span className="ff-small ff-muted">{s.uitleg}</span></span>
          </button>
        ))}
        <p className="ff-small ff-muted">Werk telt mee voor hoe druk iemand is bij Wie doet wat, maar niet voor de verdeling van het huishouden. Bedragen vragen we niet.</p>
      </section>
    </div>
  );
}
