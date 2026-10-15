import { test } from "node:test";
import assert from "node:assert/strict";
import { geclaimd, levelOf, levelProgress, teClaimen, xpForLevel } from "@/lib/xp";
import { gezin } from "./helpers";

test("levels worden steeds iets zwaarder", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(xpForLevel), [0, 100, 250, 450, 700]);
  assert.equal(levelOf(99), 1);
  assert.equal(levelOf(100), 2);
  assert.equal(levelProgress(175).pct, 50);
});

test("schatkist: verschil tussen verdiend en geclaimd", () => {
  const s = gezin({ xp: { k1: 140 }, claim: { k1: 100 } });
  assert.equal(geclaimd(s, "k1"), 100);
  assert.equal(teClaimen(s, "k1"), 40);
  assert.equal(teClaimen(gezin({ xp: { k1: 50 }, claim: {} }), "k1"), 0, "zonder startpunt niks te claimen");
});
