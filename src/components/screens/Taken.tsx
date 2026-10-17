"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Flo } from "@/components/ui/Flo";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { TaskIcon } from "@/components/ui/TaskIcon";
import { huistaakVoor } from "@/lib/huis";
import { expressionFor } from "@/lib/mood";
import { actions } from "@/lib/store";
import { wachtOpOuder, isDone, tasksFor as alleTaken } from "@/lib/tasks";
import { werkTaken } from "@/lib/huis";
import { CATALOGUS, CATS } from "@/lib/catalog";
import { dayLabel } from "@/lib/planner";
import type { FamilyState, Member, TaakCat, Task } from "@/lib/types";

interface Props {
  state: FamilyState;
  me: Member;
  onToast: (m: string) => void;
  onPlay: (scenarioId: string) => void;
  onPlanner: () => void;
}

/** Taken zonder de oude losse "Werkdag"-taak: werk staat er nu vanzelf in. */
const tasksFor = (s: FamilyState, id: string) => alleTaken(s, id).filter((t) => !(t.cat === "werk" && /^werkdag$/i.test(t.title)));

export function Taken({ state, me, onToast, onPlay, onPlanner }: Props) {
  const isParent = me.role === "ouder";
  const [view, setView] = useState<"mijn" | "iedereen">(isParent ? "iedereen" : "mijn");
  const [adding, setAdding] = useState(false);
  const mine = tasksFor(state, me.id);
  const mijnWerk = werkTaken(state, me.id).filter((w) => w.status !== "vrij");
  const doneCount = mine.filter((t) => isDone(state, t.id)).length + mijnWerk.filter((w) => w.status === "gedaan").length;
  const totaal = mine.length + mijnWerk.length;
  const date = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

  const toggle = (t: Task, who: string) => {
    const nowDone = actions.toggleTask(t, who);
    const kid = state.members.find((m) => m.id === who)?.role !== "ouder";
    if (nowDone) onToast(t.study?.ouder && kid ? "Goed bezig! Laat je ouder je nu overhoren" : t.xp ? `Top! +${t.xp} punten` : "Afgevinkt");
  };

  return (
    <div className="ff-screen">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">{date}</div>
          <h1 className="ff-h1">Taken vandaag</h1>
        </div>
        <div className="ff-row" style={{ flexWrap: "nowrap", gap: 8 }}>
          <button className="ff-btn ff-btn-ghost ff-btn-sm" onClick={onPlanner} aria-label="Leerplanner"><Icon name="boek" size={18} /> Leren</button>
          {isParent && (
            <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={() => setAdding(true)}>
              + Taak
            </button>
          )}
        </div>
      </header>

      <div className="ff-seg" role="tablist" aria-label="Welke taken">
        <button role="tab" aria-selected={view === "mijn"} onClick={() => setView("mijn")}>Mijn taken · {doneCount}/{totaal}</button>
        <button role="tab" aria-selected={view === "iedereen"} onClick={() => setView("iedereen")}>Iedereen</button>
      </div>

      {view === "mijn" && (
        <>
          <WerkVandaag state={state} me={me} who={me.id} onToast={onToast} />
          <Quests state={state} memberId={me.id} onToast={onToast} onPlay={onPlay} />
          {!isParent && <Lezen state={state} me={me} onToast={onToast} />}
          {totaal > 0 && doneCount === totaal ? (
            <div className="ff-card ff-done-card">
              <Flo size={56} />
              <div><b>Alles af voor vandaag!</b><p className="ff-small ff-muted">Lekker bezig. Je avatar straalt ervan.</p></div>
            </div>
          ) : null}
          <ul className="ff-tasklist">
            {mine.map((t) => (
              <TaskRow key={t.id} task={t} state={state} who={me.id} canToggle onToggle={() => toggle(t, me.id)} showXp={!isParent} />
            ))}
          </ul>
          {!totaal && <p className="ff-muted ff-center">Je hebt vandaag geen taken.</p>}
        </>
      )}

      {view === "iedereen" &&
        state.members.map((m) => {
          const list = tasksFor(state, m.id);
          const werk = werkTaken(state, m.id).filter((w) => w.status !== "vrij");
          if (!list.length && !werk.length) return null;
          const n = list.filter((t) => isDone(state, t.id)).length + werk.filter((w) => w.status === "gedaan").length;
          return (
            <section key={m.id} className="ff-taskgroup" aria-label={`Taken van ${m.name}`}>
              <div className="ff-taskgroup-head">
                <Avatar config={m.avatar} expression={expressionFor(state.checkins[m.id])} headOnly size={36} animate={false} label={m.name} />
                <b>{m.id === me.id ? "Jij" : m.name}</b>
                <span className="ff-small ff-muted ff-push">{n} van {list.length + werk.length}</span>
              </div>
              <WerkVandaag state={state} me={me} who={m.id} onToast={onToast} compact />
              <Quests state={state} memberId={m.id} onToast={onToast} onPlay={onPlay} compact />
              <ul className="ff-tasklist">
                {list.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    state={state}
                    who={m.id}
                    canToggle={m.id === me.id || isParent}
                    onToggle={() => toggle(t, m.id)}
                    onConfirm={isParent && m.id !== me.id ? () => { actions.confirmTask(t, me.id); onToast(`Bevestigd, ${m.name} krijgt +${t.xp} punten`); } : undefined}
                    showXp={m.role !== "ouder"}
                    onRemove={isParent ? () => { actions.removeTask(t.id); onToast("Taak verwijderd"); } : undefined}
                  />
                ))}
              </ul>
            </section>
          );
        })}

      {state.pet.has === false && isParent && view === "iedereen" && (
        <p className="ff-small ff-muted">Geen huisdier ingesteld. Dat zet je aan bij Ik › Gezin.</p>
      )}

      <AddTaskSheet open={adding} onClose={() => setAdding(false)} state={state} me={me} onAdded={onToast} />
    </div>
  );
}

/**
  Werk, diensten en school van vandaag. Staan er vanzelf in en tellen na de eindtijd als gedaan.
  Vrij genomen of dienst ging niet door? Dan klik je hem weg.
*/
function WerkVandaag({ state, me, who, onToast, compact = false }: { state: FamilyState; me: Member; who: string; onToast: (m: string) => void; compact?: boolean }) {
  const lijst = werkTaken(state, who);
  if (!lijst.length) return null;
  const mag = who === me.id || me.role === "ouder";
  const vandaag = new Date().toLocaleDateString("sv-SE");
  const tijd = (t: string) => t.replace(":", ".");
  return (
    <ul className="ff-tasklist">
      {lijst.map((w) => (
        <li key={w.key} className={`ff-werktaak is-${w.status}`}>
          <span className="ff-werktaak-icoon" aria-hidden="true">{w.status === "gedaan" ? "✓" : w.school ? "🎒" : "💼"}</span>
          <span className="ff-grow">
            <b>{w.naam}</b>
            <span className="ff-small ff-muted ff-block">
              {tijd(w.van)}–{tijd(w.tot)} · {w.status === "vrij" ? (w.dienstId ? "ging niet door" : "vrij genomen") : w.status === "gedaan" ? (w.school ? "school is uit" : "gewerkt, staat erin") : w.status === "bezig" ? (w.school ? "nu op school" : "nu aan het werk") : "staat gepland"}
            </span>
            {w.status === "bezig" && <span className="ff-bezig-balk" style={{ marginTop: 6 }}><i style={{ width: `${Math.round(w.pct * 100)}%` }} /></span>}
          </span>
          {mag && !compact && w.werkId !== "somtoday" && (
            w.dienstId ? (
              <button className="ff-link ff-small" onClick={() => { actions.removeDienst(w.dienstId!); onToast("Dienst weggehaald"); }}>Ging niet door</button>
            ) : (
              <button className="ff-link ff-small" onClick={() => { actions.toggleVrij(vandaag, who, w.werkId); onToast(w.status === "vrij" ? "Staat er weer in" : "Vrij genomen 🌴"); }}>{w.status === "vrij" ? "Toch werken" : "Vrij"}</button>
            )
          )}
        </li>
      ))}
    </ul>
  );
}

const FROM_LABEL: Record<string, string> = { coach: "Van de coach", ouder: "Van je ouder", school: "Van school", zorg: "Van je coach" };

/** Opdrachten voor het echte leven en oefeningen van school of zorg. Open quests, en wat deze week af is. */
export function Quests({ state, memberId, onToast, onPlay, compact = false }: { state: FamilyState; memberId: string; onToast: (m: string) => void; onPlay: (id: string) => void; compact?: boolean }) {
  const week = Date.now() - 7 * 864e5;
  const list = (state.quests ?? []).filter((q) => q.member === memberId && (!q.done || new Date(q.done).getTime() > week));
  if (!list.length) return null;
  const kid = state.members.find((m) => m.id === memberId)?.role !== "ouder";
  return (
    <section className="ff-stack-s" aria-label="Quests">
      {!compact && <span className="ff-eyebrow">Quests</span>}
      <ul className="ff-tasklist">
        {list.map((q) => (
          <li key={q.id} className={`ff-task ff-quest ${q.done ? "is-done" : ""}`}>
            <button
              className="ff-task-check"
              aria-pressed={!!q.done}
              onClick={() => {
                actions.toggleQuest(q.id);
                if (!q.done) onToast("Quest gehaald! +30 punten");
              }}
              aria-label={q.done ? `${q.title}: gehaald. Tik om terug te zetten` : `${q.title}: afvinken`}
            >
              {q.done ? <Icon name="check" size={22} /> : <Icon name="oefenen" size={22} />}
            </button>
            <div className="ff-task-t">
              <b>{q.title}</b>
              <span className="ff-small ff-muted"><span className={`ff-src ff-src-${q.from === "zorg" ? "zorg" : q.from === "school" ? "school" : "coach"}`}>{FROM_LABEL[q.from]}</span>{q.done ? "gehaald" : "deze week"}</span>
              {q.scenario && !q.done && <button className="ff-link ff-small" style={{ justifySelf: "start", minHeight: 32, padding: "4px 0" }} onClick={() => onPlay(q.scenario!)}>Nu oefenen</button>}
            </div>
            {kid && <span className="ff-xp">+30</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TaskRow({ task, state, who, canToggle, onToggle, onConfirm, showXp, onRemove }: { task: Task; state: FamilyState; who: string; canToggle: boolean; onToggle: () => void; onConfirm?: () => void; showXp: boolean; onRemove?: () => void }) {
  const wacht = wachtOpOuder(state, task);
  const bevestigd = !!task.study?.ouder && !!state.checked?.[new Date().toLocaleDateString("sv-SE")]?.[task.id];
  const done = isDone(state, task.id);
  const doer = state.done[new Date().toLocaleDateString("sv-SE")]?.[task.id];
  const sub = task.study
    ? `${task.study.min} min · ${task.study.kind === "huiswerk" || task.study.kind === "inleveren" ? "inleveren" : "toets"} ${dayLabel(task.study.deadline)}`
    : task.assignee === "beurt" ? "om de beurt" : task.repeat === "dagelijks" ? "elke dag" : task.repeat === "wekelijks" ? (task.days ?? []).map((d) => ["zo", "ma", "di", "wo", "do", "vr", "za"][d]).join(", ") : "alleen vandaag";
  const doneBy = done && doer && doer !== who ? ` · gedaan door ${state.members.find((m) => m.id === doer)?.name}` : "";
  return (
    <li className={`ff-task ${done ? "is-done" : ""}`}>
      <button className="ff-task-check" aria-pressed={done} disabled={!canToggle} onClick={onToggle} aria-label={done ? `${task.title}: klaar. Tik om terug te zetten` : `${task.title}: afvinken`}>
        {done ? <Icon name="check" size={22} /> : <TaskIcon name={task.icon} size={22} />}
      </button>
      <div className="ff-task-t">
        <b>{task.title}</b>
        <span className="ff-small ff-muted">
          {task.source && <span className={`ff-src ff-src-${task.source}`}>{task.source === "school" ? "Van school" : "Van coach"}</span>}
          {sub}{doneBy}
          {task.study?.ouder && (wacht ? " · wacht op ouder" : bevestigd ? " · bevestigd door ouder" : " · ouder overhoort")}
        </span>
      </div>
      {wacht && onConfirm && <button className="ff-btn ff-btn-primary ff-btn-sm" onClick={onConfirm}>Bevestig</button>}
      {showXp && task.xp > 0 && <span className="ff-xp">+{task.xp}</span>}
      {onRemove && (
        <button className="ff-task-del" onClick={onRemove} aria-label={`${task.title} verwijderen`}>
          <Icon name="sluit" size={16} />
        </button>
      )}
    </li>
  );
}

export function AddTaskSheet({ open, onClose, state, me, onAdded }: { open: boolean; onClose: () => void; state: FamilyState; me: Member; onAdded: (m: string) => void }) {
  const kids = state.members.filter((m) => m.role !== "ouder");
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState<Task["icon"]>("huis");
  const [xp, setXp] = useState(10);
  const [pet, setPet] = useState(false);
  const [cat, setCat] = useState<TaakCat>("huishouden");
  const [min, setMin] = useState(15);
  const [groep, setGroep] = useState<TaakCat>("huishouden");
  const [assignee, setAssignee] = useState<string>(kids[0]?.id ?? me.id);
  const [repeat, setRepeat] = useState<Task["repeat"]>("dagelijks");
  const [days, setDays] = useState<number[]>([]);

  useEffect(() => {
    if (open) {
      setTitle("");
      setIcon("huis");
      setXp(10);
      setPet(false);
      setCat("huishouden");
      setMin(15);
      setGroep("huishouden");
      setAssignee(kids[0]?.id ?? me.id);
      setRepeat("dagelijks");
      setDays([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const voorOuder = state.members.find((m) => m.id === assignee)?.role === "ouder";
  const dubbel = huistaakVoor(state, title);
  const save = () => {
    if (!title.trim() || (repeat === "wekelijks" && !days.length) || dubbel) return;
    actions.addTask({
      title: title.trim(), icon, xp: voorOuder ? 0 : xp, pet, assignee, repeat, cat, min,
      days: repeat === "wekelijks" ? [...days].sort() : undefined,
      date: repeat === "eenmalig" ? new Date().toLocaleDateString("sv-SE") : undefined,
      createdBy: me.id,
    });
    onAdded(assignee === "beurt" ? "Taak toegevoegd, om de beurt" : `Taak toegevoegd voor ${state.members.find((m) => m.id === assignee)?.name}`);
    onClose();
  };
  const groepen: TaakCat[] = ["huishouden", "kinderen", "school", "sport", "werk", "overig"];
  // Voorbeelden die al een huistaak zijn, laten we weg: anders staat dezelfde klus er twee keer.
  const lijst = CATALOGUS.filter((c) => c.cat === groep && (c.pet ? state.pet.has : true) && !huistaakVoor(state, c.title));

  return (
    <Sheet open={open} onClose={onClose} title="Taak toevoegen">
      <h2 className="ff-h2">Taak toevoegen</h2>
      <div className="ff-chips">
        {groepen.map((g) => <button key={g} className="ff-chip" aria-pressed={groep === g} onClick={() => setGroep(g)}>{CATS[g].label.split(" ")[0]}</button>)}
      </div>
      <div className="ff-chips">
        {lijst.map((c) => (
          <button key={c.title} className="ff-chip" aria-pressed={title === c.title} onClick={() => { setTitle(c.title); setIcon(c.icon); setXp(c.xp); setPet(!!c.pet); setCat(c.cat); setMin(c.min); }}>
            {c.title}
          </button>
        ))}
      </div>
      <label className="ff-field">
        <span className="ff-eyebrow">Of typ zelf</span>
        <input value={title} onChange={(e) => { setTitle(e.target.value); setCat(groep); }} placeholder="Bijv. fiets in de schuur zetten" maxLength={60} />
      </label>
      <div className="ff-stack-s">
        <span className="ff-eyebrow">Hoe lang duurt het ongeveer?</span>
        <div className="ff-chips">
          {[...new Set([5, 15, 30, 45, 60, 120, min])].sort((a, b) => a - b).map((m) => (
            <button key={m} className="ff-chip" aria-pressed={min === m} onClick={() => setMin(m)}>{m >= 60 ? `${Math.round((m / 60) * 10) / 10} uur` : `${m} min`}</button>
          ))}
        </div>
      </div>
      <div className="ff-stack-s">
        <span className="ff-eyebrow">Voor wie?</span>
        <div className="ff-chips">
          {state.members.map((m) => (
            <button key={m.id} className="ff-chip" aria-pressed={assignee === m.id} onClick={() => setAssignee(m.id)}>{m.id === me.id ? "Ik" : m.name}</button>
          ))}
          {kids.length > 1 && (
            <button className="ff-chip" aria-pressed={assignee === "beurt"} onClick={() => setAssignee("beurt")}>Om de beurt</button>
          )}
        </div>
      </div>
      <div className="ff-stack-s">
        <span className="ff-eyebrow">Hoe vaak?</span>
        <div className="ff-chips">
          <button className="ff-chip" aria-pressed={repeat === "dagelijks"} onClick={() => setRepeat("dagelijks")}>Elke dag</button>
          <button className="ff-chip" aria-pressed={repeat === "wekelijks"} onClick={() => setRepeat("wekelijks")}>Vaste dagen</button>
          <button className="ff-chip" aria-pressed={repeat === "eenmalig"} onClick={() => setRepeat("eenmalig")}>Alleen vandaag</button>
        </div>
        {repeat === "wekelijks" && (
          <div className="ff-chips">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button key={d} className="ff-chip" aria-pressed={days.includes(d)} onClick={() => setDays((l) => (l.includes(d) ? l.filter((x) => x !== d) : [...l, d]))}>{["zo", "ma", "di", "wo", "do", "vr", "za"][d]}</button>
            ))}
          </div>
        )}
      </div>
      {dubbel && (
        <p className="ff-alert" role="alert">
          <b>{dubbel.label.split(" (")[0]}</b> is al een huistaak. Die verdeelt de app elke dag eerlijk en staat al bij iedereen op Vandaag. Wil je hem vast bij één persoon? Kies dat bij Gezin › Taken › Taken en afspraken.
        </p>
      )}
      <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={save} disabled={!title.trim() || (repeat === "wekelijks" && !days.length) || !!dubbel}>
        Toevoegen
      </button>
    </Sheet>
  );
}

/** Lezen: minuten loggen, boek uit, weekdoel van 4 dagen. */
function Lezen({ state, me, onToast }: { state: FamilyState; me: Member; onToast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(20);
  const list = state.reading?.[me.id] ?? [];
  const [book, setBook] = useState(list[list.length - 1]?.uit ? "" : list[list.length - 1]?.book ?? "");
  const [uit, setUit] = useState(false);
  const days = ["ma", "di", "wo", "do", "vr", "za", "zo"];
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const readOn = days.map((_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return list.some((r) => new Date(r.at).toDateString() === d.toDateString());
  });
  const today = list.filter((r) => new Date(r.at).toDateString() === new Date().toDateString()).reduce((a, r) => a + r.min, 0);
  const week = list.filter((r) => new Date(r.at) >= monday).reduce((a, r) => a + r.min, 0);
  const count = readOn.filter(Boolean).length;
  const save = () => {
    const xp = actions.logReading(me.id, min, book, uit);
    onToast(uit ? `Boek uit! +${xp} punten` : xp ? `Lekker gelezen! +${xp} punten` : "Gelezen! Max punten voor vandaag is al gehaald");
    setOpen(false);
    setUit(false);
    if (uit) setBook("");
  };
  return (
    <section className="ff-card ff-stack-s ff-lezen">
      <div className="ff-row" style={{ justifyContent: "space-between" }}>
        <b>Lezen</b>
        <span className="ff-small ff-muted">{week} min deze week{today ? ` · vandaag ${today}` : ""}</span>
      </div>
      <div className="ff-weekdots" aria-label={`${count} van 4 leesdagen deze week`}>
        {days.map((d, i) => <span key={d} className={readOn[i] ? "on" : ""}>{d}</span>)}
      </div>
      <p className="ff-small ff-muted">Doel: 4 dagen per week. {count >= 4 ? "Gehaald!" : `Nog ${4 - count} ${4 - count === 1 ? "dag" : "dagen"}.`}</p>
      <button className="ff-btn ff-btn-dark" onClick={() => setOpen(true)}>Ik heb gelezen</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Ik heb gelezen">
        <h2 className="ff-h2">Hoe lang heb je gelezen?</h2>
        <div className="ff-chips">{[10, 15, 20, 30, 45].map((m) => <button key={m} className="ff-chip ff-chip-l" aria-pressed={min === m} onClick={() => setMin(m)}>{m} min</button>)}</div>
        <label className="ff-field">
          <span className="ff-eyebrow">Welk boek?</span>
          <input value={book} onChange={(e) => setBook(e.target.value)} maxLength={60} placeholder="Titel van je boek" />
        </label>
        <button className="ff-chip ff-chip-l" aria-pressed={uit} onClick={() => setUit(!uit)}>📕 Boek uit!</button>
        <p className="ff-small ff-muted">5 punten per 10 minuten, max 20 per dag. Boek uit: 25 punten extra.</p>
        <button className="ff-btn ff-btn-primary ff-btn-wide" onClick={save}>Opslaan</button>
      </Sheet>
    </section>
  );
}
