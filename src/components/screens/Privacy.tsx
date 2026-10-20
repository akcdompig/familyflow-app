"use client";

import { useEffect, useState } from "react";
import * as cloud from "@/lib/cloud";
import { isLive, snapshot, stopLive } from "@/lib/store";
import type { FamilyState, Member } from "@/lib/types";

/**
  Privacy en gegevens (AVG): wat bewaren we, wie ziet wat, gegevens downloaden,
  een vorige versie terugzetten (ouders) en het hele gezin verwijderen (ouders).
*/
export function Privacy({ state, me, onToast, onTerug }: { state: FamilyState; me: Member; onToast: (m: string) => void; onTerug: () => void }) {
  const ouder = me.role === "ouder";
  const live = isLive();
  const [versies, setVersies] = useState<{ id: number; rev: number; saved_at: string; saved_by_member: string | null }[] | null>(null);
  const [bevestig, setBevestig] = useState("");
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    if (live && ouder) cloud.familyHistory().then(setVersies).catch(() => setVersies([]));
  }, [live, ouder]);

  const download = () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `thuisclub-${me.name.toLowerCase()}-${new Date().toLocaleDateString("sv-SE")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    onToast("Je gegevens worden gedownload");
  };
  const naam = (id: string | null) => state.members.find((m) => m.id === id)?.name ?? "onbekend";

  return (
    <div className="ff-screen">
      <button className="v2-terug" onClick={onTerug}>‹ Terug</button>
      <h1 className="ff-h1">Privacy en gegevens</h1>

      <section className="ff-card ff-stack-s">
        <b>Wat bewaren we?</b>
        <ul className="ff-recept-lijst">
          <li>Wat jullie zelf invullen: taken, check-ins, klussen, eten, werk- en schooltijden, het potje.</li>
          <li>Alleen het gezin kan erbij. De gegevens staan in een database in de EU (Frankfurt).</li>
          <li>Geen reclame, geen verkoop van gegevens, geen volgen buiten de app.</li>
          <li>Somtoday: alleen toetsen, huiswerk, vakanties en lestijden. Het wachtwoord bewaren we niet.</li>
          <li>Bij een fout in de app bewaren we 30 dagen de foutmelding (zonder persoonlijke inhoud).</li>
        </ul>
      </section>

      <section className="ff-card ff-stack-s">
        <b>Wie ziet wat?</b>
        <ul className="ff-recept-lijst">
          <li><b>Kinderen</b> zien hun eigen check-ins, ruzies, rustplan en berichten. Van broers en zussen alleen het gezichtje in de huiskamer.</li>
          <li><b>Ouders</b> zien alles van de kinderen, zodat ze kunnen helpen.</li>
          <li><b>School of zorg</b> ziet alleen iets als ouders daar toestemming voor geven.</li>
        </ul>
        <p className="ff-small ff-muted">Dit wordt afgedwongen in de database, niet alleen in de app.</p>
      </section>

      <section className="ff-card ff-stack-s">
        <b>Jouw gegevens</b>
        <p className="ff-small ff-muted">Download alles wat jij in de app kunt zien, als bestand.</p>
        <button className="ff-btn ff-btn-dark ff-btn-wide" onClick={download}>Mijn gegevens downloaden</button>
      </section>

      {ouder && live && (
        <section className="ff-card ff-stack-s">
          <b>Vorige versie terugzetten</b>
          <p className="ff-small ff-muted">Iets per ongeluk gewist of veranderd? Elke opslag wordt bewaard (de laatste 300).</p>
          {!versies ? <p className="ff-small ff-muted">Laden…</p> : !versies.length ? <p className="ff-small ff-muted">Nog geen eerdere versies.</p> : (
            <div className="ff-stack-s">
              {versies.slice(0, 8).map((v) => (
                <div key={v.id} className="ff-row ff-log-rij">
                  <span className="ff-grow ff-small">{new Date(v.saved_at).toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · door {naam(v.saved_by_member)}</span>
                  <button className="ff-link ff-small" disabled={bezig} onClick={async () => {
                    setBezig(true);
                    try {
                      await cloud.restoreFamily(v.id);
                      onToast("Teruggezet. De app laadt zo de oude versie");
                    } catch (e) {
                      onToast((e as Error).message);
                    } finally {
                      setBezig(false);
                    }
                  }}>Terugzetten</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {ouder && live && (
        <section className="ff-card ff-stack-s ff-gevaar">
          <b>Gezin verwijderen</b>
          <p className="ff-small">Dit wist alles van het hele gezin: alle gezinsleden, de geschiedenis, Somtoday-koppelingen en herinneringen. Dit kan niet ongedaan worden gemaakt.</p>
          <label className="ff-small" htmlFor="ff-wis">Typ <b>{state.family}</b> om te bevestigen</label>
          <input id="ff-wis" className="ff-input" value={bevestig} onChange={(e) => setBevestig(e.target.value)} autoComplete="off" />
          <button className="ff-btn ff-btn-wide ff-btn-gevaar" disabled={bevestig.trim() !== state.family || bezig} onClick={async () => {
            setBezig(true);
            try {
              await cloud.deleteFamily();
              stopLive();
              cloud.signOut();
              location.reload();
            } catch (e) {
              onToast((e as Error).message);
              setBezig(false);
            }
          }}>Alles verwijderen</button>
        </section>
      )}
      {!live && <p className="ff-small ff-muted">Dit is de demo. In de echte app kun je hier ook een vorige versie terugzetten en het gezin verwijderen.</p>}
    </div>
  );
}
