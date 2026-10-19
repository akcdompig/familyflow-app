"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { actions } from "@/lib/store";
import { AI_OPDRACHT, keuzes, leesToets, vaakFout, zelfde } from "@/lib/toets";
import type { FamilyState, Member, OefenToets, ToetsPoging, ToetsVraag } from "@/lib/types";

/*
  Oefentoetsen in de Leerplanner.
  - Ouder: "Oefentoets plakken". Opdracht kopiëren → in je eigen AI met de foto's → resultaat plakken → vragen nakijken → opslaan.
  - Kind: oefenen, één vraag tegelijk. Fout? Die komt aan het eind nog een keer. Uitslag zonder cijfer: wat moet je nog oefenen.
  - Ouder (3.13): "Resultaten". Elke keer oefenen met per vraag goed/fout, het goede antwoord en wat het kind antwoordde.
    Een ouder oefent niet "namens" het kind: bekijken telt niet als poging.
*/

export function Toetsen({ state, me, kind, onToast }: { state: FamilyState; me: Member; kind: Member; onToast: (m: string) => void }) {
  const [plak, setPlak] = useState(false);
  const [oefen, setOefen] = useState<OefenToets | null>(null);
  const [bekijk, setBekijk] = useState<string | null>(null);
  const lijst = state.oefentoetsen?.[kind.id] ?? [];
  const isOuder = me.role === "ouder";
  const open = lijst.find((t) => t.id === bekijk);
  if (oefen) return <ToetsOefenen toets={oefen} kind={kind} onKlaar={() => setOefen(null)} onToast={onToast} />;
  if (open) return <ToetsResultaat toets={open} kind={kind} onTerug={() => setBekijk(null)} />;
  return (
    <section className="ff-card ff-stack-s" aria-label="Oefentoetsen">
      <b>📝 Oefentoetsen{isOuder ? ` van ${kind.name}` : ""}</b>
      {!lijst.length && <span className="ff-small ff-muted">{isOuder ? "Maak een toets met je eigen AI van foto's van de echte bladzijden, en plak hem hier." : "Nog geen oefentoets. Vraag papa of mama er een te maken van je hoofdstuk."}</span>}
      {lijst.map((t) => {
        const laatst = t.pogingen?.at(-1);
        const keer = t.pogingen?.length ?? 0;
        return (
          <div key={t.id} className="v2-toets-rij">
            <span className="ff-grow ff-stack-xs">
              <b>{t.titel}</b>
              <span className="ff-small ff-muted">{t.vragen.length} vragen{laatst ? ` · ${keer}× geoefend · laatst ${laatst.goed} van ${laatst.totaal} goed` : " · nog niet geoefend"}</span>
            </span>
            {me.id === kind.id && <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => setOefen(t)}>Oefenen</button>}
            {isOuder && me.id !== kind.id && <button className="ff-btn ff-btn-primary ff-btn-s" aria-label={`Resultaten van ${t.titel}`} onClick={() => setBekijk(t.id)}>Resultaten</button>}
            {isOuder && <button className="ff-btn ff-btn-ghost ff-btn-s" aria-label={`${t.titel} verwijderen`} onClick={() => { actions.verwijderToets(kind.id, t.id); onToast("Toets verwijderd"); }}>✕</button>}
          </div>
        );
      })}
      {isOuder && <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => setPlak(true)}>+ Oefentoets plakken</button>}
      <ToetsPlakken open={plak} kind={kind} me={me} onClose={() => setPlak(false)} onToast={onToast} />
    </section>
  );
}

function ToetsPlakken({ open, kind, me, onClose, onToast }: { open: boolean; kind: Member; me: Member; onClose: () => void; onToast: (m: string) => void }) {
  const [titel, setTitel] = useState("");
  const [tekst, setTekst] = useState("");
  const [gekopieerd, setGekopieerd] = useState(false);
  const [vragen, setVragen] = useState<ToetsVraag[] | null>(null);
  const gelezen = useMemo(() => leesToets(tekst), [tekst]);
  const reset = () => { setTitel(""); setTekst(""); setVragen(null); setGekopieerd(false); };
  const kopieer = async () => {
    try {
      await navigator.clipboard.writeText(AI_OPDRACHT);
      setGekopieerd(true);
    } catch {
      setGekopieerd(false);
      onToast("Kopiëren lukte niet. Selecteer de tekst en kopieer hem zelf.");
    }
  };
  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} title="Oefentoets plakken">
      {!vragen ? (
        <div className="ff-stack-s">
          <h2 className="ff-h2">Oefentoets voor {kind.name}</h2>
          <ol className="v2-toets-stappen">
            <li>Maak foto's van de bladzijden die geleerd moeten worden.</li>
            <li>Open je eigen AI (ChatGPT of Claude), voeg de foto's toe en plak deze opdracht erbij:</li>
          </ol>
          <pre className="v2-toets-opdracht">{AI_OPDRACHT}</pre>
          <button className="ff-btn ff-btn-ghost ff-btn-s" onClick={kopieer}>{gekopieerd ? "Gekopieerd ✓" : "Opdracht kopiëren"}</button>
          <ol className="v2-toets-stappen" start={3}><li>Plak hier wat de AI terugschrijft.</li></ol>
          <label className="ff-field"><span className="ff-eyebrow">Naam van de toets <span className="ff-nodig">(nodig)</span></span><input value={titel} onChange={(e) => setTitel(e.target.value)} maxLength={60} placeholder="Bijv. Duits H4 woordjes" /></label>
          <label className="ff-field"><span className="ff-eyebrow">De vragen <span className="ff-nodig">(nodig)</span></span><textarea value={tekst} onChange={(e) => setTekst(e.target.value)} rows={7} placeholder={"V: Wat betekent 'der Hund'?\nA: de hond\nO: de kat | het huis | de boom"} /></label>
          {tekst.trim() && <span className="ff-small">{gelezen.vragen.length} vragen gevonden{gelezen.fouten ? ` · ${gelezen.fouten} stukje(s) niet begrepen (zonder V: of A:)` : ""}</span>}
          <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!titel.trim() || !gelezen.vragen.length} onClick={() => setVragen(gelezen.vragen)}>Vragen nakijken</button>
        </div>
      ) : (
        <div className="ff-stack-s">
          <h2 className="ff-h2">Klopt dit?</h2>
          <p className="ff-small ff-muted">Ook een AI maakt soms een fout. Haal weg wat niet klopt. Alleen wat je opslaat, krijgt {kind.name} te zien.</p>
          <ol className="v2-toets-check">
            {vragen.map((v, i) => (
              <li key={i}>
                <span className="ff-grow ff-stack-xs"><b>{v.v}</b><span className="ff-small">✓ {v.a}{v.opties?.length ? <span className="ff-muted"> · ook: {v.opties.join(", ")}</span> : null}</span></span>
                <button className="ff-btn ff-btn-ghost ff-btn-s" aria-label={`Vraag ${i + 1} weghalen`} onClick={() => setVragen(vragen.filter((_, j) => j !== i))}>✕</button>
              </li>
            ))}
          </ol>
          <div className="ff-row">
            <button className="ff-btn ff-btn-ghost" onClick={() => setVragen(null)}>Terug</button>
            <button className="ff-btn ff-btn-primary ff-grow" disabled={!vragen.length} onClick={() => { actions.bewaarToets(kind.id, { titel: titel.trim(), vragen, door: me.id }); onToast(`Oefentoets klaar voor ${kind.name} 📝`); reset(); onClose(); }}>Klopt, opslaan</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/** Oefenen: één vraag tegelijk. Fout = aan het eind nog een keer. Uitslag zonder cijfer. */
export function ToetsOefenen({ toets, kind, onKlaar, onToast }: { toets: OefenToets; kind: Member; onKlaar: () => void; onToast: (m: string) => void }) {
  const [rij, setRij] = useState<number[]>(() => toets.vragen.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [antwoord, setAntwoord] = useState("");
  const [getoond, setGetoond] = useState<null | boolean>(null);
  const [fout, setFout] = useState<number[]>([]);
  const [antwoorden, setAntwoorden] = useState<string[]>(() => toets.vragen.map(() => ""));
  const [zelf, setZelf] = useState<number[]>([]);
  const [herhaald, setHerhaald] = useState(false);
  const i = rij[pos];
  const v = i !== undefined ? toets.vragen[i] : undefined;
  const eersteRonde = pos < toets.vragen.length;

  const beoordeel = (goed: boolean, gegeven: string) => {
    setGetoond(goed);
    if (eersteRonde) {
      if (!goed) setFout((f) => (f.includes(i) ? f : [...f, i]));
      setAntwoorden((a) => a.map((x, j) => (j === i ? gegeven.trim() : x)));
    }
  };
  const volgende = () => {
    let nieuw = rij;
    // Einde van de eerste ronde: wat fout ging komt nog één keer terug.
    if (pos === toets.vragen.length - 1 && !herhaald && fout.length) {
      nieuw = [...rij, ...fout];
      setRij(nieuw);
      setHerhaald(true);
    }
    if (pos + 1 >= nieuw.length) {
      actions.toetsPoging(kind.id, toets.id, toets.vragen.length - fout.length, toets.vragen.length, fout, antwoorden, zelf);
      setPos(nieuw.length);
      return;
    }
    setPos(pos + 1);
    setAntwoord("");
    setGetoond(null);
  };

  if (!v) {
    const nog = fout.map((j) => toets.vragen[j]);
    return (
      <section className="ff-card ff-stack-s" aria-label="Uitslag">
        <b>📝 {toets.titel}</b>
        <span className="v2-toets-uitslag">{toets.vragen.length - fout.length} van {toets.vragen.length} meteen goed</span>
        {nog.length ? (
          <>
            <span className="ff-small">Deze nog eens oefenen:</span>
            <ul className="v2-weekregels">{nog.map((x, j) => <li key={j}><span className="ff-grow">{x.v}</span><b>{x.a}</b></li>)}</ul>
          </>
        ) : <span className="ff-small">Alles in één keer goed. Morgen nog een keer? Dan blijft het hangen.</span>}
        <span className="ff-small ff-muted">Dit is oefenen, geen cijfer. Het zegt welke vragen je wist, niet of je het hele hoofdstuk kent.</span>
        <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => { onToast("Goed geoefend 📝"); onKlaar(); }}>Klaar</button>
      </section>
    );
  }

  const opties = v.opties?.length ? keuzes(v, i) : null;
  return (
    <section className="ff-card ff-stack-s" aria-label="Oefentoets">
      <div className="ff-row"><b className="ff-grow">📝 {toets.titel}</b><span className="ff-small ff-muted">{eersteRonde ? `${pos + 1} van ${toets.vragen.length}` : "nog een keer"}</span></div>
      <p className="ff-lead" style={{ margin: 0 }}>{v.v}</p>
      {opties ? (
        <div className="ff-stack-s">
          {opties.map((o) => (
            <button key={o} className={`ff-choice${getoond !== null && o === v.a ? " is-goed" : ""}`} aria-pressed={antwoord === o} disabled={getoond !== null} onClick={() => { setAntwoord(o); beoordeel(o === v.a, o); }}>{o}</button>
          ))}
        </div>
      ) : getoond === null ? (
        <div className="ff-stack-s">
          <label className="ff-field"><span className="ff-eyebrow">Jouw antwoord</span><input value={antwoord} onChange={(e) => setAntwoord(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && antwoord.trim()) beoordeel(zelfde(antwoord, v.a), antwoord); }} /></label>
          <div className="ff-row">
            <button className="ff-btn ff-btn-primary ff-grow" disabled={!antwoord.trim()} onClick={() => beoordeel(zelfde(antwoord, v.a), antwoord)}>Nakijken</button>
            <button className="ff-btn ff-btn-ghost" onClick={() => beoordeel(false, "")}>Weet ik niet</button>
          </div>
        </div>
      ) : null}
      {getoond !== null && (
        <div className={`v2-toets-feedback${getoond ? " is-goed" : ""}`} role="status">
          <b>{getoond ? "Goed!" : "Nog niet"}</b>
          <span>Antwoord: {v.a}</span>
          {!opties && !getoond && antwoord.trim() && <button className="ff-link ff-small" onClick={() => { setGetoond(true); if (eersteRonde) { setFout((f) => f.filter((x) => x !== i)); setZelf((z) => (z.includes(i) ? z : [...z, i])); } }}>Ik had het eigenlijk goed</button>}
        </div>
      )}
      {getoond !== null && <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={volgende}>Volgende</button>}
      <button className="ff-link ff-small" onClick={onKlaar}>Stoppen</button>
    </section>
  );
}

const datumKort = (iso: string) => new Date(iso).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }) + " " + new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

/** Voor ouders: hoe ging het oefenen? Per keer de score, en per vraag goed/fout met het antwoord van het kind. */
export function ToetsResultaat({ toets, kind, onTerug }: { toets: OefenToets; kind: Member; onTerug: () => void }) {
  const pogingen = [...(toets.pogingen ?? [])].reverse();
  const vaak = vaakFout(toets);
  const eerste = toets.pogingen?.[0];
  const laatst = toets.pogingen?.at(-1);
  return (
    <section className="ff-card ff-stack-s" aria-label={`Resultaten ${toets.titel}`}>
      <button className="v2-terug" onClick={onTerug}>‹ Terug naar de toetsen</button>
      <b>📝 {toets.titel}</b>
      {!pogingen.length ? (
        <>
          <span className="ff-small ff-muted">{kind.name} heeft deze toets nog niet geoefend. Dit zijn de vragen:</span>
          <ol className="v2-toets-res">{toets.vragen.map((v, i) => <li key={i}><span className="ff-grow ff-stack-xs"><b>{v.v}</b><span className="ff-small">Antwoord: {v.a}</span></span></li>)}</ol>
        </>
      ) : (
        <>
          <span className="v2-toets-uitslag">{pogingen.length}× geoefend</span>
          {eerste && laatst && pogingen.length > 1 && <span className="ff-small">Eerste keer {eerste.goed} van {eerste.totaal} goed, laatste keer {laatst.goed} van {laatst.totaal}.{laatst.goed > eerste.goed ? ` ${kind.name} gaat vooruit 👍` : ""}</span>}
          {vaak.length > 0 && (
            <div className="v2-toets-vaak ff-stack-xs" role="group" aria-label="Gaat vaker fout">
              <b>Gaat vaker fout</b>
              <span className="ff-small ff-muted">Goed om samen nog eens door te nemen.</span>
              <ul className="v2-weekregels">{vaak.map(({ i, keer }) => <li key={i}><span className="ff-grow">{toets.vragen[i].v} <span className="ff-muted">({keer}×)</span></span><b>{toets.vragen[i].a}</b></li>)}</ul>
            </div>
          )}
          {pogingen.map((p, k) => <Poging key={p.at} p={p} toets={toets} kind={kind} open={k === 0} />)}
          <span className="ff-small ff-muted">Dit is de eerste ronde: wat fout ging, kreeg {kind.name} daarna nog een keer. Oefenen, geen cijfer.</span>
        </>
      )}
    </section>
  );
}

function Poging({ p, toets, kind, open }: { p: ToetsPoging; toets: OefenToets; kind: Member; open: boolean }) {
  return (
    <details className="v2-meer-details v2-toets-poging" open={open}>
      <summary><b>{datumKort(p.at)}</b> <span className="ff-small">{p.goed} van {p.totaal} goed</span></summary>
      {!p.antwoorden && <span className="ff-small ff-muted">Van deze keer is alleen bewaard wat goed en fout was, niet wat {kind.name} antwoordde.</span>}
      <ol className="v2-toets-res">
        {toets.vragen.map((v, i) => {
          const fout = p.fout.includes(i);
          const gegeven = p.antwoorden?.[i];
          return (
            <li key={i} className={fout ? "is-fout" : "is-goed"}>
              <span aria-hidden="true">{fout ? "❌" : "✅"}</span>
              <span className="ff-grow ff-stack-xs">
                <b>{v.v}</b>
                <span className="ff-small">Goed antwoord: {v.a}</span>
                {fout && gegeven !== undefined && <span className="ff-small v2-toets-zijn">{kind.name}: {gegeven ? gegeven : "wist het niet"}</span>}
                {!fout && p.zelf?.includes(i) && <span className="ff-small ff-muted">{kind.name} rekende dit zelf goed{gegeven ? ` (“${gegeven}”)` : ""}</span>}
              </span>
              <span className="ff-visually-hidden">{fout ? "fout" : "goed"}</span>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
