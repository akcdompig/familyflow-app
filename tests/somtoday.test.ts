import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Nagebootste Somtoday die tokens roteert (oude token werkt daarna niet meer) en een nagebootste database.
type Row = Record<string, unknown>;
let row: Row;
let geldig: string;
let n: number;
let oauth: number;
let storing = false;
let geldigToken: typeof import("../supabase/functions/somtoday/index.ts").geldigToken;

before(async () => {
  (globalThis as unknown as { Deno: unknown }).Deno = { env: { get: (k: string) => (k === "SUPABASE_URL" ? "https://db" : "svc") }, serve: () => {} };
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    await new Promise((r) => setTimeout(r, 20));
    if (u.pathname === "/oauth2/token") {
      oauth++;
      if (storing) return new Response("oeps", { status: 502 });
      const rt = new URLSearchParams(String(init.body)).get("refresh_token");
      if (rt !== geldig) return new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
      geldig = `R${++n + 1}`;
      return new Response(JSON.stringify({ access_token: `A${n}`, refresh_token: geldig, expires_in: 3600 }));
    }
    if (u.pathname === "/rest/v1/somtoday_links") {
      if ((init.method ?? "GET") === "GET") return new Response(JSON.stringify([row]));
      const body = JSON.parse(String(init.body));
      if (u.searchParams.get("or") && row.refreshing_until && new Date(String(row.refreshing_until)) > new Date()) return new Response("[]");
      row = { ...row, ...body };
      return new Response(JSON.stringify([row]));
    }
    return new Response("[]");
  }) as typeof fetch;
  ({ geldigToken } = await import("../supabase/functions/somtoday/index.ts"));
});

beforeEach(() => {
  row = { family_id: "f", member_id: "k1", client_id: "c", refresh_token: "R1", api_url: "https://api", access_token: null, access_expires: null, refreshing_until: null };
  geldig = "R1";
  n = 0;
  oauth = 0;
  storing = false;
});

test("twee telefoons tegelijk: maar één vernieuwing, allebei een geldig token", async () => {
  const [a, b] = await Promise.all([geldigToken({ ...row }), geldigToken({ ...row })]);
  assert.equal(a.at, "A1");
  assert.equal(b.at, "A1");
  assert.equal(oauth, 1);
  assert.equal(row.refresh_token, geldig);
});

test("een vers token wordt hergebruikt zonder Somtoday te vragen", async () => {
  await geldigToken({ ...row });
  await geldigToken({ ...row });
  assert.equal(oauth, 1);
});

test("oud token in geheugen, nieuw in de database: werkt toch", async () => {
  await geldigToken({ ...row });
  row.access_expires = null;
  const r = await geldigToken({ ...row, refresh_token: "R1" });
  assert.equal(r.at, "A2");
  assert.equal(row.last_error, null);
});

test("storing bij Somtoday is géén verlopen koppeling", async () => {
  storing = true;
  await assert.rejects(geldigToken({ ...row }), /niet bereikbaar/);
  assert.equal(row.refresh_token, "R1", "token blijft bewaard");
});
