"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { AvatarMaker } from "@/components/screens/AvatarMaker";
import { CheckInSheet } from "@/components/screens/CheckInSheet";
import { Huiskamer } from "@/components/screens/Huiskamer";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { expressionFor, moodLabel, timeLabel } from "@/lib/mood";
import { actions, useFamily } from "@/lib/store";

type Screen = "huis" | "maker";

const TOPIC_OPENERS: Record<string, string> = {
  School: "Hoe was het vandaag op school? Was er iets lastigs?",
  Thuis: "Ik merk dat er thuis iets dwarszit. Wil je vertellen wat?",
  Vrienden: "Gaat het goed met je vrienden?",
  "Broer of zus": "Ik hoorde dat het niet lekker liep met je broer of zus. Hoe zie jij het?",
  Online: "Is er online iets gebeurd? Je krijgt geen straf, ik wil het gewoon weten.",
  Slaap: "Je slaapt slecht, hè? Wat houdt je wakker?",
};

export function FamilyFlowApp() {
  const state = useFamily();
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<Screen>("huis");
  const [checkIn, setCheckIn] = useState(false);
  const [member, setMember] = useState<string | null>(null);
  const [tips, setTips] = useState<string | null>(null);
  const [who, setWho] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const closeCheckIn = useCallback(() => setCheckIn(false), []);
  const closeMember = useCallback(() => setMember(null), []);
  const closeTips = useCallback(() => setTips(null), []);
  const closeWho = useCallback(() => setWho(false), []);

  if (!mounted) return <div className="ff-app ff-loading" aria-busy="true" />;

  const me = state.members.find((m) => m.id === state.me) ?? state.members[0];
  const parents = state.members.filter((m) => m.role === "ouder");
  const talkTo = me.role === "ouder" ? parents.find((p) => p.id !== me.id)?.name ?? "iemand die je vertrouwt" : parents.map((p) => p.name.toLowerCase()).join(" of ") || "een ouder";
  const sel = member ? state.members.find((m) => m.id === member) : undefined;
  const selCi = sel ? state.checkins[sel.id] : undefined;
  const canSeeDetails = !!sel && (sel.id === me.id || (me.role === "ouder" && sel.role !== "ouder"));
  const tipKid = tips ? state.members.find((m) => m.id === tips) : undefined;
  const tipTopics = tipKid ? state.checkins[tipKid.id]?.topics ?? [] : [];

  const nav: { id: string; label: string; icon: IconName; soon?: boolean }[] = [
    { id: "huis", label: "Huiskamer", icon: "huis" },
    { id: "taken", label: "Taken", icon: "taken", soon: true },
    { id: "voortgang", label: "Voortgang", icon: "voortgang", soon: true },
    { id: "maker", label: "Ik", icon: "ik" },
  ];

  return (
    <div className={`ff-app ${me.role === "ouder" ? "ff-theme-ouder" : "ff-theme-kind"}`}>
      {screen === "huis" && (
        <Huiskamer
          state={state}
          me={me}
          onCheckIn={() => setCheckIn(true)}
          onOpenMember={setMember}
          onTalkTips={setTips}
          onWho={() => setWho(true)}
        />
      )}
      {screen === "maker" && <AvatarMaker key={me.id} member={me} onClose={() => setScreen("huis")} onSaved={setToast} />}

      {screen === "huis" && (
        <nav className="ff-nav" aria-label="Hoofdmenu">
          {nav.map((n) => (
            <button
              key={n.id}
              className="ff-nav-item"
              aria-current={screen === n.id ? "page" : undefined}
              onClick={() => (n.soon ? setToast(`${n.label} komt in het volgende stukje`) : setScreen(n.id as Screen))}
            >
              <Icon name={n.icon} size={26} filled={screen === n.id} />
              <span>{n.label}</span>
              {n.soon && <span className="ff-soon">binnenkort</span>}
            </button>
          ))}
        </nav>
      )}

      <CheckInSheet open={checkIn} onClose={closeCheckIn} me={me} current={state.checkins[me.id]} talkTo={talkTo} onDone={setToast} />

      <Sheet open={!!sel} onClose={closeMember} title={sel ? sel.name : "Gezinslid"}>
        {sel && (
          <div className="ff-member">
            <Avatar config={sel.avatar} expression={expressionFor(selCi)} energy={sel.energy} size={130} seed={5} label={sel.name} />
            <h2 className="ff-h2">{sel.id === me.id ? "Jij" : sel.name}</h2>
            <p className="ff-muted">{selCi ? `${moodLabel(selCi)} · ${timeLabel(selCi.at)}` : "Nog niet ingecheckt"}</p>
            {canSeeDetails && selCi && selCi.topics.length > 0 && (
              <div className="ff-chips ff-center-row">
                {selCi.topics.map((t) => (
                  <span key={t} className="ff-chip ff-chip-static">{t}</span>
                ))}
              </div>
            )}
            {canSeeDetails && selCi?.wantsTalk && sel.id !== me.id && <p className="ff-strong">{sel.name} wil graag met je praten.</p>}
            <div className="ff-energy" aria-label={`Energie ${Math.round(sel.energy * 100)} procent`}>
              <span className="ff-eyebrow">Energie uit quests</span>
              <span className="ff-bar"><i style={{ width: `${Math.round(sel.energy * 100)}%` }} /></span>
            </div>
            {me.role === "ouder" && sel.role !== "ouder" && (
              <button className="ff-btn ff-btn-dark ff-btn-wide" onClick={() => { closeMember(); setTips(sel.id); }}>
                Hoe begin ik het gesprek?
              </button>
            )}
            {sel.id === me.id && (
              <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => { closeMember(); setScreen("maker"); }}>
                Avatar aanpassen
              </button>
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={!!tipKid} onClose={closeTips} title="Hoe begin je het gesprek">
        {tipKid && (
          <div className="ff-stack">
            <h2 className="ff-h2">Praten met {tipKid.name}</h2>
            <div className="ff-script">
              <div className="ff-script-say"><b>Begin zo:</b> {tipTopics.map((t) => TOPIC_OPENERS[t]).find(Boolean) ?? "Ik zag dat je je niet zo lekker voelt. Wil je vertellen wat er is?"}</div>
              <div><b>Doe:</b> naast elkaar in plaats van tegenover elkaar: in de auto, tijdens het koken, met de hond. Luister, vat samen wat je hoort.</div>
              <div><b>Wil {tipKid.name} niet praten?</b> Zeg: &ldquo;Oké. Ik ben er als je wilt.&rdquo; En kom er later op terug.</div>
              <div className="ff-script-dont"><b>Liever niet:</b> meteen oplossen, preken of doorvragen als een verhoor.</div>
            </div>
            <p className="ff-small ff-muted">Maak je je langer zorgen? Bespreek het met de mentor of het wijkteam.</p>
          </div>
        )}
      </Sheet>

      <Sheet open={who} onClose={closeWho} title="Wissel van gezinslid">
        <div className="ff-stack">
          <h2 className="ff-h2">Wie gebruikt de app?</h2>
          <p className="ff-small ff-muted">In de echte app logt iedereen in op een eigen telefoon. In deze demo wissel je hier.</p>
          <div className="ff-who-list">
            {state.members.map((m) => (
              <button key={m.id} className="ff-who-item" aria-pressed={m.id === me.id} onClick={() => { actions.switchMe(m.id); closeWho(); setScreen("huis"); setToast(null); }}>
                <Avatar config={m.avatar} expression={expressionFor(state.checkins[m.id])} headOnly size={44} animate={false} label={m.name} />
                <span><b>{m.name}</b><br /><span className="ff-small ff-muted">{m.role === "ouder" ? "ouder" : `${m.age} jaar`}</span></span>
              </button>
            ))}
          </div>
          <button className="ff-link" onClick={() => { actions.reset(); closeWho(); setToast("Voorbeeldgezin teruggezet"); }}>
            Demo opnieuw beginnen
          </button>
        </div>
      </Sheet>

      {toast && <div className="ff-toast" role="status">{toast.charAt(0).toUpperCase() + toast.slice(1)}</div>}
    </div>
  );
}
