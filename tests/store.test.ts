import { test } from "node:test";
import assert from "node:assert/strict";
import { actions, snapshot } from "@/lib/store";

// De store start in demomodus (geen browser): het voorbeeldgezin.
const xp = (id: string) => snapshot().xp[id] ?? 0;

test("klus doen en weer weghalen: punten precies terug", () => {
  const voor = xp("k1");
  const id = actions.klusGedaan("ramen", "k1", 20, "Ramen lappen");
  assert.ok(xp("k1") >= voor + 20, "punten erbij (plus eventueel een achievement)");
  const na = xp("k1");
  actions.klusWeg(id, 20);
  assert.equal(xp("k1"), na - 20);
  assert.equal(snapshot().klusLog?.some((k) => k.id === id), false);
});

test("achievement krijgt bonuspunten en een regel in Net gedaan", () => {
  const b = snapshot().badges?.find((x) => x.who === "k1" && x.badge === "shine");
  assert.ok(b, "Altijd shinen na ramen lappen");
  assert.ok(snapshot().feed?.some((f) => f.who === "k1" && /Altijd shinen/.test(f.tekst)));
});

test("claimen zet de schatkist op 0", () => {
  const n = actions.claimPunten("k1");
  assert.ok(n > 0);
  assert.equal(actions.claimPunten("k1"), 0);
});

test("vrij nemen en terugzetten", () => {
  actions.toggleVrij("2026-10-15", "p1", "w1");
  assert.deepEqual(snapshot().vrij?.["2026-10-15"], ["p1:w1"]);
  actions.toggleVrij("2026-10-15", "p1", "w1");
  assert.equal(snapshot().vrij?.["2026-10-15"], undefined);
});

test("water kan niet negatief en niet boven 20", () => {
  actions.updateDag("k2", (l) => ({ ...l, water: -5 }));
  const d = new Date().toLocaleDateString("sv-SE");
  assert.equal(snapshot().dag?.[d]?.k2.water, 0);
  actions.updateDag("k2", (l) => ({ ...l, water: 99 }));
  assert.equal(snapshot().dag?.[d]?.k2.water, 20);
});

test("porren: hooguit één keer per 10 minuten", () => {
  assert.equal(actions.por("p1", "k1", "Water!"), true);
  assert.equal(actions.por("p1", "k1", "Water!"), false);
});
