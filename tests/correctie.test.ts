import { test } from "node:test";
import assert from "node:assert/strict";
import { actions, snapshot } from "@/lib/store";
import { dagStand } from "@/lib/groei";
import { addDays } from "@/lib/planner";
import { todayKey } from "@/lib/tasks";

// 3.21: een ouder zet vinkjes goed, ook op een eerdere dag. Kind vinkte af maar deed het niet? Vinkje en punten weg.
const vandaag = todayKey();
const gisteren = addDays(vandaag, -1);
const xp = () => snapshot().xp.k1 ?? 0;
const item = (d: string, id: string) => dagStand(snapshot(), "k1", d).items.find((x) => x.id === id);

test("taak van gisteren: kind vinkte af, ouder haalt het weg, punten eraf", () => {
  actions.addTask({ title: "Kamer stofzuigen test", icon: "schoon", assignee: "k1", repeat: "eenmalig", date: gisteren, xp: 10, createdBy: "p1" });
  const t = snapshot().tasks.find((x) => x.title === "Kamer stofzuigen test")!;
  actions.toggleTask(t, "k1", gisteren);
  assert.ok(item(gisteren, `taak:${t.id}`)?.klaar, "kind heeft gisteren afgevinkt");
  const voor = xp();
  assert.equal(actions.ouderZet("k1", gisteren, `taak:${t.id}`, false), true);
  assert.equal(item(gisteren, `taak:${t.id}`)?.klaar, false, "weer open");
  assert.equal(xp(), voor - 10, "punten eraf");
  assert.equal(snapshot().done[vandaag]?.[t.id], undefined, "vandaag niet geraakt");
});

test("ochtendroutine en eten van gisteren terugzetten, punten eraf", () => {
  actions.updateDag("k1", (l) => ({ ...l, routine: ["douchen", "tanden", "deo", "haar", "lotion"], eten: ["lunch"] }), gisteren);
  assert.ok(item(gisteren, "routine")?.klaar);
  assert.ok(item(gisteren, "eten:lunch")?.klaar);
  const voor = xp();
  actions.ouderZet("k1", gisteren, "routine", false);
  actions.ouderZet("k1", gisteren, "eten:lunch", false);
  assert.equal(item(gisteren, "routine")?.klaar, false);
  assert.equal(item(gisteren, "eten:lunch")?.klaar, false);
  assert.ok(xp() < voor, "punten eraf");
  // En weer goed: wel gedaan.
  actions.ouderZet("k1", gisteren, "eten:lunch", true);
  assert.ok(item(gisteren, "eten:lunch")?.klaar);
});

test("huistaak van gisteren: wel gedaan en weer toch niet gedaan", () => {
  // Een huistaak uit de lijst van vandaag, maar dan voor gisteren.
  const k = dagStand(snapshot(), "k1", vandaag).items.find((x) => x.soort === "klus" && !x.klaar)!;
  assert.ok(k, "demogezin heeft een huistaak");
  assert.ok(!item(gisteren, k.id)?.klaar);
  const voor = xp();
  assert.equal(actions.ouderZet("k1", gisteren, k.id, true), true);
  assert.ok(item(gisteren, k.id)?.klaar);
  assert.ok(xp() > voor);
  assert.equal(actions.ouderZet("k1", gisteren, k.id, false), true);
  assert.ok(!item(gisteren, k.id)?.klaar, "niet meer gedaan");
  assert.equal(xp(), voor, "punten precies terug");
});

test("niet in de toekomst", () => {
  assert.equal(actions.ouderZet("k1", addDays(vandaag, 1), "routine", true), false);
});
