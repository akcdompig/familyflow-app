"use client";

import { Avatar } from "@/components/avatar/Avatar";
import { expressionFor } from "@/lib/mood";
import { PLAN_OPTIONS } from "@/lib/scenarios";
import * as cloud from "@/lib/cloud";
import { actions, isLive, stopLive } from "@/lib/store";
import { levelOf } from "@/lib/tasks";
import { features } from "@/lib/unlock";
import type { CalmPlan, FamilyState, Member } from "@/lib/types";

const EMPTY: CalmPlan = { signals: [], helps: [], needs: [], place: "" };

export function Ik({ state, me, onEditAvatar, onCalm, onToast }: { state: FamilyState; me: Member; onEditAvatar: () => void; onCalm: () => void; onToast: (m: string) => void }) {
  const isParent = me.role === "ouder";
  const xp = state.xp[me.id] ?? 0;
  const level = levelOf(xp);
  const into = xp % 100;
  const plan = state.plans[me.id] ?? EMPTY;
  const kids = state.members.filter((m) => m.role !== "ouder");

  const toggle = (key: "signals" | "helps" | "needs", v: string) => {
    const list = plan[key].includes(v) ? plan[key].filter((x) => x !== v) : [...plan[key], v];
    actions.savePlan(me.id, { ...plan, [key]: list });
  };

  return (
    <div className="ff-screen">
      <section className="ff-me">
        <div className="ff-me-disc">
          <Avatar config={me.avatar} expression={expressionFor(state.checkins[me.id])} energy={me.energy} size={120} seed={2} label={`Jouw avatar, ${me.name}`} />
        </div>
        <div className="ff-me-t">
          <h1 className="ff-h1">{me.name}</h1>
          <span className="ff-muted">{isParent ? "ouder" : `${me.age} jaar`}</span>
          <button className="ff-btn ff-btn-ghost" onClick={onEditAvatar}>Avatar aanpassen</button>
        </div>
      </section>

      {!isParent && (
        <section className="ff-card ff-level-card">
          <div className="ff-row" style={{ justifyContent: "space-between" }}>
            <b className="ff-level-big">Level {level}</b>
            <span className="ff-small">{into} / 100 XP</span>
          </div>
          <span className="ff-bar ff-bar-l"><i style={{ width: `${into}%` }} /></span>
          <p className="ff-small">Nog {100 - into} XP tot level {level + 1}.</p>
        </section>
      )}

      {!isParent && state.rewards.length > 0 && (
        <section className="ff-card ff-stack-s">
          <h2 className="ff-h2">Mijn beloningen</h2>
          <p className="ff-small ff-muted">Afgesproken met je ouders. Haal je een level, dan mag je het inleveren.</p>
          <ul className="ff-rewards">
            {state.rewards.filter((r) => r.title).map((r) => (
              <li key={r.level} className={r.level <= level ? "is-open" : ""}>
                <span className="ff-reward-lvl">Lvl {r.level}</span>
                <span className="ff-grow">{r.title}</span>
                <span className="ff-small">{r.level <= level ? "Behaald!" : `nog ${(r.level - 1) * 100 - xp} XP`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isParent && !features(state).oefenen && (
        <section className="ff-card ff-teaser ff-stack-s">
          <b>Volgende week komt er iets nieuws bij</b>
          <p className="ff-small">Dan kun je oefenen met lastige situaties en zie je wat jouw keuzes doen. Eerst: elke dag inchecken en je taken.</p>
        </section>
      )}

      <button className="ff-angry" onClick={onCalm}>
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 2-8 1 1 2 2 3 2 0-2 0-4 1-6z" fill="currentColor" /></svg>
        <span><b>Ik word boos</b><br /><span className="ff-small">Open je rustplan</span></span>
      </button>

      <section className="ff-card ff-stack">
        <div>
          <h2 className="ff-h2">Mijn rustplan</h2>
          <p className="ff-small ff-muted">{isParent ? "Ook ouders hebben er een. Zo geef je het goede voorbeeld." : "Maak dit samen met een ouder, op een rustig moment."}</p>
        </div>
        <PlanGroup label="1. Zo merk ik dat ik boos word" options={PLAN_OPTIONS.signals} chosen={plan.signals} onToggle={(v) => toggle("signals", v)} />
        <PlanGroup label="2. Dit helpt mij" options={PLAN_OPTIONS.helps} chosen={plan.helps} onToggle={(v) => toggle("helps", v)} />
        <label className="ff-field">
          <span className="ff-eyebrow">3. Mijn rustplek</span>
          <input value={plan.place} onChange={(e) => actions.savePlan(me.id, { ...plan, place: e.target.value })} placeholder="Bijv. mijn kamer met muziek op" maxLength={60} />
        </label>
        <PlanGroup label="4. Dit heb ik nodig van anderen" options={PLAN_OPTIONS.needs} chosen={plan.needs} onToggle={(v) => toggle("needs", v)} />
      </section>

      {isParent && kids.length > 0 && (
        <section className="ff-card ff-stack-s">
          <h2 className="ff-h2">Rustplannen van de kinderen</h2>
          {kids.map((k) => {
            const p = state.plans[k.id];
            return (
              <div key={k.id} className="ff-planrow">
                <b>{k.name}</b>
                {p && (p.helps.length || p.place) ? (
                  <span className="ff-small">Helpt: {p.helps.join(", ").toLowerCase() || "-"}{p.place ? ` · rustplek: ${p.place}` : ""}. Heeft nodig: {p.needs.join(", ").toLowerCase() || "-"}.</span>
                ) : (
                  <span className="ff-small ff-muted">Nog niet ingevuld. Maak het samen.</span>
                )}
              </div>
            );
          })}
        </section>
      )}

      {isParent && (
        <section className="ff-card ff-stack">
          <h2 className="ff-h2">Gezin</h2>
          <div className="ff-row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
            <div><b>Huisdier</b><br /><span className="ff-small ff-muted">Dan komen er huisdiertaken bij in de takenlijst.</span></div>
            <button
              className="ff-switch"
              role="switch"
              aria-checked={state.pet.has}
              aria-label="We hebben een huisdier"
              onClick={() => {
                actions.setPet({ ...state.pet, has: !state.pet.has });
                onToast(state.pet.has ? "Huisdier uitgezet" : "Huisdier aangezet");
              }}
            >
              <span />
            </button>
          </div>
          <div className="ff-row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
            <div><b>Stap voor stap</b><br /><span className="ff-small ff-muted">Week 1: inchecken en taken. Week 2: oefenen. Week 3: gezinsoverleg. Hulp bij ruzie is er altijd.</span></div>
            <button className="ff-switch" role="switch" aria-checked={!!state.startedAt && !state.allesAan} aria-label="Stap voor stap vrijspelen" onClick={() => actions.setAllesAan(!!state.startedAt && !state.allesAan)}><span /></button>
          </div>
          {state.pet.has && (
            <div className="ff-stack-s">
              <div className="ff-chips">
                {["hond", "kat", "konijn", "ander dier"].map((k) => (
                  <button key={k} className="ff-chip" aria-pressed={state.pet.kind === k} onClick={() => actions.setPet({ ...state.pet, kind: k })}>{k}</button>
                ))}
              </div>
              <label className="ff-field">
                <span className="ff-eyebrow">Naam</span>
                <input value={state.pet.name} onChange={(e) => actions.setPet({ ...state.pet, name: e.target.value })} placeholder="Naam van je huisdier" maxLength={30} />
              </label>
            </div>
          )}
        </section>
      )}

      <section className="ff-card ff-stack-s">
        <h2 className="ff-h2">Wie ziet wat?</h2>
        <p className="ff-small"><b>Ouders</b> zien je gezichtje, het onderwerp, of je wilt praten, je taken en je rustplan.</p>
        <p className="ff-small"><b>Broers en zussen</b> zien alleen je gezichtje en je taken.</p>
        <p className="ff-small"><b>Alleen jij</b> ziet je antwoorden bij het oefenen.</p>
        <p className="ff-small"><b>Ruzie oplossen:</b> de ander ziet jouw kant. Je ouders zien alleen dat er een ruzie was en hoe het is opgelost.</p>
        <p className="ff-small"><b>School en coach</b> zien alleen een weekkleur en wat ze zelf klaarzetten. Nooit je stemming of gesprekken.</p>
      </section>

      {isParent && state.pros.length > 0 && (
        <section className="ff-card ff-stack">
          <div>
            <h2 className="ff-h2">Delen met school en zorg</h2>
            <p className="ff-small ff-muted">Jullie bepalen wat er gedeeld wordt. Je kunt het altijd weer uitzetten.</p>
          </div>
          {state.pros.map((p) => (
            <div key={p.id} className="ff-row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
              <div>
                <b>{p.name}</b> <span className="ff-small ff-muted">· {p.org}</span>
                <br />
                <span className="ff-small ff-muted">{p.id === "school" ? "Ziet de weekkleur. Kan taken en berichten klaarzetten." : "Ziet de weekkleur en jullie gezinsdoelen. Kan taken en berichten klaarzetten."}</span>
              </div>
              <button
                className="ff-switch"
                role="switch"
                aria-checked={state.consent[p.id]}
                aria-label={`Delen met ${p.name}`}
                onClick={() => {
                  actions.setConsent(p.id, !state.consent[p.id]);
                  onToast(state.consent[p.id] ? `${p.name} ziet niets meer` : `Gedeeld met ${p.name}`);
                }}
              >
                <span />
              </button>
            </div>
          ))}
        </section>
      )}
      {isLive() && (
        <section className="ff-card ff-stack-s">
          <h2 className="ff-h2">Account</h2>
          <p className="ff-small ff-muted">{cloud.isAnonymous() ? "Je bent aangemeld met een code. Log je uit, dan heb je een nieuwe code van je ouder nodig." : `Ingelogd als ${cloud.userEmail()}`}</p>
          <button
            className="ff-btn ff-btn-ghost"
            onClick={() => {
              if (!window.confirm(cloud.isAnonymous() ? "Echt uitloggen? Je hebt daarna een nieuwe code nodig." : "Uitloggen?")) return;
              cloud.signOut();
              stopLive();
              window.location.reload();
            }}
          >
            Uitloggen
          </button>
        </section>
      )}
    </div>
  );
}

function PlanGroup({ label, options, chosen, onToggle }: { label: string; options: string[]; chosen: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="ff-stack-s">
      <span className="ff-eyebrow">{label}</span>
      <div className="ff-chips">
        {options.map((o) => (
          <button key={o} className="ff-chip" aria-pressed={chosen.includes(o)} onClick={() => onToggle(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}
