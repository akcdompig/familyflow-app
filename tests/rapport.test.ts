import { test } from "node:test";
import assert from "node:assert/strict";
import { weekRapport } from "@/lib/rapport";
import { gezin, at } from "./helpers";

const lid = (s: ReturnType<typeof gezin>, id: string) => s.members.find((m) => m.id === id)!;

test("weekverhaal: te weinig gegevens = vriendelijke melding, geen oordeel", () => {
  const s = gezin({ conflicts: [] });
  const r = weekRapport(s, lid(s, "p1"), "2026-10-12", at("2026-10-15"));
  assert.equal(r.genoeg, false);
  assert.ok(r.vooruit.punten.length >= 1 && r.vooruit.punten.length <= 2);
});

test("weekverhaal: gepland is niet gedaan; gedaan telt mee in het verhaal", () => {
  const s = gezin({
    samen: [
      { id: "a", soort: "sporten", titel: "Samen trainen", wie: ["p1", "k1", "k2"], datum: "2026-10-13", door: "p1", at: at("2026-10-12").toISOString(), gedaan: at("2026-10-13", "18:00").toISOString(), reactie: { k1: "😍" } },
      { id: "b", soort: "koken", titel: "Samen koken", wie: ["p1", "k2"], datum: "2026-10-14", door: "p1", at: at("2026-10-12").toISOString() },
      { id: "c", soort: "film", titel: "Filmavond", wie: ["p1", "k1"], datum: "2026-10-17", door: "k1", at: at("2026-10-12").toISOString() },
    ],
    conflicts: [{ id: "x", at: at("2026-10-14").toISOString(), from: "k1", with: "k2", topic: "Gamen", physical: false, sides: {}, status: "opgelost", solvedAt: at("2026-10-14").toISOString() }],
  });
  const r = weekRapport(s, lid(s, "p1"), "2026-10-12", at("2026-10-15"));
  assert.deepEqual(r.samen.gedaan.map((x) => x.id), ["a"]);
  assert.deepEqual(r.samen.nietGedaan.map((x) => x.id), ["b"], "gepland in het verleden maar niet afgevinkt");
  assert.deepEqual(r.samen.gepland.map((x) => x.id), ["c"]);
  assert.match(r.verhaal[0], /1× iets samen: samen trainen/);
  assert.ok(r.geoefend.some((g) => g.c.id === "conflicten"));
  assert.ok(r.zelf.some((z) => /heel leuk/.test(z.tekst)), "reactie is zelf aangegeven");
  assert.ok(r.voorbeelden.every((v) => v.b.bron === "feit"));
});

test("weekverhaal: kind ziet alleen zichzelf, ouder iedereen", () => {
  const s = gezin({
    conflicts: [{ id: "x", at: at("2026-10-14").toISOString(), from: "k1", with: "p1", topic: "Gamen", physical: false, sides: {}, status: "opgelost", solvedAt: at("2026-10-14").toISOString() }],
    history: { k2: [{ mood: 2, rest: true, at: at("2026-10-14").toISOString() }] },
  });
  const kind = weekRapport(s, lid(s, "k1"), "2026-10-12", at("2026-10-15"));
  assert.ok(kind.voorbeelden.every((v) => v.lid.id === "k1"));
  assert.ok(!kind.geoefend.some((g) => g.c.id === "teleurstelling"), "rust van zus niet zichtbaar");
  const ouder = weekRapport(s, lid(s, "p1"), "2026-10-12", at("2026-10-15"));
  assert.ok(ouder.geoefend.some((g) => g.c.id === "teleurstelling"));
});
