import { test } from "node:test";
import assert from "node:assert/strict";
import { zoekTaken } from "@/components/screens/Toevoegen";
import { CATALOGUS } from "@/lib/catalog";

test("zoeken bij taak toevoegen: in alle soorten, zonder hoofdletters, wat ermee begint eerst", () => {
  const was = zoekTaken("was", CATALOGUS).map((c) => c.title);
  assert.ok(was.length >= 2, "meerdere was-taken");
  assert.ok(was[0].toLowerCase().startsWith("was"), `eerst wat met 'was' begint: ${was.join(", ")}`);
  assert.ok(zoekTaken("VAATWASSER", CATALOGUS).every((c) => /vaatwasser/i.test(c.title)));
  assert.deepEqual(zoekTaken("   ", CATALOGUS), []);
  assert.deepEqual(zoekTaken("xyzqq", CATALOGUS), []);
  const soorten = new Set(zoekTaken("e", CATALOGUS).map((c) => c.cat));
  assert.ok(soorten.size > 1, "zoekt in meerdere soorten tegelijk");
});
