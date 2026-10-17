import { test } from "node:test";
import assert from "node:assert/strict";
import { gezin } from "./helpers";
import { DAG_OEFENING_XP, gedaanVandaag, oefeningVanVandaag } from "@/lib/oefendag";
import { huistaakVoor } from "@/lib/huis";
import { actions, snapshot } from "@/lib/store";
import { todayKey } from "@/lib/tasks";
import { XP } from "@/lib/xp";

test("zelfde dag = zelfde oefening; niet dezelfde als de afgelopen week", () => {
  const s = gezin({ played: { k1: [] } });
  const a = oefeningVanVandaag(s, "k1", "2026-10-17");
  assert.equal(oefeningVanVandaag(s, "k1", "2026-10-17").id, a.id);
  const met = { ...s, oefenDag: { k1: { "2026-10-16": { oefening: a.id, gedaan: "x" } } } };
  for (const d of ["2026-10-17", "2026-10-18", "2026-10-20", "2026-10-22"]) assert.notEqual(oefeningVanVandaag(met, "k1", d).id, a.id, d);
});

test("oefening van vandaag: één keer punten, terugdraaien geeft precies dezelfde punten terug", () => {
  const d = todayKey();
  const sc = oefeningVanVandaag(snapshot(), "k2", d);
  const voor = snapshot().xp.k2 ?? 0;
  const eerste = !(snapshot().played.k2 ?? []).includes(sc.id);
  assert.equal(actions.dagOefeningGedaan("k2", sc.id, sc.title), true);
  const verwacht = DAG_OEFENING_XP + (eerste ? XP.korteOefening : 0);
  assert.equal((snapshot().xp.k2 ?? 0) - voor, verwacht);
  assert.equal(actions.dagOefeningGedaan("k2", sc.id, sc.title), false, "tweede keer: niks");
  assert.equal((snapshot().xp.k2 ?? 0) - voor, verwacht, "geen dubbele punten");
  assert.ok(gedaanVandaag(snapshot(), "k2", d));
  actions.dagOefeningTerug("k2");
  assert.equal(snapshot().xp.k2 ?? 0, voor, "punten terug");
  assert.equal(gedaanVandaag(snapshot(), "k2", d), undefined);
  assert.equal((snapshot().played.k2 ?? []).includes(sc.id), !eerste, "eerste keer weer niet gespeeld");
  assert.equal(oefeningVanVandaag(snapshot(), "k2", d).id, sc.id, "zelfde oefening staat weer klaar");
  assert.equal(actions.dagOefeningGedaan("k2", sc.id, sc.title), true, "opnieuw doen kan");
});

test("huistaak bestaat al: geen dubbele losse taak", () => {
  const s = gezin();
  assert.equal(huistaakVoor(s, "Vaatwasser uitruimen")?.id, "vaat-uit");
  assert.equal(huistaakVoor(s, "vaatwasser inruimen")?.id, "vaat-in");
  assert.equal(huistaakVoor(s, "Fiets in de schuur zetten"), undefined);
  assert.equal(huistaakVoor(s, "Ramen lappen")?.id, "ramen");
});
