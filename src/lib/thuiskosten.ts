/*
  3.22 Zuinig thuis. Echte prijzen en milieucijfers, zodat kinderen zien dat douchen, licht en apparaten geld kosten,
  en wat een eigen huis straks per maand kost. Alles is een schatting; de bronnen staan erbij.

  Bronnen (opgezocht oktober 2026):
  - Gas € 1,76 per m³, stroom € 0,32 per kWh: gemiddelde consumentenprijs oktober 2026 (energievergelijk.nl).
  - Water € 1,82 per m³: Vitens 2026, incl. btw en belasting op leidingwater.
  - Douchen: ~8 liter per minuut, ~0,04 m³ gas per minuut (Milieu Centraal: 4 minuten korter per dag scheelt ~60 m³ gas per jaar).
  - CO2: aardgas 2,134 kg per m³, stroom (gemiddelde mix) 0,328 kg per kWh (co2emissiefactoren.nl, 2026, hele keten).
  - Vaste lasten: Nibud-minimumvoorbeeldbegroting alleenstaande, huurwoning (peildatum juli 2025).
*/

export const PRIJS = { gas: 1.76, stroom: 0.32, water: 1.82 };
export const DOUCHE = { liter: 8, gasM3: 0.04 };
/** kg CO2 per m³ gas en per kWh stroom. */
export const CO2 = { gas: 2.134, stroom: 0.328 };

/** Wat kost één minuut douchen, in centen. */
export const doucheMinuut = () => (DOUCHE.liter / 1000) * PRIJS.water * 100 + DOUCHE.gasM3 * PRIJS.gas * 100;

/** Douchen per beurt, per maand en per jaar (één keer per dag), in centen. */
export function douchen(minuten: number, personen = 1) {
  const beurt = doucheMinuut() * minuten;
  const keer = 365 * personen;
  return {
    beurt: Math.round(beurt),
    maand: Math.round(beurt * 30.4 * personen),
    jaar: Math.round(beurt * keer),
    /** Per jaar: liters water en kg CO2 (van het gas voor warm water). */
    liter: Math.round(DOUCHE.liter * minuten * keer),
    co2: Math.round(DOUCHE.gasM3 * CO2.gas * minuten * keer),
  };
}

/** kg CO2 van een apparaat voor een aantal uur of keer. */
export const apparaatCo2 = (a: { kwh: number }, n = 1) => a.kwh * CO2.stroom * n;

/** "2.920 liter" / "62 kg CO2" leesbaar. */
export const getal = (n: number) => Math.round(n).toLocaleString("nl-NL");

export interface Apparaat {
  id: string;
  naam: string;
  emoji: string;
  /** Stroom in kWh per eenheid. */
  kwh: number;
  per: "uur" | "keer";
  tip?: string;
}

/** Ongeveer: het echte verbruik hangt af van het apparaat. */
export const APPARATEN: Apparaat[] = [
  { id: "led", naam: "Ledlamp aan laten", emoji: "💡", kwh: 0.008, per: "uur", tip: "Een ledlamp kost bijna niks. Licht uit is een goede gewoonte, maar de grote kosten zitten ergens anders." },
  { id: "kachel", naam: "Elektrisch kacheltje", emoji: "🔥", kwh: 2, per: "uur", tip: "Een van de duurste dingen in huis. Liever een trui aan." },
  { id: "pc", naam: "Gaming-pc", emoji: "🖥️", kwh: 0.4, per: "uur", tip: "Uitzetten als je klaar bent, niet de hele nacht aan laten staan." },
  { id: "console", naam: "PlayStation of Xbox", emoji: "🎮", kwh: 0.2, per: "uur" },
  { id: "tv", naam: "Tv", emoji: "📺", kwh: 0.1, per: "uur" },
  { id: "droger", naam: "Wasdroger", emoji: "🌀", kwh: 2.5, per: "keer", tip: "Ophangen is gratis. Eén keer minder drogen per week scheelt al flink." },
  { id: "was", naam: "Wasmachine op 40 graden", emoji: "🧺", kwh: 0.8, per: "keer", tip: "Een volle trommel is zuiniger dan twee halve." },
  { id: "fohn", naam: "Föhn (10 minuten)", emoji: "💨", kwh: 0.33, per: "keer" },
  { id: "telefoon", naam: "Telefoon opladen", emoji: "🔌", kwh: 0.015, per: "keer", tip: "Kost bijna niks." },
];

/** Kosten in centen (niet afgerond) voor een aantal uur of keer. */
export const apparaatKost = (a: Apparaat, n = 1) => a.kwh * PRIJS.stroom * 100 * n;

/** Bedrag in centen als tekst, ook als het minder dan een cent is. */
export const prijsTekst = (cents: number) => (cents < 0.5 ? "< € 0,01" : `€ ${(Math.round(cents) / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

export interface Last {
  id: string;
  naam: string;
  emoji: string;
  cents: number;
  uitleg: string;
}

/** Nibud-minimumbegroting, alleenstaande in een huurwoning, per maand (juli 2025). */
export const VASTE_LASTEN: Last[] = [
  { id: "huur", naam: "Huur", emoji: "🏠", cents: 63600, uitleg: "Sociale huur. In de vrije sector vaak het dubbele." },
  { id: "zorg", naam: "Zorgverzekering", emoji: "🩺", cents: 17900, uitleg: "Vanaf je 18e verplicht. Met zorgtoeslag krijg je een deel terug als je weinig verdient." },
  { id: "eten", naam: "Boodschappen", emoji: "🛒", cents: 27200, uitleg: "Zelf koken is veel goedkoper dan bezorgen." },
  { id: "energie", naam: "Gas en stroom", emoji: "⚡", cents: 14300, uitleg: "Hier tellen douchen, verwarming en apparaten mee." },
  { id: "internet", naam: "Telefoon, tv en internet", emoji: "📶", cents: 6400, uitleg: "" },
  { id: "kleding", naam: "Kleding", emoji: "👕", cents: 6200, uitleg: "" },
  { id: "verzekering", naam: "Andere verzekeringen", emoji: "🛡️", cents: 2600, uitleg: "Aansprakelijkheid, inboedel." },
  { id: "vervoer", naam: "Vervoer", emoji: "🚲", cents: 2200, uitleg: "Fiets. Met een auto is het veel meer." },
  { id: "water", naam: "Water", emoji: "🚰", cents: 1700, uitleg: "" },
  { id: "overig", naam: "De rest", emoji: "🧾", cents: 32600, uitleg: "Spullen voor in huis, verzorging, eigen risico, uitjes met vrienden." },
];

export const vasteLastenTotaal = () => VASTE_LASTEN.reduce((a, l) => a + l.cents, 0);

/** Hoeveel uur per maand moet je werken voor dit bedrag, bij dit uurloon (bruto)? */
export const urenPerMaand = (cents: number, uurloon: number) => Math.ceil(cents / uurloon);
