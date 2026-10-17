"use client";

import { historie, openRegels, type OpenRegel } from "@/lib/herkomst";
import type { FamilyState, Member } from "@/lib/types";

/** Waar komen mijn punten vandaan? Wat nog in de schatkist ligt, en eerdere claims. Inklapbaar, zodat Ik rustig blijft. */
export function PuntenHistorie({ state, me }: { state: FamilyState; me: Member }) {
  const open = openRegels(state, me.id);
  const eerder = historie(state, me.id, 6);
  const datum = (at: string) => new Date(at).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
  return (
    <details className="v2-meer-details ff-punten-historie">
      <summary><b>Waar komen mijn punten vandaan?</b></summary>
      <div className="ff-stack-s">
        {open.totaal > 0 && (
          <section aria-label="Nog op te halen" className="ff-stack-xs">
            <span className="ff-eyebrow">Nog op te halen · {open.totaal}</span>
            <Regels regels={open.regels} />
          </section>
        )}
        {eerder.map((c) => (
          <section key={c.at} aria-label={`Geclaimd op ${datum(c.at)}`} className="ff-stack-xs">
            <span className="ff-eyebrow">Geclaimd {datum(c.at)} · {c.totaal}</span>
            <Regels regels={c.regels} />
          </section>
        ))}
        {!open.totaal && !eerder.length && <span className="ff-small ff-muted">Nog niks te zien. Als je punten verdient, zie je hier waarvoor.</span>}
        {(open.regels.some((r) => r.onbekend) || eerder.length === 0) && open.totaal > 0 && (
          <span className="ff-small ff-muted">Van punten van vóór deze versie weet de app niet meer waarvoor ze waren.</span>
        )}
      </div>
    </details>
  );
}

function Regels({ regels }: { regels: OpenRegel[] }) {
  return (
    <ul className="ff-punten-lijst">
      {regels.map((r, i) => (
        <li key={r.wat + i} className={r.onbekend ? "is-onbekend" : ""}>
          <span className="ff-grow">{r.wat}{r.keer > 1 ? <span className="ff-muted"> ×{r.keer}</span> : null}</span>
          <b>+{r.n}</b>
        </li>
      ))}
    </ul>
  );
}
