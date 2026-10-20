import { test } from "node:test";
import assert from "node:assert/strict";
import { KLUSSEN, ZELFDE, klusKeyVoor } from "@/lib/huis";
import { CATALOGUS } from "@/lib/catalog";
import { TASK_SUGGESTIONS } from "@/lib/tasks";
import { gezin } from "./helpers";

// Alle klussen aan, zodat we elke dubbele naam zien.
const allesAan = () => gezin({ klusAfspraken: { klussen: Object.fromEntries(KLUSSEN.map((k) => [k.id, { aan: true }])) } });

test("geen andere naam staat bij twee verschillende klussen", () => {
  const gezien = new Map<string, string>();
  for (const [id, namen] of Object.entries(ZELFDE)) {
    assert.ok(KLUSSEN.some((k) => k.id === id), `onbekende klus ${id}`);
    for (const n of namen) {
      assert.ok(!gezien.has(n) || gezien.get(n) === id, `"${n}" staat bij ${gezien.get(n)} én ${id}`);
      gezien.set(n, id);
    }
  }
});

test("losse taken uit de lijsten die een huistaak zijn, worden herkend", () => {
  const s = allesAan();
  const verwacht: Record<string, string> = {
    "Afval wegbrengen": "afval",
    "Vaatwasser uitruimen": "vaat-uit",
    "Vaatwasser inruimen": "vaat-in",
    "Afwassen": "afwas",
    "Was draaien": "was",
    "Was ophangen": "was",
    "Was vouwen en opruimen": "was-vouwen",
    "Keuken schoonmaken": "keuken",
    "Stoffen": "stoffen",
    "Tafel dekken": "tafel-dekken",
    "Tafel afruimen": "tafel-af",
    "Bedden verschonen": "bedden",
    "Ramen lappen": "ramen",
    "Badkamer schoonmaken": "badkamer",
    "Wc schoonmaken": "wc",
    "Stofzuigen": "stofzuigen",
    "Dweilen": "dweilen",
    "Strijken": "strijken",
    "Huisdier verzorgen": "dier-eten",
    "Huisdier uitlaten of eten geven": "dier-eten",
    "Je eigen schoenen van de trap halen": "schoenen",
  };
  for (const [titel, id] of Object.entries(verwacht)) assert.equal(klusKeyVoor(s, titel), id, titel);
  // Per kind: "Kamer opruimen" voor Noah = zijn eigen kamer. Voor een ouder geen huistaak.
  assert.equal(klusKeyVoor(s, "Kamer opruimen", "k1"), "kamer:k1");
  assert.equal(klusKeyVoor(s, "Bed opmaken", "k2"), "bed-op:k2");
  assert.equal(klusKeyVoor(s, "Kamer opruimen", "p1"), undefined);
});

test("wat géén huistaak is, blijft een losse taak", () => {
  const s = allesAan();
  for (const t of ["Boodschappen doen", "Boodschappen halen", "Bidon en broodtrommel klaarzetten", "Auto wassen", "Koken", "Keukenkastjes schoonmaken", "Huiswerk maken"]) assert.equal(klusKeyVoor(s, t, "k1"), undefined, t);
});

test("overzicht: elke titel uit de lijsten", () => {
  const s = allesAan();
  const titels = [...new Set([...CATALOGUS.map((c) => c.title), ...TASK_SUGGESTIONS.map((t) => t.title)])];
  const rij = titels.map((t) => [t, klusKeyVoor(s, t, "k1") ?? "-"]);
  assert.ok(rij.length > 20);
  if (process.env.FF_OVERZICHT) console.log(rij.map((r) => r.join(" → ")).join("\n"));
});
