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

// ---------- Supabase (service role) ----------
async function db(path: string, init: RequestInit = {}) {
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
async function vernieuw(link: Record<string, string>) {
  const res = await fetch(`${AUTH}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: link.refresh_token, client_id: link.client_id, scope: "openid" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Fout("Somtoday-koppeling verlopen. Koppel opnieuw", 401);
  return data as { access_token: string; refresh_token?: string; somtoday_api_url?: string };
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

async function haalOp(api: string, at: string): Promise<SomItem[]> {
  const nu = new Date();
  const van = ymd(nu);
  const tot = ymd(new Date(nu.getTime() + 28 * 864e5));
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
    const wie = await wieBenIk(req);
    const body = await req.json().catch(() => ({}));
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
          body: JSON.stringify({ family_id: fam, member_id: body.member_id, tenant_uuid: body.tenant_uuid, school: body.school ?? null, client_id: CLIENT_ID, refresh_token: t.refresh_token, api_url: t.somtoday_api_url ?? "https://api.somtoday.nl", last_error: null, pending_verifier: null }),
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
          body: JSON.stringify({ family_id: fam, member_id: body.member_id, tenant_uuid: claims.tenant ?? "", school: body.school ?? null, client_id: gelukt.client, refresh_token: gelukt.t.refresh_token ?? rt, api_url: gelukt.t.somtoday_api_url ?? "https://api.somtoday.nl", last_error: null, pending_verifier: null }),
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
          body: JSON.stringify({ refresh_token: t.refresh_token, api_url: t.somtoday_api_url ?? link.api_url, pending_verifier: null, last_error: null }),
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
        const res: Record<string, { items?: SomItem[]; fout?: string }> = {};
        // Na elkaar: elke vernieuwing levert een nieuw token op dat we meteen bewaren.
        for (const link of links) {
          try {
            const t = await vernieuw(link);
            const api = t.somtoday_api_url ?? link.api_url;
            await db(`somtoday_links?${sleutel(link.member_id)}`, {
              method: "PATCH",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify({ refresh_token: t.refresh_token ?? link.refresh_token, api_url: api }),
            });
            res[link.member_id] = { items: await haalOp(api, t.access_token) };
            await db(`somtoday_links?${sleutel(link.member_id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ last_sync: new Date().toISOString(), last_error: null }) });
          } catch (e) {
            const fout = e instanceof Error ? e.message : String(e);
            res[link.member_id] = { fout };
            await db(`somtoday_links?${sleutel(link.member_id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ last_error: fout }) });
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
