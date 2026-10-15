/*
  De competenties van FamilyFlow. Eén lijst voor alles: groeidoelen (Ik), het weekverhaal en Groei.
  De id's zijn dezelfde als die van de groeidoelen uit versie 2.3, zodat gekozen doelen blijven werken.

  Dit zijn ontwikkelkansen, geen beoordeling. Een kind "beheerst" niks door één activiteit.
  - oefenen   = je deed iets waarbij je het oefent (samen koken, een groeidoel, je rustplan)
  - toepassen = je deed het in een echte situatie (ruzie uitgepraat, zelf begonnen, hulp gevraagd)
  - groei     = het komt terug, week na week (dat zie je pas na een paar weken)
*/

export interface Competentie {
  id: string;
  naam: string;
  emoji: string;
  /** Kort, voor kinderen. */
  uitleg: string;
  /** Wat je deze week kunt oefenen: jonger dan 12 en 12+. */
  jong: string[];
  tiener: string[];
}

export const COMPETENTIES: Competentie[] = [
  { id: "plannen", naam: "Plannen en organiseren", emoji: "🗓️", uitleg: "Zelf je huiswerk, klussen of iets leuks inplannen",
    jong: ["Kies 's ochtends wanneer je je klus doet", "Leg je tas en kleren de avond ervoor klaar"], tiener: ["Plan je huiswerk en klussen in voor de week", "Plan zelf iets leuks samen, met dag en tijd"] },
  { id: "verantwoordelijkheid", naam: "Zelfstandig en verantwoordelijk", emoji: "🎯", uitleg: "Je dag afmaken zonder dat iemand het hoeft te zeggen",
    jong: ["Doe je klus zonder dat iemand het hoeft te zeggen", "Ruim je eigen spullen op voor het slapen"], tiener: ["Doe je klussen op tijd, zonder herinnering", "Zeg het zelf als iets niet lukt, en wanneer het wel lukt"] },
  { id: "teleurstelling", naam: "Emoties de baas", emoji: "🌦️", uitleg: "Rust nemen, tot 10 tellen, sportief blijven als iets tegenzit",
    jong: ["Verlies je een spel? Zeg 'goed gespeeld'", "Tel tot 10 als iets niet gaat zoals je wilt"], tiener: ["Merk je dat je boos wordt? Neem even rust en kom dan terug", "Verlies je? Doe de klus zonder mopperen"] },
  { id: "communiceren", naam: "Praten en luisteren", emoji: "💬", uitleg: "Laten weten hoe het gaat, en de ander laten uitpraten",
    jong: ["Vertel bij het eten één ding over je dag", "Laat iemand uitpraten voor je zelf praat"], tiener: ["Vraag iemand thuis hoe zijn dag was, en luister echt", "Zeg wat je dwarszit voordat het groot wordt"] },
  { id: "conflicten", naam: "Conflicten oplossen", emoji: "🕊️", uitleg: "Een ruzie rustig uitpraten of samen een eerlijke oplossing kiezen",
    jong: ["Zeg sorry en vraag: wat kan ik doen?", "Kies 'om de beurt' als jullie het niet eens zijn"], tiener: ["Kies samen een eerlijke manier als jullie het niet eens zijn", "Praat een ruzie binnen een dag uit"] },
  { id: "samenwerken", naam: "Samenwerken", emoji: "🤝", uitleg: "Samen iets doen of samen een klus oppakken",
    jong: ["Doe één klus samen met je broer of zus", "Help bij het koken: snijden of tafel dekken"], tiener: ["Kook één keer samen, verdeel wie wat doet", "Doe een klus samen in plaats van om de beurt"] },
  { id: "rekening", naam: "Rekening houden met anderen", emoji: "💛", uitleg: "Iets doen voor een ander, of de ander laten kiezen",
    jong: ["Vraag of iemand hulp nodig heeft", "Wees stil als iemand slaapt of leert"], tiener: ["Doe iets voor iemand zonder dat het gevraagd wordt", "Laat een ander kiezen wat jullie samen gaan doen"] },
  { id: "sociaal", naam: "Sociaal", emoji: "👫", uitleg: "Iets doen met vrienden, of vrienden welkom laten voelen",
    jong: ["Nodig een vriend of vriendin uit om te spelen", "Stel iemand voor aan je ouders"], tiener: ["Spreek af met vrienden voor iets buiten of samen doen", "Neem een vriend mee voor een gezinsactiviteit"] },
  { id: "initiatief", naam: "Initiatief en hulp vragen", emoji: "🙋", uitleg: "Zelf beginnen, en op tijd hulp vragen",
    jong: ["Begin zelf aan je klus", "Vraag hulp als je iets niet snapt"], tiener: ["Bedenk zelf iets leuks voor het gezin", "Vraag op tijd hulp, niet pas als het te laat is"] },
  { id: "band", naam: "Samen tijd", emoji: "💞", uitleg: "Tijd met elkaar, zonder schermen of haast",
    jong: ["Doe een spelletje met papa of mama", "Help een avond bij het koken"], tiener: ["Plan één moment met een ouder, alleen jullie twee", "Doe iets samen met je broer of zus"] },
];

export const competentie = (id: string) => COMPETENTIES.find((c) => c.id === id);
export const oefentips = (c: Competentie, leeftijd?: number) => (leeftijd !== undefined && leeftijd < 12 ? c.jong : c.tiener);
