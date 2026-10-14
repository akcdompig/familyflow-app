/*
  Conflictcoach. Vaste scenario's, geen AI.
  Opbouw volgens het G-schema (gebeurtenis, gedachte, gevoel, gedrag, gevolg), zoals in de jeugdhulp gebruikt.
  Elke keuze is één van drie soorten: aanvallen, wegduiken of voor jezelf opkomen.
  Na een keuze zie je wat het doet met jou en met de ander. Na een "foute" eerste keuze kun je altijd nog herstellen.

  {ander} wordt vervangen door de naam van de ander (een broer, zus of ouder uit het eigen gezin, of een vriend).
*/

export type ChoiceType = "aanval" | "wegduik" | "opkomen";
export type Feel = "blij" | "goed" | "neutraal" | "verdrietig" | "boos";
export type Outcome = "opgelost" | "half" | "escalatie";
export type With = "sib" | "ouder" | "vriend";
export type SkillId = "overgang" | "rustig" | "toon" | "grens" | "samen" | "luisteren" | "hulp" | "timeout";

export interface End {
  outcome: Outcome;
  text: string;
}
export interface CoachChoice {
  type: ChoiceType;
  text: string;
  /** Thermometer na deze keuze, 0–10. */
  self: number;
  other: number;
  feel: Feel;
  /** Wat de ander terugzegt. Leeg = zegt niks. */
  says: string;
  /** Wat er gebeurt, kort uitgelegd. */
  what?: string;
  next?: string;
  end?: End;
}
export interface CoachNode {
  says: string;
  feel: Feel;
  /** Korte tussentekst, bijvoorbeeld "Even later…". */
  text?: string;
  choices: CoachChoice[];
}
export interface CoachScenario {
  id: string;
  title: string;
  where: "thuis" | "school" | "buiten" | "online";
  with: With;
  /** Naam als het geen gezinslid is. */
  otherName?: string;
  skill: SkillId;
  situation: string;
  selfStart: number;
  otherStart: number;
  start: CoachNode;
  nodes: Record<string, CoachNode>;
  advice: { coach: string; psy: string; quest: string };
}

export const SKILLS: Record<SkillId, { label: string; short: string }> = {
  overgang: { label: "Stoppen en omschakelen", short: "Stoppen" },
  rustig: { label: "Rustig blijven bij een snauw", short: "Rustig blijven" },
  toon: { label: "Normaal reageren", short: "Normale toon" },
  grens: { label: "Grens aangeven", short: "Grens" },
  samen: { label: "Samen oplossen", short: "Samen oplossen" },
  luisteren: { label: "Luisteren en samenvatten", short: "Luisteren" },
  hulp: { label: "Hulp vragen", short: "Hulp vragen" },
  timeout: { label: "Time-out nemen", short: "Time-out" },
};

export const TYPE_INFO: Record<ChoiceType, { label: string; uitleg: string }> = {
  aanval: { label: "Aanvallen", uitleg: "Aanvallen geeft even lucht, maar de ander gaat zich verdedigen. Dan wordt het een wedstrijd wie wint, en verliezen jullie allebei." },
  wegduik: { label: "Wegduiken", uitleg: "Wegduiken voorkomt een ruzie op dat moment, maar je boosheid blijft. En de ander weet niet wat er bij jou speelt." },
  opkomen: { label: "Voor jezelf opkomen", uitleg: "Rustig zeggen wat je voelt en wat je wilt. Zo heb je de meeste kans dat het goed afloopt, voor jou én voor de ander." },
};

export const OUTCOME_INFO: Record<Outcome, { label: string; tone: "munt" | "zon" | "koraal" }> = {
  opgelost: { label: "Opgelost", tone: "munt" },
  half: { label: "Half opgelost", tone: "zon" },
  escalatie: { label: "Uit de hand gelopen", tone: "koraal" },
};

export const COACH_SCENARIOS: CoachScenario[] = [
  {
    id: "gamen-stoppen",
    title: "Stoppen met gamen",
    where: "thuis",
    with: "ouder",
    skill: "overgang",
    situation: "Je zit midden in een potje met je vrienden online. Het gaat net lekker. Dan komt {ander} binnen.",
    selfStart: 6,
    otherStart: 4,
    start: {
      says: "Stoppen nu, we gaan eten.",
      feel: "neutraal",
      choices: [
        { type: "aanval", text: "\"Jij verpest ALLES! Ik ben nu niet klaar!\"", self: 8, other: 7, feel: "boos", says: "Zo praat je niet tegen mij. Dan gaat de console nu uit.", what: "{ander} voelt zich niet gerespecteerd en grijpt in. Nu gaat het niet meer over eten, maar over wie wint.", next: "a" },
        { type: "wegduik", text: "Koptelefoon op en gewoon doorspelen.", self: 6, other: 7, feel: "boos", says: "Hallo?! Ik praat tegen je!", what: "Negeren voelt voor de ander als: jij bent niet belangrijk. Daardoor wordt {ander} juist harder.", next: "b" },
        { type: "opkomen", text: "\"Ik zit midden in een potje. Mag ik dit afmaken? Nog 3 minuten, dan kom ik echt.\"", self: 5, other: 4, feel: "neutraal", says: "Oké, 3 minuten. Ik zet een timer.", what: "{ander} hoort dat je wilt komen, en jij krijgt tijd om af te ronden.", next: "c" },
      ],
    },
    nodes: {
      a: {
        says: "Zo praat je niet tegen mij. Dan gaat de console nu uit.",
        feel: "boos",
        text: "Je voelt de boosheid in je buik. Wat doe je nu?",
        choices: [
          { type: "opkomen", text: "\"Sorry, dat was niet oké. Ik was gefrustreerd. Mag ik mijn team even laten weten dat ik stop?\"", self: 5, other: 5, feel: "neutraal", says: "Oké. Fijn dat je sorry zegt. Zeg het ze en kom dan.", end: { outcome: "opgelost", text: "Je hebt zelf het herstel ingezet. Midden in je boosheid omdraaien is het moeilijkste wat er is. Knap." } },
          { type: "aanval", text: "Controller neergooien en naar je kamer stampen.", self: 9, other: 8, feel: "boos", says: "Dan morgen ook geen gamen.", end: { outcome: "escalatie", text: "Iedereen is boos, het eten is verpest en je bent je gametijd van morgen kwijt. Het potje was je toch al kwijt." } },
        ],
      },
      b: {
        says: "Hallo?! Ik praat tegen je!",
        feel: "boos",
        choices: [
          { type: "opkomen", text: "Koptelefoon af: \"Sorry, ik hoorde je half. Ik maak dit potje af, 3 minuten, dan kom ik.\"", self: 5, other: 5, feel: "neutraal", says: "Oké. Maar de volgende keer gewoon meteen antwoorden.", end: { outcome: "half", text: "Het is goed gekomen, al was {ander} eerst geïrriteerd. Meteen antwoorden had dat gescheeld." } },
          { type: "wegduik", text: "Blijven doorspelen.", self: 8, other: 9, feel: "boos", says: "Zo. Nu is hij uit.", end: { outcome: "escalatie", text: "{ander} trekt de stekker eruit. Je bent je potje kwijt én er is ruzie. Negeren werkt bijna nooit." } },
        ],
      },
      c: {
        says: "Oké, 3 minuten. Ik zet een timer.",
        feel: "neutraal",
        text: "De timer gaat. Je team vraagt: nog eentje?",
        choices: [
          { type: "opkomen", text: "\"Jongens, ik moet eten. Tot straks!\" En de console uit.", self: 4, other: 2, feel: "blij", says: "Top dat je je aan je woord houdt. Kom, het is nog warm.", end: { outcome: "opgelost", text: "Je deed wat je zei. Daardoor vertrouwt {ander} je de volgende keer sneller, en krijg je makkelijker een paar minuten extra." } },
          { type: "wegduik", text: "\"Nog eentje dan, ze rekenen op me.\" En doorspelen.", self: 6, other: 7, feel: "boos", says: "We hadden een afspraak. Nu is het klaar.", end: { outcome: "half", text: "Je kwam uiteindelijk wel, maar {ander} voelt zich voor de gek gehouden. De volgende keer krijg je minder snel extra tijd." } },
        ],
      },
    },
    advice: {
      coach: "Stoppen met gamen is voor veel kinderen het moeilijkste moment van de dag. Spreek vooraf af: een seintje 10 minuten van tevoren, dan dit potje afmaken, dan stoppen. Zeg wat je nodig hebt in plaats van te ontploffen.",
      psy: "Een game is gemaakt om je vast te houden: je brein krijgt steeds een kleine beloning. Stoppen voelt daardoor als iets kwijtraken, en dat maakt boos. Dat is normaal. Een vast afrondmoment helpt je brein om om te schakelen.",
      quest: "Spreek met je ouders een vast stopseintje af en stop deze week 3 keer op tijd zonder ruzie.",
    },
  },
  {
    id: "in-de-weg",
    title: "Elkaar in de weg lopen",
    where: "thuis",
    with: "sib",
    skill: "rustig",
    situation: "Het is 's ochtends druk. Jij moet je tanden poetsen, maar {ander} staat al tien minuten voor de spiegel. Je vraagt of je er even bij mag.",
    selfStart: 5,
    otherStart: 6,
    start: {
      says: "Wacht nou even, ik was hier eerst!",
      feel: "boos",
      choices: [
        { type: "aanval", text: "\"Doe normaal, jij staat hier altijd uren!\"", self: 7, other: 8, feel: "boos", says: "Bemoei je met je eigen zaken!", what: "Je gaat mee in de snauw. Nu snauwen jullie allebei en wordt het een wedstrijd.", next: "a" },
        { type: "wegduik", text: "Zuchten, de deur hard dichtdoen en zonder tanden poetsen weggaan.", self: 7, other: 5, feel: "neutraal", says: "", what: "Je ontloopt de ruzie, maar je neemt je boosheid de hele ochtend mee.", next: "b" },
        { type: "opkomen", text: "Rustig: \"Ik snap dat jij eerst was. Ik hoef alleen even mijn tanden te poetsen, twee minuten. Mag ik er even naast?\"", self: 4, other: 4, feel: "neutraal", says: "Ja oké, ga daar maar even staan.", what: "Je ging niet in op de snauw. Daardoor had {ander} niks om tegen te vechten.", next: "c" },
      ],
    },
    nodes: {
      a: {
        says: "Bemoei je met je eigen zaken!",
        feel: "boos",
        choices: [
          { type: "opkomen", text: "Een stap terug: \"Oké, we hebben allebei haast. Jij nog 2 minuten, dan ik?\"", self: 5, other: 5, feel: "neutraal", says: "Prima. 2 minuten.", end: { outcome: "half", text: "Je haalde het zelf terug. Het begin was niet fijn, maar je voorkwam erger." } },
          { type: "aanval", text: "Haar of zijn spullen opzij schuiven en ertussen gaan staan.", self: 9, other: 9, feel: "boos", says: "AU! Mam!!", end: { outcome: "escalatie", text: "Het wordt fysiek. Er moet een ouder bij komen en de dag begint voor iedereen slecht." } },
        ],
      },
      b: {
        says: "Hé, waarom deed je vanochtend zo raar?",
        feel: "neutraal",
        text: "'s Middags zie je {ander} weer.",
        choices: [
          { type: "opkomen", text: "\"Ik baalde dat je zo snauwde. Ik vroeg het gewoon normaal.\"", self: 4, other: 4, feel: "neutraal", says: "Ja, sorry. Ik was gestrest, ik was te laat.", end: { outcome: "opgelost", text: "Later praten is ook goed. Je zei wat je dwarszat, zonder aan te vallen." } },
          { type: "wegduik", text: "\"Laat me met rust.\"", self: 6, other: 6, feel: "verdrietig", says: "Oké, dan niet.", end: { outcome: "half", text: "De ruzie ontplofte niet, maar is ook niet opgelost. Zulke kleine dingen stapelen zich op." } },
        ],
      },
      c: {
        says: "Ja oké, ga daar maar even staan.",
        feel: "neutraal",
        text: "Je poetst je tanden. {ander} is nog een beetje chagrijnig.",
        choices: [
          { type: "opkomen", text: "\"Thanks. Succes vandaag.\"", self: 3, other: 2, feel: "goed", says: "Jij ook. Sorry dat ik zo snauwde.", end: { outcome: "opgelost", text: "Door rustig te blijven kreeg je wat je nodig had. En {ander} zei uit zichzelf sorry." } },
          { type: "aanval", text: "\"Zie je, het kan toch gewoon normaal.\"", self: 4, other: 6, feel: "boos", says: "Ga nou maar gewoon.", end: { outcome: "half", text: "Je deed het bijna perfect, maar dat laatste zinnetje prikte. Een sneer achteraf maakt het goede werk weer half kapot." } },
        ],
      },
    },
    advice: {
      coach: "Als iemand snauwt, hoef je niet mee te doen. Reageer op de vraag, niet op de toon. Een snauw komt vaak door stress en is niet echt tegen jou bedoeld.",
      psy: "Als iemand snauwt, schiet je brein in de verdediging: vechten of vluchten. Haal één keer adem voordat je antwoordt. Dan krijgt het denkende deel van je brein weer de kans.",
      quest: "Reageer deze week één keer heel rustig als iemand tegen je snauwt. Vertel bij het eten hoe dat ging.",
    },
  },
  {
    id: "vals-antwoord",
    title: "Een normale vraag, een vals antwoord",
    where: "thuis",
    with: "sib",
    skill: "toon",
    situation: "Je zit op de bank en bent moe van school. {ander} komt binnen en vraagt iets.",
    selfStart: 5,
    otherStart: 3,
    start: {
      says: "Heb jij mijn oplader gezien?",
      feel: "neutraal",
      choices: [
        { type: "aanval", text: "\"Zoek het zelf, ik ben je knecht niet.\"", self: 6, other: 7, feel: "boos", says: "Wow, ik vroeg alleen iets. Wat is jouw probleem?", what: "Een normale vraag kreeg een vals antwoord. {ander} voelt zich aangevallen, terwijl er niks aan de hand was.", next: "a" },
        { type: "wegduik", text: "Niks zeggen en blijven scrollen.", self: 5, other: 5, feel: "neutraal", says: "Hallo? Ik vraag je wat.", what: "Niks zeggen voelt voor de ander ook een beetje vals.", next: "b" },
        { type: "opkomen", text: "\"Nee, sorry. Kijk anders even in de keuken, daar lag er eentje.\"", self: 4, other: 2, feel: "goed", says: "O ja, thanks!", end: { outcome: "opgelost", text: "Een gewone vraag, een gewoon antwoord. Klaar. Zo simpel kan het zijn, ook als je moe bent." } },
      ],
    },
    nodes: {
      a: {
        says: "Wow, ik vroeg alleen iets. Wat is jouw probleem?",
        feel: "boos",
        choices: [
          { type: "opkomen", text: "\"Sorry, dat was vals. Ik ben gewoon moe. Ik heb hem niet gezien.\"", self: 4, other: 4, feel: "neutraal", says: "Oké. Rustig aan dan.", end: { outcome: "opgelost", text: "Je zag zelf dat je vals deed en je zei het. Dat is echt sterk." } },
          { type: "aanval", text: "\"Jij bent mijn probleem.\"", self: 7, other: 8, feel: "verdrietig", says: "Doe normaal, joh.", end: { outcome: "escalatie", text: "Nu is er ruzie, terwijl het om een oplader ging. Zo begint het vaak: één vals zinnetje, en dan nog één." } },
        ],
      },
      b: {
        says: "Hallo? Ik vraag je wat.",
        feel: "neutraal",
        choices: [
          { type: "opkomen", text: "\"O sorry, ik zat even weg. Nee, niet gezien.\"", self: 4, other: 3, feel: "goed", says: "Oké, geeft niks.", end: { outcome: "opgelost", text: "Even laat, maar netjes. Geen ruzie." } },
          { type: "aanval", text: "\"Ik hoorde je heus wel, ik weet het niet!\"", self: 6, other: 6, feel: "boos", says: "Waarom doe je nou zo?", end: { outcome: "half", text: "Er is geen grote ruzie, maar de sfeer is wel verpest. Dat had makkelijk anders gekund." } },
        ],
      },
    },
    advice: {
      coach: "Let op je toon, niet alleen op je woorden. Vraag jezelf: hoe zou ik willen dat iemand mij antwoordt? Ben je moe of chagrijnig, zeg dat dan gewoon: \"Ik ben moe, ik heb hem niet gezien.\"",
      psy: "Als je moe bent of honger hebt, is je lontje korter. Je brein ziet dan sneller gevaar, ook als het er niet is. Als je weet dat je moe bent, kun je het zeggen in plaats van het op een ander af te reageren.",
      quest: "Let er een dag lang op: geef op elke normale vraag een normaal antwoord. Tel hoe vaak het lukt.",
    },
  },
  {
    id: "iemand-doet-vals",
    title: "Iemand doet vals tegen jou",
    where: "thuis",
    with: "sib",
    skill: "grens",
    situation: "Je komt de kamer in met je nieuwe trui aan. {ander} kijkt je aan.",
    selfStart: 6,
    otherStart: 3,
    start: {
      says: "Haha, wat zie jij er stom uit.",
      feel: "blij",
      choices: [
        { type: "aanval", text: "\"Kijk eerst eens naar jezelf, lelijkerd.\"", self: 7, other: 7, feel: "boos", says: "Wat? Het was een grapje!", what: "Je betaalt terug met hetzelfde. Nu gaat het niet meer over de trui, maar over wie het hardst kan kwetsen.", next: "a" },
        { type: "wegduik", text: "Niks zeggen, naar je kamer gaan en de trui uittrekken.", self: 6, other: 3, feel: "neutraal", says: "", what: "Je laat het gaan, maar het doet je pijn. {ander} heeft niet eens door dat het je raakte.", next: "b" },
        { type: "opkomen", text: "Rustig, recht aankijken: \"Dat vind ik niet leuk om te horen. Ik vind hem zelf mooi.\"", self: 4, other: 4, feel: "neutraal", says: "Oké, oké, sorry. Was een grapje. Hij staat je eigenlijk best goed.", end: { outcome: "opgelost", text: "Je gaf een duidelijke grens, zonder te schelden. Dan kan de ander makkelijk sorry zeggen." } },
      ],
    },
    nodes: {
      a: {
        says: "Wat? Het was een grapje!",
        feel: "boos",
        choices: [
          { type: "opkomen", text: "\"Het voelde niet als een grapje. Laat het gewoon.\"", self: 5, other: 5, feel: "neutraal", says: "Oké. Sorry.", end: { outcome: "half", text: "Je herstelde het en zei waar het om ging. Het schelden had je kunnen overslaan." } },
          { type: "aanval", text: "\"Jouw grapjes zijn net zo lelijk als jij.\"", self: 8, other: 8, feel: "boos", says: "Dan zeg ik helemaal niks meer tegen je.", end: { outcome: "escalatie", text: "Jullie hebben elkaar allebei gekwetst. Zo wordt een flauwe opmerking een ruzie van een hele dag." } },
        ],
      },
      b: {
        says: "Waar is je trui? Hij was eigenlijk best mooi.",
        feel: "goed",
        text: "Later zie je {ander} weer.",
        choices: [
          { type: "opkomen", text: "\"Waarom zei je dan dat ik er stom uitzag? Dat deed best pijn.\"", self: 4, other: 4, feel: "verdrietig", says: "Sorry. Dat wist ik niet. Ik zei het zonder na te denken.", end: { outcome: "opgelost", text: "Achteraf zeggen dat iets pijn deed is moedig. Nu weet {ander} het, en doet het waarschijnlijk niet meer." } },
          { type: "wegduik", text: "\"Laat maar.\"", self: 6, other: 3, feel: "neutraal", says: "Oké.", end: { outcome: "half", text: "Je hield de pijn voor jezelf. Dan weet {ander} niet dat het je raakt, en gebeurt het waarschijnlijk weer." } },
        ],
      },
    },
    advice: {
      coach: "Een grens aangeven is niet hetzelfde als terugslaan. Zeg wat het met je doet (\"dat vind ik niet leuk\") en wat je wilt (\"laat dat\"). Kort, rustig, en dan stoppen.",
      psy: "Een gemene opmerking voelt als een kleine aanval, en je brein wil terugvechten of wegrennen. Met een rustige grens laat je zien dat je sterk bent, zonder dat de ruzie groter wordt.",
      quest: "Geef deze week één keer rustig een grens aan: \"Dat vind ik niet leuk. Wil je daarmee stoppen?\"",
    },
  },
  {
    id: "zin-doordrijven",
    title: "Je zin doordrijven",
    where: "thuis",
    with: "sib",
    skill: "samen",
    situation: "Vrijdagavond, filmavond. Jij wilt een actiefilm, {ander} wil een comedy. Er is één tv.",
    selfStart: 5,
    otherStart: 5,
    start: {
      says: "Nee joh, we kijken die comedy. Jouw films zijn altijd saai.",
      feel: "neutraal",
      choices: [
        { type: "aanval", text: "De afstandsbediening pakken en je eigen film aanzetten. \"Ik was eerst.\"", self: 6, other: 8, feel: "boos", says: "Dat is echt niet eerlijk! Mam!", what: "Je hebt je zin, maar {ander} voelt zich overruled. Nu is de filmavond voor niemand meer leuk.", next: "a" },
        { type: "wegduik", text: "\"Prima, kijk maar wat je wilt. Ik ga wel naar boven.\"", self: 6, other: 5, feel: "verdrietig", says: "Ja, ga dan ook maar.", what: "Er is geen ruzie, maar ook geen filmavond samen. Je gaf op in plaats van samen te zoeken.", next: "b" },
        { type: "opkomen", text: "\"Ik wil echt die actiefilm, jij die comedy. Hoe lossen we dit op? Deze week jij, volgende week ik?\"", self: 4, other: 4, feel: "neutraal", says: "Hmm. Of we zoeken samen een derde film die we allebei oké vinden?", what: "Je zei wat je wilde en vroeg naar een oplossing. Nu denkt {ander} met je mee in plaats van tegen je in.", next: "c" },
      ],
    },
    nodes: {
      a: {
        says: "Dat is echt niet eerlijk! Mam!",
        feel: "boos",
        choices: [
          { type: "opkomen", text: "Afstandsbediening neerleggen: \"Oké, sorry. Laten we om de beurt kiezen. Jij mag beginnen.\"", self: 5, other: 4, feel: "goed", says: "Echt? Oké, deal.", end: { outcome: "opgelost", text: "Je gaf iets op en kreeg er een fijne avond voor terug. Dat is samen oplossen." } },
          { type: "aanval", text: "\"Doe niet zo kinderachtig. Ik kijk mijn film.\"", self: 7, other: 9, feel: "boos", says: "Ik haat je!", end: { outcome: "escalatie", text: "Er komt een ouder bij en de tv gaat uit. Niemand krijgt zijn zin." } },
        ],
      },
      b: {
        says: "Ja, ga dan ook maar.",
        feel: "verdrietig",
        choices: [
          { type: "opkomen", text: "Terugkomen: \"Eigenlijk wil ik wel samen kijken. Zullen we om de beurt kiezen?\"", self: 4, other: 3, feel: "goed", says: "Ja, leuk. Dan kies jij volgende week.", end: { outcome: "opgelost", text: "Je kwam zelf terug. Daarmee laat je zien dat de avond samen je meer waard is dan gelijk krijgen." } },
          { type: "wegduik", text: "Boven blijven.", self: 6, other: 5, feel: "verdrietig", says: "", end: { outcome: "half", text: "Geen ruzie, maar ook niks samen. Gebeurt dat vaak, dan zien jullie elkaar steeds minder." } },
        ],
      },
      c: {
        says: "Hmm. Of we zoeken samen een derde film die we allebei oké vinden?",
        feel: "neutraal",
        choices: [
          { type: "opkomen", text: "\"Goed plan. Jij noemt er drie, ik kies er één.\"", self: 3, other: 2, feel: "blij", says: "Deal! Ik pak de chips.", end: { outcome: "opgelost", text: "Jullie vonden samen iets. Niemand won, en toch hebben jullie allebei een goede avond." } },
          { type: "aanval", text: "\"Nee, dan wil ik toch die van mij.\"", self: 5, other: 7, feel: "boos", says: "Zie je, jij wilt altijd je zin.", end: { outcome: "half", text: "Je was er bijna. Door toch vast te houden aan je eigen plan ging de goede start weer verloren." } },
        ],
      },
    },
    advice: {
      coach: "Koppig zijn voelt als winnen, maar vaak verliezen jullie allebei. Gebruik drie stappen: 1. zeg wat jij wilt, 2. vraag wat de ander wil, 3. zoek iets waar jullie allebei mee kunnen leven.",
      psy: "Je zin doordrijven geeft even een gevoel van controle. Maar de ander onthoudt dat het oneerlijk was, en de volgende keer wordt het juist moeilijker. Wie kan geven en nemen, heeft op de lange termijn betere vriendschappen.",
      quest: "Los deze week één keer samen iets op met de drie stappen: wat wil ik, wat wil jij, wat doen we?",
    },
  },
  {
    id: "niet-luisteren",
    title: "Niet luisteren naar advies",
    where: "thuis",
    with: "ouder",
    skill: "luisteren",
    situation: "Vrijdag heb je een toets. Het is dinsdag. {ander} komt je kamer in.",
    selfStart: 5,
    otherStart: 4,
    start: {
      says: "Je hebt vrijdag die toets, hè? Begin je vandaag al een stukje?",
      feel: "neutraal",
      choices: [
        { type: "aanval", text: "\"Bemoei je er niet mee, ik weet zelf wel wanneer ik moet leren!\"", self: 7, other: 6, feel: "verdrietig", says: "Ik probeer je alleen maar te helpen.", what: "{ander} wilde helpen, maar voelt zich weggeduwd. En jij voelt je gecontroleerd.", next: "a" },
        { type: "wegduik", text: "\"Ja, ja.\" En niks doen.", self: 5, other: 5, feel: "neutraal", says: "Je zegt ja, maar ik zie je niks doen.", what: "\"Ja ja\" klinkt als luisteren, maar is het niet. De ander merkt dat meteen.", next: "b" },
        { type: "opkomen", text: "\"Je bedoelt dat ik niet alles op donderdag moet doen, toch? Ik wil eerst even chillen. Om 7 uur begin ik, 20 minuten.\"", self: 4, other: 2, feel: "goed", says: "Precies. Goed plan. Zal ik je om 7 uur even herinneren?", end: { outcome: "opgelost", text: "Je vatte samen wat {ander} bedoelde en kwam met je eigen plan. Zo luister je én hou je zelf de regie." } },
      ],
    },
    nodes: {
      a: {
        says: "Ik probeer je alleen maar te helpen.",
        feel: "verdrietig",
        choices: [
          { type: "opkomen", text: "\"Sorry. Ik voel me een beetje opgejaagd. Ik ga vanavond om 7 uur 20 minuten leren, oké?\"", self: 4, other: 3, feel: "goed", says: "Oké, dat is helemaal goed.", end: { outcome: "opgelost", text: "Je zei eerlijk hoe het voelde en kwam met een plan. Daar kan {ander} prima mee leven." } },
          { type: "aanval", text: "\"Ik heb je hulp niet nodig.\"", self: 7, other: 6, feel: "verdrietig", says: "Oké. Dan moet je het zelf weten.", end: { outcome: "escalatie", text: "Donderdagavond zit je in de stress, met alles tegelijk. En je hebt geen zin meer om hulp te vragen." } },
        ],
      },
      b: {
        says: "Je zegt ja, maar ik zie je niks doen.",
        feel: "neutraal",
        choices: [
          { type: "opkomen", text: "\"Je hebt gelijk. Ik heb gewoon geen zin. Wil je helpen het in stukjes te verdelen?\"", self: 4, other: 2, feel: "blij", says: "Graag! Vier avondjes van 20 minuten, dat is zo gedaan.", end: { outcome: "opgelost", text: "Eerlijk zeggen dat je geen zin hebt, en dan hulp vragen. Zo maak je van een grote klus kleine stukjes." } },
          { type: "wegduik", text: "\"Ik doe het straks wel.\"", self: 6, other: 6, feel: "boos", says: "Dat zei je gisteren ook.", end: { outcome: "half", text: "Er komt geen grote ruzie, maar {ander} vertrouwt je \"straks\" niet meer. En de toets komt steeds dichterbij." } },
        ],
      },
    },
    advice: {
      coach: "Luisteren betekent niet dat je het overal mee eens moet zijn. Vat eerst samen wat de ander bedoelt (\"Je bedoelt dat…\"). Dan voelt de ander zich gehoord, en mag jij je eigen plan noemen.",
      psy: "Op jouw leeftijd wil je zelf beslissen, en dat is gezond. Daardoor voelt advies al snel als een bevel. Als je samenvat wat de ander zegt, verdwijnt dat verzet: je kiest dan zelf, in plaats van dat je moet.",
      quest: "Vat deze week twee keer samen wat iemand zegt voordat je antwoordt: \"Dus jij bedoelt…\"",
    },
  },
  {
    id: "groepsapp",
    title: "Een nare foto in de groepsapp",
    where: "online",
    with: "vriend",
    otherName: "Sem",
    skill: "hulp",
    situation: "In de klassengroepsapp zet {ander} een foto van jou waarop je raar kijkt. Er komen lachende emoji's onder.",
    selfStart: 7,
    otherStart: 3,
    start: {
      says: "😂😂 Wat een kop!",
      feel: "blij",
      choices: [
        { type: "aanval", text: "Terugschelden in de groep: \"Jij bent zelf een loser, dat weet iedereen.\"", self: 8, other: 7, feel: "boos", says: "Haha, kan er iemand niet tegen een grapje?", what: "Je reageert in de groep, waar iedereen meekijkt. Zo geef je {ander} precies de aandacht die hij zocht.", next: "a" },
        { type: "wegduik", text: "De telefoon wegleggen en tegen niemand iets zeggen.", self: 7, other: 3, feel: "goed", says: "", what: "Niet reageren in de groep is soms slim. Maar nu blijf je er alleen mee zitten.", next: "b" },
        { type: "opkomen", text: "Een screenshot maken. Privé sturen: \"Haal die foto weg, ik vind dat niet leuk.\" En het thuis of aan je mentor laten zien.", self: 5, other: 4, feel: "neutraal", says: "Oké, relax. Ik haal hem weg.", end: { outcome: "opgelost", text: "Niet in de groep, wel duidelijk, en je droeg het niet alleen. Een volwassene inschakelen is geen klikken. Het is slim." } },
      ],
    },
    nodes: {
      a: {
        says: "Haha, kan er iemand niet tegen een grapje?",
        feel: "blij",
        choices: [
          { type: "opkomen", text: "Stoppen in de groep, een screenshot maken en het thuis vertellen.", self: 6, other: 4, feel: "neutraal", says: "", end: { outcome: "half", text: "Je stopte op tijd en vroeg hulp. Je ouder of mentor kan zorgen dat de foto weggaat." } },
          { type: "aanval", text: "Nog harder terugschelden.", self: 9, other: 8, feel: "boos", says: "Kijk eens wie er boos wordt 😂", end: { outcome: "escalatie", text: "Het wordt een rel in de groep. Straks gaat het niet meer over de foto, maar over wat jij schreef." } },
        ],
      },
      b: {
        says: "",
        feel: "neutraal",
        text: "'s Avonds kun je niet slapen. Je blijft aan de foto denken.",
        choices: [
          { type: "opkomen", text: "Naar je ouder gaan: \"Er staat een foto van mij in de groep. Ik vind het echt rot.\"", self: 4, other: 3, feel: "neutraal", says: "", end: { outcome: "opgelost", text: "Hulp vragen is moedig. Samen kunnen jullie zorgen dat de foto weggaat." } },
          { type: "wegduik", text: "Het voor je houden.", self: 8, other: 3, feel: "goed", says: "", end: { outcome: "half", text: "Niemand weet hoe rot je je voelt. Juist bij nare dingen online is het belangrijk om het niet alleen te dragen." } },
        ],
      },
    },
    advice: {
      coach: "Online voelt alles groter, omdat iedereen meekijkt. Reageer nooit in de groep als je boos bent. Maak een screenshot, zeg het privé, of laat een volwassene het oplossen.",
      psy: "Wie pest, zoekt vaak de aandacht van de groep. Een boze reactie in de groep geeft precies die aandacht. Hulp vragen is geen zwakte: wie hulp vraagt, komt er sneller en met minder schade uit.",
      quest: "Spreek met je ouders af wat je doet als er online iets naars gebeurt. Zet het in je rustplan.",
    },
  },
  {
    id: "voetbal",
    title: "Ruzie bij het voetballen",
    where: "buiten",
    with: "vriend",
    otherName: "Daan",
    skill: "timeout",
    situation: "Je voetbalt met vrienden op het veldje. Je schiet, en volgens jou is het goal. {ander} zegt van niet.",
    selfStart: 7,
    otherStart: 6,
    start: {
      says: "Nee joh, die was naast. Jij speelt altijd vals.",
      feel: "boos",
      choices: [
        { type: "aanval", text: "\"Hij was er WEL in! Jij bent gewoon een slechte verliezer!\"", self: 8, other: 8, feel: "boos", says: "Ik? Jij bent de valsspeler!", what: "Jullie gaan allebei harder praten. Niemand luistert meer, iedereen wil alleen nog gelijk hebben.", next: "a" },
        { type: "wegduik", text: "De bal pakken en naar huis gaan.", self: 7, other: 6, feel: "boos", says: "Serieus? Nu kunnen we niet meer spelen.", what: "Je stopt de ruzie, maar ook het spel. Voor iedereen.", next: "b" },
        { type: "opkomen", text: "\"Oké, we zien het allebei anders. Doen we hem over, of tossen we erom?\"", self: 5, other: 4, feel: "neutraal", says: "Prima. Overdoen.", end: { outcome: "opgelost", text: "Bij ja-nee is er geen winnaar. Een eerlijke manier kiezen, zoals overdoen of tossen, haalt de angel eruit." } },
      ],
    },
    nodes: {
      a: {
        says: "Ik? Jij bent de valsspeler!",
        feel: "boos",
        choices: [
          { type: "opkomen", text: "Time-out: \"Wacht. We worden allebei te boos. Even drinken, dan verder?\"", self: 5, other: 5, feel: "neutraal", says: "Oké. Even pauze.", end: { outcome: "half", text: "De time-out voorkwam dat het uit de hand liep. Na de pauze spreek je makkelijker af: overdoen." } },
          { type: "aanval", text: "Duwen.", self: 10, other: 9, feel: "boos", says: "Blijf van me af!", end: { outcome: "escalatie", text: "Het wordt fysiek. Het spel is voorbij, en de vriendschap misschien ook even. Duwen maakt het altijd groter." } },
        ],
      },
      b: {
        says: "Serieus? Nu kunnen we niet meer spelen.",
        feel: "boos",
        choices: [
          { type: "opkomen", text: "Terugkomen: \"Sorry, ik was boos. Doen we hem over?\"", self: 4, other: 3, feel: "goed", says: "Ja, kom op.", end: { outcome: "opgelost", text: "Even weglopen en dan terugkomen is eigenlijk een time-out. En sorry zeggen maakt het helemaal goed." } },
          { type: "wegduik", text: "Gewoon naar huis gaan.", self: 7, other: 6, feel: "boos", says: "", end: { outcome: "half", text: "Je ontliep de ruzie, maar thuis ben je nog steeds boos. En morgen is het ongemakkelijk." } },
        ],
      },
    },
    advice: {
      coach: "Merk je dat je te boos wordt? Neem een time-out: \"Ik ben te boos, even pauze.\" Dat is niet opgeven, dat is slim. Na de pauze kun je weer normaal praten.",
      psy: "Boven de 7 op je thermometer werkt het denkende deel van je brein even minder goed. Na 10 tot 20 minuten zakt dat weer. Een time-out geeft je brein die tijd. Daarom werkt het ook bij volwassenen.",
      quest: "Neem deze week één keer bewust een time-out als je merkt dat je boos wordt. Vertel achteraf hoe dat ging.",
    },
  },
];

export const scenarioById = (id: string) => COACH_SCENARIOS.find((s) => s.id === id);

export const WHERE_LABEL: Record<CoachScenario["where"], string> = { thuis: "Thuis", school: "School", buiten: "Buiten", online: "Online" };
