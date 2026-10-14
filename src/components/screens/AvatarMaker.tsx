"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { EXTRAS, HAIR_COLORS, HAIR_STYLES, OUTFIT_COLORS, OUTFITS, SKINS } from "@/components/avatar/parts";
import { Icon } from "@/components/ui/Icon";
import { actions } from "@/lib/store";
import type { AvatarConfig, Extra, Member } from "@/lib/types";

type Tab = "huid" | "haar" | "extra" | "kleding";
const TABS: { id: Tab; label: string }[] = [
  { id: "huid", label: "Huid" },
  { id: "haar", label: "Haar" },
  { id: "extra", label: "Extra's" },
  { id: "kleding", label: "Kleding" },
];

const pickOne = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export function AvatarMaker({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: (msg: string) => void }) {
  const [cfg, setCfg] = useState<AvatarConfig>(member.avatar);
  const [name, setName] = useState(member.name);
  const [tab, setTab] = useState<Tab>("haar");
  const [spin, setSpin] = useState(0);
  const set = (p: Partial<AvatarConfig>) => setCfg((c) => ({ ...c, ...p }));
  const toggleExtra = (e: Extra) =>
    setCfg((c) => {
      let extras = c.extras.includes(e) ? c.extras.filter((x) => x !== e) : [...c.extras, e];
      if (e === "pet" && extras.includes("pet")) extras = extras.filter((x) => x !== "koptelefoon");
      if (e === "koptelefoon" && extras.includes("koptelefoon")) extras = extras.filter((x) => x !== "pet");
      return { ...c, extras };
    });

  const surprise = () => {
    setCfg({
      skin: pickOne(SKINS).id,
      hair: pickOne(HAIR_STYLES).id,
      hairColor: pickOne(HAIR_COLORS),
      extras: Math.random() > 0.6 ? [pickOne(["sproeten", "bril", "koptelefoon"] as const)] : [],
      outfit: pickOne(OUTFITS).id,
      outfitColor: pickOne(OUTFIT_COLORS),
    });
    setSpin((s) => s + 1);
  };

  const save = () => {
    actions.saveAvatar(member.id, cfg, name);
    onSaved("Je avatar is opgeslagen");
    onClose();
  };

  return (
    <div className="ff-screen ff-maker">
      <header className="ff-top">
        <button className="ff-iconbtn" onClick={onClose} aria-label="Terug">
          <Icon name="terug" />
        </button>
        <h1 className="ff-h2">Maak jouw avatar</h1>
        <span style={{ width: 44 }} aria-hidden="true" />
      </header>

      <div className="ff-maker-stage">
        <div className="ff-maker-disc" key={spin}>
          <Avatar config={cfg} expression="blij" energy={0.5} size={168} seed={1} label="Voorbeeld van jouw avatar" />
        </div>
      </div>

      <label className="ff-field">
        <span className="ff-eyebrow">Je naam in de app</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
      </label>

      <div className="ff-tabs" role="tablist" aria-label="Onderdelen">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className="ff-tab" onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="ff-maker-panel" role="tabpanel">
        {tab === "huid" && (
          <div className="ff-swatches">
            {SKINS.map((s) => (
              <button key={s.id} className="ff-swatch ff-swatch-l" style={{ background: s.color }} aria-label={s.label} aria-pressed={cfg.skin === s.id} onClick={() => set({ skin: s.id })} />
            ))}
          </div>
        )}

        {tab === "haar" && (
          <>
            <div className="ff-grid4">
              {HAIR_STYLES.map((h) => (
                <button key={h.id} className="ff-tile" aria-pressed={cfg.hair === h.id} onClick={() => set({ hair: h.id })}>
                  <Avatar config={{ ...cfg, hair: h.id, extras: [] }} headOnly size={52} animate={false} label={h.label} />
                  <span>{h.label}</span>
                </button>
              ))}
            </div>
            <div className="ff-eyebrow">{cfg.hair === "hoofddoek" ? "Kleur hoofddoek" : "Haarkleur"}</div>
            <div className="ff-swatches">
              {HAIR_COLORS.map((c) => (
                <button key={c} className="ff-swatch" style={{ background: c }} aria-label={`Kleur ${c}`} aria-pressed={cfg.hairColor === c} onClick={() => set({ hairColor: c })} />
              ))}
            </div>
          </>
        )}

        {tab === "extra" && (
          <div className="ff-grid3">
            {EXTRAS.map((e) => (
              <button key={e.id} className="ff-tile" aria-pressed={cfg.extras.includes(e.id)} onClick={() => toggleExtra(e.id)}>
                <Avatar config={{ ...cfg, extras: [e.id] }} headOnly size={52} animate={false} label={e.label} />
                <span>{e.label}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "kleding" && (
          <>
            <div className="ff-chips">
              {OUTFITS.map((o) => (
                <button key={o.id} className="ff-chip ff-chip-l" aria-pressed={cfg.outfit === o.id} onClick={() => set({ outfit: o.id })}>
                  {o.label}
                </button>
              ))}
            </div>
            <div className="ff-eyebrow">Kleur</div>
            <div className="ff-swatches">
              {OUTFIT_COLORS.map((c) => (
                <button key={c} className="ff-swatch" style={{ background: c }} aria-label={`Kleur ${c}`} aria-pressed={cfg.outfitColor === c} onClick={() => set({ outfitColor: c })} />
              ))}
            </div>
            <p className="ff-small ff-muted">Straks speel je met quests nieuwe kleding en accessoires vrij.</p>
          </>
        )}
      </div>

      <div className="ff-maker-actions">
        <button className="ff-btn ff-btn-ghost" onClick={surprise}>
          <Icon name="dobbel" size={20} /> Verras me
        </button>
        <button className="ff-btn ff-btn-primary ff-grow" onClick={save}>
          Opslaan
        </button>
      </div>
    </div>
  );
}
