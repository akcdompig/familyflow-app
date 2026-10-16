import { test } from "node:test";
import assert from "node:assert/strict";
import { samenwerken } from "@/lib/samenwerken";
import { snapshot } from "@/lib/store";
import { openRegels } from "@/lib/herkomst";

const id = () => snapshot().samen!.find((x) => x.titel === "Sporten test")!.id;
const xp = (w: string) => snapshot().xp[w] ?? 0;

test("gedaan met alleen wie echt meedeed: wie niet mee kon krijgt geen punten", () => {
  samenwerken.plan({ soort: "sport", titel: "Sporten test", wie: ["p1", "k1", "k2"], datum: new Date().toLocaleDateString("sv-SE"), door: "p1" });
  const voor = { p1: xp("p1"), k1: xp("k1"), k2: xp("k2") };
  samenwerken.gedaan(id(), "p1", ["p1", "k2"]);
  assert.equal(xp("p1"), voor.p1 + 10);
  assert.equal(xp("k2"), voor.k2 + 10);
  assert.equal(xp("k1"), voor.k1, "Noah ging niet mee: geen punten");
  assert.deepEqual(snapshot().samen!.find((x) => x.id === id())!.deden, ["p1", "k2"]);
});

test("terugzetten: weer gepland, punten er weer af, ook uit de uitleg", () => {
  const voor = { p1: xp("p1"), k2: xp("k2") };
  samenwerken.terugzetten(id());
  const x = snapshot().samen!.find((m) => m.id === id())!;
  assert.equal(x.gedaan, undefined);
  assert.equal(xp("p1"), voor.p1 - 10);
  assert.equal(xp("k2"), voor.k2 - 10);
  assert.ok(!openRegels(snapshot(), "k2").regels.some((r) => r.wat === "Samen: Sporten test"));
});

test("aanpassen: wie gaat mee en hoe laat, alleen zolang het niet gedaan is", () => {
  samenwerken.wijzigSamen(id(), { wie: ["p1", "k2"], tijd: "18:30" });
  let x = snapshot().samen!.find((m) => m.id === id())!;
  assert.deepEqual(x.wie, ["p1", "k2"]);
  assert.equal(x.tijd, "18:30");
  samenwerken.gedaan(id(), "p1");
  samenwerken.wijzigSamen(id(), { wie: ["p1"] });
  x = snapshot().samen!.find((m) => m.id === id())!;
  assert.deepEqual(x.wie, ["p1", "k2"], "gedaan = niet meer aan te passen, eerst terugzetten");
});
