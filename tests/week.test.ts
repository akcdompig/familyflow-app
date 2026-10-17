import { test } from "node:test";
import assert from "node:assert/strict";
import { dagStand } from "@/lib/groei";
import { maandag } from "@/lib/huis";
import { actions, snapshot } from "@/lib/store";
import { todayKey } from "@/lib/tasks";
import { leesToets, zelfde } from "@/lib/toets";
import { weekDicht, weekKaart } from "@/lib/week";

const d = todayKey();

test("overgeslagen en ging niet door tellen niet mee in het totaal", () => {
  const voor = dagStand(snapshot(), "k1", d);
  const open = voor.items.find((x) => !x.klaar && !x.status)!;
  assert.ok(open, "er staat iets open");
  actions.zetStatus("k1", d, open.id, "nietdoor");
  const na = dagStand(snapshot(), "k1", d);
  assert.equal(na.totaal, voor.totaal - 1);
  assert.equal(na.items.find((x) => x.id === open.id)?.status, "nietdoor");
  actions.zetStatus("k1", d, open.id, null);
  assert.equal(dagStand(snapshot(), "k1", d).totaal, voor.totaal);
});

test("ouder vinkt af voor kind: punten naar het kind, en terug te draaien", () => {
  const item = dagStand(snapshot(), "k1", d).items.find((x) => !x.klaar && (x.soort === "klus" || x.soort === "taak"))!;
  assert.ok(item);
  const xp = snapshot().xp.k1 ?? 0;
  assert.equal(actions.ouderAfvinken("k1", item.id), true);
  assert.ok(dagStand(snapshot(), "k1", d).items.find((x) => x.id === item.id)?.klaar, "staat overal als gedaan");
  assert.ok((snapshot().xp.k1 ?? 0) > xp, "punten naar het kind");
  actions.ouderTerug("k1", item.id);
  assert.equal(dagStand(snapshot(), "k1", d).items.find((x) => x.id === item.id)?.klaar, false);
  assert.ok((snapshot().xp.k1 ?? 0) <= xp + 25, "punten weer weg (op een eventuele badge na)");
});

test("weekkaart telt de week, en afsluiten zet hem vast", () => {
  actions.setWeekAfspraak("k2", 80, "€ 5 weekgeld");
  const k = weekKaart(snapshot(), "k2");
  assert.equal(k.drempel, 80);
  assert.equal(k.beloning, "€ 5 weekgeld");
  assert.equal(k.pct, k.totaal ? Math.round((k.af / k.totaal) * 100) : 0);
  assert.equal(actions.weekAfsluiten("k2", "p1", k), true);
  assert.equal(actions.weekAfsluiten("k2", "p1", { ...k, pct: 100, gehaald: true }), false, "twee keer afsluiten kan niet");
  assert.ok(weekDicht(snapshot(), "k2", d));
  const item = dagStand(snapshot(), "k2", d).items.find((x) => !x.klaar);
  if (item) {
    assert.equal(actions.zetStatus("k2", d, item.id, "overgeslagen"), false, "na afsluiten niks meer wijzigen");
    assert.equal(actions.ouderAfvinken("k2", item.id), false);
  }
  assert.equal(snapshot().weekAfsluiting?.k2?.[maandag(d)]?.pct, k.pct, "afgesloten stand blijft staan");
});

test("oefentoets lezen: V/A/O, ook met vet of nummers; rommel wordt overgeslagen", () => {
  const t = leesToets("V: Wat is 'der Hund'?\nA: de hond\nO: de kat | het huis\n\n**Vraag 2:** Vertaal: het boek\n**Antwoord:** das Buch\n\nzomaar een zin");
  assert.equal(t.vragen.length, 2);
  assert.deepEqual(t.vragen[0], { v: "Wat is 'der Hund'?", a: "de hond", opties: ["de kat", "het huis"] });
  assert.equal(t.vragen[1].a, "das Buch");
  assert.equal(t.fouten, 1);
  assert.ok(zelfde("Das buch!", "das Buch"));
  assert.ok(zelfde("hond", "de hond"));
  assert.ok(!zelfde("kat", "de hond"));
});
