import { test } from "node:test";
import assert from "node:assert/strict";
import { dagAf, doelVan, uurMin, week, weekStand } from "@/lib/scherm";
import { gezin, at } from "./helpers";

test("dag af: pas als routine en klussen van nu en eerder klaar zijn", () => {
  const s = gezin();
  const nu = at("2026-10-15", "10:00");
  const voor = dagAf(s, "k1", nu);
  assert.equal(voor.af, false);
  assert.ok(voor.open.some((x) => /ochtendroutine/i.test(x)));
});

test("schermtijd: week, gemiddelde, binnen de afspraak", () => {
  const s = gezin({ schermtijd: { k1: { "2026-10-14": { totaal: 90, door: "p1", at: "1" }, "2026-10-15": { totaal: 276, sociaal: 233, door: "p1", at: "1" } } }, schermAfspraak: { k1: { doel: 120 } } });
  const nu = at("2026-10-15");
  assert.equal(week(s, "k1", nu).length, 7);
  assert.equal(week(s, "k1", nu)[6].totaal, 276);
  assert.deepEqual(weekStand(s, "k1", nu), { gemiddeld: 183, binnen: 1, dagen: 2 });
  assert.equal(doelVan(s, "k2"), 120);
  assert.equal(uurMin(276), "4 u 36 m");
  assert.equal(weekStand(gezin(), "k1", nu), null);
});
