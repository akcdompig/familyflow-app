/*
  Scenariodatabase van de conflictcoach (versie 1).
  Elk scenario heeft dezelfde velden. Nieuwe scenario's kun je hier toevoegen; de logica staat in methodiek.ts
  en het scherm in CoachNu.tsx. Mogelijke factoren zijn verklaringen, geen diagnoses.
*/

export interface ConflictScenario {
  id: string;
  title: string;
  category: "ouder-kind" | "broer-zus" | "online" | "buiten";
  description: string;
  trigger: string;
  possible_factors: string[];
  early_signs: string[];
  /** Extra veiligheidsvraag naast de algemene. */
  safety_check: string[];
  parent_guidance: string[];
  child_guidance: string[];
  calming_options: string[];
  dialogue_examples: { ouder: string[]; kind: string[] };
  coach_questions: string[];
  repair_steps: string[];
  prevention: string[];
  age_adaptations: { jong: string; tiener: string };
  adhd_add_considerations: string[];
  professional_support: string[];
  /** Bijbehorend oefenscenario in de conflictcoach. */
  practice?: string;
}

export const CONFLICTS: ConflictScenario[] = [
  {
    id: "gamen",
    title: "Stoppen met gamen",
    category: "ouder-kind",
    description: "De gametijd is voorbij. Het kind wil doorspelen, weigert, negeert of wordt boos.",
    trigger: "Een ouder zegt dat de afgesproken gametijd voorbij is.",
    possible_factors: ["Moeite met stoppen met iets leuks", "Frustratie over het moeten stoppen", "Een onverwachte verandering in de planning", "Moe, honger of al stress van eerder", "Afspraken die niet duidelijk zijn of steeds anders gaan"],
    early_signs: ["Niet reageren", "\"Ja, zo!\" zonder te stoppen", "Harder praten tegen het scherm", "Zuchten, onrustig worden"],
    safety_check: [],
    parent_guidance: ["Erken de teleurstelling, maar laat de afspraak niet meteen los.", "Geef korte, duidelijke instructies. Eén zin is genoeg.", "Geef liefst vooraf een seintje, bijvoorbeeld 10 minuten van tevoren.", "Bespreek de regels later, op een rustig moment."],
    child_guidance: ["Stoppen voelt rot. Dat mag.", "Zeg wat je nodig hebt, bijvoorbeeld: dit potje afmaken.", "Doe dan ook wat je zegt. Zo krijg je de volgende keer makkelijker wat tijd."],
    calming_options: ["Even naar buiten of een stukje lopen", "Water drinken", "Muziek op, 5 minuten"],
    dialogue_examples: {
      ouder: ["Ik zie dat je midden in je spel zit en dat stoppen vervelend voelt. De afgesproken tijd is voorbij. Wil je zelf afsluiten, of wil je dat ik je help herinneren aan de afspraak?"],
      kind: ["Ik zit midden in een potje. Mag ik dit afmaken? Dan stop ik echt.", "Ik baal ervan, maar ik stop."],
    },
    coach_questions: ["Wat maakt stoppen voor jou moeilijk?", "Wat zou het de volgende keer makkelijker maken?", "Hoe kan de ouder je het best een seintje geven?"],
    repair_steps: ["Afmaken wat is afgesproken, zonder nieuwe discussie", "Zeggen dat je baalde, zonder te schelden", "Samen kijken naar de afspraak van morgen"],
    prevention: ["Vooraf vaste speeltijd en eindtijd afspreken", "Een seintje 10 minuten van tevoren", "Afspreken wat er gebeurt als de afspraak niet wordt nagekomen", "Regels voorspelbaar en eerlijk houden"],
    age_adaptations: { jong: "Gebruik een timer of klok die het kind zelf kan zien. Houd de regel simpel.", tiener: "Laat de jongere meedenken over de afspraak, bijvoorbeeld een weekbudget dat hij of zij zelf indeelt." },
    adhd_add_considerations: ["Overschakelen van een spel naar iets anders kan extra moeilijk zijn.", "Een vast seintje en een vaste volgorde helpen.", "Bespreek oplossingen niet uitgebreid als de spanning hoog is."],
    professional_support: ["Het stoppen loopt bijna elke dag uit op heftige ruzie", "Gamen gaat ten koste van slaap, school of vrienden", "Er is agressie bij het stoppen"],
    practice: "gamen-stoppen",
  },
  {
    id: "in-de-weg",
    title: "Broer en zus lopen elkaar in de weg",
    category: "broer-zus",
    description: "Broer en zus irriteren elkaar, pakken elkaars spullen, maken vervelende opmerkingen of respecteren elkaars rust en privacy niet.",
    trigger: "Een kleine botsing: iets pakken, een opmerking, in elkaars ruimte komen.",
    possible_factors: ["Behoefte aan eigen ruimte en privacy", "Verschil in behoefte aan rust", "Het gevoel dat het oneerlijk is", "Irritaties die zich hebben opgestapeld", "Moeite met elkaars grenzen"],
    early_signs: ["Zuchten of rollen met de ogen", "Snauwen", "Elkaar blijven opzoeken", "Deuren hard dichtdoen"],
    safety_check: [],
    parent_guidance: ["Laat beide kinderen hun eigen kant vertellen. Kies niet meteen een kant.", "Benoem concreet welk gedrag over een grens ging.", "Help ieder kind een duidelijke grens te formuleren.", "Maak afspraken over spullen, privacy en eigen ruimte."],
    child_guidance: ["Zeg wat je stoort, niet wat je van de ander vindt.", "Geef een duidelijke grens: \"Wil je kloppen voor je binnenkomt?\"", "Lukt het niet samen? Vraag een ouder om te helpen."],
    calming_options: ["Even naar je eigen kamer", "Iets anders gaan doen", "Muziek op"],
    dialogue_examples: {
      ouder: ["Jullie hoeven het niet altijd met elkaar eens te zijn. Jullie moeten elkaars grenzen wel respecteren. We gaan kijken wat ieder van jullie nodig heeft om weer rustig te worden."],
      kind: ["Ik wil dat je mijn spullen niet pakt zonder te vragen.", "Ik heb nu even rust nodig. Kunnen we straks praten?"],
    },
    coach_questions: ["Wat wil je dat de ander voortaan anders doet?", "Wat kun jij zelf veranderen?", "Wat heb jij nodig om je thuis prettig te voelen?"],
    repair_steps: ["Spullen teruggeven of iets heel maken", "Laten merken dat je snapt wat het deed", "Een afspraak maken over spullen of ruimte"],
    prevention: ["Afspraken over elkaars spullen en kamers", "Kloppen voor je binnenkomt", "Vaste rustmomenten", "Een afgesproken manier om een discussie te stoppen"],
    age_adaptations: { jong: "Maak de afspraken heel concreet en hang ze desnoods op.", tiener: "Respecteer privacy extra goed. Laat ze zelf eerst een afspraak voorstellen." },
    adhd_add_considerations: ["Prikkels van de ander kunnen sneller irriteren.", "Een eigen rustplek helpt.", "Houd afspraken kort en zichtbaar."],
    professional_support: ["Er is vaak fysiek geweld tussen de kinderen", "Eén kind is steeds het doelwit", "De sfeer thuis blijft gespannen ondanks afspraken"],
    practice: "in-de-weg",
  },
  {
    id: "brutaal-antwoord",
    title: "Een brutaal antwoord op een normale vraag",
    category: "ouder-kind",
    description: "Een ouder vraagt iets gewoons, zoals of het huiswerk af is. Het kind reageert geïrriteerd, rolt met de ogen of zegt dat de ouder zich er niet mee moet bemoeien.",
    trigger: "Een gewone vraag van een ouder.",
    possible_factors: ["De vraag voelt als controle of kritiek", "Er is al spanning door school of vrienden", "De toon wordt verkeerd begrepen, door ouder of kind", "Reageren voordat je hebt nagedacht"],
    early_signs: ["Kortaf antwoorden", "Rollen met de ogen", "Niet opkijken van de telefoon", "Zuchten"],
    safety_check: [],
    parent_guidance: ["Ga geen machtsstrijd aan.", "Benoem het gedrag, zonder te beschamen.", "Vraag wat het kind in je vraag hoorde.", "Help het kind irritatie op een nette manier te zeggen."],
    child_guidance: ["Ben je geïrriteerd? Zeg dat, in plaats van de ander weg te duwen.", "Bijvoorbeeld: \"Ik ben nu geïrriteerd. Kun je het straks nog eens vragen?\""],
    calming_options: ["Even iets drinken", "Vijf minuten voor jezelf", "Even naar buiten"],
    dialogue_examples: {
      ouder: ["Ik hoor dat je geïrriteerd reageert. Is het dat je nu geen gesprek wilt, of zit er iets in mijn vraag dat je dwarszit?"],
      kind: ["Ik ben nu geïrriteerd. Kun je het straks nog eens vragen?", "Sorry, ik ben moe. Ja, het is bijna af."],
    },
    coach_questions: ["Wat hoorde je in de vraag?", "Hoe kun je laten merken dat je geïrriteerd bent, zonder de ander weg te duwen?", "Hoe zou de ouder het anders kunnen vragen?"],
    repair_steps: ["Het antwoord opnieuw geven, nu normaal", "Laten merken dat je ziet hoe het overkwam", "Afspreken wanneer zulke vragen beter uitkomen"],
    prevention: ["Een vast moment voor vragen over huiswerk", "Na school eerst even bijkomen", "Een afgesproken zin als je even geen zin hebt in vragen"],
    age_adaptations: { jong: "Oefen samen een alternatief antwoord, bijvoorbeeld als rollenspel.", tiener: "Erken de behoefte aan zelfstandigheid. Vraag minder, vertrouw meer, en spreek af wanneer je wel even checkt." },
    adhd_add_considerations: ["Impulsief reageren gaat vaak sneller dan nadenken.", "Geef ruimte om het antwoord over te doen.", "Stel één vraag tegelijk."],
    professional_support: ["Het kind reageert bijna altijd afwijzend of vijandig", "Er lijkt meer aan de hand, zoals somberheid of problemen op school"],
    practice: "vals-antwoord",
  },
  {
    id: "oneerlijk",
    title: "Je voelt je oneerlijk of kwetsend behandeld",
    category: "broer-zus",
    description: "Een kind voelt zich beledigd, uitgelachen, afgewezen of oneerlijk behandeld, en reageert met schelden, schreeuwen, terugtrekken of terugaanvallen.",
    trigger: "Een opmerking, grap of beslissing die als oneerlijk of kwetsend voelt.",
    possible_factors: ["Zich niet gehoord of gerespecteerd voelen", "Schaamte of bang zijn voor gezichtsverlies", "Een eerdere ruzie die nog niet is opgelost", "Sterk reageren op onrecht"],
    early_signs: ["Rood worden of stilvallen", "Terugschelden", "Weglopen of zich afsluiten", "Tranen"],
    safety_check: [],
    parent_guidance: ["Erken het gevoel, zonder direct te beslissen wie gelijk heeft.", "Zoek uit wat er echt gebeurde.", "Help het kind kiezen: een grens aangeven, afstand nemen of hulp vragen."],
    child_guidance: ["Je mag boos zijn als iets je kwetst.", "Kies wat je doet: een grens aangeven, even afstand nemen, of hulp vragen.", "Terugkwetsen maakt het meestal groter."],
    calming_options: ["Afstand nemen van de ander", "Even naar je rustplek", "Het eerst aan iemand anders vertellen"],
    dialogue_examples: {
      ouder: ["Ik wil begrijpen wat er gebeurde. Je mag boos zijn en zeggen dat iets je kwetst. We gaan ook kijken hoe je kunt reageren zonder iemand pijn te doen."],
      kind: ["Ik vind dit niet prettig. Stop daarmee.", "Ik neem nu even afstand."],
    },
    coach_questions: ["Wat had je op dat moment nodig?", "Wat zou je de volgende keer kunnen zeggen?", "Wat denk je dat de ander bedoelde, en wat deed het met jou?"],
    repair_steps: ["Laten weten wat het met je deed", "De ander laten zeggen wat hij of zij bedoelde", "Afspreken wat wel en niet oké is"],
    prevention: ["Oefenen met assertieve zinnen: \"Ik vind dit niet prettig. Stop daarmee.\"", "Thuis afspreken: grapjes stoppen zodra iemand \"stop\" zegt"],
    age_adaptations: { jong: "Help het kind het gevoel een naam te geven: boos, verdrietig, beschaamd.", tiener: "Neem het gevoel van onrecht serieus. Vraag eerst door, geef later pas advies." },
    adhd_add_considerations: ["Een sterke reactie op onrecht komt vaak voor. Het gevoel is echt, ook als de reactie te heftig is.", "Bespreek het pas als de spanning gezakt is."],
    professional_support: ["Het kind voelt zich structureel buitengesloten of gepest", "Het kind trekt zich steeds vaker terug of wordt somber"],
    practice: "iemand-doet-vals",
  },
  {
    id: "doordrijven",
    title: "Blijven doordrijven of geen nee accepteren",
    category: "ouder-kind",
    description: "Het kind blijft dezelfde eis herhalen, blijft discussiëren, wil het laatste woord of accepteert een beslissing niet.",
    trigger: "Een ouder zegt nee of neemt een beslissing.",
    possible_factors: ["Moeite met teleurstelling", "Behoefte aan duidelijkheid of controle", "Het gevoel niet serieus genomen te worden", "Een discussie die oploopt doordat je steeds opnieuw uitlegt"],
    early_signs: ["Steeds hetzelfde vragen", "\"Maar waarom dan?\" blijven herhalen", "Harder gaan praten", "Achter de ouder aan blijven lopen"],
    safety_check: [],
    parent_guidance: ["Kijk of het kind nog informatie nodig heeft, of vooral moeite heeft met de uitkomst.", "Geef één korte uitleg en blijf daarbij.", "Erken de wens, maar ga geen eindeloze onderhandeling aan.", "Bied aan om de afspraak later opnieuw te bekijken."],
    child_guidance: ["Je mag het ergens niet mee eens zijn.", "Zeg je punt één keer goed, en stop dan.", "Vraag of jullie er later nog eens naar kunnen kijken."],
    calming_options: ["Even weglopen uit de discussie", "Je punt opschrijven voor later", "Iets anders gaan doen"],
    dialogue_examples: {
      ouder: ["Ik hoor dat je het er niet mee eens bent. Je hebt je punt kunnen uitleggen en ik heb mijn beslissing uitgelegd. We hoeven het niet eens te zijn om nu verder te kunnen."],
      kind: ["Ik ben het er niet mee eens, maar ik stop nu. Kunnen we er morgen nog eens over praten?"],
    },
    coach_questions: ["Hoe kun je laten zien dat je het ergens niet mee eens bent, en toch stoppen met de discussie?", "Wat had je nodig om je gehoord te voelen?"],
    repair_steps: ["De discussie stoppen", "Een moment afspreken om het opnieuw te bekijken", "Laten merken dat je de ander gehoord hebt"],
    prevention: ["Duidelijk maken waar overleg kan, en waar een grens vaststaat", "Inspraak geven waar het kan", "Een vast moment om afspraken te bespreken, zoals het gezinsoverleg"],
    age_adaptations: { jong: "Houd de uitleg heel kort. Eén zin.", tiener: "Geef meer ruimte om mee te praten en spreek af wanneer een regel opnieuw besproken wordt." },
    adhd_add_considerations: ["Teleurstelling verdragen kan extra moeilijk zijn.", "Lange uitleg werkt averechts. Kort en steeds hetzelfde werkt beter.", "Geef verwerkingstijd."],
    professional_support: ["Discussies lopen bijna altijd uit op heftige ruzie", "Ouders voelen zich machteloos of uitgeput"],
    practice: "zin-doordrijven",
  },
  {
    id: "advies",
    title: "Niet luisteren naar advies",
    category: "ouder-kind",
    description: "Een ouder geeft advies over school, vrienden, planning of gedrag. Het kind wijst het af, zegt dat de ouder er niks van snapt, of doet juist het tegenovergestelde.",
    trigger: "Een ouder geeft ongevraagd advies.",
    possible_factors: ["Behoefte aan zelfstandigheid", "Advies voelt als kritiek of wantrouwen", "Te veel informatie tegelijk", "Eerst zelf een oplossing willen bedenken"],
    early_signs: ["\"Ja ja\" zonder te luisteren", "\"Jij snapt het niet\"", "Weglopen", "Juist het tegenovergestelde doen"],
    safety_check: [],
    parent_guidance: ["Luister eerst, geef daarna pas advies.", "Vraag of je mag meedenken.", "Vraag welke oplossing het kind zelf ziet.", "Help, zonder alle verantwoordelijkheid over te nemen."],
    child_guidance: ["Luisteren betekent niet dat je het ermee eens moet zijn.", "Vat samen wat de ander bedoelt: \"Dus jij bedoelt…\"", "Zeg dan wat jij zelf van plan bent."],
    calming_options: ["Even tijd voor jezelf", "Er later op terugkomen"],
    dialogue_examples: {
      ouder: ["Ik heb misschien een idee, maar ik wil eerst horen hoe jij ernaar kijkt. Wil je dat ik meedenk, of wil je eerst zelf vertellen wat je van plan bent?"],
      kind: ["Je bedoelt dat ik niet alles op het laatste moment moet doen, toch? Ik wil het eerst zelf proberen. Als het niet lukt, vraag ik je hulp."],
    },
    coach_questions: ["Welke hulp zou je wel willen, zonder het gevoel dat iemand alles voor je bepaalt?", "Wat is jouw eigen plan?", "Wanneer vraag je wel om hulp?"],
    repair_steps: ["Samenvatten wat de ander bedoelde", "Je eigen plan noemen", "Afspreken wanneer je hulp vraagt"],
    prevention: ["Afspreken wanneer ouders meedenken en wanneer het kind het eerst zelf probeert", "Afspreken wanneer er extra hulp nodig is"],
    age_adaptations: { jong: "Bied twee opties aan en laat het kind kiezen.", tiener: "Vraag eerst of je advies mag geven. Accepteer ook een nee, en blijf beschikbaar." },
    adhd_add_considerations: ["Te veel informatie tegelijk komt niet binnen. Eén tip per keer.", "Een plan op papier of in de app helpt bij plannen."],
    professional_support: ["Er zijn grote zorgen over school, vrienden of gedrag", "Het contact tussen ouder en kind is langere tijd slecht"],
    practice: "niet-luisteren",
  },
  {
    id: "groepsapp",
    title: "Een nare foto in een groepsapp",
    category: "online",
    description: "Er wordt een gênante of kwetsende foto gedeeld. Het kind voelt zich vernederd, wordt boos, wil wraak, of wil niet dat de ouder zich ermee bemoeit.",
    trigger: "Een foto of bericht in een groepsapp of op social media.",
    possible_factors: ["Bang zijn voor vernedering of buitengesloten worden", "Groepsdruk en onzekerheid", "Geen controle meer over je eigen foto's", "Niet weten wat er online nog meer kan gebeuren"],
    early_signs: ["Stil worden of zich afsluiten", "Steeds op de telefoon kijken", "Niet naar school willen", "Boos of juist verdrietig reageren"],
    safety_check: ["Is de foto zonder toestemming gemaakt of gedeeld?", "Is het een naaktfoto, of is er sprake van chantage, bedreiging of seksuele intimidatie?"],
    parent_guidance: ["Reageer rustig en zonder verwijten.", "Vraag of de foto zonder toestemming is gemaakt of gedeeld, en of er gepest, gedreigd of gechanteerd wordt.", "Help bewijs bewaren, het bericht melden en om verwijdering vragen.", "Voorkom wraakacties en verdere verspreiding."],
    child_guidance: ["Je hoeft dit niet alleen op te lossen.", "Reageer niet in de groep en neem geen wraak.", "Maak een screenshot van het bericht, behalve als het een naaktfoto is. Die stuur je nooit door.", "Vertel het aan een ouder of je mentor."],
    calming_options: ["De telefoon even wegleggen", "Met iemand praten die je vertrouwt", "Iets doen wat je afleidt"],
    dialogue_examples: {
      ouder: ["Ik kan me voorstellen dat dit heel naar voelt. Je hoeft dit niet alleen op te lossen. Ik ga je helpen kijken wat er is gebeurd en welke stappen jou beschermen."],
      kind: ["Er staat een foto van mij in de groep en ik vind het echt rot. Wil je me helpen?"],
    },
    coach_questions: ["Wat zou jou nu het meest helpen om je weer veilig te voelen?", "Wie kan er nog meer helpen, op school bijvoorbeeld?"],
    repair_steps: ["De foto laten verwijderen", "Het melden bij de app of de school", "Afspreken wat je doet als het nog eens gebeurt"],
    prevention: ["Praten over digitale grenzen en toestemming", "Praten over groepsdruk online", "Afspreken wanneer en bij wie je hulp vraagt"],
    age_adaptations: { jong: "Kijk samen mee en neem het meteen over als het nodig is.", tiener: "Respecteer de privacy, maar maak duidelijk dat je helpt zonder te straffen. Laat de jongere meebeslissen over de stappen." },
    adhd_add_considerations: ["Impulsief terugreageren ligt op de loer. Spreek af: eerst de telefoon weg, dan pas reageren."],
    professional_support: ["Er is sprake van een naaktfoto, chantage of bedreiging: ga naar het veiligheidsscherm", "Het pesten gaat door", "Het kind wil niet meer naar school"],
    practice: "groepsapp",
  },
  {
    id: "voetbal",
    title: "Ruzie tijdens samen spelen of sporten",
    category: "buiten",
    description: "Ruzie tijdens een spel of sport, buiten of binnen: over een regel, de score of vals spelen. Er wordt gescholden, geduwd, of iemand loopt boos weg.",
    trigger: "Een discussie over het spel, de regels of de score.",
    possible_factors: ["Teleurstelling en willen winnen", "Sterk reageren op onrecht", "Groepsdruk of uitdagen", "Moeite om je in te houden als het oploopt"],
    early_signs: ["Harder roepen", "Wild gebaren", "Dicht bij de ander gaan staan", "Schelden"],
    safety_check: [],
    parent_guidance: ["Stop het spel als de spanning te hoog wordt.", "Zorg dat iedereen veilig is en haal ze zo nodig uit elkaar.", "Bespreek wat er gebeurde pas als het rustig is.", "Laat iedereen zijn kant vertellen en oefen andere reacties."],
    child_guidance: ["Merk je dat je bijna ontploft? Stop even met spelen.", "Zeg: \"Ik ben te boos, even pauze.\"", "Spreek daarna een eerlijke manier af: overdoen of tossen."],
    calming_options: ["Even uit het spel stappen", "Water drinken", "Een rondje lopen"],
    dialogue_examples: {
      ouder: ["We stoppen even. Het spel is minder belangrijk dan dat iedereen veilig blijft. We bespreken straks wat er gebeurde en hoe jullie verder kunnen."],
      kind: ["We zien het allebei anders. Doen we hem over?", "Ik ben te boos. Even pauze."],
    },
    coach_questions: ["Aan welk signaal merk je dat je bijna de controle verliest?", "Wat kun je dan doen?", "Hoe kunnen jullie het de volgende keer eerlijk beslissen?"],
    repair_steps: ["Even afstand, dan terugkomen", "Laten merken dat het je spijt, als je dat meent", "Een eerlijke manier afspreken om te beslissen"],
    prevention: ["Afspraken over sportief spelen", "Een time-outsignaal afspreken", "Spelregels vooraf afspreken", "Een neutrale derde vragen als je er niet uitkomt"],
    age_adaptations: { jong: "Een volwassene in de buurt houdt het overzicht.", tiener: "Laat ze zelf de regels en een time-outsignaal afspreken." },
    adhd_add_considerations: ["Impulsen remmen is lastiger als emoties oplopen.", "Oefen vooraf met een time-outsignaal.", "Vroege signalen leren herkennen helpt het meest."],
    professional_support: ["Er wordt vaker geduwd of geslagen", "Het kind raakt vrienden kwijt door ruzies"],
    practice: "voetbal",
  },
];

export const CATEGORY_LABEL: Record<ConflictScenario["category"], string> = { "ouder-kind": "Ouder en kind", "broer-zus": "Broer en zus", online: "Online", buiten: "Buiten" };
export const conflictById = (id: string) => CONFLICTS.find((c) => c.id === id);
