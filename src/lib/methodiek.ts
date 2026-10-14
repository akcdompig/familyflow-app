/*
  Algemene coachlogica: zes vaste stappen, stoplichtmodel, rustopties en veiligheidsprotocol.
  Geldt voor elk scenario. De scenario-inhoud staat los hiervan in conflicts.ts,
  zodat er scenario's bij kunnen zonder de app te herschrijven.
  Geen diagnoses, geen partij kiezen, geen afgedwongen excuses.
*/

export type Licht = "rood" | "oranje" | "groen";

export const STAPPEN = [
  { n: 1, titel: "Wat gebeurde er?" },
  { n: 2, titel: "Spanning herkennen" },
  { n: 3, titel: "Eerst rust" },
  { n: 4, titel: "Het gesprek" },
  { n: 5, titel: "Herstel en afspraak" },
  { n: 6, titel: "Leren voor de volgende keer" },
] as const;

export const STOPLICHT: Record<Licht, { titel: string; signalen: string[]; ouder: string; kind: string; zin: string }> = {
  rood: {
    titel: "De spanning is te hoog",
    signalen: ["Schreeuwen of schelden", "Dreigen of iets doen zonder na te denken", "Heel hard huilen", "Niet meer kunnen luisteren", "Dichtklappen of ineens weglopen"],
    ouder: "Stop het gesprek over de inhoud. Gebruik weinig woorden, praat rustig, geef ruimte. Kijk of iedereen veilig is.",
    kind: "Stop even. Je hoeft nu niks op te lossen. Eerst rustig worden.",
    zin: "We hoeven dit nu niet op te lossen. Eerst zorgen we dat iedereen rustig en veilig is.",
  },
  oranje: {
    titel: "De spanning loopt op",
    signalen: ["Kortaf reageren", "Onrustig bewegen", "Steeds hetzelfde zeggen", "Harder gaan praten", "Moeite met luisteren"],
    ouder: "Benoem wat je ziet, zonder oordeel. Geef hooguit twee keuzes en stel een korte pauze voor.",
    kind: "Je merkt dat het oploopt. Dat is een goed moment om even pauze te nemen.",
    zin: "Ik merk dat het steeds moeilijker wordt om elkaar te horen. Wil je even rustig zitten of een stukje lopen?",
  },
  groen: {
    titel: "Er is weer ruimte om te praten",
    signalen: ["Rustigere stem", "Kan weer luisteren", "Kan weer nadenken", "Kan kiezen wat je wilt doen"],
    ouder: "Nu kun je samen terugkijken: wat gebeurde er, wat voelde ieder, wat is ieders aandeel?",
    kind: "Je bent rustig genoeg om te praten. Goed gedaan.",
    zin: "Zullen we samen terugkijken? Wat gebeurde er vlak voordat het misging?",
  },
};

export const STIL_NOTE = "Let op: niet iedereen wordt boos als de spanning oploopt. Sommige kinderen worden juist stil, trekken zich terug of reageren niet meer. Kijk naar wat er echt gebeurt.";

/** Manieren om rustig te worden. Altijd een keuze, nooit verplicht. */
export const RUST_OPTIES = [
  { id: "stil", label: "Even stil zijn" },
  { id: "water", label: "Water drinken" },
  { id: "bewegen", label: "Rustig bewegen of een stukje lopen" },
  { id: "plek", label: "Naar mijn rustplek" },
  { id: "afstand", label: "Even afstand nemen" },
  { id: "adem", label: "Ademhalen met de app" },
] as const;

export const VERDER_WANNEER = ["Over 10 minuten", "Na het eten", "Vanavond", "Morgen"];

export const TIME_OUT_NOTE = "Een time-out is geen straf. Het is even afstand nemen om rustig te worden. Spreek af wanneer jullie verder praten.";

/* ---------- Veiligheid ---------- */
export type Gevaar = "geweld" | "dreiging" | "zelf" | "online" | "pesten";

export const VEILIGHEIDSVRAGEN: { id: Gevaar; ouder: string; kind: string }[] = [
  { id: "geweld", ouder: "Is iemand gewond, of is er geslagen, geschopt of met iets gegooid?", kind: "Is iemand gewond, of is er geslagen, geschopt of gegooid?" },
  { id: "dreiging", ouder: "Wordt er ernstig gedreigd, of voelt iemand zich thuis niet veilig?", kind: "Word je bedreigd, of voel je je niet veilig?" },
  { id: "zelf", ouder: "Praat of denkt iemand erover zichzelf pijn te doen of dood te willen?", kind: "Denk je erover jezelf pijn te doen, of wil je niet meer leven?" },
  { id: "online", ouder: "Gaat het om een naaktfoto, chantage of iemand die online dreigt?", kind: "Gaat het om een naaktfoto, chantage of iemand die online dreigt?" },
  { id: "pesten", ouder: "Wordt uw kind al langere tijd steeds gepest?", kind: "Word je al langere tijd steeds gepest?" },
];

export interface Hulplijn {
  naam: string;
  wat: string;
  tel?: string;
  web?: string;
}

export const HULP = {
  nood: { naam: "112", wat: "Direct gevaar of ernstig gewond", tel: "112" },
  kindertelefoon: { naam: "De Kindertelefoon", wat: "Gratis en anoniem praten, voor kinderen en jongeren", tel: "0800-0432", web: "https://www.kindertelefoon.nl" },
  veiligthuis: { naam: "Veilig Thuis", wat: "Advies bij geweld of onveiligheid thuis, ook voor ouders", tel: "0800-2000", web: "https://www.veiligthuis.nl" },
  zelfmoord: { naam: "113 Zelfmoordpreventie", wat: "Gratis en anoniem, dag en nacht", tel: "0800-0113", web: "https://www.113.nl" },
  helpwanted: { naam: "Helpwanted", wat: "Hulp bij naaktfoto's, sextortion en online misbruik", web: "https://www.helpwanted.nl" },
} satisfies Record<string, Hulplijn>;

export const VEILIGHEID: Record<Gevaar, { titel: string; ouder: string[]; kind: string[]; hulp: (keyof typeof HULP)[]; verderMag: boolean }> = {
  geweld: {
    titel: "Eerst veiligheid",
    ouder: ["Haal de kinderen uit elkaar en zorg dat iedereen veilig is.", "Ernstig gewond? Bel 112.", "Praat pas over wat er gebeurde als iedereen rustig is.", "Gebeurt dit vaker? Vraag hulp bij Veilig Thuis, de huisarts of het wijkteam."],
    kind: ["Ga naar een veilige plek, weg van de ander.", "Zoek meteen een volwassene op.", "Ben je gewond? Zeg het tegen een volwassene of bel 112."],
    hulp: ["nood", "veiligthuis", "kindertelefoon"],
    verderMag: true,
  },
  dreiging: {
    titel: "Dit is meer dan een ruzie",
    ouder: ["Bij ernstige dreiging of onveiligheid gaat bescherming voor bemiddelen.", "Bij direct gevaar: bel 112.", "Bel Veilig Thuis voor advies. Dat kan ook anoniem."],
    kind: ["Je verdient het om je veilig te voelen.", "Vertel het aan een volwassene die je vertrouwt.", "Je kunt ook gratis en anoniem bellen of chatten met de Kindertelefoon."],
    hulp: ["nood", "veiligthuis", "kindertelefoon"],
    verderMag: false,
  },
  zelf: {
    titel: "Je staat er niet alleen voor",
    ouder: ["Neem het altijd serieus en blijf in de buurt.", "Vraag rustig en direct hoe het gaat. Praten over zelfdoding maakt het niet erger.", "Bel 113 of de huisarts voor advies, vandaag nog. Bij direct gevaar: 112."],
    kind: ["Fijn dat je dit eerlijk aangeeft. Je hoeft dit niet alleen te dragen.", "Vertel het nu aan iemand die je vertrouwt.", "Je kunt dag en nacht gratis en anoniem praten met 113. Bij direct gevaar: bel 112."],
    hulp: ["zelfmoord", "kindertelefoon", "nood"],
    verderMag: false,
  },
  online: {
    titel: "Hier hoort hulp bij",
    ouder: ["Blijf rustig en geef geen verwijten. Uw kind is niet de schuldige.", "Bewaar bewijs, maar stuur beelden nooit door. Maak geen screenshots van naaktbeelden.", "Ga niet in op eisen of chantage. Blokkeer en meld de afzender.", "Helpwanted helpt gratis bij het verwijderen en met advies. Bij chantage of bedreiging: doe aangifte bij de politie."],
    kind: ["Het is niet jouw schuld.", "Stuur niks door en betaal of stuur niks als iemand dreigt.", "Vertel het aan een volwassene die je vertrouwt.", "Helpwanted helpt je gratis en anoniem."],
    hulp: ["helpwanted", "kindertelefoon", "nood"],
    verderMag: false,
  },
  pesten: {
    titel: "Pesten is geen gewone ruzie",
    ouder: ["Bij pesten is er geen gelijke strijd. Bescherming gaat voor bemiddelen.", "Neem contact op met de mentor of de vertrouwenspersoon op school.", "Schrijf op wat er gebeurt, met data. Bewaar online berichten."],
    kind: ["Het ligt niet aan jou.", "Vertel het thuis en aan je mentor. Daar is het voor.", "Bewaar berichten en reageer niet terug in de groep.", "Je kunt ook praten met de Kindertelefoon."],
    hulp: ["kindertelefoon"],
    verderMag: false,
  },
};

export const ALGEMENE_HULP = "Gebeurt dit meerdere keren per week, loopt het steeds vaker uit de hand of maakt u zich zorgen? Bespreek het met de huisarts, het wijkteam of de mentor. Deze coach vervangt geen professionele hulp.";

export const INTENTIE_IMPACT = "Iemand kan iets niet kwetsend bedoelen en de ander toch kwetsen. Allebei kan waar zijn: wat je bedoelde, en wat het deed.";

export const GEEN_SORRY_DWANG = "Een sorry werkt alleen als je het meent. Dwing het niet af. Iets goedmaken kan ook met een daad of een nieuwe afspraak.";
