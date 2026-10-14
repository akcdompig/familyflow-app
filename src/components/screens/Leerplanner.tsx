"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { actions } from "@/lib/store";
import { addDays, dayLabel, herken, iso, plan, SOORT, VAKKEN, type PlanItem, type Soort } from "@/lib/planner";
import { blokNaarTaak } from "@/lib/somtoday";
import { isDone } from "@/lib/tasks";
import { SomtodayKaart } from "@/components/screens/SomtodayKaart";
import type { FamilyState, Member, Task } from "@/lib/types";

type Stage = "week" | "plak" | "check" | "voorstel";
const WEEKDAGEN = [
  { n: 1, l: "ma" }, { n: 2, l: "di" }, { n: 3, l: "wo" }, { n: 4, l: "do" }, { n: 5, l: "vr" }, { n: 6, l: "za" }, { n: 0, l: "zo" },
];
const newItem = (): PlanItem => ({ id: "i" + Math.random().toString(36).slice(2, 8), subject: "", kind: "toets", date: "", note: "" });

/** Leerplanner: van je Somtoday-week naar korte leerblokjes, verspreid over de dagen. */
export function Leerplanner({ state, me, onClose, onToast }: { state: FamilyState; me: Member; onClose: () => void; onToast: (m: string) => void }) {
  const kids = state.members.filter((m) => m.role !== "ouder");
  const [who, setWho] = useState(me.role === "ouder" ? kids[0]?.id ?? me.id : me.id);
  const [stage, setStage] = useState<Stage>("week");
  const [text, setText] = useState("");
  const [items, setItems] = useState<PlanItem[]>([]);
  const [druk, setDruk] = useState<number[]>([]);
  const [max, setMax] = useState(60);
  const today = iso(new Date());
  const whoMember = state.members.find((m) => m.id === who);
  const whoName = whoMember?.name ?? "";

  const studyTasks = state.tasks.filter((t) => t.study && t.assignee === who && t.date && t.date >= today).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const result = useMemo(
    () => plan(items.filter((i) => i.subject && i.date), { today, drukkeDagen: druk, maxPerDag: max, bestaand: studyTasks.map((t) => ({ date: t.date!, min: t.study!.min })) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, druk, max, today],
  );
  const set = (id: string, p: Partial<PlanItem>) => setItems((l) => l.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const save = () => {
    const exists = (b: (typeof result.blokken)[number]) => state.tasks.some((t) => t.study && t.assignee === who && t.study.subject === b.subject && t.study.kind === b.kind && t.study.deadline === b.deadline);
    const list: Omit<Task, "id">[] = result.blokken.filter((b) => !exists(b)).map((b) => blokNaarTaak(b, who, me.id));
    actions.addTasks(list);
    onToast(list.length ? `${list.length} leerblokjes ingepland` : "Dit stond al in de planning");
    setItems([]);
    setText("");
    setStage("week");
  };

  // Groepeer per dag voor het overzicht.
  const perDag = (list: { date: string; min: number; title: string; done?: boolean }[]) => {
    const m = new Map<string, typeof list>();
    for (const x of list) m.set(x.date, [...(m.get(x.date) ?? []), x]);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">Leerplanner{me.role === "ouder" ? ` · ${whoName}` : ""}</div>
          <h1 className="ff-h2">{stage === "week" ? "Mijn leerweek" : stage === "plak" ? "Somtoday-week plakken" : stage === "check" ? "Klopt dit?" : "Zo ga je het doen"}</h1>
        </div>
        <button className="ff-iconbtn" onClick={stage === "week" ? onClose : () => setStage(stage === "voorstel" ? "check" : "week")} aria-label={stage === "week" ? "Sluiten" : "Terug"}>
          <Icon name={stage === "week" ? "sluit" : "terug"} />
        </button>
      </header>

      {me.role === "ouder" && stage === "week" && kids.length > 1 && (
        <div className="ff-chips">{kids.map((k) => <button key={k.id} className="ff-chip" aria-pressed={who === k.id} onClick={() => setWho(k.id)}>{k.name}</button>)}</div>
      )}

      {stage === "week" && (
        <>
          {studyTasks.length ? (
            <section className="ff-stack-s">
              {perDag(studyTasks.map((t) => ({ date: t.date!, min: t.study!.min, title: t.title, done: isDone(state, t.id, t.date) }))).map(([d, list]) => (
                <div key={d} className="ff-card ff-planday">
                  <div className="ff-row" style={{ justifyContent: "space-between" }}>
                    <b>{d === today ? "Vandaag" : d === addDays(today, 1) ? "Morgen" : dayLabel(d)}</b>
                    <span className="ff-small ff-muted">{list.reduce((a, x) => a + x.min, 0)} min</span>
                  </div>
                  {list.map((x, i) => <div key={i} className={`ff-planblok ${x.done ? "is-done" : ""}`}><span>{x.title}</span><span className="ff-small ff-muted">{x.min} min</span></div>)}
                </div>
              ))}
              <p className="ff-small ff-muted">De blokjes van vandaag staan ook bij je taken. Afvinken geeft XP.</p>
            </section>
          ) : (
            <section className="ff-card ff-stack-s">
              <b>Nog niks gepland</b>
              <p className="ff-small">Zet je toetsen en huiswerk erin. De app maakt er korte blokjes van, verspreid over de dagen. Kort en vaak leren werkt beter dan alles op de laatste avond.</p>
            </section>
          )}
          {whoMember && <SomtodayKaart who={whoMember} me={me} onToast={onToast} />}
          <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={() => setStage("plak")}>Somtoday-week plakken</button>
          <button className="ff-btn ff-btn-ghost ff-btn-wide" onClick={() => { setItems([newItem()]); setStage("check"); }}>Zelf een toets of opdracht toevoegen</button>
        </>
      )}

      {stage === "plak" && (
        <section className="ff-stack">
          <div className="ff-card ff-stack-s ff-install">
            <b>Zo doe je het op een iPhone</b>
            <ol className="ff-list ff-small">
              <li>Maak een screenshot van je week in Somtoday.</li>
              <li>Open de screenshot in Foto's en tik rechtsonder op het tekst-icoon (vierkantje met streepjes).</li>
              <li>Tik op <b>Kopieer alles</b>.</li>
              <li>Plak het hieronder.</li>
            </ol>
            <p className="ff-small ff-muted">Android: open de screenshot met Google Lens en kies Tekst › Alles kopiëren.</p>
          </div>
          <textarea className="ff-text" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Bijvoorbeeld:\nVrijdag 23 oktober\nWiskunde\nToets H4 §1 t/m 3"} />
          <button
            className="ff-btn ff-btn-primary ff-btn-wide"
            disabled={!text.trim()}
            onClick={() => {
              const found = herken(text);
              setItems(found.length ? found : [newItem()]);
              if (!found.length) onToast("Ik vond niks. Vul het zelf even in");
              setStage("check");
            }}
          >
            Herkennen
          </button>
        </section>
      )}

      {stage === "check" && (
        <section className="ff-stack">
          <p className="ff-small ff-muted">Controleer alles even. Klopt het vak, wat het is, en de datum?</p>
          {items.map((it) => (
            <div key={it.id} className="ff-card ff-stack-s">
              <div className="ff-row" style={{ justifyContent: "space-between" }}>
                <select className="ff-select" value={it.subject} onChange={(e) => set(it.id, { subject: e.target.value })} aria-label="Vak">
                  <option value="">Kies een vak</option>
                  {[...new Set([...VAKKEN, it.subject].filter(Boolean))].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <button className="ff-task-del" aria-label="Weghalen" onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))}><Icon name="sluit" size={14} /></button>
              </div>
              <div className="ff-chips">
                {(Object.keys(SOORT) as Soort[]).map((k) => <button key={k} className="ff-chip" aria-pressed={it.kind === k} onClick={() => set(it.id, { kind: k })}>{SOORT[k].label}</button>)}
              </div>
              <label className="ff-field">
                <span className="ff-eyebrow">{it.kind === "huiswerk" || it.kind === "inleveren" ? "Inleveren op" : "Wanneer is het?"}</span>
                <input type="date" value={it.date} min={today} onChange={(e) => set(it.id, { date: e.target.value })} />
              </label>
              {it.note && <p className="ff-small ff-muted">{it.note}</p>}
            </div>
          ))}
          <button className="ff-btn ff-btn-ghost" onClick={() => setItems((l) => [...l, newItem()])}>+ Nog iets toevoegen</button>
          <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!items.some((i) => i.subject && i.date)} onClick={() => setStage("voorstel")}>Maak mijn planning</button>
        </section>
      )}

      {stage === "voorstel" && (
        <section className="ff-stack">
          <div className="ff-card ff-stack-s">
            <b>Drukke dagen</b>
            <p className="ff-small ff-muted">Bijvoorbeeld als je training hebt. Dan plant de app daar minder.</p>
            <div className="ff-chips">{WEEKDAGEN.map((d) => <button key={d.n} className="ff-chip" aria-pressed={druk.includes(d.n)} onClick={() => setDruk((l) => (l.includes(d.n) ? l.filter((x) => x !== d.n) : [...l, d.n]))}>{d.l}</button>)}</div>
            <b>Maximaal per dag</b>
            <div className="ff-chips">{[30, 45, 60, 90].map((m) => <button key={m} className="ff-chip" aria-pressed={max === m} onClick={() => setMax(m)}>{m} min</button>)}</div>
          </div>
          {result.telaat.length > 0 && <p className="ff-alert">Te laat om nog te plannen: {result.telaat.join(", ")}. Doe dit vandaag nog.</p>}
          {result.krap.length > 0 && <p className="ff-alert">Krap! {result.krap[0]}.</p>}
          {perDag(result.blokken).map(([d, list]) => (
            <div key={d} className="ff-card ff-planday">
              <div className="ff-row" style={{ justifyContent: "space-between" }}>
                <b>{d === today ? "Vandaag" : d === addDays(today, 1) ? "Morgen" : dayLabel(d)}</b>
                <span className="ff-small ff-muted">{list.reduce((a, x) => a + x.min, 0)} min</span>
              </div>
              {list.map((x, i) => <div key={i} className="ff-planblok"><span>{x.title}</span><span className="ff-small ff-muted">{x.min} min · +{Math.round(x.min / 2)} XP</span></div>)}
            </div>
          ))}
          <p className="ff-small ff-muted">Totaal {result.blokken.reduce((a, b) => a + b.min, 0)} minuten, {result.blokken.length} blokjes, {result.blokken.reduce((a, b) => a + Math.round(b.min / 2), 0)} XP te verdienen.</p>
          <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={!result.blokken.length} onClick={save}>Zet in {me.id === who ? "mijn" : `de`} taken</button>
        </section>
      )}
    </div>
  );
}
