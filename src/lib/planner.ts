/*
  Leerplanner. Geen AI: vaste regels.
  1. Herkennen: uit geplakte tekst (bijvoorbeeld de Somtoday-week via iPhone "Kopieer alles") halen we vak, soort en datum.
  2. Het kind controleert en past aan.
  3. Plannen: elke toets of opdracht wordt verdeeld in korte blokjes over de dagen ervoor.
     Kort en vaak werkt beter dan alles op de laatste avond, zeker bij ADHD of ADD.
*/

export type Soort = "toets" | "so" | "leren" | "inleveren" | "huiswerk";

export interface PlanItem {
  id: string;
  subject: string;
  kind: Soort;
  /** Inleverdatum of toetsdatum, YYYY-MM-DD. Leeg = nog kiezen. */
  date: string;
  note: string;
  /** Id uit Somtoday. */
  sid?: string;
}

export interface Blok {
  itemId: string;
  subject: string;
  kind: Soort;
  date: string;
  min: number;
  part: number;
  of: number;
  title: string;
  deadline: string;
  sid?: string;
  note?: string;
}

/** venster = hoeveel dagen vóór de deadline je begint. */
export const SOORT: Record<Soort, { label: string; blokken: number; min: number; venster: number; uitleg: string }> = {
  toets: { label: "Toets of proefwerk", blokken: 4, min: 20, venster: 7, uitleg: "4 blokjes van 20 minuten in de week ervoor, de laatste avond herhalen" },
  so: { label: "SO of overhoring", blokken: 2, min: 15, venster: 4, uitleg: "2 blokjes van 15 minuten" },
  leren: { label: "Woordjes of stof leren", blokken: 3, min: 10, venster: 5, uitleg: "3 keer 10 minuten, verspreid" },
  inleveren: { label: "Opdracht inleveren", blokken: 2, min: 30, venster: 7, uitleg: "2 blokjes van 30 minuten" },
  huiswerk: { label: "Huiswerk maken", blokken: 1, min: 25, venster: 2, uitleg: "1 blokje, de dag ervoor" },
};

export const VAKKEN = ["Wiskunde", "Nederlands", "Engels", "Frans", "Duits", "Biologie", "Geschiedenis", "Aardrijkskunde", "Natuurkunde", "Scheikunde", "NaSk", "Economie", "Maatschappijleer", "Techniek", "Lezen"];

const VAK_PATRONEN: [RegExp, string][] = [
  [/\bwiskunde\b|\bwis\b/i, "Wiskunde"],
  [/\bnederlands\b|\bned\b/i, "Nederlands"],
  [/\bengels\b|\beng\b/i, "Engels"],
  [/\bfrans\b|\bfra\b/i, "Frans"],
  [/\bduits\b|\bdui\b/i, "Duits"],
  [/\bbiologie\b|\bbio\b/i, "Biologie"],
  [/\bgeschiedenis\b|\bges\b/i, "Geschiedenis"],
  [/\baardrijkskunde\b|\baak\b/i, "Aardrijkskunde"],
  [/\bnatuurkunde\b/i, "Natuurkunde"],
  [/\bscheikunde\b/i, "Scheikunde"],
  [/\bnask\b|\bnatuur-? en scheikunde\b/i, "NaSk"],
  [/\beconomie\b|\beco\b/i, "Economie"],
  [/\bmaatschappijleer\b|\bmaat\b/i, "Maatschappijleer"],
  [/\btechniek\b/i, "Techniek"],
  [/^\s*(lo|gym)\b|lichamelijke opvoeding/i, "LO"],
];
/** Korte vakcodes zoals in Somtoday. Alleen herkennen als ze los aan het begin van een regel staan. */
const AFKORTINGEN: Record<string, string> = { wi: "Wiskunde", ne: "Nederlands", en: "Engels", fa: "Frans", du: "Duits", bi: "Biologie", gs: "Geschiedenis", ak: "Aardrijkskunde", nk: "Natuurkunde", sk: "Scheikunde", ec: "Economie" };

const DAGEN = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const DAG_KORT = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export const iso = (d: Date) => d.toLocaleDateString("sv-SE");
const atNoon = (s: string) => new Date(s + "T12:00:00");
export const addDays = (s: string, n: number) => {
  const d = atNoon(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const dayLabel = (s: string) => {
  const d = atNoon(s);
  return `${DAG_KORT[d.getDay()]} ${d.getDate()} ${MAANDEN[d.getMonth()]}`;
};

function vakVan(line: string): string | null {
  for (const [re, v] of VAK_PATRONEN) if (re.test(line)) return v;
  const m = line.trim().match(/^([a-z]{2})(?:\s*[:\-–]|\s*$|\s+\d)/i);
  if (m && AFKORTINGEN[m[1].toLowerCase()]) return AFKORTINGEN[m[1].toLowerCase()];
  return null;
}

function soortVan(text: string): Soort | null {
  const t = text.toLowerCase();
  if (/proefwerk|\bpw\b|\btoets\b|\btt\b|\bexamen\b/.test(t)) return "toets";
  if (/\bso\b|overhoring|schriftelijke/.test(t)) return "so";
  if (/inleveren|werkstuk|verslag|presentatie|boekverslag/.test(t)) return "inleveren";
  if (/woordjes|\bleren\b|\bleer\b|uit je hoofd/.test(t)) return "leren";
  if (/maken|huiswerk|\bhw\b|opdracht|\blezen\b|afmaken/.test(t)) return "huiswerk";
  return null;
}

/** Datum in een regel: "maandag", "ma 20 okt", "20 oktober", "20-10", "20/10". */
function datumVan(line: string, today = new Date()): string | null {
  const t = line.toLowerCase();
  const year = today.getFullYear();
  const mk = (day: number, month: number) => {
    let d = new Date(year, month, day, 12);
    if (d.getTime() < today.getTime() - 60 * 864e5) d = new Date(year + 1, month, day, 12);
    return iso(d);
  };
  let m = t.match(/\b(\d{1,2})\s+(jan|feb|mrt|maa|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*\.?/);
  if (m) {
    const mi = MAANDEN.indexOf(m[2] === "maa" ? "mrt" : m[2]);
    if (mi >= 0) return mk(Number(m[1]), mi);
  }
  m = t.match(/\b(\d{1,2})[-/](\d{1,2})(?:[-/]\d{2,4})?\b/);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return mk(Number(m[1]), Number(m[2]) - 1);
  const dag = DAGEN.findIndex((d) => t.includes(d));
  const kort = dag < 0 ? DAG_KORT.findIndex((d) => new RegExp(`^\\s*${d}\\b\\.?`).test(t)) : -1;
  const wd = dag >= 0 ? dag : kort;
  if (wd >= 0) {
    const d = new Date(today);
    d.setHours(12, 0, 0, 0);
    const diff = (wd - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
    return iso(d);
  }
  return null;
}

/** Herken toetsen en huiswerk in geplakte tekst. Het kind controleert het resultaat altijd zelf. */
export function herken(text: string, today = new Date()): PlanItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: PlanItem[] = [];
  let date = "";
  let cur: { subject: string; date: string; lines: string[] } | null = null;
  const flush = () => {
    if (!cur) return;
    const all = cur.lines.join(" ");
    const kind = soortVan(all);
    if (kind) {
      const note = all.replace(new RegExp(cur.subject, "i"), "").replace(/\s+/g, " ").trim().slice(0, 70);
      items.push({ id: "i" + items.length + Math.random().toString(36).slice(2, 6), subject: cur.subject, kind, date: cur.date, note });
    }
    cur = null;
  };
  for (const line of lines) {
    const d = datumVan(line, today);
    const v = vakVan(line);
    if (d && !v) {
      flush();
      date = d;
      continue;
    }
    if (v) {
      flush();
      cur = { subject: v, date: d ?? date, lines: [line] };
      continue;
    }
    if (cur) cur.lines.push(line);
  }
  flush();
  // Dubbele samenvoegen (zelfde vak, soort en datum).
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = `${i.subject}|${i.kind}|${i.date}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const titel = (subject: string, kind: Soort, part: number, of: number) => {
  const last = part === of;
  if (kind === "toets") return last && of > 1 ? `${subject}: herhalen voor de toets` : `${subject}: leren voor de toets (${part}/${of})`;
  if (kind === "so") return last && of > 1 ? `${subject}: herhalen voor de SO` : `${subject}: leren voor de SO (${part}/${of})`;
  if (kind === "leren") return `${subject}: leren (${part}/${of})`;
  if (kind === "inleveren") return `${subject}: werken aan de opdracht (${part}/${of})`;
  return `${subject}: huiswerk maken`;
};

export interface PlanResult {
  blokken: Blok[];
  krap: string[];
  telaat: string[];
}

/**
 * Verdeel elk item over de dagen tot de deadline (de deadline zelf telt niet mee).
 * Maximaal maxPerDag minuten per dag, op drukke dagen maxDruk. Bestaande leerblokken tellen mee.
 */
export function plan(items: PlanItem[], opts: { today?: string; maxPerDag?: number; maxDruk?: number; drukkeDagen?: number[]; bestaand?: { date: string; min: number }[] } = {}): PlanResult {
  const today = opts.today ?? iso(new Date());
  const maxPerDag = opts.maxPerDag ?? 60;
  const maxDruk = opts.maxDruk ?? 20;
  const druk = new Set(opts.drukkeDagen ?? []);
  const load = new Map<string, number>();
  for (const b of opts.bestaand ?? []) load.set(b.date, (load.get(b.date) ?? 0) + b.min);
  const cap = (d: string) => (druk.has(atNoon(d).getDay()) ? maxDruk : maxPerDag);
  const blokken: Blok[] = [];
  const krap: string[] = [];
  const telaat: string[] = [];

  for (const it of [...items].filter((i) => i.date).sort((a, b) => a.date.localeCompare(b.date))) {
    const { blokken: n, min, venster } = SOORT[it.kind];
    const days: string[] = [];
    const from = addDays(it.date, -venster) > today ? addDays(it.date, -venster) : today;
    for (let d = from; d < it.date; d = addDays(d, 1)) days.push(d);
    if (!days.length) {
      telaat.push(`${it.subject} (${SOORT[it.kind].label.toLowerCase()})`);
      continue;
    }
    // Spreid de blokjes over het venster; het laatste blokje op de dag vóór de deadline.
    const k = days.length - 1;
    let idx: number[];
    if (n > days.length) {
      idx = Array.from({ length: n }, (_, i) => i % days.length).sort((a, b) => a - b);
      krap.push(`${it.subject}: weinig tijd, begin vandaag`);
    } else {
      idx = Array.from({ length: n }, (_, i) => (n === 1 ? k : Math.round((i * k) / (n - 1))));
    }
    let over = false;
    idx.forEach((pos, i) => {
      // Zoek de dichtstbijzijnde dag met ruimte, eerst eerder, dan later.
      let chosen = pos;
      const fits = (p: number) => (load.get(days[p]) ?? 0) + min <= cap(days[p]);
      if (!fits(pos)) {
        let found = -1;
        for (let dlt = 1; dlt <= k && found < 0; dlt++) {
          if (pos - dlt >= 0 && fits(pos - dlt)) found = pos - dlt;
          else if (pos + dlt <= k && fits(pos + dlt)) found = pos + dlt;
        }
        if (found >= 0) chosen = found;
        else over = true;
      }
      const d = days[chosen];
      load.set(d, (load.get(d) ?? 0) + min);
      blokken.push({ itemId: it.id, subject: it.subject, kind: it.kind, date: d, min, part: i + 1, of: n, title: titel(it.subject, it.kind, i + 1, n), deadline: it.date, sid: it.sid, note: it.note || undefined });
    });
    if (over) krap.push(`${it.subject}: sommige dagen worden vol`);
  }
  // Binnen één item de nummering op datum zetten.
  const byItem = new Map<string, Blok[]>();
  for (const b of blokken) byItem.set(b.itemId, [...(byItem.get(b.itemId) ?? []), b]);
  for (const list of byItem.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    list.forEach((b, i) => {
      b.part = i + 1;
      b.title = titel(b.subject, b.kind, i + 1, list.length);
    });
  }
  return { blokken: blokken.sort((a, b) => a.date.localeCompare(b.date)), krap: [...new Set(krap)], telaat };
}

/** Een item zoals de Edge Function "somtoday" het teruggeeft. */
export interface SomItem {
  sid: string;
  date: string;
  vak: string;
  type: string; // HUISWERK | TOETS | GROTE_TOETS
  onderwerp: string;
  omschrijving: string;
  gemaakt: boolean;
}

/** Vaknaam uit Somtoday naar onze vaknaam ("wiskunde" → "Wiskunde", "nask1" → "NaSk"). */
const STAMMEN: [string, string][] = [
  ["wisk", "Wiskunde"], ["neder", "Nederlands"], ["engel", "Engels"], ["fran", "Frans"], ["duit", "Duits"], ["biol", "Biologie"],
  ["gesch", "Geschiedenis"], ["aardr", "Aardrijkskunde"], ["nask", "NaSk"], ["natuurk", "Natuurkunde"], ["scheik", "Scheikunde"],
  ["econ", "Economie"], ["maatsch", "Maatschappijleer"], ["techn", "Techniek"], ["lichamelijk", "LO"], ["mens en natuur", "Mens en natuur"], ["mens en maat", "Mens en maatschappij"],
];
export function vakNaam(naam: string): string {
  const laag = naam.toLowerCase();
  for (const [stam, v] of STAMMEN) if (laag.includes(stam)) return v;
  const v = vakVan(naam);
  if (v) return v;
  const t = naam.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "School";
}

/** Somtoday-item naar een planitem voor de leerplanner. Al gemaakt huiswerk slaan we over. */
export function vanSomtoday(i: SomItem): PlanItem | null {
  const tekst = `${i.onderwerp} ${i.omschrijving}`;
  let kind: Soort;
  if (i.type === "GROTE_TOETS") kind = "toets";
  else if (i.type === "TOETS") kind = /\bso\b|overhoring|schriftelijke/i.test(tekst) ? "so" : "toets";
  else {
    if (i.gemaakt) return null;
    kind = soortVan(tekst) ?? "huiswerk";
    if (kind === "toets" || kind === "so") kind = "leren"; // als huiswerk opgegeven: leren, geen echte toets
  }
  const note = [i.onderwerp, i.omschrijving].filter(Boolean).join(" – ").slice(0, 120);
  return { id: "s" + i.sid, sid: i.sid, subject: vakNaam(i.vak), kind, date: i.date, note };
}
