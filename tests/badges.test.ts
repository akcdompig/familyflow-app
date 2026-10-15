import { test } from "node:test";
import assert from "node:assert/strict";
import { bijna, nieuweBadges } from "@/lib/badges";
import { gezin, at } from "./helpers";

const klusjes = (by: string, n: number, d = "2026-10-15") => Array.from({ length: n }, (_, i) => ({ id: `k${i}`, klus: "keuken", by, at: at(d, `${String(8 + (i % 12)).padStart(2, "0")}:00`).toISOString() }));

test("Huisheld bij 10 klussen in een week", () => {
  const nu = at("2026-10-15", "21:00");
  assert.equal(nieuweBadges(gezin({ klusLog: klusjes("k1", 9) }), nu).length, 0);
  const b = nieuweBadges(gezin({ klusLog: klusjes("k1", 10) }), nu);
  assert.deepEqual(b.map((x) => [x.who, x.def.id]), [["k1", "huisheld"]]);
});

test("oude data van voor de start telt niet mee", () => {
  const s = gezin({ klusLog: klusjes("k1", 10, "2026-10-14"), badgesStart: at("2026-10-15", "00:00").toISOString() });
  assert.equal(nieuweBadges(s, at("2026-10-15", "21:00")).length, 0);
});

test("opnieuw halen kan pas na de wachttijd, en telt alleen nieuwe klussen", () => {
  const eerder = { id: "b", who: "k1", badge: "huisheld", at: at("2026-10-15", "20:00").toISOString(), gezien: [] };
  const s = gezin({ klusLog: klusjes("k1", 10), badges: [eerder] });
  assert.equal(nieuweBadges(s, at("2026-10-15", "21:00")).length, 0, "net gehaald");
  assert.equal(nieuweBadges(s, at("2026-10-23", "21:00")).length, 0, "na 7 dagen, maar geen nieuwe klussen");
});

test("Masterchef: 3 keer gekookt in een week", () => {
  const s = gezin({ koken: { "2026-10-12": { kok: "k2" }, "2026-10-13": { kok: "k2" }, "2026-10-15": { kok: "k2" } } });
  assert.ok(nieuweBadges(s, at("2026-10-15", "20:00")).some((b) => b.who === "k2" && b.def.id === "masterchef"));
});

test("bijna: toont voortgang zonder al gehaalde", () => {
  const v = bijna(gezin({ klusLog: klusjes("k1", 7) }), "k1", at("2026-10-15", "21:00"));
  assert.equal(v[0].def.id, "huisheld");
  assert.equal(v[0].n, 7);
});
