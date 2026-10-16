/*
  Coach op jouw interesses. Iedereen kiest waar hij beter in wil worden: koken, sport, gezond eten,
  leren en plannen, je hoofd (schermtijd, slaap, stress) of geld en sparen.
  Elke dag een tip die past bij je leeftijd. Bij koken ook een makkelijk recept, dat je meteen kunt inplannen.
  Vaste teksten, geen AI: zo weet je als ouder precies wat je kinderen te lezen krijgen.
*/

import type { Member } from "./types";

export type Onderwerp = "koken" | "sport" | "gezond" | "praten" | "leren" | "hoofd" | "geld";
export type Groep = "kind" | "tiener" | "ouder";

export const ONDERWERPEN: { id: Onderwerp; label: string; emoji: string; uitleg: string }[] = [
  { id: "koken", label: "Koken", emoji: "🍳", uitleg: "Makkelijke recepten en keukentrucs" },
  { id: "sport", label: "Sport en fitness", emoji: "💪", uitleg: "Fitter worden, rustig opbouwen" },
  { id: "gezond", label: "Gezond eten en drinken", emoji: "🥦", uitleg: "Wat is goed voor je, en wat niet" },
  { id: "praten", label: "Praten en ruzie oplossen", emoji: "🤝", uitleg: "Rustig blijven, luisteren, samen oplossen" },
  { id: "leren", label: "Leren en plannen", emoji: "📚", uitleg: "Slimmer leren, minder stress voor toetsen" },
  { id: "hoofd", label: "Je hoofd", emoji: "🧠", uitleg: "Gamen, schermtijd, slaap en stress" },
  { id: "geld", label: "Geld en sparen", emoji: "💰", uitleg: "Sparen, uitgeven en slim kopen" },
];

export const groepVan = (m: Member): Groep => (m.role === "ouder" ? "ouder" : (m.age ?? 13) < 12 ? "kind" : "tiener");

interface Tip {
  tekst: string;
  voor?: Groep[];
}

const TIPS: Record<Onderwerp, Tip[]> = {
  koken: [
    { tekst: "Lees het hele recept één keer door voordat je begint. Dan sta je niet halverwege zonder ui." },
    { tekst: "Snij eerst alles en zet het klaar in bakjes. Koken gaat dan vanzelf, net als in een kookprogramma." },
    { tekst: "Een ui snijden zonder tranen: een scherp mes en de ui eerst 10 minuten in de koelkast." },
    { tekst: "Proef tijdens het koken. Te flauw? Een snufje zout of een kneepje citroen maakt het af." },
    { tekst: "Ruim op terwijl het eten staat te pruttelen. Dan is de keuken schoon als jullie gaan eten." },
    { tekst: "Rijst nooit meer aangebrand: 1 deel rijst, 1,5 deel water, deksel erop en niet roeren." },
    { tekst: "Kook je voor 4? Maak meteen voor 6. Morgen restjes, en de koelkast is je beste vriend." },
    { tekst: "Pasta-water mag zout zijn als de zee. Zo smaakt de pasta zelf ook ergens naar.", voor: ["tiener", "ouder"] },
  ],
  sport: [
    { tekst: "Begin klein: 10 minuten bewegen per dag is al beter dan 1 keer per week een uur afzien." },
    { tekst: "Warm altijd 5 minuten op: wat touwtjespringen, armen draaien, rustig joggen op de plek." },
    { tekst: "Spierpijn de dag erna is normaal. Lekker blijven bewegen helpt beter dan stilzitten." },
    { tekst: "Rechtop staan helpt al: schouders naar achteren en omlaag, kin iets in. Doe het een paar keer per dag bewust.", voor: ["tiener", "ouder"] },
    { tekst: "Drink voor, tijdens en na het sporten water. Zweten = water kwijt." },
    { tekst: "Kracht opbouwen gaat over herhalen, niet over zo zwaar mogelijk. Goede techniek eerst.", voor: ["tiener", "ouder"] },
    { tekst: "Samen sporten is makkelijker volhouden. Vraag iemand uit het gezin om mee te gaan wandelen of fietsen." },
    { tekst: "Rust is ook training. Je spieren worden sterker tijdens het herstellen, niet tijdens het sporten zelf." },
    { tekst: "Buiten spelen telt ook als sport! Voetballen, klimmen, fietsen: alles waar je van gaat hijgen.", voor: ["kind"] },
  ],
  gezond: [
    { tekst: "Drink zo'n 1,5 liter water per dag: dat zijn 6 glazen. Je hersenen bestaan voor een groot deel uit water. Al een beetje te weinig drinken maakt je moe, geeft hoofdpijn en je kunt je slechter concentreren." },
    { tekst: "Dorst is al een teken dat je te laat bent. Zet 's ochtends een fles water klaar en drink er de hele dag van." },
    { tekst: "Je brein draait 's ochtends op je ontbijt. Iets met eiwit, zoals eieren, kwark of yoghurt, houdt je langer vol en helpt je concentratie op school." },
    { tekst: "Noedels uit een zakje als ontbijt? Veel zout, weinig eiwit en je hebt snel weer honger. Eieren, kwark met fruit of havermout geven je veel langer energie." },
    { tekst: "Veel suiker geeft eerst een piek en dan een dip: moe, chagrijnig en zin in nog meer. Daarom liever geen frisdrank met suiker. Water is het beste, light of zero kan af en toe." },
    { tekst: "Kies vers in plaats van bewerkt: groente, fruit, eieren, vlees, vis, kwark. Chips, kant-en-klaar en zakjes zitten vaak vol zout, suiker en vet, en houden je niet lang vol." },
    { tekst: "Train je? Drink voor, tijdens en na het sporten. Heb je veel gezweet, dan mag er een klein snufje zout in je water om aan te vullen wat je kwijt bent." },
    { tekst: "Na het trainen herstellen je spieren. Eiwit helpt daarbij: een glas melk, kwark, eieren, kip of vis." },
    { tekst: "Twee stuks fruit per dag: leg ze 's ochtends al klaar, dan pak je ze vanzelf." },
    { tekst: "Energiedrankjes zijn niet bedoeld voor tieners: veel suiker en cafeïne, slechter slapen, een onrustig hoofd.", voor: ["tiener", "kind"] },
    { tekst: "Groente bij elke warme maaltijd: maak er een spelletje van wie de meeste kleuren op zijn bord heeft." },
    { tekst: "Honger tussendoor? Kies eerst fruit, een eitje, kwark of een boterham, en pas daarna iets lekkers." },
    { tekst: "Eet niet achter een scherm. Dan merk je niet wanneer je vol zit." },
    { tekst: "Zet water op tafel en leg fruit in het zicht. Wat makkelijk te pakken is, eten en drinken kinderen vanzelf.", voor: ["ouder"] },
    { tekst: "Leg uit wáárom, niet alleen dát: \"Je hersenen werken beter met water en een goed ontbijt.\" Kinderen houden iets beter vol als ze snappen waarom.", voor: ["ouder"] },
    { tekst: "Koop wat je wilt dat ze eten. Ligt er geen frisdrank of snoep in huis, dan is de keuze makkelijk.", voor: ["ouder"] },
  ],
  praten: [
    { tekst: "Boos? Eerst afkoelen, dan praten. Zeg: \"Ik wil hier zo over praten, maar nu even niet.\"" },
    { tekst: "Praat in ik-zinnen: \"Ik baal ervan als…\" in plaats van \"Jij doet altijd…\". Dan voelt de ander zich minder aangevallen." },
    { tekst: "Laat de ander uitpraten. Zeg daarna kort wat je hoorde: \"Dus jij vindt dat…?\" Dan voelt iemand zich gehoord." },
    { tekst: "Schreeuwt de ander? Praat jij juist langzamer en zachter. Rust werkt aanstekelijk." },
    { tekst: "Sorry zeggen is sterk, niet zwak. Kijk daarna samen: hoe doen we het de volgende keer?" },
    { tekst: "Een pauze is geen weglopen. Spreek een tijd af: \"We praten om 8 uur verder.\"" },
    { tekst: "Zoek samen een oplossing waar jullie allebei mee kunnen leven. Dan hoeft niemand te winnen." },
    { tekst: "Zeg wat je wél wilt, niet alleen wat je niet wilt. \"Ik wil dat je klopt\" werkt beter dan \"Kom niet zomaar binnen\"." },
    { tekst: "Benoem wat je ziet, zonder oordeel: \"Ik zie dat je boos bent.\" Dat haalt vaak al spanning weg.", voor: ["ouder"] },
    { tekst: "Ga naast je kind zitten in plaats van ertegenover. In de auto of tijdens het koken praat het vaak makkelijker.", voor: ["ouder"] },
    { tekst: "Eerst verbinden, dan corrigeren. Een hand op de schouder en \"Ik snap dat je baalt\", daarna pas de afspraak.", voor: ["ouder"] },
  ],
  leren: [
    { tekst: "Leer in blokjes van 20 minuten met 5 minuten pauze. Je onthoudt meer dan in een uur achter elkaar." },
    { tekst: "Telefoon in een andere kamer tijdens het leren. Alleen al het zien ervan haalt je uit je concentratie." },
    { tekst: "Overhoor jezelf in plaats van alleen teruglezen. Afdekken en opzeggen werkt veel beter." },
    { tekst: "Begin een week van tevoren met leren voor een toets. Elke dag een stukje, de leerplanner helpt je." },
    { tekst: "Pak eerst het moeilijkste vak, als je hoofd nog fris is. Het makkelijke kan aan het eind." },
    { tekst: "Leg je spullen voor morgen 's avonds al klaar. Rustige ochtend, minder vergeten." },
    { tekst: "Snap je iets niet? Vraag het de volgende les meteen. Dat is slim, niet dom.", voor: ["kind", "tiener"] },
    { tekst: "Overhoor je kind 10 minuten per dag. Kort en vaak werkt beter dan een avond stampen.", voor: ["ouder"] },
  ],
  hoofd: [
    { tekst: "Gamen en scrollen geven snelle dopamine-kicks. Je brein went daaraan, en dan voelt de rest van de dag saai. Een pauze helpt je brein resetten." },
    { tekst: "Elk uur gamen? Neem 10 minuten pauze: water halen, even naar buiten, rekken." },
    { tekst: "Het laatste uur voor het slapen geen scherm. Het licht houdt je brein wakker en je slaapt slechter." },
    { tekst: "Merk je dat je boos wordt als je moet stoppen met gamen? Dat is je brein dat meer dopamine wil. Spreek vooraf een stoptijd af." },
    { tekst: "Voel je je onrustig of druk in je hoofd? 4 tellen in, 4 vasthouden, 6 uit. Doe het 5 keer." },
    { tekst: "Elke dag even buiten zijn helpt tegen somber en druk voelen. Daglicht doet echt iets." },
    { tekst: "Zit je ergens mee? Praten helpt. Met je ouders, een vriend, of de coach in de app." },
    { tekst: "Slaap is je oplaadtijd. Tieners hebben 8 tot 10 uur nodig, ook als het niet zo voelt.", voor: ["tiener"] },
    { tekst: "Leg je eigen telefoon ook weg aan tafel. Kinderen doen wat jij doet, niet wat je zegt.", voor: ["ouder"] },
  ],
  geld: [
    { tekst: "Spaar eerst, geef dan uit. Krijg je geld, zet meteen een deel apart." },
    { tekst: "Wil je iets kopen? Wacht 3 dagen. Wil je het dan nog steeds, dan is het geen impulsaankoop." },
    { tekst: "Statiegeld is gratis geld. Flessen en blikjes terugbrengen en in het gezinspotje!" },
    { tekst: "In-game aankopen tellen ook als echt geld. Reken uit hoeveel je in een maand uitgeeft.", voor: ["kind", "tiener"] },
    { tekst: "Vergelijk prijzen per kilo of per liter, niet per pak. Grote verpakkingen zijn niet altijd goedkoper." },
    { tekst: "Stel een doel: waarvoor spaar je? Met een doel hou je het makkelijker vol." },
    { tekst: "Laat je kind zelf een keer boodschappen doen met een vast bedrag. Rekenen en keuzes maken in één.", voor: ["ouder"] },
  ],
};

export interface Recept {
  id: string;
  naam: string;
  emoji: string;
  tijd: number;
  personen: number;
  ingredienten: string[];
  stappen: string[];
}

export const RECEPTEN: Recept[] = [
  {
    id: "wraps-kip", naam: "Wraps met kip en groente", emoji: "🌯", tijd: 25, personen: 4,
    ingredienten: ["8 wraps", "500 g kipfilet in reepjes", "1 paprika", "1 komkommer", "1 krop ijsbergsla", "kruidenmix (fajita of shoarma)", "saus naar keuze (knoflook, yoghurt)"],
    stappen: ["Snij de paprika in reepjes, de komkommer in stukjes en de sla fijn.", "Bak de kip in een beetje olie tot hij niet meer roze is (± 8 minuten).", "Doe de kruiden erbij en bak nog 2 minuten mee.", "Warm de wraps kort op in een droge pan of magnetron.", "Zet alles op tafel, iedereen maakt zijn eigen wrap."],
  },
  {
    id: "pasta-pesto", naam: "Pasta pesto met tomaat", emoji: "🍝", tijd: 20, personen: 4,
    ingredienten: ["400 g pasta", "1 potje groene pesto", "250 g cherrytomaatjes", "zakje rucola of spinazie", "geraspte kaas", "optioneel: kipreepjes of pijnboompitten"],
    stappen: ["Kook water met een flinke schep zout en kook de pasta volgens het pak.", "Halveer de tomaatjes.", "Giet de pasta af en houd een kopje kookwater apart.", "Roer de pesto en een scheutje kookwater door de pasta.", "Schep de tomaatjes en rucola erdoor en strooi kaas erover."],
  },
  {
    id: "gebakken-rijst", naam: "Gebakken rijst met ei", emoji: "🍳", tijd: 25, personen: 4,
    ingredienten: ["300 g rijst (liefst van gisteren)", "4 eieren", "1 zak gesneden groente (wokmix)", "2 lente-uitjes", "ketjap of sojasaus", "olie"],
    stappen: ["Heb je geen rijst van gisteren? Kook de rijst en laat hem goed afkoelen.", "Bak de groente 4 minuten in een hete wok of pan met olie.", "Schuif de groente opzij, klop de eieren erin en roer tot ze gestold zijn.", "Doe de rijst erbij en bak alles 5 minuten op hoog vuur.", "Maak op smaak met ketjap en strooi de lente-ui erover."],
  },
  {
    id: "omelet", naam: "Omelet vol groente", emoji: "🥚", tijd: 15, personen: 2,
    ingredienten: ["4 eieren", "scheutje melk", "handje champignons", "halve paprika", "handje spinazie", "geraspte kaas", "zout en peper"],
    stappen: ["Snij de groente klein.", "Klop de eieren met de melk, zout en peper.", "Bak de groente 3 minuten in een beetje boter.", "Giet het ei erover en laat het op laag vuur stollen.", "Strooi kaas erover, vouw dubbel en snij in tweeën."],
  },
  {
    id: "traybake", naam: "Kip en groente uit de oven", emoji: "🍗", tijd: 45, personen: 4,
    ingredienten: ["600 g kippendijen", "800 g krieltjes", "2 paprika's", "1 courgette", "1 rode ui", "olijfolie", "paprikapoeder, knoflook, zout"],
    stappen: ["Zet de oven op 200 graden.", "Snij alle groente in grove stukken en halveer de krieltjes.", "Doe alles op een bakplaat, met olie en kruiden erover, en hussel het goed door.", "Leg de kip ertussen.", "40 minuten in de oven, halverwege een keer omscheppen. Klaar als de kip goudbruin is."],
  },
  {
    id: "pannenkoeken", naam: "Pannenkoeken", emoji: "🥞", tijd: 30, personen: 4,
    ingredienten: ["250 g bloem", "500 ml melk", "2 eieren", "snufje zout", "boter om te bakken", "beleg: stroop, poedersuiker, appel, kaas"],
    stappen: ["Doe de bloem en het zout in een kom en maak een kuiltje.", "Klop de eieren erin en voeg de melk beetje bij beetje toe. Blijf kloppen tot er geen klontjes meer zijn.", "Smelt een klontje boter in een hete pan.", "Giet een soeplepel beslag erin en draai de pan zodat het verdeelt.", "Omdraaien als de bovenkant droog is. Nog 1 minuut, en klaar."],
  },
  {
    id: "overnight-oats", naam: "Overnight oats (ontbijt)", emoji: "🥣", tijd: 5, personen: 1,
    ingredienten: ["40 g havermout", "100 ml melk", "2 eetlepels yoghurt", "halve banaan of handje fruit", "optioneel: theelepel honing, kaneel"],
    stappen: ["Doe havermout, melk en yoghurt in een bakje of pot.", "Roer goed en zet hem een nacht in de koelkast.", "'s Ochtends fruit erop. Klaar: ontbijt zonder moeite."],
  },
  {
    id: "shakshuka", naam: "Shakshuka (eieren in tomatensaus)", emoji: "🍅", tijd: 25, personen: 4,
    ingredienten: ["1 ui", "1 paprika", "2 teentjes knoflook", "2 blikken tomatenblokjes", "6 eieren", "komijn en paprikapoeder", "brood erbij"],
    stappen: ["Snij de ui, paprika en knoflook en bak ze 5 minuten.", "Doe de kruiden en de tomaten erbij en laat het 10 minuten pruttelen.", "Maak met een lepel 6 kuiltjes en breek in elk een ei.", "Deksel erop, 6 tot 8 minuten op laag vuur tot het wit gestold is.", "Eten met brood om te dippen."],
  },
];

/** Vast getal per dag, zodat iedereen dezelfde dag dezelfde tip ziet en het morgen wisselt. */
const dagNr = (nu: Date) => Math.floor(new Date(nu.getFullYear(), nu.getMonth(), nu.getDate()).getTime() / 864e5);

/** De tip van vandaag voor dit lid, uit de onderwerpen die hij heeft gekozen. */
export function tipVanDeDag(m: Member, interesses: string[], nu = new Date()): { onderwerp: (typeof ONDERWERPEN)[number]; tekst: string; recept?: Recept } | null {
  // Gezond eten en drinken komt altijd voorbij, plus wat je zelf kiest. Nog niks gekozen? Dan gezond en praten.
  const eigen = interesses.length ? interesses : ["praten"];
  const gekozen = ONDERWERPEN.filter((o) => o.id === "gezond" || eigen.includes(o.id));
  if (!gekozen.length) return null;
  const g = groepVan(m);
  const n = dagNr(nu) + m.id.length;
  // Om de dag gezond eten en drinken; de andere dagen om de beurt de rest.
  const anders = gekozen.filter((o) => o.id !== "gezond");
  const onderwerp = !anders.length || n % 2 === 0 ? gekozen.find((o) => o.id === "gezond")! : anders[Math.floor(n / 2) % anders.length];
  const pool = TIPS[onderwerp.id].filter((t) => !t.voor || t.voor.includes(g));
  const stap = Math.floor(n / 2);
  const tekst = pool[stap % pool.length].tekst;
  const recept = onderwerp.id === "koken" ? RECEPTEN[stap % RECEPTEN.length] : undefined;
  return { onderwerp, tekst, recept };
}
