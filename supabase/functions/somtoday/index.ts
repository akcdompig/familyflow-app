// FamilyFlow Edge Function "somtoday".
// Haalt toetsen en huiswerk uit Somtoday voor de kinderen in een gezin.
// De Somtoday-tokens blijven hier op de server; de app ziet ze nooit.
//
// Somtoday heeft geen officiële API. Dit volgt github.com/elisaado/somtoday-api-docs.
//
// Acties (POST JSON { action, ... }), altijd met de Supabase-login van de app:
//   status                                  → welke kinderen gekoppeld zijn
//   scholen    { q }                        → scholen zoeken
//   login      { member_id, tenant_uuid, school, username, password }  → koppelen (wachtwoord wordt niet bewaard)
//   startLink  { member_id, tenant_uuid, school }  → inloglink voor scholen met Microsoft/SSO-login
//   finishLink { member_id, callback }      → de somtoday://-link na het inloggen
//   ontkoppel  { member_id }
//   ophalen                                 → toetsen en huiswerk van vandaag tot 4 weken vooruit, per kind

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AUTH = "https://inloggen.somtoday.nl";
const CLIENT_ID = "somtoday-leerling-native";
const REDIRECT = "somtoday://nl.topicus.somtoday.leerling/oauth/callback";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
class Fout extends Error {
  constructor(msg: string, public status = 400) {
    super(msg);
  }
}

// ---------- Klok-taken (pg_cron) ----------
/** Alleen de klok mag onderhoud starten: die stuurt de geheime sleutel uit app_secrets mee. */
async function vereisKlok(req: Request) {
  let geheim: string | undefined;
  try {
    geheim = (await dbRuw("app_secrets?name=eq.cron&select=value"))?.[0]?.value;
  } catch {
    return; // tabel bestaat nog niet (beveiliging.sql nog niet gedraaid): zoals vroeger
  }
  if (geheim && req.headers.get("x-cron-secret") !== geheim) throw new Fout("Niet toegestaan", 401);
}

// ---------- Versleuteling van de Somtoday-tokens ----------
// Met het geheim SOMTODAY_SLEUTEL (32 bytes, base64) worden de tokens versleuteld opgeslagen (AES-GCM).
// Zonder dat geheim werkt alles zoals vroeger. Oude, onversleutelde tokens blijven leesbaar.
const VELDEN = ["refresh_token", "access_token"];
let aesKey: { raw: string; key: Promise<CryptoKey> } | null = null;
function aesSleutel(): Promise<CryptoKey> | null {
  const raw = Deno.env.get("SOMTODAY_SLEUTEL");
  if (!raw) return null;
  if (aesKey?.raw !== raw) aesKey = { raw, key: crypto.subtle.importKey("raw", Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)), "AES-GCM", false, ["encrypt", "decrypt"]) };
  return aesKey.key;
}
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (t: string) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
export async function versleutel(v: unknown): Promise<unknown> {
  const k = aesSleutel();
  if (!k || typeof v !== "string" || v.startsWith("enc1:")) return v;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await k, new TextEncoder().encode(v)));
  return `enc1:${b64(iv)}:${b64(ct)}`;
}
export async function ontsleutel(v: unknown): Promise<unknown> {
  if (typeof v !== "string" || !v.startsWith("enc1:")) return v;
  const k = aesSleutel();
  if (!k) throw new Fout("De sleutel voor Somtoday ontbreekt op de server (SOMTODAY_SLEUTEL)", 500);
  const [, iv, ct] = v.split(":");
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await k, unb64(ct)));
}
async function velden(obj: unknown, fn: (v: unknown) => Promise<unknown>): Promise<unknown> {
  if (Array.isArray(obj)) return Promise.all(obj.map((o) => velden(o, fn)));
  if (!obj || typeof obj !== "object") return obj;
  const uit: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  for (const v of VELDEN) if (v in uit) uit[v] = await fn(uit[v]);
  return uit;
}

// ---------- Supabase (service role) ----------
/** Database-aanroep. Tokens in somtoday_links gaan versleuteld heen en komen ontsleuteld terug. */
async function db(path: string, init: RequestInit = {}) {
  if (!path.startsWith("somtoday_links")) return dbRuw(path, init);
  const body = typeof init.body === "string" ? JSON.stringify(await velden(JSON.parse(init.body), versleutel)) : init.body;
  return velden(await dbRuw(path, { ...init, body }), ontsleutel);
}
async function dbRuw(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Fout(`Database: ${text}`, 500);
  return text ? JSON.parse(text) : null;
}

interface Wie {
  family_id: string;
  member_id: string;
  role: string;
}
async function wieBenIk(req: Request): Promise<Wie> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Fout("Niet ingelogd", 401);
  const res = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_SERVICE, Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Fout("Niet ingelogd", 401);
  const user = await res.json();
  const rows = await db(`family_members?user_id=eq.${user.id}&select=family_id,member_id,role`);
  if (!rows?.length) throw new Fout("Je hoort nog niet bij een gezin", 403);
  return rows[0];
}
/** Ouders mogen elk kind koppelen, een kind alleen zichzelf. */
function magVoor(wie: Wie, memberId: string) {
  if (wie.role !== "ouder" && wie.member_id !== memberId) throw new Fout("Dat mag alleen een ouder", 403);
}

// ---------- PKCE ----------
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function pkce() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return { verifier, challenge };
}
function authorizeUrl(tenant: string, challenge: string) {
  const u = new URL(`${AUTH}/oauth2/authorize`);
  Object.entries({
    redirect_uri: REDIRECT,
    client_id: CLIENT_ID,
    state: b64url(crypto.getRandomValues(new Uint8Array(6))),
    response_type: "code",
    scope: "openid",
    tenant_uuid: tenant,
    session: "no_session",
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).forEach(([k, v]) => v && u.searchParams.set(k, v));
  return u.toString();
}

async function token(body: Record<string, string>) {
  const res = await fetch(`${AUTH}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Fout(`Somtoday weigert de login (${res.status})`, 502);
  return data as { access_token: string; refresh_token: string; somtoday_api_url?: string };
}
const codeUit = (link: string) => {
  const q = link.indexOf("?");
  return q < 0 ? null : new URLSearchParams(link.slice(q + 1)).get("code");
};

// ---------- Inloggen met gebruikersnaam en wachtwoord (nabootsen van de Somtoday-app) ----------
class Koekjes {
  private jar = new Map<string, string>();
  neem(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      if (i > 0) this.jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
    }
  }
  get header() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function loginMetWachtwoord(tenant: string, username: string, password: string) {
  const { verifier, challenge } = await pkce();
  const jar = new Koekjes();
  const ga = async (url: string, init: RequestInit = {}) => {
    const res = await fetch(url, { ...init, redirect: "manual", headers: { "User-Agent": UA, Cookie: jar.header, ...(init.headers ?? {}) } });
    jar.neem(res);
    await res.body?.cancel();
    return res;
  };
  /** Volg redirects binnen Somtoday. Stopt bij de somtoday://-callback (die bevat de code). */
  const volg = async (res: Response) => {
    for (let i = 0; i < 8; i++) {
      const loc = res.headers.get("location");
      if (!loc) return { res, loc: null as string | null };
      if (!loc.startsWith("http") && !loc.startsWith("/")) return { res, loc };
      res = await ga(new URL(loc, AUTH).toString());
    }
    return { res, loc: res.headers.get("location") };
  };

  // 1. Start: Somtoday stuurt ons door naar het inlogscherm met een "auth"-code.
  const start = await ga(authorizeUrl(tenant, challenge));
  const loc1 = start.headers.get("location") ?? "";
  const auth = new URL(loc1, AUTH).searchParams.get("auth");
  if (!auth) throw new Fout("Somtoday gaf geen inlogscherm terug. Probeer het via de link", 502);
  await volg(start);

  const form = (velden: Record<string, string>) => ({
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: AUTH },
    body: new URLSearchParams(velden).toString(),
  });
  const USER = "usernameFieldPanel:usernameFieldPanel_body:usernameField";
  const PASS = "passwordFieldPanel:passwordFieldPanel_body:passwordField";

  // 2. Gebruikersnaam sturen. Daaruit blijkt of het scherm ook meteen het wachtwoord wil.
  const r1 = await ga(`${AUTH}/?0-1.-panel-signInForm&auth=${encodeURIComponent(auth)}`, form({ loginLink: "x", [USER]: username }));
  const l1 = r1.headers.get("location") ?? "";
  let r2: Response;
  if (l1.includes("auth=")) {
    // Gebruikersnaam en wachtwoord op één scherm.
    r2 = await ga(`${AUTH}/?0-1.-panel-signInForm&auth=${encodeURIComponent(auth)}`, form({ loginLink: "x", [USER]: username, [PASS]: password }));
  } else {
    // Eerst gebruikersnaam, dan wachtwoord.
    await volg(r1);
    r2 = await ga(`${AUTH}/login?2-1.-passwordForm&auth=${encodeURIComponent(auth)}`, form({ loginLink: "x", [PASS]: password }));
  }
  const eind = await volg(r2);
  const code = eind.loc ? codeUit(eind.loc) : null;
  if (!code) throw new Fout("Inloggen lukte niet. Klopt de gebruikersnaam en het wachtwoord? Logt de school in via Microsoft, kies dan 'Inloggen via de link'", 400);

  return token({ grant_type: "authorization_code", session: "no_session", scope: "openid", client_id: CLIENT_ID, tenant_uuid: tenant, redirect_uri: REDIRECT, code, code_verifier: verifier });
}

// ---------- Scholenlijst ----------
// Somtoday stuurt soms door met een cookie; zonder cookie blijft het rondjes draaien. Daarom zelf redirects volgen.
let scholenCache: { at: number; data: any } | null = null;
async function scholenLijst() {
  if (scholenCache && Date.now() - scholenCache.at < 6 * 3600e3) return scholenCache.data;
  const jar = new Koekjes();
  let url = "https://servers.somtoday.nl/organisaties.json";
  for (let i = 0; i < 10; i++) {
    const res = await fetch(url, { redirect: "manual", headers: { "User-Agent": UA, Accept: "application/json", Cookie: jar.header } });
    jar.neem(res);
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      await res.body?.cancel();
      url = new URL(loc, url).toString();
      continue;
    }
    if (!res.ok) throw new Fout(`Scholenlijst niet bereikbaar (${res.status})`, 502);
    const data = await res.json();
    scholenCache = { at: Date.now(), data };
    return data;
  }
  throw new Fout("Scholenlijst niet bereikbaar. Kies de school op de Somtoday-site", 502);
}

// ---------- Somtoday-gegevens ----------
/*
  Waarom de koppeling vroeger "verliep":
  Somtoday geeft bij elke vernieuwing een NIEUW refresh-token en het oude werkt daarna niet meer.
  Openden twee telefoons tegelijk de app (papa en Kian), dan vernieuwden ze allebei met hetzelfde oude token.
  De tweede kreeg "ongeldig", en Somtoday trekt dan soms de hele koppeling in.
  Nu:
  - Het access-token (± 1 uur geldig) wordt bewaard en hergebruikt, dus er wordt veel minder vaak vernieuwd.
  - Vernieuwen gebeurt met een slot: maar één tegelijk. De rest wacht even en gebruikt het nieuwe token.
  - Elke 6 uur vernieuwt de server zelf (pg_cron), zodat het token nooit te lang ongebruikt blijft.
  - Een storing bij Somtoday is geen "verlopen": dan proberen we het later gewoon opnieuw.
*/
type Link = Record<string, any>;
const VERLOPEN = "Somtoday-koppeling verlopen. Koppel opnieuw";
const sleutelVan = (l: Link) => `family_id=eq.${l.family_id}&member_id=eq.${encodeURIComponent(l.member_id)}`;
const slaap = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function vernieuw(link: Record<string, string>) {
  let res: Response;
  try {
    res = await fetch(`${AUTH}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: link.refresh_token, client_id: link.client_id, scope: "openid" }),
    });
  } catch {
    throw new Fout("Somtoday is even niet bereikbaar. Ik probeer het later opnieuw", 503);
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.access_token) return data as { access_token: string; refresh_token?: string; somtoday_api_url?: string; expires_in?: number };
  // Alleen een afgewezen token betekent echt verlopen. Al het andere is een storing.
  const afgewezen = (res.status === 400 || res.status === 401) && /invalid_grant|invalid_token|expired|revoked/i.test(JSON.stringify(data));
  if (afgewezen) throw new Fout(VERLOPEN, 401);
  throw new Fout("Somtoday is even niet bereikbaar. Ik probeer het later opnieuw", 503);
}

async function leesLink(l: Link): Promise<Link> {
  const rows = await db(`somtoday_links?${sleutelVan(l)}&select=*`);
  if (!rows?.length) throw new Fout("Niet meer gekoppeld", 404);
  return rows[0];
}

/** Een geldig access-token voor deze koppeling. Vernieuwt alleen als het moet, en nooit twee tegelijk. */
async function geldigToken(link0: Link, forceer = false): Promise<{ at: string; api: string }> {
  let link = link0;
  const vers = (l: Link) => !!l.access_token && !!l.access_expires && new Date(l.access_expires).getTime() > Date.now() + 2 * 60e3;
  if (!forceer && vers(link)) return { at: link.access_token, api: link.api_url };

  // Slot pakken: alleen als niemand anders nu aan het vernieuwen is.
  const nu = new Date().toISOString();
  const tot = new Date(Date.now() + 40e3).toISOString();
  const pak = await db(`somtoday_links?${sleutelVan(link)}&or=(refreshing_until.is.null,refreshing_until.lt.${encodeURIComponent(nu)})`, {
    method: "PATCH",
    body: JSON.stringify({ refreshing_until: tot }),
  });
  if (!pak?.length) {
    // Een andere telefoon vernieuwt nu. Even wachten en dan zijn nieuwe token gebruiken.
    for (let i = 0; i < 12; i++) {
      await slaap(1500);
      link = await leesLink(link);
      if (vers(link)) return { at: link.access_token, api: link.api_url };
      if (!link.refreshing_until || new Date(link.refreshing_until).getTime() < Date.now()) break;
    }
    if (vers(link)) return { at: link.access_token, api: link.api_url };
    throw new Fout("Somtoday is even bezig. Probeer het zo nog eens", 503);
  }
  link = pak[0];
  const klaar = (velden: Record<string, unknown>) => db(`somtoday_links?${sleutelVan(link)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ refreshing_until: null, ...velden }) });
  try {
    let t;
    try {
      t = await vernieuw(link);
    } catch (e) {
      // Was het token net door iemand anders vernieuwd (en staat er al een nieuwe)? Dan die proberen.
      const nieuw = await leesLink(link);
      if (e instanceof Fout && e.status === 401 && nieuw.refresh_token && nieuw.refresh_token !== link.refresh_token) t = await vernieuw(nieuw);
      else throw e;
    }
    const api = t.somtoday_api_url ?? link.api_url;
    const verloopt = new Date(Date.now() + Math.max(300, Math.min(3600, Number(t.expires_in ?? 3600)) - 120) * 1000).toISOString();
    await klaar({ refresh_token: t.refresh_token ?? link.refresh_token, access_token: t.access_token, access_expires: verloopt, api_url: api, last_refresh: new Date().toISOString(), last_error: null });
    return { at: t.access_token, api };
  } catch (e) {
    const fout = e instanceof Error ? e.message : String(e);
    await klaar({ last_error: fout, ...(fout === VERLOPEN ? { access_token: null, access_expires: null } : {}) }).catch(() => undefined);
    throw e;
  }
}

/** Elke 6 uur (pg_cron): alle koppelingen even vernieuwen, zodat ze nooit verlopen door stilstand. */
async function onderhoud() {
  const links: Link[] = await db("somtoday_links?refresh_token=not.is.null&select=*");
  let ok = 0;
  const fouten: string[] = [];
  for (const l of links) {
    const oud = !l.last_refresh || Date.now() - new Date(l.last_refresh).getTime() > 6 * 3600e3;
    if (!oud) continue;
    try {
      await geldigToken(l, true);
      ok++;
    } catch (e) {
      fouten.push(`${l.member_id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return { vernieuwd: ok, fouten };
}

async function alles(api: string, at: string, path: string, params: URLSearchParams) {
  const out: any[] = [];
  for (let start = 0; start < 1000; start += 100) {
    const res = await fetch(`${api}${path}?${params}`, { headers: { Authorization: `Bearer ${at}`, Accept: "application/json", Range: `items=${start}-${start + 99}` } });
    if (res.status === 204) break;
    if (!res.ok) throw new Fout(`Somtoday ${path} gaf ${res.status}`, 502);
    const items = (await res.json()).items ?? [];
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const schoon = (s?: string) =>
  (s ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|div)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

/** Vrijdag van ISO-week w in het jaar rond `bij`. */
function vrijdagVanWeek(w: number, bij: Date) {
  const jan4 = new Date(Date.UTC(bij.getUTCFullYear(), 0, 4));
  const ma = new Date(jan4);
  ma.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (w - 1) * 7 + 4);
  // Week in januari terwijl het nu najaar is: volgend jaar.
  if (ma.getTime() < bij.getTime() - 30 * 864e5) ma.setUTCFullYear(ma.getUTCFullYear() + 1);
  return ymd(ma);
}

export interface SomItem {
  sid: string;
  date: string;
  vak: string;
  type: string; // HUISWERK | TOETS | GROTE_TOETS
  onderwerp: string;
  omschrijving: string;
  gemaakt: boolean;
}

export interface Vakantie {
  naam: string;
  van: string;
  tot: string;
}

/** Schoolvakanties van de leerling (vanaf een maand terug). */
async function haalVakanties(api: string, at: string): Promise<Vakantie[]> {
  try {
    const h = { Authorization: `Bearer ${at}`, Accept: "application/json" };
    const ll = await (await fetch(`${api}/rest/v1/leerlingen`, { headers: h })).json();
    const id = ll?.items?.[0]?.links?.[0]?.id;
    if (!id) return [];
    const res = await fetch(`${api}/rest/v1/vakanties/leerling/${id}`, { headers: h });
    if (!res.ok) return [];
    const grens = ymd(new Date(Date.now() - 30 * 864e5));
    return ((await res.json()).items ?? [])
      .map((v: any) => ({ naam: String(v.naam ?? "Vakantie"), van: String(v.beginDatum ?? "").slice(0, 10), tot: String(v.eindDatum ?? "").slice(0, 10) }))
      .filter((v: Vakantie) => v.van && v.tot && v.tot >= grens);
  } catch {
    return [];
  }
}

export interface RoosterDag {
  date: string;
  van: string;
  tot: string;
  lessen: number;
}

/** Lesrooster van vandaag tot 2 weken vooruit: per dag het eerste en laatste uur. */
async function haalRooster(api: string, at: string): Promise<RoosterDag[]> {
  try {
    const nu = new Date();
    const p = new URLSearchParams({ begindatum: ymd(nu), einddatum: ymd(new Date(nu.getTime() + 14 * 864e5)) });
    const lijst = await alles(api, at, "/rest/v1/afspraken", p);
    const per = new Map<string, RoosterDag>();
    for (const a of lijst) {
      const b = String(a.beginDatumTijd ?? "");
      const e = String(a.eindDatumTijd ?? "");
      if (b.length < 16 || e.length < 16) continue;
      // Uitgevallen lessen tellen niet.
      if (a.uitval === true || /uitval|vervallen/i.test(String(a.afspraakType?.naam ?? "") + String(a.omschrijving ?? ""))) continue;
      const date = b.slice(0, 10);
      const van = b.slice(11, 16);
      const tot = e.slice(11, 16);
      const d = per.get(date);
      if (!d) per.set(date, { date, van, tot, lessen: 1 });
      else per.set(date, { date, van: van < d.van ? van : d.van, tot: tot > d.tot ? tot : d.tot, lessen: d.lessen + 1 });
    }
    return [...per.values()].sort((x, y) => x.date.localeCompare(y.date));
  } catch {
    return [];
  }
}

async function haalOp(api: string, at: string): Promise<SomItem[]> {
  const nu = new Date();
  const van = ymd(nu);
  const tot = ymd(new Date(nu.getTime() + 42 * 864e5)); // 6 weken vooruit, voor het maandoverzicht
  const p = new URLSearchParams({ begintNaOfOp: van });
  p.append("additional", "swigemaaktVinkjes");
  p.append("additional", "lesgroep");
  const [afspraak, dag, week] = await Promise.all([
    alles(api, at, "/rest/v1/studiewijzeritemafspraaktoekenningen", p),
    alles(api, at, "/rest/v1/studiewijzeritemdagtoekenningen", p),
    alles(api, at, "/rest/v1/studiewijzeritemweektoekenningen", p),
  ]);
  const maak = (r: any, bron: string, date: string): SomItem => ({
    sid: `${bron}-${r.links?.[0]?.id}`,
    date,
    vak: r.lesgroep?.vak?.naam ?? r.additionalObjects?.lesgroep?.vak?.naam ?? r.studiewijzer?.naam ?? "",
    type: r.studiewijzerItem?.huiswerkType ?? "HUISWERK",
    onderwerp: schoon(r.studiewijzerItem?.onderwerp),
    omschrijving: schoon(r.studiewijzerItem?.omschrijving).slice(0, 200),
    gemaakt: (r.additionalObjects?.swigemaaktVinkjes?.items ?? []).some((v: any) => v.gemaakt === true),
  });
  const out: SomItem[] = [];
  for (const [bron, lijst] of [["a", afspraak], ["d", dag]] as const) {
    for (const r of lijst) {
      if (r.studiewijzerItem?.tonen === false) continue;
      const d = String(r.datumTijd ?? "").slice(0, 10);
      if (d >= van && d <= tot) out.push(maak(r, bron, d));
    }
  }
  for (const r of week) {
    if (r.studiewijzerItem?.tonen === false) continue;
    const w = (((r.weeknummerTm ?? r.weeknummerVanaf ?? 0) - 1) % 52) + 1;
    const d = vrijdagVanWeek(w, nu);
    if (d >= van && d <= tot) out.push(maak(r, "w", d));
  }
  return out;
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "onderhoud") {
      await vereisKlok(req);
      return json(await onderhoud());
    }
    const wie = await wieBenIk(req);
    const fam = wie.family_id;
    const sleutel = (m: string) => `family_id=eq.${fam}&member_id=eq.${encodeURIComponent(m)}`;

    switch (body.action) {
      case "status": {
        const rows = await db(`somtoday_links?family_id=eq.${fam}&select=member_id,school,last_sync,last_error,refresh_token`);
        return json(rows.map((r: any) => ({ member_id: r.member_id, school: r.school, last_sync: r.last_sync, last_error: r.last_error, gekoppeld: !!r.refresh_token })));
      }

      case "scholen": {
        const q = String(body.q ?? "").toLowerCase().trim();
        if (q.length < 3) return json([]);
        const orgs = await scholenLijst();
        const lijst = (orgs[0]?.instellingen ?? []).filter((s: any) => `${s.naam} ${s.plaats}`.toLowerCase().includes(q)).slice(0, 15);
        return json(lijst.map((s: any) => ({ uuid: s.uuid, naam: s.naam, plaats: s.plaats, sso: (s.oidcurls ?? []).length > 0 })));
      }

      case "login": {
        magVoor(wie, body.member_id);
        if (!body.tenant_uuid || !body.username || !body.password) throw new Fout("Vul school, gebruikersnaam en wachtwoord in");
        const t = await loginMetWachtwoord(body.tenant_uuid, String(body.username).trim(), String(body.password));
        await db("somtoday_links", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ family_id: fam, member_id: body.member_id, tenant_uuid: body.tenant_uuid, school: body.school ?? null, client_id: CLIENT_ID, refresh_token: t.refresh_token, api_url: t.somtoday_api_url ?? "https://api.somtoday.nl", last_error: null, pending_verifier: null, access_token: null, access_expires: null, refreshing_until: null, last_refresh: new Date().toISOString() }),
        });
        return json({ ok: true });
      }

      case "startLink": {
        magVoor(wie, body.member_id);
        const { verifier, challenge } = await pkce();
        await db("somtoday_links", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ family_id: fam, member_id: body.member_id, tenant_uuid: body.tenant_uuid ?? "", school: body.school ?? null, client_id: CLIENT_ID, pending_verifier: verifier }),
        });
        return json({ url: authorizeUrl(body.tenant_uuid ?? "", challenge) });
      }

      case "plakLogin": {
        // De login van leerling.somtoday.nl (Local Storage, "CapacitorStorage.<uuid>") geplakt als JSON.
        magVoor(wie, body.member_id);
        let data: any;
        try {
          data = JSON.parse(String(body.data ?? "").trim());
        } catch {
          throw new Fout("Dit is niet de goede waarde. Kopieer de hele waarde van de regel CapacitorStorage.… met de lange code");
        }
        const rt = data?.refresh_token;
        if (!rt) throw new Fout("Hier staat geen refresh_token in. Kies de regel CapacitorStorage.… met een lange code erachter");
        const claims = (() => {
          try {
            if (data.id_token_claims_obj) return typeof data.id_token_claims_obj === "string" ? JSON.parse(data.id_token_claims_obj) : data.id_token_claims_obj;
            const p = String(data.id_token ?? "").split(".")[1];
            return p ? JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/"))) : {};
          } catch {
            return {};
          }
        })();
        const aud = Array.isArray(claims.aud) ? claims.aud[0] : claims.aud;
        const kandidaten = [...new Set([aud, claims.azp, "somtoday-leerling-web", "somtoday-leerling-native", "D50E0C06-32D1-4B41-A137-A9A850C892C2"].filter(Boolean))] as string[];
        let gelukt: { client: string; t: any } | null = null;
        for (const client of kandidaten) {
          try {
            gelukt = { client, t: await vernieuw({ refresh_token: rt, client_id: client }) };
            break;
          } catch {
            /* volgende proberen */
          }
        }
        if (!gelukt) throw new Fout("Somtoday accepteert deze login niet (meer). Ververs leerling.somtoday.nl, en kopieer de waarde opnieuw");
        await db("somtoday_links", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ family_id: fam, member_id: body.member_id, tenant_uuid: claims.tenant ?? "", school: body.school ?? null, client_id: gelukt.client, refresh_token: gelukt.t.refresh_token ?? rt, api_url: gelukt.t.somtoday_api_url ?? "https://api.somtoday.nl", last_error: null, pending_verifier: null, access_token: null, access_expires: null, refreshing_until: null, last_refresh: new Date().toISOString() }),
        });
        return json({ ok: true });
      }

      case "finishLink": {
        magVoor(wie, body.member_id);
        const rows = await db(`somtoday_links?${sleutel(body.member_id)}&select=*`);
        const link = rows?.[0];
        if (!link?.pending_verifier) throw new Fout("Begin opnieuw met koppelen");
        const code = codeUit(String(body.callback ?? "").trim());
        if (!code) throw new Fout("In deze link staat geen code. Kopieer de hele somtoday://-link");
        const velden: Record<string, string> = { grant_type: "authorization_code", session: "no_session", scope: "openid", client_id: CLIENT_ID, redirect_uri: REDIRECT, code, code_verifier: link.pending_verifier };
        if (link.tenant_uuid) velden.tenant_uuid = link.tenant_uuid;
        const t = await token(velden);
        await db(`somtoday_links?${sleutel(body.member_id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ refresh_token: t.refresh_token, api_url: t.somtoday_api_url ?? link.api_url, pending_verifier: null, last_error: null, access_token: null, access_expires: null, refreshing_until: null, last_refresh: new Date().toISOString() }),
        });
        return json({ ok: true });
      }

      case "ontkoppel": {
        magVoor(wie, body.member_id);
        await db(`somtoday_links?${sleutel(body.member_id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        return json({ ok: true });
      }

      case "ophalen": {
        const links = await db(`somtoday_links?family_id=eq.${fam}&refresh_token=not.is.null&select=*`);
        const res: Record<string, { items?: SomItem[]; vakanties?: Vakantie[]; rooster?: RoosterDag[]; fout?: string }> = {};
        for (const link of links) {
          try {
            const { at, api } = await geldigToken(link);
            const [items, vakanties, rooster] = await Promise.all([haalOp(api, at), haalVakanties(api, at), haalRooster(api, at)]);
            res[link.member_id] = { items, vakanties, rooster };
            await db(`somtoday_links?${sleutel(link.member_id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ last_sync: new Date().toISOString(), last_error: null }) });
          } catch (e) {
            const fout = e instanceof Error ? e.message : String(e);
            // Een storing laten we stil voorbijgaan; alleen echt verlopen melden we.
            res[link.member_id] = fout === VERLOPEN ? { fout } : {};
          }
        }
        return json(res);
      }

      default:
        throw new Fout("Onbekende actie");
    }
  } catch (e) {
    const f = e instanceof Fout ? e : new Fout(String((e as Error)?.message ?? e), 500);
    return json({ error: f.message }, f.status);
  }
});
export { geldigToken, vernieuw };
