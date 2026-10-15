import { test } from "node:test";
import assert from "node:assert/strict";
import { beurtVoor, eters, honger, KLUSSEN, klusStatus, magRestjes, parseEuro, potStand, rommel, werkOp, werkTaken, euro } from "@/lib/huis";
import { gezin, at } from "./helpers";

const klus = (id: string) => KLUSSEN.find((k) => k.id === id)!;
const st = (s: ReturnType<typeof gezin>, key: string, nu: Date) => klusStatus(s, nu).find((k) => k.key === key)!;

test("dagelijkse klus van gisteren moet vandaag, maar is nog niet te laat", () => {
  const s = gezin({ klusLog: [{ id: "a", klus: "keuken", by: "k1", at: at("2026-10-14", "20:00").toISOString() }] });
  const k = st(s, "keuken", at("2026-10-15", "10:00"));
  assert.equal(k.nodig, true);
  assert.equal(k.teLaat, 0);
  assert.equal(st(s, "keuken", at("2026-10-16", "10:00")).teLaat, 1);
});

test("nooit bijgehouden klus geeft geen rommel", () => {
  assert.deepEqual(rommel(gezin(), at("2026-10-15", "10:00")), []);
});

test("koelkast: alleen als er gekookt is, na het eten", () => {
  const s = gezin({ koken: { "2026-10-15": { kok: "p1" } } });
  assert.equal(st(s, "koelkast", at("2026-10-15", "18:00")).nodig, false, "voor het eten nog niet");
  assert.equal(st(s, "koelkast", at("2026-10-15", "20:00")).nodig, true);
  assert.equal(st(gezin(), "koelkast", at("2026-10-15", "20:00")).nodig, false, "niet gekookt = niet nodig");
});

test("koelkast: vergeten gisteren = pan in de huiskamer, 's ochtends wegzetten telt", () => {
  const s = gezin({ koken: { "2026-10-14": { kok: "p1" } } });
  assert.equal(st(s, "koelkast", at("2026-10-15", "08:00")).teLaat, 1);
  const weg = gezin({ koken: { "2026-10-14": { kok: "p1" } }, klusLog: [{ id: "x", klus: "koelkast", by: "k1", at: at("2026-10-15", "07:30").toISOString() }] });
  assert.equal(st(weg, "koelkast", at("2026-10-15", "08:00")).teLaat, 0);
});

test("koelkast: de kok hoeft het niet zelf te doen", () => {
  const s = gezin({ koken: { "2026-10-15": { kok: "p1" } } });
  assert.notEqual(st(s, "koelkast", at("2026-10-15", "20:00")).beurt?.id, "p1");
});

test("restjes mag hooguit 1 dag (max 2 dagen hetzelfde)", () => {
  assert.equal(magRestjes(gezin({ koken: { "2026-10-14": { kok: "p1" } } }), "2026-10-15"), true);
  assert.equal(magRestjes(gezin({ koken: { "2026-10-14": { restjes: true } } }), "2026-10-15"), false);
  assert.equal(magRestjes(gezin(), "2026-10-15"), false);
});

test("wie werkt tijdens het eten, eet niet mee (tenzij gekozen)", () => {
  const s = gezin({ werk: { p1: [{ id: "w", naam: "Security", soort: "vast", days: [4], van: "17:00", tot: "23:00" }] } });
  assert.equal(eters(s, "2026-10-15").includes("p1"), false);
  assert.equal(eters(s, "2026-10-15").includes("p2"), true);
});

test("honger: na 18 uur en niemand kookt", () => {
  assert.equal(honger(gezin(), "k1", at("2026-10-15", "18:30")), true);
  assert.equal(honger(gezin({ koken: { "2026-10-15": { kok: "p1" } } }), "k1", at("2026-10-15", "18:30")), false);
});

test("beurt: wie nu vrij is gaat voor, daarna wie het het langst niet deed", () => {
  const s = gezin({
    werk: { k1: [{ id: "s", naam: "School", soort: "vast", days: [4], van: "08:30", tot: "15:00", look: "school" }] },
    klusLog: [{ id: "a", klus: "stofzuigen", by: "k2", at: at("2026-10-13").toISOString() }],
  });
  assert.equal(beurtVoor(s, klus("stofzuigen"), at("2026-10-15", "10:00"))?.id, "k2", "Noah zit op school");
  assert.equal(beurtVoor(s, klus("stofzuigen"), at("2026-10-15", "16:00"))?.id, "k1", "na school: Noah, Lina deed het al");
});

test("werk: vrij genomen en school in de vakantie", () => {
  const s = gezin({
    werk: { p1: [{ id: "ing", naam: "ING", soort: "vast", days: [4], van: "08:00", tot: "17:00" }], k1: [{ id: "s", naam: "School", soort: "vast", days: [4], van: "08:30", tot: "15:00", look: "school" }] },
    vrij: { "2026-10-15": ["p1:ing"] },
    vakanties: { k1: [{ naam: "Herfst", van: "2026-10-10", tot: "2026-10-18" }] },
  });
  assert.equal(werkOp(s, "p1", "2026-10-15")[0].vrij, true);
  assert.equal(werkOp(s, "k1", "2026-10-15")[0].vrij, true);
});

test("werktaken: gepland, bezig, gedaan en nachtdienst van gisteren", () => {
  const s = gezin({
    werk: { p1: [{ id: "sec", naam: "Security", soort: "wisselend" }] },
    diensten: [
      { id: "d1", member: "p1", werkId: "sec", date: "2026-10-14", van: "20:00", tot: "02:00" },
      { id: "d2", member: "p1", werkId: "sec", date: "2026-10-15", van: "14:00", tot: "18:00" },
    ],
  });
  const nacht = werkTaken(s, "p1", at("2026-10-15", "01:00"));
  assert.equal(nacht.find((w) => w.dienstId === "d1")?.status, "bezig");
  assert.equal(werkTaken(s, "p1", at("2026-10-15", "13:00")).find((w) => w.dienstId === "d2")?.status, "gepland");
  assert.equal(werkTaken(s, "p1", at("2026-10-15", "16:00")).find((w) => w.dienstId === "d2")?.status, "bezig");
  assert.equal(werkTaken(s, "p1", at("2026-10-15", "19:00")).find((w) => w.dienstId === "d2")?.status, "gedaan");
});

test("potje: stand, uitgaven en bedragen invoeren", () => {
  const s = gezin({ pot: { doel: "Bowlen", cents: 6000, items: [
    { id: "1", cents: 375, soort: "statiegeld", reden: "", by: "k1", at: "" },
    { id: "2", cents: 1000, soort: "inleg", reden: "", by: "p1", at: "" },
    { id: "3", cents: 500, soort: "uitgave", reden: "", by: "p1", at: "" },
  ] } });
  assert.equal(potStand(s), 875);
  assert.equal(parseEuro("3,75"), 375);
  assert.equal(parseEuro("€ 2.5"), 250);
  assert.equal(parseEuro("abc"), 0);
  assert.equal(parseEuro("-4"), 0);
  assert.equal(euro(875), "€ 8,75");
});
