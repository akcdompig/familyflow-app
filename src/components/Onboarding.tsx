"use client";

import { useState } from "react";
import { Flo } from "@/components/ui/Flo";
import { Icon } from "@/components/ui/Icon";
import * as cloud from "@/lib/cloud";
import { newFamily, type NewMember } from "@/lib/newFamily";
import type { FamilyState, Role } from "@/lib/types";

/* ---------- Welkom ---------- */
export function Welkom({ onParent, onCode }: { onParent: (mode: "nieuw" | "inloggen") => void; onCode: () => void }) {
  return (
    <div className="ff-screen ff-onb">
      <div className="ff-onb-hero">
        <Flo size={96} />
        <h1 className="ff-h1">Welkom bij FamilyFlow</h1>
        <p className="ff-muted">Minder gedoe thuis. Eerlijk verdeelde klussen, een rustige dag voor de kinderen, en samen huisregels maken die echt werken.</p>
      </div>
      <ul className="ff-onb-punten">
        <li>🧹 Wie doet wat, eerlijk verdeeld naar ieders rooster</li>
        <li>✅ Kinderen zien meteen wat er nu moet, zonder te zoeken</li>
        <li>🤝 Bij ruzie: rust, praten, een huisregel, en na een week kijken of hij helpt</li>
      </ul>
      <button className="ff-onb-choice" onClick={onCode}>
        <span className="ff-onb-ic"><Icon name="ik" size={26} /></span>
        <span className="ff-grow"><b>Ik heb een code</b><br /><span className="ff-small ff-muted">Je hebt een uitnodiging gekregen</span></span>
      </button>
      <button className="ff-onb-choice" onClick={() => onParent("nieuw")}>
        <span className="ff-onb-ic ff-onb-ic-2"><Icon name="gezin" size={26} /></span>
        <span className="ff-grow"><b>Nieuw gezin starten</b><br /><span className="ff-small ff-muted">Voor ouders</span></span>
      </button>
      <a className="ff-onb-choice" href="#demo" onClick={() => window.setTimeout(() => window.location.reload(), 10)}>
        <span className="ff-onb-ic ff-onb-ic-3"><Icon name="oefenen" size={26} /></span>
        <span className="ff-grow"><b>Eerst rondkijken</b><br /><span className="ff-small ff-muted">Probeer de app met een voorbeeldgezin, zonder account</span></span>
      </a>
      <button className="ff-link" onClick={() => onParent("inloggen")}>Ik ben ouder en heb al een account</button>
    </div>
  );
}

/* ---------- Ouder: account ---------- */
export function OuderAccount({ mode: start, onDone, onBack }: { mode: "nieuw" | "inloggen"; onDone: () => void; onBack: () => void }) {
  const [mode, setMode] = useState(start);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      if (mode === "nieuw") await cloud.signUp(email, pw);
      else await cloud.signIn(email, pw);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ff-screen ff-onb">
      <header className="ff-top">
        <button className="ff-iconbtn" onClick={onBack} aria-label="Terug"><Icon name="terug" /></button>
        <h1 className="ff-h2 ff-grow">{mode === "nieuw" ? "Account voor ouders" : "Inloggen"}</h1>
      </header>
      <form className="ff-card ff-stack" onSubmit={(e) => { e.preventDefault(); void go(); }}>
        <label className="ff-field">
          <span className="ff-eyebrow">E-mailadres</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="ff-field">
          <span className="ff-eyebrow">Wachtwoord {mode === "nieuw" && "(minstens 6 tekens)"}</span>
          <input type="password" autoComplete={mode === "nieuw" ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required />
        </label>
        {err && <p className="ff-alert">{err}</p>}
        <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={busy || !email || pw.length < 6}>{busy ? "Even geduld…" : mode === "nieuw" ? "Account maken" : "Inloggen"}</button>
      </form>
      <button className="ff-link" onClick={() => setMode(mode === "nieuw" ? "inloggen" : "nieuw")}>
        {mode === "nieuw" ? "Ik heb al een account" : "Nog geen account? Maak er een"}
      </button>
      <p className="ff-small ff-muted ff-center">Kinderen hebben geen account nodig. Zij doen mee met een code van jou.</p>
    </div>
  );
}

/* ---------- Ouder: gezin aanmaken ---------- */
const ROLES: { id: Role; label: string }[] = [
  { id: "ouder", label: "Ouder" },
  { id: "kind", label: "Kind" },
  { id: "tiener", label: "Tiener (15+)" },
];

export function GezinMaken({ onCreated }: { onCreated: (state: FamilyState, rev: number, me: string) => void }) {
  const [family, setFamily] = useState("");
  const [people, setPeople] = useState<NewMember[]>([
    { name: "", role: "ouder" },
    { name: "", role: "ouder", email: "" },
    { name: "", role: "kind", age: undefined, bedtime: "21:30", email: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (i: number, p: Partial<NewMember>) => setPeople((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const valid = people.filter((p) => p.name.trim());
  const ok = family.trim() && people[0].name.trim() && valid.length >= 2;

  const create = async () => {
    setBusy(true);
    setErr("");
    try {
      const state = newFamily(family, valid);
      state.members[0].joined = false; // eerst je eigen avatar maken
      await cloud.createFamily(state, state.members[0].id);
      const loaded = await cloud.loadFamily();
      onCreated(loaded?.state ?? state, loaded?.rev ?? 0, state.members[0].id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ff-screen ff-onb">
      <header>
        <div className="ff-eyebrow">Stap 1 van 3</div>
        <h1 className="ff-h1">Wie zitten er in jullie gezin?</h1>
      </header>
      <label className="ff-field ff-card">
        <span className="ff-eyebrow">Naam van het gezin</span>
        <input value={family} onChange={(e) => setFamily(e.target.value)} placeholder="Bijv. Familie Jansen" maxLength={40} />
      </label>

      {people.map((p, i) => (
        <section key={i} className="ff-card ff-stack-s">
          <div className="ff-row" style={{ justifyContent: "space-between" }}>
            <b>{i === 0 ? "Jij" : `Gezinslid ${i + 1}`}</b>
            {i > 0 && <button className="ff-link ff-small" onClick={() => setPeople((l) => l.filter((_, j) => j !== i))}>Weghalen</button>}
          </div>
          <label className="ff-field">
            <span className="ff-eyebrow">Naam in de app</span>
            <input value={p.name} onChange={(e) => set(i, { name: e.target.value })} placeholder={i === 0 ? "Bijv. Papa of je voornaam" : "Bijv. Mama, Kian"} maxLength={20} />
          </label>
          {i > 0 && (
            <div className="ff-chips">
              {ROLES.map((r) => (
                <button key={r.id} className="ff-chip" aria-pressed={p.role === r.id} onClick={() => set(i, { role: r.id, bedtime: r.id === "ouder" ? undefined : !p.bedtime || p.bedtime === "21:30" || p.bedtime === "22:30" ? (r.id === "tiener" ? "22:30" : "21:30") : p.bedtime })}>{r.label}</button>
              ))}
            </div>
          )}
          {p.role !== "ouder" && (
            <div className="ff-two">
              <label className="ff-field">
                <span className="ff-eyebrow">Leeftijd</span>
                <input type="number" inputMode="numeric" min={4} max={25} value={p.age ?? ""} onChange={(e) => set(i, { age: e.target.value ? Number(e.target.value) : undefined })} />
              </label>
              <label className="ff-field">
                <span className="ff-eyebrow">Bedtijd</span>
                <input type="time" value={p.bedtime ?? "21:30"} onChange={(e) => set(i, { bedtime: e.target.value })} />
              </label>
            </div>
          )}
          {i > 0 && (
            <label className="ff-field">
              <span className="ff-eyebrow">E-mail voor de uitnodiging (mag leeg)</span>
              <input type="email" value={p.email ?? ""} onChange={(e) => set(i, { email: e.target.value })} />
            </label>
          )}
          {p.role !== "ouder" && <p className="ff-small ff-muted">Telefoon aan de lader: een uur voor bedtijd. Dat zet de app als vaste taak klaar.</p>}
        </section>
      ))}
      <button className="ff-btn ff-btn-ghost" onClick={() => setPeople((l) => [...l, { name: "", role: "kind", bedtime: "21:30", email: "" }])} disabled={people.length >= 8}>+ Gezinslid</button>

      {err && <p className="ff-alert">{err}</p>}
      <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!ok || busy} onClick={create}>{busy ? "Even geduld…" : "Gezin aanmaken"}</button>
    </div>
  );
}

/* ---------- Code invullen ---------- */
export function CodeInvullen({ onJoined, onBack }: { onJoined: (state: FamilyState, rev: number, me: string) => void; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const standalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone);
  const ios = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      await cloud.signInWithCode();
      const who = await cloud.joinFamily(code);
      const fam = await cloud.loadFamily();
      if (!fam) throw new Error("Gezin niet gevonden");
      onJoined(fam.state, fam.rev, who.member_id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ff-screen ff-onb">
      <header className="ff-top">
        <button className="ff-iconbtn" onClick={onBack} aria-label="Terug"><Icon name="terug" /></button>
        <h1 className="ff-h2 ff-grow">Vul je code in</h1>
      </header>
      {ios && !standalone && (
        <div className="ff-card ff-stack-s ff-install">
          <b>Zet de app eerst op je beginscherm</b>
          <p className="ff-small">Tik onderin op <b>Deel</b> (het vierkantje met de pijl) en kies <b>Zet op beginscherm</b>. Open daarna FamilyFlow vanaf je beginscherm en vul daar je code in.</p>
        </div>
      )}
      <form className="ff-card ff-stack" onSubmit={(e) => { e.preventDefault(); void go(); }}>
        <input
          className="ff-code-input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
          placeholder="ABCD2345"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          aria-label="Code van 8 tekens"
        />
        {err && <p className="ff-alert">{err}</p>}
        <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={(code.length !== 6 && code.length !== 8) || busy}>{busy ? "Even geduld…" : "Meedoen"}</button>
      </form>
      <p className="ff-small ff-muted ff-center">De code staat in de uitnodiging van je ouder.</p>
    </div>
  );
}
