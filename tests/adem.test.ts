import { test } from "node:test";
import assert from "node:assert/strict";
import { metAdem } from "@/components/ui/Stoplicht";

const A = "Ademhalen met de app";

test("ademhalen valt nooit af als de lijst wordt ingekort", () => {
  const lijst = ["a", "b", "c", "d", "e", "f", "g", A];
  const uit = metAdem(lijst, 6);
  assert.equal(uit.length, 6);
  assert.ok(uit.includes(A));
});
test("dubbele opties verdwijnen, volgorde blijft", () => {
  assert.deepEqual(metAdem(["a", "b", "a"], 6), ["a", "b"]);
});
test("zonder ademoptie gewoon inkorten", () => {
  assert.deepEqual(metAdem(["a", "b", "c"], 2), ["a", "b"]);
});
