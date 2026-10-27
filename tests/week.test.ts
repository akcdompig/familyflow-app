import { test } from "node:test";
import assert from "node:assert/strict";
import { dagStand } from "@/lib/groei";
import { maandag } from "@/lib/huis";
import { actions, snapshot } from "@/lib/store";
import { todayKey } from "@/lib/tasks";
import { leesToets, vaakFout, zelfde } from "@/lib/toets";
import { eerdereWeken, tredenVan, vinkjesNodig, weekDicht, weekKaart } from "@/lib/week";

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

test("weekbonus in groene dagen: twee treden, gesorteerd, en hoeveel dagen nog", () => {
  actions.setWeekAfspraak("k1", [{ pct: 86, dagen: 6, wat: "€ 5" }, { pct: 71, dagen: 5, wat: "€ 2,50" }], "€ 5");
  assert.deepEqual(tredenVan(snapshot(), "k1").map((t) => [t.dagen, t.wat]), [[5, "€ 2,50"], [6, "€ 5"]]);
  assert.equal(snapshot().weekAfspraak?.k1?.zakgeld, "€ 5");
  const k = weekKaart(snapshot(), "k1");
  assert.equal(k.groen, k.week.filter((x) => x.kleur === "groen").length);
  assert.equal(k.behaald, [5, 6].filter((n) => k.groen >= n).length - 1);
  if (k.volgende) assert.equal(k.volgende.nogDagen, k.volgende.dagen! - k.groen);
  assert.equal(vinkjesNodig(5, 10, 80), 3);
  assert.equal(vinkjesNodig(0, 0, 80), 0);
});

test("weekbonus: oude afspraken in procenten worden groene dagen; dubbel of te veel wordt opgeschoond", () => {
  actions.setWeekAfspraak("k2", 80, "Film kiezen");
  assert.deepEqual(tredenVan(snapshot(), "k2").map((t) => [t.dagen, t.wat]), [[6, "Film kiezen"]], "80% van 7 dagen = 6");
  actions.setWeekAfspraak("k2", [{ pct: 75, wat: "a" }, { pct: 75, wat: "b" }, { pct: 90, wat: "c" }, { pct: 95, wat: "d" }], "");
  assert.deepEqual(tredenVan(snapshot(), "k2").map((t) => t.dagen), [5, 6]);
  // Twee oude treden die op hetzelfde aantal dagen uitkomen: de tweede schuift een dag op.
  actions.setWeekAfspraak("k2", [{ pct: 80, wat: "a" }, { pct: 85, wat: "b" }], "");
  assert.deepEqual(tredenVan(snapshot(), "k2").map((t) => t.dagen), [6, 7]);
});

test("weekbonus: afsluiten onthoudt de trede, uitbetaald aan en uit", () => {
  const ma = maandag(d);
  const k = weekKaart(snapshot(), "k1");
  const nep = { ...k, maandag: "2026-01-05", pct: 90, gehaald: true, behaald: 1, beloning: "€ 5" };
  assert.equal(actions.weekAfsluiten("k1", "p1", nep), true);
  assert.equal(snapshot().weekAfsluiting?.k1?.["2026-01-05"]?.trede, 1);
  actions.weekUitbetaald("k1", "2026-01-05", true);
  assert.ok(snapshot().weekAfsluiting?.k1?.["2026-01-05"]?.betaald);
  actions.weekUitbetaald("k1", "2026-01-05", false);
  assert.equal(snapshot().weekAfsluiting?.k1?.["2026-01-05"]?.betaald, undefined);
  assert.ok(eerdereWeken(snapshot(), "k1").some((w) => w.maandag === "2026-01-05"));
  assert.ok(ma >= "2026-01-05");
});

test("oefentoets: poging bewaart antwoorden en zelf-goed; vaker fout telt per vraag", () => {
  actions.bewaarToets("k2", { titel: "Test", door: "p1", vragen: [{ v: "1?", a: "een" }, { v: "2?", a: "twee" }, { v: "3?", a: "drie" }] });
  const id = snapshot().oefentoetsen!.k2!.at(-1)!.id;
  actions.toetsPoging("k2", id, 1, 3, [0, 2], ["ien", "twee", ""], []);
  actions.toetsPoging("k2", id, 2, 3, [0], ["1", "twee", "drei"], [2]);
  const t = snapshot().oefentoetsen!.k2!.find((x) => x.id === id)!;
  assert.equal(t.pogingen!.length, 2);
  assert.deepEqual(t.pogingen![0].antwoorden, ["ien", "twee", ""]);
  assert.equal(t.pogingen![0].zelf, undefined, "geen lege zelf-lijst opslaan");
  assert.deepEqual(t.pogingen![1].zelf, [2]);
  assert.deepEqual(vaakFout(t), [{ i: 0, keer: 2 }], "alleen vraag 1 ging twee keer fout");
  assert.deepEqual(vaakFout({ ...t, pogingen: [{ at: "x", goed: 0, totaal: 3, fout: [0, 0, 9] }] }), [], "dubbel of onbekend telt niet");
});
