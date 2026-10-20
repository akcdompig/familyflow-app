/*
  Herinneringen op je telefoon (web push).
  - Android/Chrome: werkt meteen in de browser en als app.
  - iPhone: alleen als FamilyFlow op het beginscherm staat (Deel › Zet op beginscherm), iOS 16.4 of nieuwer.
  De Edge Function "herinneringen" beslist wanneer: na 2 uur stil, of om 9 uur als een kind nog niks deed.
*/

import { edge, isDemo } from "./cloud";

export type PushStatus = "aan" | "uit" | "geblokkeerd" | "beginscherm" | "kan-niet" | "demo";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const losseApp = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

function urlB64(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registratie(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const bestaand = await navigator.serviceWorker.getRegistration();
  if (bestaand) return bestaand;
  if (location.protocol !== "https:") return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function pushStatus(): Promise<PushStatus> {
  if (isDemo()) return "demo";
  if (isIos() && !losseApp()) return "beginscherm";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") return "kan-niet";
  if (Notification.permission === "denied") return "geblokkeerd";
  const reg = await registratie();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "aan" : "uit";
}

export async function pushAan(): Promise<PushStatus> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "geblokkeerd" : "uit";
  const reg = await registratie();
  if (!reg) throw new Error("Herinneringen werken alleen in de echte app (https)");
  await navigator.serviceWorker.ready;
  const { publicKey } = await edge<{ publicKey: string }>("herinneringen", { action: "sleutel" });
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(publicKey) as BufferSource });
  await edge("herinneringen", { action: "abonneer", sub: sub.toJSON() });
  return "aan";
}

export async function pushUit(): Promise<PushStatus> {
  const reg = await registratie();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await edge("herinneringen", { action: "opzeggen", endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe();
  }
  return "uit";
}

export const pushTest = () => edge<{ ok: boolean }>("herinneringen", { action: "test" });
