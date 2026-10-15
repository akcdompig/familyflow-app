"use client";

import { useEffect, useState } from "react";
import { pushAan, pushStatus, pushTest, pushUit, type PushStatus } from "@/lib/push";

const UITLEG: Record<PushStatus, string> = {
  aan: "Staat aan. Ben je 2 uur stil in de app, dan krijg je een seintje.",
  uit: "Krijg een seintje als je 2 uur niks hebt afgevinkt. Kinderen krijgen om 9 uur een wekmelding als ze nog niks deden.",
  geblokkeerd: "Meldingen staan uit voor FamilyFlow. Zet ze aan bij de instellingen van je telefoon (Meldingen › FamilyFlow).",
  beginscherm: "Op de iPhone werkt dit alleen als FamilyFlow op je beginscherm staat: tik op Deel › Zet op beginscherm, en open de app vanaf daar.",
  "kan-niet": "Deze browser kan geen meldingen. Open FamilyFlow in Chrome of Safari, of zet hem op je beginscherm.",
  demo: "In de demo kun je geen meldingen krijgen.",
};

/** Herinneringen aan of uit, met een testknop. */
export function Herinneringen({ onToast, compact = false, onWeg }: { onToast: (m: string) => void; compact?: boolean; onWeg?: () => void }) {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [bezig, setBezig] = useState(false);
  useEffect(() => {
    pushStatus().then(setStatus).catch(() => setStatus("kan-niet"));
  }, []);
  if (!status || (compact && (status === "aan" || status === "demo" || status === "kan-niet"))) return null;

  const doe = async (fn: () => Promise<PushStatus | unknown>, klaar: string) => {
    setBezig(true);
    try {
      const r = await fn();
      if (typeof r === "string") setStatus(r as PushStatus);
      onToast(typeof r === "string" && r !== "aan" && r !== "uit" ? UITLEG[r as PushStatus] : klaar);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Dat lukte niet");
    } finally {
      setBezig(false);
    }
  };

  return (
    <section className={`ff-card ff-stack-s${compact ? " ff-attn ff-attn-zon" : ""}`}>
      <div className="ff-row" style={{ justifyContent: "space-between" }}>
        <b>🔔 Herinneringen op je telefoon</b>
        {compact && onWeg && <button className="ff-link ff-small" onClick={onWeg}>Later</button>}
      </div>
      <p className="ff-small ff-muted">{UITLEG[status]}</p>
      {status === "uit" && <button className="ff-btn ff-btn-primary ff-btn-wide" disabled={bezig} onClick={() => doe(pushAan, "Herinneringen staan aan 🔔")}>Zet aan</button>}
      {status === "aan" && (
        <div className="ff-row">
          <button className="ff-btn ff-btn-dark" disabled={bezig} onClick={() => doe(pushTest, "Testmelding verstuurd. Kijk op je telefoon")}>Stuur een test</button>
          <button className="ff-btn ff-btn-ghost" disabled={bezig} onClick={() => doe(pushUit, "Herinneringen staan uit")}>Zet uit</button>
        </div>
      )}
    </section>
  );
}
