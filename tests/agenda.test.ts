import { test } from "node:test";
import assert from "node:assert/strict";
import { beeldVoor, controleer, verschil } from "@/lib/agenda";
import { waardering, weekInzet } from "@/lib/inzet";
import { actions, snapshot } from "@/lib/store";
import { verdeling } from "@/lib/verdeling";
import { gezin } from "./helpers";

const ontbijt = { titel: "Ontbijten met Akram", datum: "2026-10-20", van: "11:00", tot: "12:00", soort: "sociaal" as const };

test("afspraak zonder werkdag: opslaan lukt, geen punten, geen taak", () => {
  const xp = { ...snapshot().xp };
  const taken = snapshot().tasks.length;
  const id = actions.bewaarAfspraak("p2", ontbijt);
  assert.ok(id);
  assert.equal(snapshot().agenda?.p2?.filter((a) => a.titel === ontbijt.titel).length, 1);
  assert.deepEqual(snapshot().xp, xp, "geen punten");
  assert.equal(snapshot().tasks.length, taken, "geen taak");
});

test("twee keer op opslaan: één afspraak", () => {
  actions.bewaarAfspraak("p2", ontbijt);
  actions.bewaarAfspraak("p2", { ...ontbijt, titel: " ontbijten met akram " });
  assert.equal(snapshot().agenda?.p2?.filter((a) => a.titel.toLowerCase() === "ontbijten met akram").length, 1);
});

test("aanpassen raakt alleen die ene afspraak", () => {
  const a = actions.bewaarAfspraak("p2", { ...ontbijt, titel: "Tandarts", soort: "persoonlijk", van: "09:00", tot: "09:30" })!;
  const b = actions.bewaarAfspraak("p2", { ...ontbijt, titel: "Lunch met Sanne", van: "13:00", tot: "14:00" })!;
  const voorB = snapshot().agenda!.p2.find((x) => x.id === b)!;
  actions.bewaarAfspraak("p2", { ...ontbijt, titel: "Tandarts", soort: "persoonlijk", van: "09:30", tot: "10:00" }, a);
  const na = snapshot().agenda!.p2;
  assert.equal(na.find((x) => x.id === a)!.van, "09:30");
  assert.deepEqual(na.find((x) => x.id === b), voorB, "andere afspraak onveranderd");
});

test("geen stille datum of tijd: zonder tijden niet opslaan", () => {
  assert.ok(controleer({ ...ontbijt, van: "", tot: "" }).length > 0);
  assert.ok(controleer({ ...ontbijt, van: "12:00", tot: "11:00" }).length > 0);
  assert.equal(actions.bewaarAfspraak("p2", { ...ontbijt, van: "" }), null);
});

test("verschil laat zien wat er verandert", () => {
  const oud = { id: "x", at: "", ...ontbijt };
  const v = verschil(oud, { ...ontbijt, van: "10:30" });
  assert.deepEqual(v.map((x) => [x.veld, x.van, x.naar]), [["Begin", "11.00", "10.30"]]);
});

test("plaatje alleen als het iets zegt", () => {
  assert.equal(beeldVoor(ontbijt), "eten");
  assert.equal(beeldVoor({ ...ontbijt, soort: "zakelijk" }), "zakelijk");
  assert.equal(beeldVoor({ titel: "Tandarts", soort: "persoonlijk" }), null);
  assert.equal(beeldVoor({ titel: "Overleg", soort: "zakelijk", met: "Jan" }), "zakelijk");
});

test("zakelijke afspraak: geen werktijd, takenverdeling blijft gelijk", () => {
  const s = gezin();
  const d = "2026-10-21";
  const voor = verdeling(s, d);
  const met = { ...s, agenda: { p1: [{ id: "a", at: "", ...ontbijt, datum: d, soort: "zakelijk" as const }] } };
  assert.deepEqual(verdeling(met, d).wie, voor.wie);
});

test("inzet: waardering alleen met gegevens, en zonder punten", () => {
  const nu = new Date("2026-10-15T20:00:00+02:00");
  const s = gezin();
  assert.deepEqual(waardering(s, "p1", nu), []);
  const met = { ...s, inzet: { p1: [{ id: "i", soort: "pitch" as const, datum: "2026-10-15", at: "" }] }, agenda: { p1: [{ id: "a", at: "", ...ontbijt, datum: "2026-10-15", soort: "zakelijk" as const }] } };
  const z = waardering(met, "p1", nu);
  assert.ok(z.some((x) => /presentatie/.test(x)));
  assert.ok(z.some((x) => /Ontbijten met Akram/.test(x)));
  assert.ok(weekInzet(met, "p1", nu).some((r) => r.bron === "agenda"));
});

test("werkdag telt als dag, niet in uren", () => {
  const nu = new Date("2026-10-15T20:00:00+02:00"); // donderdag
  const s = gezin({ werk: { p1: [{ id: "w", naam: "ING", soort: "vast", days: [1, 2, 4], van: "08:00", tot: "17:00" }], p2: [{ id: "w", naam: "ING", soort: "vast", days: [1, 2, 4], van: "08:00", tot: "12:00" }] } });
  const lang = weekInzet(s, "p1", nu).find((r) => r.bron === "rooster")!.tekst;
  const kort = weekInzet(s, "p2", nu).find((r) => r.bron === "rooster")!.tekst;
  assert.equal(lang, "3 werkdagen bij ING");
  assert.equal(kort, lang);
});
