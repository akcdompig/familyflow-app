import { test } from "node:test";
import assert from "node:assert/strict";
import { basisXp, dagdeel, gegeten, gezondheid, hygiene, kledingDag, walm, gemist, DOEL } from "@/lib/dag";
import { gezin, at } from "./helpers";

const log = (o: object) => ({ routine: [], water: 0, fruit: 0, ...o });

test("dagdeel: ochtend, middag, avond, nacht", () => {
  assert.equal(dagdeel(at("2026-10-15", "07:00")), "ochtend");
  assert.equal(dagdeel(at("2026-10-15", "12:00")), "middag");
  assert.equal(dagdeel(at("2026-10-15", "18:30")), "avond");
  assert.equal(dagdeel(at("2026-10-15", "23:30")), "nacht");
  assert.equal(dagdeel(at("2026-10-15", "03:00")), "nacht");
});

test("kleding: dag 3 in dezelfde set geeft een walmpje", () => {
  const s = gezin({ dag: { "2026-10-13": { k1: log({ kleding: "nieuw" }) }, "2026-10-14": { k1: log({ kleding: "zelfde" }) }, "2026-10-15": { k1: log({ kleding: "zelfde" }) } } });
  assert.equal(kledingDag(s, "k1", "2026-10-15"), 3);
  assert.equal(walm(s, "k1", at("2026-10-15", "08:00")), true);
});

test("kleding: een schone set reset de teller", () => {
  const s = gezin({ dag: { "2026-10-14": { k1: log({ kleding: "zelfde" }) }, "2026-10-15": { k1: log({ kleding: "nieuw" }) } } });
  assert.equal(kledingDag(s, "k1", "2026-10-15"), 1);
});

test("walm pas na de deadline als de routine niet gedaan is", () => {
  const s = gezin();
  assert.equal(walm(s, "k1", at("2026-10-15", "09:00")), false, "voor 10 uur nog geen walm");
  assert.equal(walm(s, "k1", at("2026-10-15", "10:30")), true, "na 10 uur wel");
  const af = gezin({ dag: { "2026-10-15": { k1: log({ routine: ["douchen", "tanden", "deo", "haar", "lotion"], kleding: "nieuw" }) } } });
  assert.equal(walm(af, "k1", at("2026-10-15", "10:30")), false);
  assert.equal(hygiene(af, "k1", at("2026-10-15", "10:30")), 100);
});

test("weekend: deadline pas om 12 uur", () => {
  assert.equal(walm(gezin(), "k1", at("2026-10-17", "11:00")), false);
  assert.equal(walm(gezin(), "k1", at("2026-10-17", "12:30")), true);
});

test("gezondheid telt water, fruit, maaltijden en bewegen", () => {
  const leeg = gezin();
  assert.equal(gezondheid(leeg, "k1", at("2026-10-15")), 0);
  const vol = gezin({ dag: { "2026-10-15": { k1: log({ water: DOEL.water, fruit: DOEL.fruit, eten: ["ontbijt", "lunch", "tussendoor", "avondeten"], sport: true }) } } });
  assert.equal(gezondheid(vol, "k1", at("2026-10-15")), 100);
});

test("oud veld 'ontbijt' telt nog als ontbijt", () => {
  assert.equal(gegeten(log({ ontbijt: true }), "ontbijt"), true);
  assert.equal(gegeten(log({}), "ontbijt"), false);
});

test("basisXp: afvinken en terugzetten geeft precies hetzelfde terug", () => {
  const a = log({});
  const b = log({ routine: ["douchen", "tanden", "deo", "haar", "lotion"], water: 6, fruit: 2, eten: ["ontbijt"] });
  assert.equal(basisXp(a), 0);
  assert.equal(basisXp(b), 5 * 2 + 5 + 5 + 5 + 2);
});

test("gemiste eetmomenten", () => {
  const s = gezin({ dag: { "2026-10-15": { k1: log({ eten: ["ontbijt"] }) } } });
  assert.deepEqual(gemist(s, "k1", at("2026-10-15", "15:00")), ["lunch"]);
  assert.deepEqual(gemist(s, "k1", at("2026-10-15", "09:00")), []);
});

test("ongezond: eerste gratis, daarna zakt gezondheid, hooguit 30", async () => {
  const { gezondheid, ongezond, ongezondAftrek } = await import("../src/lib/dag");
  const nu = new Date();
  const d = nu.toLocaleDateString("sv-SE");
  const st = (extra: object) => ({ members: [], dag: { [d]: { k: { routine: [], water: 6, fruit: 2, eten: ["ontbijt", "lunch", "tussendoor", "avondeten"], ...extra } } } }) as never;
  const basis = gezondheid(st({}), "k", nu);
  assert.equal(gezondheid(st({ snoep: 1 }), "k", nu), basis);
  assert.equal(gezondheid(st({ snoep: 1, zoet: 1 }), "k", nu), basis - 6);
  assert.equal(ongezond({ routine: [], water: 0, fruit: 0, snoep: 2, zoet: 3 }), 5);
  assert.equal(ongezondAftrek({ routine: [], water: 0, fruit: 0, snoep: 20 }), 30);
});
