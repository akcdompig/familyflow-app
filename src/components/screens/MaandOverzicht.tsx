"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { addDays, iso } from "@/lib/planner";
import { isDone } from "@/lib/tasks";
import type { FamilyState } from "@/lib/types";

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const KOP = ["ma", "di", "wo", "do", "vr", "za", "zo"];

interface Deadline {
  subject: string;
  kind: string;
  note?: string;
}

/** Maandkalender per kind: toetsen, inleveren, leerblokjes en vakanties in één oogopslag. */
export function MaandOverzicht({ state, who }: { state: FamilyState; who: string }) {
  const today = iso(new Date());
  const [maand, setMaand] = useState(() => today.slice(0, 7)); // "2026-10"
  const [dag, setDag] = useState<string | null>(today);

  const { deadlines, blokken } = useMemo(() => {
    const deadlines = new Map<string, Deadline[]>();
    const blokken = new Map<string, { title: string; min: number; done: boolean }[]>();
    const gezien = new Set<string>();
    for (const t of state.tasks) {
      if (!t.study || t.assignee !== who) continue;
      const k = `${t.study.subject}|${t.study.kind}|${t.study.deadline}`;
      if (!gezien.has(k)) {
        gezien.add(k);
        deadlines.set(t.study.deadline, [...(deadlines.get(t.study.deadline) ?? []), { subject: t.study.subject, kind: t.study.kind, note: t.study.note }]);
      }
      if (t.date) blokken.set(t.date, [...(blokken.get(t.date) ?? []), { title: t.title, min: t.study.min, done: isDone(state, t.id, t.date) }]);
    }
    return { deadlines, blokken };
  }, [state, who]);

  const vakantie = (d: string) => (state.vakanties?.[who] ?? []).find((v) => d >= v.van && d <= v.tot);

  // Rooster van de maand, beginnend op maandag.
  const eerste = `${maand}-01`;
  const start = addDays(eerste, -((new Date(eerste + "T12:00:00").getDay() + 6) % 7));
  const dagen: string[] = [];
  for (let d = start; dagen.length < 42; d = addDays(d, 1)) dagen.push(d);
  while (dagen.length > 35 && dagen.slice(-7).every((d) => !d.startsWith(maand))) dagen.splice(-7);

  const [j, m] = maand.split("-").map(Number);
  const schuif = (n: number) => {
    const d = new Date(j, m - 1 + n, 1, 12);
    setMaand(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setDag(null);
  };

  const isToets = (k: string) => k === "toets" || k === "so";
  const gekozen = dag ? { deadlines: deadlines.get(dag) ?? [], blokken: blokken.get(dag) ?? [], vak: vakantie(dag) } : null;
  const aantalToetsen = [...deadlines.entries()].filter(([d]) => d.startsWith(maand)).reduce((a, [, l]) => a + l.filter((x) => isToets(x.kind)).length, 0);

  return (
    <section className="ff-stack-s">
      <div className="ff-row" style={{ justifyContent: "space-between" }}>
        <button className="ff-iconbtn" onClick={() => schuif(-1)} aria-label="Vorige maand"><Icon name="terug" /></button>
        <div style={{ textAlign: "center" }}>
          <b style={{ textTransform: "capitalize" }}>{MAANDEN[m - 1]} {j}</b>
          <div className="ff-small ff-muted">{aantalToetsen ? `${aantalToetsen} ${aantalToetsen === 1 ? "toets" : "toetsen"} deze maand` : "Geen toetsen deze maand"}</div>
        </div>
        <button className="ff-iconbtn" onClick={() => schuif(1)} aria-label="Volgende maand" style={{ transform: "scaleX(-1)" }}><Icon name="terug" /></button>
      </div>

      <div className="ff-maand" role="grid" aria-label={`${MAANDEN[m - 1]} ${j}`}>
        {KOP.map((k) => <div key={k} className="ff-maand-kop">{k}</div>)}
        {dagen.map((d) => {
          const dl = deadlines.get(d) ?? [];
          const bl = blokken.get(d) ?? [];
          const vak = vakantie(d);
          const klaar = bl.length > 0 && bl.every((b) => b.done);
          return (
            <button
              key={d}
              className={`ff-maand-dag${d.startsWith(maand) ? "" : " is-buiten"}${vak ? " is-vakantie" : ""}${d === today ? " is-vandaag" : ""}${d === dag ? " is-gekozen" : ""}`}
              onClick={() => setDag(d)}
              aria-label={`${Number(d.slice(8))} ${MAANDEN[Number(d.slice(5, 7)) - 1]}${vak ? `, ${vak.naam}` : ""}${dl.length ? `, ${dl.length} deadline` : ""}`}
            >
              <span className="ff-maand-nr">{Number(d.slice(8))}</span>
              <span className="ff-maand-stip">
                {dl.some((x) => isToets(x.kind)) && <i className="is-toets" />}
                {dl.some((x) => x.kind === "inleveren") && <i className="is-inleveren" />}
                {dl.some((x) => !isToets(x.kind) && x.kind !== "inleveren") && <i className="is-huiswerk" />}
                {bl.length > 0 && <i className={klaar ? "is-klaar" : "is-blok"} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="ff-maand-legenda ff-small ff-muted">
        <span><i className="is-toets" /> toets</span>
        <span><i className="is-inleveren" /> inleveren</span>
        <span><i className="is-huiswerk" /> huiswerk</span>
        <span><i className="is-blok" /> leren</span>
        <span><i className="is-vak" /> vakantie</span>
      </div>

      {gekozen && dag && (
        <div className="ff-card ff-planday">
          <b>{new Date(dag + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</b>
          {gekozen.vak && <p className="ff-small ff-muted">{gekozen.vak.naam}. Geen schooltaken.</p>}
          {gekozen.deadlines.map((x, i) => (
            <div key={"d" + i} className="ff-planblok" style={{ background: isToets(x.kind) ? "var(--ff-koraal-zacht)" : "var(--ff-zon-zacht)" }}>
              <span>{x.subject}: {isToets(x.kind) ? (x.kind === "so" ? "SO" : "toets") : x.kind === "inleveren" ? "inleveren" : x.kind === "leren" ? "leren af" : "huiswerk af"}{x.note ? ` · ${x.note}` : ""}</span>
            </div>
          ))}
          {gekozen.blokken.map((b, i) => (
            <div key={"b" + i} className={`ff-planblok ${b.done ? "is-done" : ""}`}><span>{b.title}</span><span className="ff-small ff-muted">{b.min} min</span></div>
          ))}
          {!gekozen.vak && !gekozen.deadlines.length && !gekozen.blokken.length && <p className="ff-small ff-muted">Niks gepland.</p>}
        </div>
      )}
    </section>
  );
}
