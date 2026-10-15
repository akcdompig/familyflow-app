import { test } from "node:test";
import assert from "node:assert/strict";
import { restTekst, slaapt, werktNu } from "@/lib/status";
import { gezin, at } from "./helpers";

test("vast werk: bezig met voortgang en resttijd", () => {
  const s = gezin({ werk: { p1: [{ id: "ing", naam: "ING", soort: "vast", days: [4], van: "08:00", tot: "17:00" }] } });
  const b = werktNu(s, "p1", at("2026-10-15", "12:30"))!;
  assert.equal(b.werk.naam, "ING");
  assert.equal(b.rest, 270);
  assert.ok(Math.abs(b.pct - 0.5) < 0.01);
  assert.equal(werktNu(s, "p1", at("2026-10-15", "17:00")), null);
  assert.equal(werktNu(s, "p1", at("2026-10-16", "12:00")), null, "vrijdag staat niet in de dagen");
});

test("vrij genomen = niet aan het werk", () => {
  const s = gezin({ werk: { p1: [{ id: "ing", naam: "ING", soort: "vast", days: [4], van: "08:00", tot: "17:00" }] }, vrij: { "2026-10-15": ["p1:ing"] } });
  assert.equal(werktNu(s, "p1", at("2026-10-15", "12:00")), null);
});

test("nachtdienst over middernacht", () => {
  const s = gezin({ werk: { p1: [{ id: "sec", naam: "Security", soort: "wisselend" }] }, diensten: [{ id: "d", member: "p1", werkId: "sec", date: "2026-10-15", van: "22:00", tot: "03:00" }] });
  assert.equal(werktNu(s, "p1", at("2026-10-15", "23:00"))?.look, "security");
  assert.equal(werktNu(s, "p1", at("2026-10-16", "02:00"))?.werk.naam, "Security");
  assert.equal(werktNu(s, "p1", at("2026-10-16", "04:00")), null);
});

test("lesrooster uit Somtoday, niet in de vakantie", () => {
  const s = gezin({ rooster: { k1: [{ date: "2026-10-15", van: "08:30", tot: "14:45", lessen: 7 }] } });
  assert.equal(werktNu(s, "k1", at("2026-10-15", "10:00"))?.look, "school");
  const vak = gezin({ ...s, vakanties: { k1: [{ naam: "Herfst", van: "2026-10-10", tot: "2026-10-18" }] } });
  assert.equal(werktNu(vak, "k1", at("2026-10-15", "10:00")), null);
});

test("slapen telt maximaal 14 uur", () => {
  const s = gezin({ sleep: { k1: at("2026-10-14", "22:00").toISOString() } });
  assert.equal(slaapt(s, "k1", at("2026-10-15", "07:00")), true);
  assert.equal(slaapt(s, "k1", at("2026-10-15", "13:00")), false);
});

test("resttijd leesbaar", () => {
  assert.equal(restTekst(200), "nog 3u 20m");
  assert.equal(restTekst(60), "nog 1u");
  assert.equal(restTekst(15), "nog 15 min");
});
