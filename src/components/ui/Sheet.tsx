"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Onderblad dat omhoog schuift. Escape of de achtergrond sluit het. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => ref.current?.querySelector<HTMLElement>("button, [href], input, textarea")?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="ff-sheet-wrap">
      <button className="ff-sheet-backdrop" aria-label="Sluiten" onClick={onClose} tabIndex={-1} />
      <div ref={ref} className="ff-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ff-sheet-grip" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
