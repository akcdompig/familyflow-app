/*
  Koppeling met Supabase, zonder extra pakketten: gewoon fetch naar de REST-API.
  De sleutels staan in /config.js (window.FF_CONFIG). De "anon key" is openbaar; de beveiliging zit in de
  database-regels (zie supabase/schema.sql).
*/

import type { FamilyState } from "./types";

interface Config {
  url: string;
  anonKey: string;
}
interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // seconden
  user: { id: string; email?: string; is_anonymous?: boolean };
}
export interface WhoAmI {
  family_id: string;
  member_id: string;
  role: string;
}

const SKEY = "familyflow:sessie";

export function config(): Config | null {
  if (typeof window === "undefined") return null;
  const c = (window as unknown as { FF_CONFIG?: Partial<Config> }).FF_CONFIG;
  return c?.url && c?.anonKey ? { url: c.url.replace(/\/$/, ""), anonKey: c.anonKey } : null;
}

/** Demo als er geen Supabase is ingesteld, of als het adres op #demo eindigt. */
export function isDemo(): boolean {
  if (typeof window === "undefined") return true;
  return !config() || window.location.hash === "#demo" || new URLSearchParams(window.location.search).has("demo");
}

let session: Session | null = readSession();

function readSession(): Session | null {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(SKEY) : null;
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function writeSession(s: Session | null) {
  session = s;
  try {
    if (s) window.localStorage.setItem(SKEY, JSON.stringify(s));
    else window.localStorage.removeItem(SKEY);
  } catch {
    /* geen opslag */
  }
}

export const hasSession = () => !!session;
export const isAnonymous = () => !!session?.user.is_anonymous;
export const userEmail = () => session?.user.email ?? "";

/** Nederlandse foutmelding uit een Supabase-antwoord. */
function niceError(body: unknown, status: number): string {
  const b = (body ?? {}) as Record<string, string>;
  const msg = b.msg || b.message || b.error_description || b.error || "";
  if (/Invalid login credentials/i.test(msg)) return "E-mailadres of wachtwoord klopt niet";
  if (/already registered|already exists/i.test(msg)) return "Dit e-mailadres heeft al een account. Kies Inloggen";
  if (/Password should be/i.test(msg)) return "Kies een wachtwoord van minstens 6 tekens";
  if (/Anonymous sign-ins are disabled/i.test(msg)) return "Inloggen met een code staat nog uit in Supabase (Anonymous sign-ins)";
  if (/Email not confirmed/i.test(msg)) return "Bevestig eerst je e-mailadres, of zet e-mailbevestiging uit in Supabase";
  if (/rate limit/i.test(msg)) return "Even te vaak geprobeerd. Wacht een minuut";
  if (status === 0) return "Geen internet";
  return msg || `Er ging iets mis (${status})`;
}

async function call<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const c = config();
  if (!c) throw new Error("Supabase is niet ingesteld");
  if (init.auth !== false) await ensureFresh();
  const headers: Record<string, string> = {
    apikey: c.anonKey,
    "Content-Type": "application/json",
    Authorization: `Bearer ${init.auth !== false && session ? session.access_token : c.anonKey}`,
    ...(init.headers as Record<string, string>),
  };
  let res: Response;
  try {
    res = await fetch(c.url + path, { ...init, headers });
  } catch {
    throw new Error("Geen internet");
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) throw new Error(niceError(body, res.status));
  return body as T;
}

function takeSession(body: unknown): void {
  const b = body as Partial<Session> & { expires_in?: number };
  if (!b?.access_token) throw new Error("Bevestig eerst je e-mailadres, of zet e-mailbevestiging uit in Supabase");
  writeSession({
    access_token: b.access_token,
    refresh_token: b.refresh_token!,
    expires_at: b.expires_at ?? Math.floor(Date.now() / 1000) + (b.expires_in ?? 3600),
    user: b.user!,
  });
}

let refreshing: Promise<void> | null = null;
async function ensureFresh() {
  if (!session) return;
  if (session.expires_at - 60 > Date.now() / 1000) return;
  refreshing ??= (async () => {
    try {
      const body = await call("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session!.refresh_token }), auth: false });
      takeSession(body);
    } catch (e) {
      // Alleen uitloggen als Supabase zegt dat de login echt niet meer geldig is.
      // Bij storingen of geen internet blijft iedereen gewoon ingelogd en proberen we het later opnieuw.
      if (/invalid refresh token|refresh token not found|already used/i.test(String((e as Error).message ?? e))) {
        writeSession(null);
        throw new Error("Je bent uitgelogd. Log opnieuw in");
      }
      throw new Error("Even geen verbinding met de server. We proberen het zo opnieuw");
    } finally {
      refreshing = null;
    }
  })();
  await refreshing;
}

export async function signUp(email: string, password: string) {
  takeSession(await call("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email: email.trim(), password }), auth: false }));
}
export async function signIn(email: string, password: string) {
  takeSession(await call("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: email.trim(), password }), auth: false }));
}
export async function signInWithCode() {
  if (session) return;
  takeSession(await call("/auth/v1/signup", { method: "POST", body: JSON.stringify({ data: {} }), auth: false }));
}
export function signOut() {
  writeSession(null);
}

const rpc = <T,>(name: string, args: Record<string, unknown> = {}) => call<T>(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });

export const whoami = () => rpc<WhoAmI | null>("whoami");
export const createFamily = (state: FamilyState, memberId: string) => rpc<string>("create_family", { p_state: state, p_member_id: memberId });
export const makeInvite = (memberId: string) => rpc<string>("make_invite", { p_member_id: memberId });
export const joinFamily = (code: string) => rpc<WhoAmI>("join_family", { p_code: code });
export const saveFamily = (state: FamilyState, rev: number) => rpc<number>("save_family", { p_state: state, p_rev: rev });

/*
  Laden gaat via de databasefunctie load_family: die geeft kinderen een versie zonder de privé-gegevens
  van anderen (zie supabase/beveiliging.sql). Bestaat die functie nog niet, dan lezen we de tabel zoals vroeger.
*/
let viaFunctie = true;
const ontbreekt = (e: unknown) => /could not find the function|PGRST202|404/i.test(String((e as Error)?.message ?? e));

export async function loadFamily(): Promise<{ state: FamilyState; rev: number } | null> {
  if (viaFunctie) {
    try {
      return (await rpc<{ state: FamilyState; rev: number } | null>("load_family")) ?? null;
    } catch (e) {
      if (!ontbreekt(e)) throw e;
      viaFunctie = false;
    }
  }
  const rows = await call<{ state: FamilyState; rev: number }[]>("/rest/v1/families?select=state,rev&limit=1");
  return rows[0] ?? null;
}
export async function loadRev(): Promise<number | null> {
  if (viaFunctie) {
    try {
      return (await rpc<number | null>("family_rev")) ?? null;
    } catch (e) {
      if (!ontbreekt(e)) throw e;
      viaFunctie = false;
    }
  }
  const rows = await call<{ rev: number }[]>("/rest/v1/families?select=rev&limit=1");
  return rows[0]?.rev ?? null;
}

/** Ouders: de laatste versies van de gezinsstand, en een versie terugzetten. */
export const familyHistory = () => rpc<{ id: number; rev: number; saved_at: string; saved_by_member: string | null }[]>("family_history");
export const restoreFamily = (id: number) => rpc<number>("restore_family", { p_id: id });
/** AVG: het hele gezin en alle gegevens verwijderen (alleen ouders). */
export const deleteFamily = () => rpc<null>("delete_family");

/** Foutmelding vastleggen, zodat problemen bij een gezin opvallen. Hooguit 10 per sessie, stil bij mislukken. */
let fouten = 0;
export function logError(message: string, stack = "", version = "") {
  if (!session || fouten >= 10) return;
  fouten++;
  void rpc("log_error", { p_message: message, p_stack: stack, p_version: version, p_url: location.pathname }).catch(() => undefined);
}

/** Supabase Edge Function aanroepen, met de login van deze telefoon. */
export const edge = <T,>(name: string, body: Record<string, unknown>) => call<T>(`/functions/v1/${name}`, { method: "POST", body: JSON.stringify(body) });
