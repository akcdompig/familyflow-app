import { test, before } from "node:test";
import assert from "node:assert/strict";

// De Edge Function draait in Deno; hier zetten we een nep-Deno neer en laden alleen de beslisregels.
let beslis: typeof import("../supabase/functions/herinneringen/index.ts").beslis;
before(async () => {
  (globalThis as unknown as { Deno: unknown }).Deno = { env: { get: () => "x" }, serve: () => {} };
  ({ beslis } = await import("../supabase/functions/herinneringen/index.ts"));
});

const at = (t: string, d = "2026-10-15") => new Date(`${d}T${t}:00+02:00`);
const leden = [{ id: "p1", name: "Angelo", role: "ouder" }, { id: "k1", name: "Kian", role: "kind", bedtime: "21:30" }, { id: "k2", name: "Khloe", role: "tiener" }];
const vak = { k1: [{ naam: "Herfst", van: "2026-10-10", tot: "2026-10-18" }], k2: [{ naam: "Herfst", van: "2026-10-10", tot: "2026-10-18" }] };
const sub = (m: string, last: string | null = null, kind: string | null = null) => ({ endpoint: "https://x", family_id: "f", member_id: m, last_sent: last, last_kind: kind });

test("kind in de vakantie: wekmelding om 9 uur, niet ervoor, daarna elk uur", () => {
  const st = { members: leden, vakanties: vak };
  assert.equal(beslis(st, sub("k1"), at("08:45")), null);
  assert.equal(beslis(st, sub("k1"), at("09:00"))?.soort, "wekker");
  assert.equal(beslis(st, sub("k1", at("09:00").toISOString(), "wekker"), at("09:30")), null);
  assert.match(beslis(st, sub("k1", at("09:00").toISOString(), "wekker"), at("10:05"))!.titel, /wakker/);
});

test("2 uur stil: melding met wat er openstaat en wie al bezig is", () => {
  const st = { members: leden, vakanties: vak, actief: { p1: at("08:10").toISOString() }, feed: [{ who: "k2", at: at("10:00").toISOString() }] };
  assert.equal(beslis(st, sub("p1"), at("10:00")), null);
  const r = beslis(st, sub("p1"), at("10:15"))!;
  assert.equal(r.soort, "stil");
  assert.match(r.tekst, /Khloe is al lekker bezig/);
});

test("nooit 's nachts, niet vlak voor bedtijd, niet als je slaapt", () => {
  const st = { members: leden, vakanties: vak, actief: { k1: at("15:00").toISOString() }, sleep: {} as Record<string, string> } as Record<string, unknown>;
  assert.equal(beslis(st, sub("k1"), at("21:10")), null);
  assert.equal(beslis(st, sub("k1"), at("06:30", "2026-10-16")), null);
  assert.equal(beslis({ ...st, sleep: { k1: at("20:00").toISOString() } }, sub("k1"), at("20:30")), null);
});

test("op school geen meldingen, na school wel", () => {
  const st = { members: leden, vakanties: {}, werk: { k2: [{ id: "s", naam: "ROC", soort: "vast", days: [4], van: "09:00", tot: "13:00", look: "school" }] }, actief: { k2: at("08:00").toISOString() } };
  assert.equal(beslis(st, sub("k2"), at("11:00")), null);
  assert.equal(beslis(st, sub("k2"), at("15:05"))?.soort, "stil");
});

test("op het werk alleen gezondheid; 2 uur tellen vanaf einde werk", () => {
  const st = { members: leden, vakanties: {}, werk: { p1: [{ id: "w", naam: "ING", soort: "vast", days: [4], van: "08:00", tot: "17:00" }] }, actief: { p1: at("08:00").toISOString() } };
  assert.match(beslis(st, sub("p1"), at("10:30"))!.titel, /pauze/);
  assert.equal(beslis(st, sub("p1", at("10:30").toISOString(), "stil"), at("17:30")), null);
  assert.equal(beslis(st, sub("p1", at("10:30").toISOString(), "stil"), at("19:05"))?.soort, "stil");
});

test("restjes in de koelkast: één keer per avond, niet voor de kok", () => {
  const st = { members: leden, vakanties: vak, koken: { "2026-10-15": { kok: "p1" } }, actief: { p1: at("20:00").toISOString(), k1: at("20:30").toISOString() } };
  assert.equal(beslis(st, sub("k1"), at("20:50"))?.soort, "koelkast");
  assert.equal(beslis(st, sub("p1"), at("20:50")), null);
  assert.equal(beslis(st, sub("k1", at("20:50").toISOString(), "koelkast"), at("21:00")), null);
  assert.equal(beslis({ ...st, klusLog: [{ klus: "koelkast", by: "p2", at: at("20:40").toISOString() }] }, sub("k1"), at("20:50")), null);
});
