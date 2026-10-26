"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import * as cloud from "@/lib/cloud";
import { inviteText } from "@/lib/newFamily";
import type { FamilyState, Member } from "@/lib/types";

const CODES_KEY = "familyflow:codes";
function readCodes(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(CODES_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeCodes(c: Record<string, string>) {
  try {
    window.localStorage.setItem(CODES_KEY, JSON.stringify(c));
  } catch {
    /* */
  }
}

/** Ouders nodigen de andere gezinsleden uit: per persoon een code, te versturen via mail of WhatsApp. */
export function Uitnodigen({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const [codes, setCodes] = useState<Record<string, string>>(readCodes);
  const [busy, setBusy] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const others = state.members.filter((m) => m.id !== me.id);
  const url = typeof window !== "undefined" ? window.location.origin + "/" : "";

  const make = async (m: Member) => {
    setBusy(m.id);
    setErr("");
    try {
      const code = await cloud.makeInvite(m.id);
      const next = { ...codes, [m.id]: code };
      setCodes(next);
      writeCodes(next);
      setFresh((f) => [...f, m.id]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const text = (m: Member) => inviteText({ name: m.name, from: me.name, code: codes[m.id], url, family: state.family });
  const copy = async (m: Member) => {
    try {
      await navigator.clipboard.writeText(text(m));
      onToast("Gekopieerd. Plak het in een bericht");
    } catch {
      onToast("Kopiëren lukte niet");
    }
  };

  return (
    <div className="ff-stack">
      {others.map((m) => {
        // Code al gebruikt? Dan niet meer tonen.
        const code = m.joined === false || fresh.includes(m.id) ? codes[m.id] : undefined;
        return (
          <section key={m.id} className="ff-card ff-stack-s ff-invite">
            <div className="ff-row">
              <span className={m.joined === false ? "ff-ghost" : ""}>
                <Avatar config={m.avatar} headOnly size={44} animate={false} label={m.name} />
              </span>
              <div className="ff-grow">
                <b>{m.name}</b>
                <br />
                <span className="ff-small ff-muted">{m.joined === false ? "Doet nog niet mee" : "Doet mee"}</span>
              </div>
              {m.joined !== false && <span className="ff-pill ok">Klaar</span>}
            </div>
            {code ? (
              <>
                <div className="ff-code" aria-label={`Code voor ${m.name}`}>{code}</div>
                <div className="ff-invite-btns">
                  {m.email && (
                    <a className="ff-btn ff-btn-primary" href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent("Doe je mee met StairHop?")}&body=${encodeURIComponent(text(m))}`}>
                      Mailen
                    </a>
                  )}
                  <a className="ff-btn ff-btn-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(text(m))}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                  <button className="ff-btn ff-btn-ghost" onClick={() => copy(m)}>Kopiëren</button>
                </div>
                <button className="ff-link" style={{ justifySelf: "start" }} disabled={busy === m.id} onClick={() => make(m)}>Nieuwe code maken</button>
              </>
            ) : (
              <button className="ff-btn ff-btn-dark" disabled={busy === m.id} onClick={() => make(m)}>
                {busy === m.id ? "Even geduld…" : m.joined === false ? `Uitnodiging voor ${m.name} maken` : "Nieuwe telefoon? Maak een nieuwe code"}
              </button>
            )}
          </section>
        );
      })}
      {err && <p className="ff-alert">{err}</p>}
      <p className="ff-small ff-muted">Een code werkt één keer. Nieuwe telefoon of per ongeluk uitgelogd? Maak dan gewoon een nieuwe code.</p>
    </div>
  );
}
