"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Icon } from "@/components/ui/Icon";
import { LineChart } from "@/components/ui/LineChart";
import { TaskIcon } from "@/components/ui/TaskIcon";
import { timeLabel } from "@/lib/mood";
import { goalSeries, thermSeries, weekSignal } from "@/lib/signals";
import { actions } from "@/lib/store";
import { isDone } from "@/lib/tasks";
import type { FamilyState, Pro, Task } from "@/lib/types";

/* Verzonnen extra gezinnen, zodat je ziet hoe een caseload eruitziet. Niet te openen. */
const OTHERS = [
  { name: "Familie De Boer", kids: "2 kinderen", level: "groen" as const, note: "Alles rustig" },
  { name: "Familie Yilmaz", kids: "3 kinderen", level: "oranje" as const, note: "Geen gezinsoverleg in 2 weken" },
  { name: "Familie Bakker", kids: "1 kind", level: "geen" as const, note: "Nog geen toestemming" },
];

const GOAL_COLORS = ["#d9442f", "#3cc6a0", "#6c8cff"];
const SCHOOL_IDEAS = ["Wiskunde oefenen, 20 minuten", "Woordjes Engels leren", "Tas inpakken voor morgen", "Planner bijwerken", "Leesboek: 15 minuten lezen"];
const ZORG_IDEAS = ["Geef elk kind vandaag één compliment", "Samen eten zonder telefoons", "10 minuten één-op-één tijd per kind", "Rustplan samen doorlopen", "Een wandeling met z'n allen"];

export function ProApp({ state, pro, onToast }: { state: FamilyState; pro: Pro; onToast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const allowed = state.consent[pro.id];
  const sig = weekSignal(state);
  const school = pro.id === "school";

  if (open && allowed) return <FamilyDetail state={state} pro={pro} onBack={() => setOpen(false)} onToast={onToast} />;

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">{pro.org}</div>
          <h1 className="ff-h1">{school ? "Mijn leerlingen" : "Mijn gezinnen"}</h1>
        </div>
        <span className={`ff-pro-badge ff-pro-${pro.id}`}><Icon name={pro.id} size={22} /></span>
      </header>
      <p className="ff-muted">Hallo {pro.name}. Je ziet alleen wat een gezin met je deelt: een weekkleur, de doelen en wat jij klaarzet. Geen gesprekken, geen stemmingen per dag.</p>

      <ul className="ff-caselist">
        <li>
          <button className="ff-case" onClick={() => (allowed ? setOpen(true) : onToast("Dit gezin deelt (nog) niets met jou"))}>
            <span className={`ff-sig ff-sig-${allowed ? sig.level : "geen"}`} aria-hidden="true" />
            <span className="ff-grow">
              <b>{state.family}</b>
              <br />
              <span className="ff-small ff-muted">
                {allowed ? (school ? state.members.filter((m) => m.role !== "ouder").map((m) => m.name).join(", ") : sig.reasons[0] ?? "Alles rustig deze week") : "Nog geen toestemming"}
              </span>
            </span>
            <span className="ff-chev"><Icon name="terug" size={18} /></span>
          </button>
        </li>
        {OTHERS.map((o) => (
          <li key={o.name}>
            <div className="ff-case is-static">
              <span className={`ff-sig ff-sig-${o.level}`} aria-hidden="true" />
              <span className="ff-grow"><b>{o.name}</b><br /><span className="ff-small ff-muted">{school ? o.kids : o.note}</span></span>
              <span className="ff-small ff-muted">voorbeeld</span>
            </div>
          </li>
        ))}
      </ul>

      <section className="ff-card ff-stack-s">
        <b>Wat betekenen de kleuren?</b>
        <p className="ff-small"><span className="ff-sig ff-sig-groen" /> Groen: het loopt. <span className="ff-sig ff-sig-oranje" /> Oranje: even contact zoeken. <span className="ff-sig ff-sig-geen" /> Grijs: geen toestemming.</p>
        <p className="ff-small ff-muted">Oranje gaat aan bij een patroon, zoals een kind met drie lastige dagen in een week of een ruzie met fysiek contact. Het is een seintje, geen diagnose.</p>
      </section>
    </div>
  );
}

function FamilyDetail({ state, pro, onBack, onToast }: { state: FamilyState; pro: Pro; onBack: () => void; onToast: (m: string) => void }) {
  const school = pro.id === "school";
  const kids = state.members.filter((m) => m.role !== "ouder");
  const parents = state.members.filter((m) => m.role === "ouder");
  const sig = weekSignal(state);
  const mine = state.tasks.filter((t) => t.source === pro.id);
  const sent = state.messages.filter((m) => m.from === pro.id).slice().reverse();
  const targets = school ? kids : [...kids, ...parents];

  const [mode, setMode] = useState<"taak" | "bericht">("taak");
  const [title, setTitle] = useState("");
  const [to, setTo] = useState<string>(kids[0]?.id ?? "");
  const [repeat, setRepeat] = useState<Task["repeat"]>("eenmalig");
  const [msgTo, setMsgTo] = useState<string>(school ? kids[0]?.id ?? "ouders" : "gezin");
  const [text, setText] = useState("");
  const name = (id: string) => (id === "gezin" ? "het hele gezin" : id === "ouders" ? "de ouders" : state.members.find((m) => m.id === id)?.name ?? id);

  const addTask = () => {
    if (!title.trim() || !to) return;
    const kid = kids.some((k) => k.id === to);
    actions.addTask({ title: title.trim(), icon: school ? "boek" : "zon", assignee: to, repeat, date: repeat === "eenmalig" ? new Date().toLocaleDateString("sv-SE") : undefined, xp: kid ? 20 : 0, createdBy: pro.id, source: pro.id });
    onToast(`Taak klaargezet voor ${name(to)}`);
    setTitle("");
  };
  const send = () => {
    if (!text.trim()) return;
    actions.sendMessage(pro.id, msgTo, text.trim());
    onToast(`Bericht gestuurd naar ${name(msgTo)}`);
    setText("");
  };

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <button className="ff-iconbtn" onClick={onBack} aria-label="Terug naar de lijst"><Icon name="terug" /></button>
        <div className="ff-grow">
          <div className="ff-eyebrow">{school ? "Leerling en gezin" : "Gezin"}</div>
          <h1 className="ff-h2">{state.family}</h1>
        </div>
      </header>

      <div className="ff-pro-family">
        {(school ? kids : state.members).map((m) => (
          <div key={m.id} className="ff-pro-member">
            <Avatar config={m.avatar} headOnly size={48} animate={false} label={m.name} />
            <span className="ff-small"><b>{m.name}</b></span>
          </div>
        ))}
      </div>

      <section className={`ff-card ff-signal ff-signal-${sig.level}`}>
        <div className="ff-row"><span className={`ff-sig ff-sig-${sig.level}`} /><b>Deze week: {sig.level}</b></div>
        {sig.reasons.length ? (
          <ul className="ff-small">{sig.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        ) : (
          <p className="ff-small">Geen bijzonderheden. Het gezin draait goed.</p>
        )}
        {sig.level === "oranje" && <p className="ff-small"><b>Tip:</b> {school ? "vraag de leerling na de les even hoe het gaat, of bel de ouders." : "plan een kort belmoment met de ouders in."}</p>}
      </section>

      {!school && (
        <section className="ff-card ff-stack-s">
          <h2 className="ff-h2">Gezinsdoelen</h2>
          <p className="ff-small ff-muted">De cijfers die het gezin zelf geeft in het wekelijkse overleg.</p>
          <LineChart series={goalSeries(state)} colors={GOAL_COLORS} dashed={thermSeries(state)} label="Gezinsdoelen per week" />
          <ul className="ff-legend">
            {state.goals.map((g, i) => g && <li key={i}><i style={{ background: GOAL_COLORS[i] }} />{g}</li>)}
            <li><i className="ff-legend-dash" />Hoe gaat het thuis</li>
          </ul>
        </section>
      )}

      <section className="ff-card ff-stack">
        <div className="ff-seg" role="tablist" aria-label="Wat wil je klaarzetten">
          <button role="tab" aria-selected={mode === "taak"} onClick={() => setMode("taak")}>Taak meegeven</button>
          <button role="tab" aria-selected={mode === "bericht"} onClick={() => setMode("bericht")}>Bericht sturen</button>
        </div>

        {mode === "taak" ? (
          <>
            <div className="ff-chips">
              {(school ? SCHOOL_IDEAS : ZORG_IDEAS).map((s) => <button key={s} className="ff-chip" aria-pressed={title === s} onClick={() => setTitle(s)}>{s}</button>)}
            </div>
            <label className="ff-field">
              <span className="ff-eyebrow">Of typ zelf</span>
              <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder={school ? "Bijv. werkstuk inleiding schrijven" : "Bijv. samen het rustplan maken"} />
            </label>
            <div className="ff-stack-s">
              <span className="ff-eyebrow">Voor wie?</span>
              <div className="ff-chips">{targets.map((m) => <button key={m.id} className="ff-chip" aria-pressed={to === m.id} onClick={() => setTo(m.id)}>{m.name}</button>)}</div>
            </div>
            <div className="ff-chips">
              <button className="ff-chip" aria-pressed={repeat === "eenmalig"} onClick={() => setRepeat("eenmalig")}>Alleen vandaag</button>
              <button className="ff-chip" aria-pressed={repeat === "dagelijks"} onClick={() => setRepeat("dagelijks")}>Elke dag</button>
            </div>
            <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!title.trim() || !to} onClick={addTask}>Klaarzetten in de app</button>
          </>
        ) : (
          <>
            <div className="ff-stack-s">
              <span className="ff-eyebrow">Aan wie?</span>
              <div className="ff-chips">
                <button className="ff-chip" aria-pressed={msgTo === "gezin"} onClick={() => setMsgTo("gezin")}>Hele gezin</button>
                <button className="ff-chip" aria-pressed={msgTo === "ouders"} onClick={() => setMsgTo("ouders")}>Ouders</button>
                {kids.map((k) => <button key={k.id} className="ff-chip" aria-pressed={msgTo === k.id} onClick={() => setMsgTo(k.id)}>{k.name}</button>)}
              </div>
            </div>
            <textarea className="ff-text" rows={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="Kort en positief werkt het best" />
            <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!text.trim()} onClick={send}>Versturen</button>
          </>
        )}
      </section>

      {mine.length > 0 && (
        <section className="ff-card ff-stack-s">
          <h2 className="ff-h2">Wat jij klaarzette</h2>
          {mine.map((t) => (
            <div key={t.id} className="ff-pro-task">
              <TaskIcon name={t.icon} size={20} />
              <span className="ff-grow"><b>{t.title}</b><br /><span className="ff-small ff-muted">{name(t.assignee)} · {t.repeat === "dagelijks" ? "elke dag" : "vandaag"}</span></span>
              <span className={`ff-pill ${isDone(state, t.id) ? "ok" : ""}`}>{isDone(state, t.id) ? "Gedaan" : "Open"}</span>
            </div>
          ))}
        </section>
      )}

      {sent.length > 0 && (
        <section className="ff-card ff-stack-s">
          <h2 className="ff-h2">Berichten</h2>
          {sent.map((m) => (
            <div key={m.id} className="ff-planrow">
              <span className="ff-small"><b>Aan {name(m.to)}</b> · {timeLabel(m.at)} · {m.read ? "gelezen" : "nog niet gelezen"}</span>
              <span>{m.text}</span>
            </div>
          ))}
        </section>
      )}

      <section className="ff-card ff-stack-s">
        <h2 className="ff-h2">Eigen notities</h2>
        <p className="ff-small ff-muted">Alleen jij ziet dit. Het gezin niet.</p>
        <textarea className="ff-text" rows={3} maxLength={600} value={state.proNotes[pro.id]} onChange={(e) => actions.saveProNote(pro.id, e.target.value)} placeholder="Bijv. afspraken uit het laatste gesprek" />
      </section>
    </div>
  );
}
