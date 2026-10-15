// FamilyFlow Edge Function "herinneringen".
// Stuurt een melding naar je telefoon als je 2 uur niks in de app hebt gedaan.
// Kinderen krijgen om 9 uur een wekmelding als ze nog niks hebben gedaan (op schooldagen niet: dan zitten ze op school).
// De melding zegt wat er nog open staat: ochtendroutine, water, lunch, fruit. En wie er al lekker bezig is.
//
// Geen extra pakketten en geen geheime sleutels om in te stellen: de functie maakt bij de eerste keer zelf
// een sleutelpaar (VAPID) en bewaart dat in de tabel push_config. De melding zelf is leeg; de telefoon haalt
// de tekst daarna op met actie "bericht". Zo hoeft er niets versleuteld te worden.
//
// Acties (POST JSON { action, ... }):
//   sleutel                    → openbare sleutel voor de telefoon (geen login nodig)
//   abonneer  { sub }          → deze telefoon krijgt herinneringen (met login)
//   opzeggen  { endpoint }     → deze telefoon niet meer (met login)
//   test                       → nu meteen een testmelding naar jezelf (met login)
//   bericht   { endpoint }     → de tekst van de laatste melding voor deze telefoon (de service worker vraagt dit)
//   ronde                      → elke 15 minuten via pg_cron: wie moet een herinnering krijgen?

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CONTACT = "mailto:familyflow@example.com";
const TZ = "Europe/Amsterdam";
const STIL_MIN = 120; // na zoveel minuten niks: herinnering

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

// ---------- VAPID ----------
const b64url = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = new TextEncoder();

let sleutelCache: { publicKey: string; privateKey: CryptoKey } | null = null;
async function sleutels() {
  if (sleutelCache) return sleutelCache;
  const rows = await db("push_config?id=eq.1&select=public_key,private_jwk");
  let pub: string;
  let jwk: JsonWebKey;
  if (rows?.length) {
    pub = rows[0].public_key;
    jwk = rows[0].private_jwk;
  } else {
    const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    pub = b64url(await crypto.subtle.exportKey("raw", pair.publicKey));
    jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    // Als twee aanroepen tegelijk een sleutel maken, wint de eerste. Daarna opnieuw lezen.
    await db("push_config", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ id: 1, public_key: pub, private_jwk: jwk }) });
    const again = await db("push_config?id=eq.1&select=public_key,private_jwk");
    pub = again[0].public_key;
    jwk = again[0].private_jwk;
  }
  const privateKey = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  sleutelCache = { publicKey: pub, privateKey };
  return sleutelCache;
}

async function vapidHeader(endpoint: string) {
  const { publicKey, privateKey } = await sleutels();
  const aud = new URL(endpoint).origin;
  const head = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: CONTACT })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, enc.encode(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64url(sig)}, k=${publicKey}`;
}

/** Lege push sturen. De telefoon haalt de tekst op. Geeft false als het abonnement niet meer bestaat. */
async function duw(endpoint: string): Promise<boolean> {
  const res = await fetch(endpoint, { method: "POST", headers: { Authorization: await vapidHeader(endpoint), TTL: "3600", Urgency: "normal", "Content-Length": "0" } });
  await res.body?.cancel();
  if (res.status === 404 || res.status === 410) return false;
  if (!res.ok) console.log("push mislukt", res.status, endpoint.slice(0, 60));
  return true;
}

interface Sub {
  endpoint: string;
  family_id: string;
  member_id: string;
  last_sent: string | null;
  last_kind: string | null;
}

async function verstuur(s: Sub, titel: string, tekst: string, soort: string) {
  await db(`push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ last_sent: new Date().toISOString(), last_kind: soort, last_title: titel, last_body: tekst }),
  });
  const ok = await duw(s.endpoint);
  if (!ok) await db(`push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

// ---------- Tijd in Nederland ----------
function nuNL(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }).formatToParts(d).map((x) => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  const uur = Number(p.hour) % 24;
  return { datum: `${p.year}-${p.month}-${p.day}`, min: uur * 60 + Number(p.minute), uur, wd };
}
const mins = (t?: string, anders = 0) => (t && /^\d\d:\d\d$/.test(t) ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) : anders);

// ---------- Wie krijgt wat? ----------
// deno-lint-ignore no-explicit-any
type State = any;

const ROUTINE = ["douchen", "tanden", "deo", "haar", "lotion"];

/** Kies de herinnering die nu het meest telt. */
function tekstVoor(st: State, id: string, nl: ReturnType<typeof nuNL>): string {
  const log = st.dag?.[nl.datum]?.[id] ?? { routine: [], water: 0, fruit: 0 };
  const eten: string[] = log.eten ?? [];
  const gegeten = (x: string) => eten.includes(x) || (x === "ontbijt" && log.ontbijt);
  const routineAf = ROUTINE.every((r) => (log.routine ?? []).includes(r));
  const waterVerwacht = Math.max(0, Math.min(6, Math.floor((nl.uur - 7) / 2)));
  if (nl.uur < 12 && !routineAf) return "Je ochtendroutine staat nog open 🚿 Even afvinken?";
  if (nl.uur < 11 && !gegeten("ontbijt")) return "Al ontbeten? 🥣 Een broodje of smoothie telt ook.";
  if (nl.uur >= 13 && nl.uur < 17 && !gegeten("lunch")) return "Heb je al geluncht? 🥪";
  if ((log.water ?? 0) < waterVerwacht) return `Tijd voor een glas water 💧 Je zit op ${log.water ?? 0} van de 6.`;
  if (nl.uur >= 15 && (log.fruit ?? 0) < 2) return "Pak een stuk fruit uit de koelkast 🍎";
  if (nl.uur >= 19 && !gegeten("avondeten")) return "Avondeten gehad? Vink het even af 🍽️";
  return "Even inchecken? Laat zien dat je bezig bent 💪";
}

/** "Lina is al lekker bezig": wie heeft de laatste 2 uur iets gedaan? */
function wieIsBezig(st: State, id: string): string {
  const grens = Date.now() - STIL_MIN * 60e3;
  // deno-lint-ignore no-explicit-any
  const ids = [...new Set((st.feed ?? []).filter((f: any) => f.who !== id && new Date(f.at).getTime() > grens).map((f: any) => f.who))] as string[];
  // deno-lint-ignore no-explicit-any
  const namen = ids.map((x) => st.members?.find((m: any) => m.id === x)?.name).filter(Boolean);
  if (!namen.length) return "";
  return ` ${namen.slice(0, 2).join(" en ")} ${namen.length > 1 ? "zijn" : "is"} al lekker bezig.`;
}

function slaapt(st: State, id: string) {
  const at = st.sleep?.[id];
  return !!at && Date.now() - new Date(at).getTime() < 14 * 3600e3;
}
function inVakantie(st: State, id: string, datum: string) {
  // deno-lint-ignore no-explicit-any
  return (st.vakanties?.[id] ?? []).some((v: any) => datum >= v.van && datum <= v.tot);
}
/** Laatst actief: de stempel uit de app, of anders de laatste check-in. */
function laatstActief(st: State, id: string): number {
  const a = st.actief?.[id] ? new Date(st.actief[id]).getTime() : 0;
  const c = st.checkins?.[id]?.at ? new Date(st.checkins[id].at).getTime() : 0;
  return Math.max(a, c);
}

/** Wat moet deze telefoon nu krijgen? null = niks. */
function beslis(st: State, s: Sub, nu: Date): { titel: string; tekst: string; soort: string } | null {
  // deno-lint-ignore no-explicit-any
  const m = st.members?.find((x: any) => x.id === s.member_id);
  if (!m || slaapt(st, m.id)) return null;
  const nl = nuNL(nu);
  const kind = m.role !== "ouder";
  const bed = mins(m.bedtime, kind ? 22 * 60 : 23 * 60);
  // Nooit 's nachts of vlak voor bedtijd.
  if (nl.min < 7 * 60 || nl.min > bed - 30) return null;
  // Kinderen op een schooldag: niet onder schooltijd.
  const schooldag = kind && nl.wd >= 1 && nl.wd <= 5 && !inVakantie(st, m.id, nl.datum);
  if (schooldag && nl.min >= 8 * 60 + 15 && nl.min < 15 * 60) return null;

  const laatst = laatstActief(st, m.id);
  const vandaagActief = laatst > 0 && nuNL(new Date(laatst)).datum === nl.datum;
  const sindsMelding = s.last_sent ? (nu.getTime() - new Date(s.last_sent).getTime()) / 60e3 : Infinity;
  const vandaagGemeld = !!s.last_sent && nuNL(new Date(s.last_sent)).datum === nl.datum;
  const naam = m.name;

  // 1) Wekmelding voor kinderen: om 9 uur nog niks gedaan (niet op schooldagen). Daarna elk uur, niet pas na 2 uur.
  if (kind && !schooldag && !vandaagActief && nl.min >= 9 * 60) {
    if (vandaagGemeld && sindsMelding < 60) return null;
    const eerste = !(vandaagGemeld && s.last_kind === "wekker");
    return eerste
      ? { titel: `Goedemorgen ${naam}! ☀️`, tekst: `Uitslapen is lekker, maar nu is het tijd. Begin met je ochtendroutine.${wieIsBezig(st, m.id)}`, soort: "wekker" }
      : { titel: `${naam}, ben je al wakker?`, tekst: `Je hebt vandaag nog niks afgevinkt. Check even in en doe je ochtendroutine.${wieIsBezig(st, m.id)}`, soort: "wekker" };
  }
  // Schooldag en na school nog niet in de app geweest.
  if (kind && schooldag && !vandaagActief && nl.min >= 15 * 60 + 30) {
    if (vandaagGemeld && sindsMelding < STIL_MIN) return null;
    return { titel: `Hoi ${naam}, hoe was school?`, tekst: `Je bent vandaag nog niet in de app geweest. Check even in.${wieIsBezig(st, m.id)}`, soort: "na-school" };
  }
  // 2) Al 2 uur stil, terwijl je vandaag wel al bezig was.
  if (!vandaagActief) return null;
  const stil = (nu.getTime() - laatst) / 60e3;
  if (stil < STIL_MIN || sindsMelding < STIL_MIN) return null;
  return { titel: `Hoi ${naam}, alles goed?`, tekst: tekstVoor(st, m.id, nl) + wieIsBezig(st, m.id), soort: "stil" };
}

async function ronde() {
  const subs: Sub[] = await db("push_subs?select=endpoint,family_id,member_id,last_sent,last_kind");
  if (!subs.length) return { gestuurd: 0 };
  const fams = [...new Set(subs.map((s) => s.family_id))];
  const rows = await db(`families?id=in.(${fams.join(",")})&select=id,state`);
  // deno-lint-ignore no-explicit-any
  const per = new Map<string, State>(rows.map((r: any) => [r.id, r.state]));
  const nu = new Date();
  let gestuurd = 0;
  for (const s of subs) {
    const st = per.get(s.family_id);
    if (!st) continue;
    const b = beslis(st, s, nu);
    if (!b) continue;
    try {
      await verstuur(s, b.titel, b.tekst, b.soort);
      gestuurd++;
    } catch (e) {
      console.log("versturen mislukt", String(e));
    }
  }
  return { gestuurd };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    switch (body.action) {
      case "sleutel":
        return json({ publicKey: (await sleutels()).publicKey });

      case "bericht": {
        if (!body.endpoint) throw new Fout("Geen endpoint");
        const rows = await db(`push_subs?endpoint=eq.${encodeURIComponent(body.endpoint)}&select=last_title,last_body`);
        return json(rows?.length ? { titel: rows[0].last_title ?? "FamilyFlow", tekst: rows[0].last_body ?? "" } : { titel: "FamilyFlow", tekst: "Even inchecken?" });
      }

      case "ronde":
        return json(await ronde());

      case "abonneer": {
        const wie = await wieBenIk(req);
        const sub = body.sub;
        if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint)) throw new Fout("Ongeldig abonnement");
        await db("push_subs", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({ endpoint: sub.endpoint, family_id: wie.family_id, member_id: wie.member_id, sub, last_sent: null, last_kind: null }),
        });
        return json({ ok: true });
      }

      case "opzeggen": {
        const wie = await wieBenIk(req);
        await db(`push_subs?endpoint=eq.${encodeURIComponent(String(body.endpoint ?? ""))}&family_id=eq.${wie.family_id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        return json({ ok: true });
      }

      case "test": {
        const wie = await wieBenIk(req);
        const subs: Sub[] = await db(`push_subs?family_id=eq.${wie.family_id}&member_id=eq.${encodeURIComponent(wie.member_id)}&select=endpoint,family_id,member_id,last_sent,last_kind`);
        if (!subs.length) throw new Fout("Deze telefoon staat nog niet aan voor herinneringen");
        for (const s of subs) await verstuur({ ...s }, "Het werkt! 🎉", "Zo zien je herinneringen eruit. Ben je 2 uur stil, dan krijg je er een.", "test");
        // Een test telt niet als herinnering: de klok voor "2 uur stil" begint niet opnieuw.
        for (const s of subs) await db(`push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ last_sent: s.last_sent, last_kind: s.last_kind }) });
        return json({ ok: true, telefoons: subs.length });
      }

      default:
        throw new Fout("Onbekende actie");
    }
  } catch (e) {
    const f = e instanceof Fout ? e : new Fout(String(e), 500);
    return json({ error: f.message }, f.status);
  }
});
