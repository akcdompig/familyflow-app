"use client";

import { useCallback, useEffect, useState } from "react";
import * as cloud from "@/lib/cloud";
import { addDays, iso, type SomItem } from "@/lib/planner";
import { finishLink, plakLogin, koppelMetWachtwoord, ontkoppel, planSomtoday, somStatus, startLink, syncSomtoday, zoekScholen, type School, type SomStatus } from "@/lib/somtoday";
import { actions, snapshot } from "@/lib/store";
import type { Member } from "@/lib/types";

type Stap = "uit" | "school" | "login" | "link" | "plak";

const tijd = (s: string) => {
  const d = new Date(s);
  const vandaag = d.toDateString() === new Date().toDateString();
  return vandaag ? `vandaag ${d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}` : d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
};

/** Voorbeeldweek zoals Somtoday hem zou aanleveren, voor de demo. */
function voorbeeldWeek(): SomItem[] {
  const t = iso(new Date());
  const r = Math.random().toString(36).slice(2, 6);
  return [
    { sid: `demo-${r}-1`, date: addDays(t, 6), vak: "wiskunde", type: "TOETS", onderwerp: "Toets H3", omschrijving: "Paragraaf 3.1 t/m 3.4", gemaakt: false },
    { sid: `demo-${r}-2`, date: addDays(t, 1), vak: "Engelse taal", type: "HUISWERK", onderwerp: "Unit 2", omschrijving: "Maak opdracht 4 t/m 8", gemaakt: false },
    { sid: `demo-${r}-3`, date: addDays(t, 4), vak: "geschiedenis", type: "HUISWERK", onderwerp: "Hoofdstuk 2", omschrijving: "Leer paragraaf 2.1", gemaakt: false },
    { sid: `demo-${r}-4`, date: addDays(t, 3), vak: "nederlands", type: "HUISWERK", onderwerp: "Woordenlijst", omschrijving: "Leer de woordjes van les 5", gemaakt: false },
    { sid: `demo-${r}-5`, date: addDays(t, 12), vak: "biologie", type: "GROTE_TOETS", onderwerp: "Proefwerk H4", omschrijving: "Cellen en organen", gemaakt: false },
  ];
}

/** Somtoday koppelen voor één kind. Daarna komen toetsen en huiswerk vanzelf in de planning. */
export function SomtodayKaart({ who, me, onToast }: { who: Member; me: Member; onToast: (m: string) => void }) {
  const [status, setStatus] = useState<SomStatus | null>(null);
  const [geladen, setGeladen] = useState(false);
  const [stap, setStap] = useState<Stap>("uit");
  const [q, setQ] = useState("");
  const [scholen, setScholen] = useState<School[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [url, setUrl] = useState("");
  const [terug, setTerug] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const demo = cloud.isDemo();
  const mag = me.role === "ouder" || me.id === who.id;

  const laad = useCallback(async () => {
    if (demo) return setGeladen(true);
    try {
      const list = await somStatus();
      setStatus(list.find((s) => s.member_id === who.id) ?? null);
    } catch {
      setStatus(null);
    }
    setGeladen(true);
  }, [demo, who.id]);
  useEffect(() => {
    setStap("uit");
    setGeladen(false);
    void laad();
  }, [laad]);

  const doe = async (f: () => Promise<void>) => {
    setBezig(true);
    setFout("");
    try {
      await f();
    } catch (e) {
      setFout(String((e as Error).message ?? e));
    } finally {
      setBezig(false);
    }
  };
  const klaar = async () => {
    setStap("uit");
    setPass("");
    setTerug("");
    await laad();
    const m = await syncSomtoday(true);
    onToast(m ?? "Somtoday gekoppeld");
  };

  if (!geladen) return null;
  if (demo) {
    return (
      <section className="ff-card ff-stack-s">
        <b>Somtoday</b>
        <p className="ff-small ff-muted">In de echte app koppel je Somtoday één keer. Daarna komen toetsen en huiswerk vanzelf in de planning. Probeer hier hoe dat eruitziet met een voorbeeldweek.</p>
        <button
          className="ff-btn ff-btn-primary ff-btn-wide"
          onClick={() => {
            const p = planSomtoday(snapshot(), who.id, voorbeeldWeek(), me.id);
            actions.addSomtoday(who.id, p.taken, p.sids);
            onToast(`Uit Somtoday: ${p.toetsen} toetsen en ${p.huiswerk} huiswerk ingepland voor ${who.name}`);
          }}
        >
          Doe alsof Somtoday een week stuurt
        </button>
      </section>
    );
  }

  const gekoppeld = status?.gekoppeld;

  return (
    <section className="ff-card ff-stack-s">
      <div className="ff-row" style={{ justifyContent: "space-between" }}>
        <b>Somtoday</b>
        <span className="ff-small ff-muted">{gekoppeld ? (status?.last_sync ? `opgehaald ${tijd(status.last_sync)}` : "gekoppeld") : "niet gekoppeld"}</span>
      </div>

      {stap === "uit" && gekoppeld && (
        <>
          <p className="ff-small">Nieuwe toetsen en huiswerk komen vanzelf in de planning van {me.id === who.id ? "jou" : who.name}, verdeeld in korte blokjes.</p>
          {status?.last_error && <p className="ff-alert">{status.last_error}</p>}
          <div className="ff-row">
            <button className="ff-btn ff-btn-primary" disabled={bezig} onClick={() => doe(async () => { onToast((await syncSomtoday(true)) ?? "Niks nieuws in Somtoday"); await laad(); })}>
              {bezig ? "Bezig…" : "Nu ophalen"}
            </button>
            {mag && (
              <button className="ff-btn ff-btn-ghost" disabled={bezig} onClick={() => window.confirm("Somtoday ontkoppelen?") && doe(async () => { await ontkoppel(who.id); await laad(); onToast("Somtoday ontkoppeld"); })}>
                Ontkoppelen
              </button>
            )}
          </div>
        </>
      )}

      {stap === "uit" && !gekoppeld && (
        <>
          <p className="ff-small">Koppel Somtoday, dan zet de app toetsen en huiswerk vanzelf in de planning. Toetsen worden verdeeld over de dagen ervoor.</p>
          {mag ? (
            <>
              <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setStap("plak")}>Somtoday koppelen (via laptop)</button>
              <button className="ff-link" onClick={() => setStap("school")}>Andere manier: school zoeken en inloggen</button>
            </>
          ) : <p className="ff-small ff-muted">Vraag je ouder om dit te koppelen.</p>}
        </>
      )}

      {stap === "school" && (
        <>
          <label className="ff-field">
            <span className="ff-eyebrow">Welke school?</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bijvoorbeeld Buitenhout" onKeyDown={(e) => e.key === "Enter" && q.trim().length >= 3 && doe(async () => setScholen(await zoekScholen(q)))} />
          </label>
          <button className="ff-btn ff-btn-ghost" disabled={bezig || q.trim().length < 3} onClick={() => doe(async () => setScholen(await zoekScholen(q)))}>{bezig ? "Zoeken…" : "Zoek"}</button>
          {scholen.map((s) => (
            <button key={s.uuid} className="ff-btn ff-btn-ghost ff-btn-wide" style={{ justifyContent: "flex-start", textAlign: "left" }} onClick={() => { setSchool(s); setStap(s.sso ? "link" : "login"); setUrl(""); }}>
              {s.naam} <span className="ff-small ff-muted">· {s.plaats}</span>
            </button>
          ))}
          {fout && (
            <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => { setFout(""); setSchool({ uuid: "", naam: "", plaats: "", sso: true }); setUrl(""); setStap("link"); }}>
              Kies de school op de Somtoday-site
            </button>
          )}
          <button className="ff-link" onClick={() => setStap("uit")}>Annuleren</button>
        </>
      )}

      {stap === "login" && school && (
        <>
          <p className="ff-small"><b>{school.naam}</b>. Log in met het Somtoday-account van {me.id === who.id ? "jou" : who.name}. Het wachtwoord wordt niet bewaard.</p>
          <label className="ff-field">
            <span className="ff-eyebrow">Gebruikersnaam</span>
            <input value={user} onChange={(e) => setUser(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="username" />
          </label>
          <label className="ff-field">
            <span className="ff-eyebrow">Wachtwoord</span>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
          </label>
          <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={bezig || !user || !pass} onClick={() => doe(async () => { await koppelMetWachtwoord(who.id, school, user, pass); await klaar(); })}>
            {bezig ? "Koppelen…" : "Koppelen"}
          </button>
          <button className="ff-link" onClick={() => setStap("link")}>Logt de school in via Microsoft? Klik hier</button>
        </>
      )}

      {stap === "plak" && (
        <>
          <p className="ff-small">Dit doe je één keer, op een laptop met Chrome.</p>
          <ol className="ff-list ff-small">
            <li>Open <b>leerling.somtoday.nl</b> en log in als {me.id === who.id ? "jezelf" : who.name}.</li>
            <li>Druk op <b>F12</b> › tabblad <b>Application</b> › links <b>Local storage</b> › <b>https://leerling.somtoday.nl</b>.</li>
            <li>Dubbelklik bij de regel <b>CapacitorStorage.</b> met een lange code (bijvoorbeeld CapacitorStorage.39bc1e28-…) op de waarde rechts. Druk op Ctrl+A en Ctrl+C.</li>
            <li>Plak het hieronder en tik op Koppelen. Open deze app daarvoor gewoon op de laptop, of stuur het naar je telefoon.</li>
          </ol>
          <textarea className="ff-text" rows={4} value={terug} onChange={(e) => setTerug(e.target.value)} placeholder='{"nonce":"…","refresh_token":"…", …}' />
          <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={bezig || !terug.includes("refresh_token")} onClick={() => doe(async () => { await plakLogin(who.id, terug); await klaar(); })}>
            {bezig ? "Koppelen…" : "Koppelen"}
          </button>
          <button className="ff-link" onClick={() => { setTerug(""); setStap("uit"); }}>Annuleren</button>
        </>
      )}

      {stap === "link" && school && (
        <>
          <p className="ff-small">{school.naam ? <><b>{school.naam}</b>. </> : "Je kiest de school straks zelf op de Somtoday-site. "}Dit gaat het makkelijkst op een laptop of computer.</p>
          <ol className="ff-list ff-small">
            <li>Open de inloglink en log in met het Somtoday-account van {me.id === who.id ? "jou" : who.name}.</li>
            <li>Daarna probeert de browser een <b>somtoday://</b>-link te openen. Dat lukt niet, dat is goed.</li>
            <li>Kopieer die hele link (Chrome: F12 › Network, of uit de melding) en plak hem hieronder.</li>
          </ol>
          {url ? (
            <a className="ff-btn ff-btn-ghost ff-btn-wide" href={url} target="_blank" rel="noreferrer">Inloglink openen</a>
          ) : (
            <button className="ff-btn ff-btn-ghost ff-btn-wide" disabled={bezig} onClick={() => doe(async () => setUrl((await startLink(who.id, school)).url))}>Maak de inloglink</button>
          )}
          <textarea className="ff-text" rows={3} value={terug} onChange={(e) => setTerug(e.target.value)} placeholder="somtoday://nl.topicus.somtoday.leerling/oauth/callback?code=…" />
          <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={bezig || !url || !terug.includes("code=")} onClick={() => doe(async () => { await finishLink(who.id, terug); await klaar(); })}>
            {bezig ? "Koppelen…" : "Klaar"}
          </button>
          {!school.sso && school.uuid && <button className="ff-link" onClick={() => setStap("login")}>Toch met gebruikersnaam en wachtwoord</button>}
        </>
      )}

      {fout && <p className="ff-alert">{fout}</p>}
    </section>
  );
}
