/** Oefenlevels: herkenbare situaties met 4 keuzes. Elke keuze laat zien wat er met jou gebeurt én wat de ander voelt. */
export interface Scenario {
  id: number;
  title: string;
  where: string;
  situation: string;
  /** [keuze, wat er met jou gebeurt, wat de ander voelt] */
  choices: [string, string, string][];
  question: string;
  answers: string[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 1, title: "Stoppen met gamen", where: "Thuis",
    situation: "Je zit midden in een potje. Je vader zegt: “Over vijf minuten stoppen, eten.” Na vijf minuten ben je nog bezig en hij zet de tv uit.",
    choices: [
      ["Schreeuwen en de controller gooien", "Je bent je gametijd voor morgen kwijt en het eten wordt ijzig.", "Papa schrikt en voelt zich niet gerespecteerd."],
      ["“Nog één minuutje!” en doorspelen", "Discussie, en het potje is toch verloren.", "Papa voelt dat afspraken niet tellen."],
      ["Ademhalen: “Ik was bijna klaar, dat vind ik echt balen.”", "Misschien mag je na het eten even afmaken.", "Papa snapt je en ziet dat je je kunt beheersen."],
      ["Volgende keer vóór het potje vragen hoe laat het eten is", "Geen verrassing en geen ruzie.", "Papa merkt dat je meedenkt."],
    ],
    question: "Wat helpt jou om makkelijker te stoppen?", answers: ["Een waarschuwing vooraf", "Eerst het potje afmaken", "Na het stoppen iets leuks doen", "Een timer zien"],
  },
  {
    id: 2, title: "Verliezen en uitgelachen worden", where: "Broer of zus",
    situation: "Jullie spelen een spel. Jij verliest en je zus lacht. Je wordt heel boos.",
    choices: [
      ["Haar schoppen of slaan", "Ze heeft pijn. Jij krijgt een flinke consequentie en moet het goedmaken.", "Ze voelt zich niet meer veilig bij jou."],
      ["Schreeuwen dat ze moet ophouden", "Het wordt een schreeuwwedstrijd.", "Ze lacht misschien nog harder."],
      ["Stoppen met het spel en naar je rustplek gaan", "Je voorkomt dat het uit de hand loopt.", "Ze merkt dat het je echt raakt."],
      ["“Ik vind het niet leuk als je lacht als ik verlies.”", "Ze hoort wat het met je doet.", "Ze kan stoppen of sorry zeggen."],
    ],
    question: "Wat staat er op jouw rustplan als je zo boos wordt?", answers: ["Weglopen naar mijn rustplek", "Ademhalen", "Iets fysieks, zoals een bokszak", "Het later bespreken"],
  },
  {
    id: 3, title: "Wie is er aan de beurt?", where: "Broer of zus",
    situation: "De vaatwasser moet uitgeruimd. Jij vindt dat je broer aan de beurt is. Hij zegt dat jij het moet doen.",
    choices: [
      ["Ruzie maken tot een ouder ingrijpt", "De vaatwasser is nog steeds vol.", "Iedereen raakt geïrriteerd."],
      ["Niks doen, hij is aan de beurt", "Er gebeurt niks en je ouders worden boos op jullie allebei.", "Hij voelt zich ook onterecht behandeld."],
      ["De takenlijst in de app checken", "De lijst beslist, niet de ruzie.", "Niemand hoeft gelijk te krijgen."],
      ["“Ik doe het nu, doe jij morgen de mijne?”", "Snel opgelost en je hebt een deal.", "Je broer voelt dat je meedenkt."],
    ],
    question: "Wat maakt taken voor jou eerlijk?", answers: ["Een vaste lijst", "Kunnen ruilen", "Iets terugkrijgen"],
  },
  {
    id: 4, title: "Je broer of zus pakt je spullen", where: "Broer of zus",
    situation: "Je broertje heeft zonder vragen je controller gepakt. Er zit nu een kras op.",
    choices: [
      ["Hem een duw geven", "Hij huilt, jij krijgt straf en de kras blijft.", "Hij is bang en verdrietig."],
      ["Zijn spullen kapotmaken als wraak", "Nu is het oorlog en verliezen jullie allebei.", "Hij wil jou terugpakken."],
      ["“Ik word boos als je mijn spullen pakt zonder te vragen.”", "Hij hoort wat het met jou doet.", "Hij voelt zich niet aangevallen en luistert eerder."],
      ["Samen met een ouder een leenregel maken", "Volgende keer is het duidelijk.", "Hij weet voortaan wat mag."],
    ],
    question: "Wat wil je eigenlijk dat er gebeurt?", answers: ["Dat hij sorry zegt", "Dat het niet meer gebeurt", "Dat de kras gemaakt wordt"],
  },
  {
    id: 5, title: "Uitgescholden in een game", where: "Online",
    situation: "Je verliest online. Een teamgenoot scheldt je uit in de voicechat.",
    choices: [
      ["Keihard terugschelden", "Het escaleert. Je kunt geband worden.", "Hij krijgt precies de reactie die hij zocht."],
      ["Zijn naam opzoeken en het op school laten merken", "Het conflict komt mee naar school.", "Hij gaat terugslaan."],
      ["Muten en het potje afmaken", "Jij hebt rust.", "Hij heeft geen publiek meer."],
      ["Rapporteren en het thuis vertellen als het blijft gebeuren", "Je hoeft het niet alleen op te lossen.", "Hij krijgt een waarschuwing van het spel."],
    ],
    question: "Wat zegt zijn gescheld over jou?", answers: ["Niks, hij was gewoon boos", "Ik twijfel soms", "Het raakt me best"],
  },
  {
    id: 6, title: "Uitgelachen in de groepsapp", where: "Klas",
    situation: "Iemand zet een foto van jou in de klassenapp. Iedereen stuurt lachende emoji’s.",
    choices: [
      ["Een gemene foto terugsturen", "Nu ben jij ook dader en het blijft rondgaan.", "Die persoon voelt zich net zo rot als jij."],
      ["Niks zeggen en de hele avond terugscrollen", "Je voelt je steeds rotter en slaapt slecht.", "De anderen denken dat het je niks doet."],
      ["Screenshot maken en het aan je ouder of mentor laten zien", "Er komt een volwassene bij die het kan stoppen.", "De dader merkt dat er grenzen zijn."],
      ["Privé vragen of de foto weg mag", "Kan werken. Stopt het niet, ga dan naar een volwassene.", "Die persoon hoort hoe het voor jou is."],
    ],
    question: "Bij wie kun jij terecht als iets online pijn doet?", answers: ["Papa of mama", "Mijn mentor", "Een vriend", "Ik weet het niet"],
  },
  {
    id: 7, title: "Eruit gestuurd", where: "School",
    situation: "Je zat even met je buurman te praten. De docent stuurt alleen jou eruit en je vindt het oneerlijk.",
    choices: [
      ["De deur dichtslaan en gaan schelden", "Schorsing en een gesprek met je ouders.", "De docent vertrouwt je minder."],
      ["Weglopen en naar huis gaan", "Verzuim, en het probleem is niet opgelost.", "School gaat zich zorgen maken."],
      ["Rustig gaan en na de les vragen of je het mag uitleggen", "De docent luistert eerder naar je.", "De docent ziet dat je je kunt beheersen."],
      ["Het met je mentor bespreken als het vaker gebeurt", "Je mentor kan bemiddelen.", "De docent hoort jouw kant."],
    ],
    question: "Wat kun jij doen als iets oneerlijk voelt?", answers: ["Later rustig praten", "Mijn mentor vragen", "Het thuis vertellen"],
  },
  {
    id: 8, title: "Vrienden willen spijbelen", where: "School",
    situation: "In de pauze zeggen je vrienden: “Kom, we gaan niet naar het laatste uur. En neem een hijs.”",
    choices: [
      ["Meedoen, anders vinden ze je saai", "Verzuim, een telefoontje naar huis en een gewoonte die moeilijk afleert.", "Je vrienden zien dat je makkelijk mee te krijgen bent."],
      ["Meegaan maar niks doen", "Je krijgt toch dezelfde gevolgen.", "Je vrienden rekenen je tot de groep."],
      ["“Nee, ik heb geen zin in gezeur thuis”", "Een makkelijke uitweg zonder discussie.", "De meesten vinden het prima."],
      ["“Na school gaan we voetballen?”", "Je blijft erbij horen, op jouw manier.", "Je vrienden hebben gewoon een ander plan."],
    ],
    question: "Wie is een echte vriend als je een keer nee zegt?", answers: ["Iemand die het accepteert", "Iemand die niet blijft duwen", "Weet ik nog niet"],
  },
  {
    id: 9, title: "Toetsstress", where: "School",
    situation: "Morgen heb je een toets. Je snapt het niet en denkt: “Ik haal het toch niet.”",
    choices: [
      ["Gaan gamen om het te vergeten", "Even rust, morgen meer stress.", "Je ouders merken het pas bij het cijfer."],
      ["Tot laat doorleren", "Je slaapt slecht en onthoudt minder.", "Je ouders zien dat je moe bent."],
      ["Kleine stukjes: 20 minuten leren, 5 minuten pauze", "Het voelt kleiner en je gaat vooruit.", "Je ouders zien je inzet."],
      ["Iemand vragen om je te overhoren", "Samen gaat het sneller.", "Je ouder helpt graag en voelt zich betrokken."],
    ],
    question: "Wat zeg je tegen jezelf als iets moeilijk is?", answers: ["Ik kan het niet", "Ik snap het nog niet", "Stap voor stap"],
  },
  {
    id: 10, title: "Ruzie over huiswerk", where: "Thuis",
    situation: "Je moeder zegt voor de derde keer dat je huiswerk moet maken. Jij zegt dat het al af is, maar dat is niet waar.",
    choices: [
      ["Liegen en hopen dat het niet uitkomt", "Het komt meestal uit, en dan is er ruzie.", "Je moeder vertrouwt je minder."],
      ["Boos worden: “Je zit altijd te zeuren!”", "De ruzie gaat over toon in plaats van huiswerk.", "Je moeder voelt zich niet gehoord."],
      ["Eerlijk zeggen dat je geen zin hebt of het niet snapt", "Je moeder kan helpen.", "Ze waardeert je eerlijkheid."],
      ["Samen een vast huiswerkmoment afspreken", "Geen gezeur meer, want het staat vast.", "Ze hoeft niet steeds te herinneren."],
    ],
    question: "Wat is het moeilijkste aan beginnen?", answers: ["Geen zin", "Ik snap het niet", "Ik weet niet waar ik moet beginnen"],
  },
];

export const PLAN_OPTIONS = {
  signals: ["Warm hoofd", "Harde stem", "Vuisten ballen", "Hart bonkt", "Huilen", "Alles is stom"],
  helps: ["Naar mijn rustplek", "10 keer diep ademen", "Muziek op", "Bokszak of sporten", "Even naar buiten", "Douchen", "Tekenen of schrijven"],
  needs: ["Even met rust laten", "Niet praten, wel in de buurt", "Later rustig praten", "Een knuffel", "Iets te drinken"],
};
