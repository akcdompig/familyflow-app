"use client";

import { useEffect, useRef, useState } from "react";
import { AfspraakBeeld } from "@/components/ui/AfspraakBeeld";
import { Sheet } from "@/components/ui/Sheet";
import { SOORTEN, beeldVoor, controleer, soortVan, tijdTekst, verschil, type Invoer } from "@/lib/agenda";
import { actions } from "@/lib/store";
import type { AgendaItem, FamilyState, Member } from "@/lib/types";

/*
  "+ Afspraak toevoegen": zo kort mogelijk. Naam, datum, van–tot en soort staan meteen in beeld.
  Met wie, waar en een notitie zitten onder "Meer". Geen tijd voorinvullen: die kies je zelf.
  Aanpassen? Dan eerst "Dit verandert", daarna pas opslaan.
*/

const leeg = (datum: string): Invoer => ({ titel: "", datum, van: "", tot: "", soort: "persoonlijk" });
const vanItem = (a: AgendaItem): Invoer => ({ titel: a.titel, datum: a.datum, van: a.van, tot: a.tot, soort: a.soort, met: a.met, waar: a.waar, notitie: a.notitie });

export function AfspraakSheet({ open, me, datum, item, onClose, onToast }: { open: boolean; me: Member; datum: string; item?: AgendaItem; onClose: () => void; onToast: (m: string) => void }) {
  const [x, setX] = useState<Invoer>(item ? vanItem(item) : leeg(datum));
  const [meer, setMeer] = useState(!!(item?.met || item?.waar || item?.notitie));
  const [geprobeerd, setGeprobeerd] = useState(false);
  const [check, setCheck] = useState(false);
  const [weg, setWeg] = useState(false);
  const bezig = useRef(false);
  useEffect(() => {
    if (!open) return;
    setX(item ? vanItem(item) : leeg(datum));
    setMeer(!!(item?.met || item?.waar || item?.notitie));
    setGeprobeerd(false);
    setCheck(false);
    setWeg(false);
    bezig.current = false;
  }, [open, item, datum]);

  const fouten = controleer(x);
  const veranderd = item ? verschil(item, x) : [];
  const zet = (k: keyof Invoer) => (e: { target: { value: string } }) => setX({ ...x, [k]: e.target.value });

  const opslaan = () => {
    setGeprobeerd(true);
    if (fouten.length || bezig.current) return;
    if (item && !veranderd.length) return onClose();
    if (item && !check) return setCheck(true);
    bezig.current = true; // tweede tik doet niks meer
    const id = actions.bewaarAfspraak(me.id, x, item?.id);
    if (!id) {
      bezig.current = false;
      onToast("Opslaan lukte niet. Kijk de velden nog even na.");
      return;
    }
    onToast(item ? "Afspraak aangepast" : "Afspraak gezet 📅");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={item ? "Afspraak aanpassen" : "Afspraak toevoegen"}>
      {!check ? (
        <form className="ff-stack-s" onSubmit={(e) => { e.preventDefault(); opslaan(); }} noValidate>
          <h2 className="ff-h2">{item ? "Afspraak aanpassen" : "Afspraak toevoegen"}</h2>
          <label className="ff-field">
            <span className="ff-eyebrow">Wat</span>
            <input value={x.titel} onChange={zet("titel")} placeholder="Bijv. Ontbijten met Akram" maxLength={80} aria-invalid={geprobeerd && !x.titel.trim()} />
          </label>
          <label className="ff-field">
            <span className="ff-eyebrow">Datum</span>
            <input type="date" value={x.datum} onChange={zet("datum")} aria-invalid={geprobeerd && !x.datum} />
          </label>
          <div className="ff-row ff-afspraak-tijden">
            <label className="ff-field ff-grow">
              <span className="ff-eyebrow">Van</span>
              <input type="time" value={x.van} onChange={zet("van")} aria-invalid={geprobeerd && !x.van} />
            </label>
            <label className="ff-field ff-grow">
              <span className="ff-eyebrow">Tot</span>
              <input type="time" value={x.tot} onChange={zet("tot")} aria-invalid={geprobeerd && (!x.tot || x.tot <= x.van)} />
            </label>
          </div>
          <div className="ff-field">
            <span className="ff-eyebrow" id="soort-label">Soort</span>
            <div className="ff-chips" role="group" aria-labelledby="soort-label">
              {SOORTEN.map((s) => <button type="button" key={s.id} className="ff-chip" aria-pressed={x.soort === s.id} onClick={() => setX({ ...x, soort: s.id })}><span aria-hidden="true">{s.emoji}</span> {s.label}</button>)}
            </div>
          </div>
          {!meer ? (
            <button type="button" className="ff-link" onClick={() => setMeer(true)}>+ Met wie, waar of een notitie</button>
          ) : (
            <div className="ff-stack-s">
              <label className="ff-field"><span className="ff-eyebrow">Met wie (optioneel)</span><input value={x.met ?? ""} onChange={zet("met")} placeholder="Bijv. Akram" maxLength={60} /></label>
              <label className="ff-field"><span className="ff-eyebrow">Waar (optioneel)</span><input value={x.waar ?? ""} onChange={zet("waar")} placeholder="Bijv. Café de Haven" maxLength={80} /></label>
              <label className="ff-field"><span className="ff-eyebrow">Notitie of doel (optioneel, alleen jij ziet dit)</span><textarea value={x.notitie ?? ""} onChange={zet("notitie")} rows={2} maxLength={300} /></label>
            </div>
          )}
          {geprobeerd && fouten.length > 0 && <p className="ff-alert" role="alert">{fouten.join(". ")}.</p>}
          <p className="ff-small ff-muted">Een afspraak is geen taak: niks af te vinken, geen punten, en het telt niet als werktijd.</p>
          <button type="submit" className="ff-btn ff-btn-primary ff-btn-wide">{item ? "Opslaan" : "Afspraak opslaan"}</button>
          {item && (!weg ? (
            <button type="button" className="ff-link ff-center" onClick={() => setWeg(true)}>Afspraak verwijderen</button>
          ) : (
            <div className="ff-row">
              <span className="ff-small ff-grow">Zeker weten? Alleen deze afspraak gaat weg.</span>
              <button type="button" className="ff-btn ff-btn-ghost ff-btn-s" onClick={() => setWeg(false)}>Nee</button>
              <button type="button" className="ff-btn ff-btn-primary ff-btn-s" onClick={() => { actions.verwijderAfspraak(me.id, item.id); onToast("Afspraak verwijderd"); onClose(); }}>Ja, weg</button>
            </div>
          ))}
        </form>
      ) : (
        <section className="ff-stack-s" aria-label="Dit verandert">
          <h2 className="ff-h2">Dit verandert</h2>
          <ul className="ff-verschil">
            {veranderd.map((v) => <li key={v.veld}><span className="ff-muted">{v.veld}:</span> <s>{v.van}</s> → <b>{v.naar}</b></li>)}
          </ul>
          <p className="ff-small ff-muted">Je andere afspraken blijven zoals ze zijn.</p>
          <div className="ff-row">
            <button className="ff-btn ff-btn-ghost" onClick={() => setCheck(false)}>Terug</button>
            <button className="ff-btn ff-btn-primary ff-grow" onClick={opslaan}>Ja, opslaan</button>
          </div>
        </section>
      )}
    </Sheet>
  );
}

/** Eén afspraak in een lijst. Plaatje alleen als het iets toevoegt. Tik = aanpassen (alleen je eigen). */
export function AfspraakRij({ a, wie, me, onOpen }: { a: AgendaItem; wie: Member; me: Member; onOpen?: () => void }) {
  const beeld = beeldVoor(a);
  const eigen = wie.id === me.id;
  const inhoud = (
    <>
      {beeld ? <AfspraakBeeld soort={beeld} size={72} /> : <span className="ff-afspraak-emoji" aria-hidden="true">{soortVan(a.soort).emoji}</span>}
      <span className="ff-grow ff-stack-xs" style={{ textAlign: "left" }}>
        <b>{a.titel}</b>
        <span className="ff-small ff-muted">{tijdTekst(a)}{a.waar ? ` · ${a.waar}` : ""}{!eigen ? ` · ${wie.name}` : ""}</span>
        {eigen && a.notitie && <span className="ff-small">{a.notitie}</span>}
      </span>
    </>
  );
  return onOpen && eigen ? (
    <button className="ff-afspraak" onClick={onOpen} aria-label={`${a.titel}, ${tijdTekst(a)}. Aanpassen`}>{inhoud}</button>
  ) : (
    <div className="ff-afspraak">{inhoud}</div>
  );
}

/** Afspraken op een dag: van jezelf (aan te passen) en, voor ouders, ook van de rest van het gezin. */
export function AfsprakenOpDag({ state, me, datum, onToast, alleenIk = false, titel = "📅 Afspraken" }: { state: FamilyState; me: Member; datum: string; onToast: (m: string) => void; alleenIk?: boolean; titel?: string }) {
  const [open, setOpen] = useState<{ item?: AgendaItem } | null>(null);
  const leden = state.members.filter((m) => m.joined !== false && (m.id === me.id || (!alleenIk && (me.role === "ouder" || m.role === "ouder"))));
  const rijen = leden.flatMap((m) => (state.agenda?.[m.id] ?? []).filter((a) => a.datum === datum).map((a) => ({ a, m }))).sort((x, y) => x.a.van.localeCompare(y.a.van));
  const vandaag = new Date().toLocaleDateString("sv-SE");
  return (
    <section className="ff-card ff-stack-s" aria-label="Afspraken">
      <b>{titel}</b>
      {rijen.map(({ a, m }) => <AfspraakRij key={a.id} a={a} wie={m} me={me} onOpen={() => setOpen({ item: a })} />)}
      {!rijen.length && <span className="ff-small ff-muted">Geen afspraken.</span>}
      {datum >= vandaag && <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => setOpen({})}>+ Afspraak toevoegen</button>}
      <AfspraakSheet open={!!open} me={me} datum={datum} item={open?.item} onClose={() => setOpen(null)} onToast={onToast} />
    </section>
  );
}
