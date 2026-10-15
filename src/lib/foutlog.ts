/*
  Foutmeldingen uit de app vastleggen (alleen in de echte app, niet in de demo).
  Geen persoonsgegevens: alleen de melding, waar het gebeurde en de versie.
*/
import { logError } from "./cloud";
import { VERSION } from "./version";

let aan = false;
export function startFoutlog() {
  if (aan || typeof window === "undefined") return;
  aan = true;
  window.addEventListener("error", (e) => logError(String(e.message || "Fout"), String(e.error?.stack ?? `${e.filename}:${e.lineno}`), VERSION));
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as Error | undefined;
    logError(String(r?.message ?? r ?? "Onafgehandelde fout"), String(r?.stack ?? ""), VERSION);
  });
}
export const meldFout = (e: unknown, waar: string) => logError(`${waar}: ${String((e as Error)?.message ?? e)}`, String((e as Error)?.stack ?? ""), VERSION);
