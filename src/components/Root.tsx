"use client";

import { useEffect, useState } from "react";
import { FamilyFlowApp } from "@/components/FamilyFlowApp";
import { CodeInvullen, GezinMaken, OuderAccount, Welkom } from "@/components/Onboarding";
import { AvatarMaker } from "@/components/screens/AvatarMaker";
import { Uitnodigen } from "@/components/screens/Uitnodigen";
import { Flo } from "@/components/ui/Flo";
import * as cloud from "@/lib/cloud";
import { cachedLive, startLive, useFamily } from "@/lib/store";
import type { FamilyState } from "@/lib/types";

type Phase = "laden" | "welkom" | "ouder" | "gezin" | "code" | "app" | "fout";

/** Startpunt: demo, of de echte app met aanmelden. */
export function Root() {
  const [demo] = useState(() => cloud.isDemo());
  const [phase, setPhase] = useState<Phase>("laden");
  const [parentMode, setParentMode] = useState<"nieuw" | "inloggen">("nieuw");
  const [invites, setInvites] = useState(false);
  const [err, setErr] = useState("");

  const enter = (s: FamilyState, rev: number, me: string) => {
    startLive(s, rev, me);
    setPhase("app");
  };

  const boot = async () => {
    setErr("");
    if (!cloud.hasSession()) return setPhase("welkom");
    const cached = cachedLive();
    if (cached) enter(cached.state, cached.rev, cached.me);
    try {
      const who = await cloud.whoami();
      if (!who) {
        setPhase(cloud.isAnonymous() ? "code" : "gezin");
        return;
      }
      const fam = await cloud.loadFamily();
      if (fam) enter(fam.state, fam.rev, who.member_id);
    } catch (e) {
      const msg = (e as Error).message;
      if (/uitgelogd/i.test(msg)) return setPhase("welkom");
      if (!cached) {
        setErr(msg);
        setPhase("fout");
      }
    }
  };

  useEffect(() => {
    if (!demo) void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  if (demo) return <FamilyFlowApp />;
  if (phase === "app") return <LiveApp invites={invites} onInvitesDone={() => setInvites(false)} />;

  return (
    <div className="ff-app">
      {phase === "laden" && <div className="ff-onb-load"><Flo size={80} /></div>}
      {phase === "fout" && (
        <div className="ff-screen ff-onb">
          <div className="ff-onb-hero"><Flo size={80} /><h1 className="ff-h2">Even geen verbinding</h1><p className="ff-muted">{err}</p></div>
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => void boot()}>Opnieuw proberen</button>
        </div>
      )}
      {phase === "welkom" && <Welkom onParent={(m) => { setParentMode(m); setPhase("ouder"); }} onCode={() => setPhase("code")} />}
      {phase === "ouder" && <OuderAccount mode={parentMode} onBack={() => setPhase("welkom")} onDone={() => void boot()} />}
      {phase === "gezin" && <GezinMaken onCreated={(s, r, me) => { setInvites(true); enter(s, r, me); }} />}
      {phase === "code" && <CodeInvullen onBack={() => { cloud.signOut(); setPhase("welkom"); }} onJoined={enter} />}
    </div>
  );
}

/** Eerst je avatar, dan (na het aanmaken) de uitnodigingen, dan de app. */
function LiveApp({ invites, onInvitesDone }: { invites: boolean; onInvitesDone: () => void }) {
  const state = useFamily();
  const [toast, setToast] = useState<string | null>(null);
  const me = state.members.find((m) => m.id === state.me);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!me) return <div className="ff-app"><div className="ff-onb-load"><Flo size={80} /></div></div>;

  if (me.joined === false) {
    return (
      <div className="ff-app ff-onb-avatar">
        <div className="ff-card ff-onb-hi">
          <b>Welkom {me.name}!</b> Maak eerst je eigen avatar. Zo zie je jezelf straks in de huiskamer.
        </div>
        <AvatarMaker key={me.id} member={me} firstTime onClose={() => undefined} onSaved={setToast} />
      </div>
    );
  }

  if (invites) {
    return (
      <div className="ff-app"><div className="ff-screen ff-onb">
        <header>
          <div className="ff-eyebrow">Stap 3 van 3</div>
          <h1 className="ff-h1">Nodig je gezin uit</h1>
          <p className="ff-muted">Maak per persoon een code en stuur die via mail of WhatsApp. In het bericht staat hoe ze de app installeren.</p>
        </header>
        <Uitnodigen state={state} me={me} onToast={setToast} />
        <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={onInvitesDone}>Naar de huiskamer</button>
        <p className="ff-small ff-muted ff-center">Dit kan later ook, onder Gezin.</p>
        {toast && <div className="ff-toast" role="status">{toast}</div>}
      </div></div>
    );
  }

  return <FamilyFlowApp />;
}
