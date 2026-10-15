# FamilyFlow (versie 1.2, pilotweek)

Minder strijd, meer samen. Eén app voor het hele gezin: een huiskamer met levende avatars, check-ins, een rustplan, ruzies oplossen en coaching. Later ook voor school en wijkteam.

## Starten

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Losse preview zonder Next.js (dezelfde componenten, één HTML-bestand):

```bash
npm run preview:build   # maakt preview/dist/index.html
```

## Live zetten (release 1, testpilot)

De echte app is een gewone webapp die je op je beginscherm zet (PWA). Hij staat kant-en-klaar in `dist/`, dus Vercel hoeft niks te bouwen.

**1. Supabase (de database), ± 10 minuten**
1. Maak een gratis account op supabase.com en klik op **New project**. Kies als regio **Frankfurt** (EU).
2. Ga naar **SQL Editor › New query**, plak de inhoud van `supabase/schema.sql` en klik op **Run**.
3. Ga naar **Authentication › Sign In / Providers**:
   - **Email** aan, **Confirm email** uit. Ouders loggen in met e-mail en wachtwoord.
   - **Allow anonymous sign-ins** aan. Kinderen en de andere ouder doen mee met een code.
4. Ga naar **Project Settings › API** en kopieer de **Project URL** en de **anon public key**. Zet die in `dist/config.js`:
   ```js
   window.FF_CONFIG = { url: "https://xxxx.supabase.co", anonKey: "eyJ..." };
   ```
   De anon key is openbaar; de beveiliging zit in de regels in `schema.sql`. Je ziet alleen je eigen gezin.

**2. Vercel (de website), ± 5 minuten**
1. Log in op vercel.com met GitHub en klik op **Add New › Project**.
2. Kies de repo en klik op **Deploy**. De instellingen komen uit `vercel.json`.
3. Je krijgt een adres, bijvoorbeeld `familyflow.vercel.app`. Dat is de link voor in de uitnodigingen. Een eigen domein kan later.

**3. Aan de slag**
1. Open het adres op je telefoon en zet de app op je beginscherm.
2. Kies **Nieuw gezin starten**, maak een account en vul het gezin in.
3. Maak je avatar en stuur per persoon de uitnodiging, via mail of WhatsApp. Daarin staat hoe ze de app installeren en hun code.

De demo blijft bereikbaar via `/#demo`.

**Opnieuw bouwen** na een wijziging in de code: `node preview/build.mjs`. Daarmee worden `dist/` en de demo bijgewerkt.

## Somtoday-koppeling (versie 1.3)

Toetsen en huiswerk komen vanzelf uit Somtoday in de planning van het kind. Toetsen worden verdeeld in korte leerblokjes over de dagen ervoor (de regels van de leerplanner). Wat één keer is ingepland komt niet terug, ook niet als iemand het weghaalt.

**Eenmalig in Supabase, ± 5 minuten**
1. **SQL Editor › New query**: plak `supabase/somtoday.sql` en klik op **Run**.
2. **Edge Functions › Deploy a new function › Via Editor**. Noem hem precies `somtoday`, plak de inhoud van `supabase/functions/somtoday/index.ts` en klik op **Deploy**. Laat "Verify JWT" aan.

**Koppelen in de app**
Taken › Leren › kaart **Somtoday** › Somtoday koppelen. Kies de school en log in met het Somtoday-account van het kind. Het wachtwoord wordt niet bewaard, alleen een token, en dat staat alleen op de server.
Logt de school in via Microsoft, dan gaat het via een inloglink (het makkelijkst op een laptop).

**Hoe het loopt**
- Bij openen van de app (hooguit om de 3 uur) haalt de app 4 weken vooruit op en plant nieuwe dingen in. Er komt een melding: "Uit Somtoday: 1 toets en 3 huiswerk ingepland voor Kian".
- "Nu ophalen" op de Somtoday-kaart doet het meteen.
- De Somtoday-API is niet officieel. Werkt het opeens niet meer, dan zie je de fout op de kaart. Opnieuw koppelen helpt meestal.

## Somtoday 2.0: koppeling blijft, plus lesrooster (versie 1.12)

**Waarom de koppeling "verliep":** Somtoday geeft bij elke vernieuwing een nieuw token en het oude werkt daarna niet meer. Openden twee telefoons tegelijk de app, dan vernieuwden ze allebei met hetzelfde oude token; de tweede werd afgewezen en Somtoday trok de koppeling in.

**Nu:** het token wordt bewaard en hergebruikt (± 1 uur), vernieuwen gebeurt met een slot (maar één tegelijk), de server vernieuwt zelf elke 6 uur, en een storing bij Somtoday telt niet meer als "verlopen".

**Lesrooster:** per dag het eerste en laatste uur uit Somtoday (2 weken vooruit). Uitgevallen lessen tellen niet. Tijdens de les staat het kind "op school" met een voortgangsbalk, krijgt het geen meldingen en geen klussen voor nu.

**Eenmalig in Supabase**
1. **Edge Functions › somtoday**: plak de nieuwe `supabase/functions/somtoday/index.ts` en klik op **Deploy**.
2. **SQL Editor**: plak `supabase/somtoday-v2.sql` en klik op **Run**.
3. Koppel Kian **één keer opnieuw** (Taken › Leren › Somtoday). Het oude token is door de oude fout al ingetrokken. Daarna blijft hij gekoppeld.

## Herinneringen op je telefoon (versie 1.10)

Ben je 2 uur stil in de app, dan krijg je een seintje met wat er nog open staat (ochtendroutine, water, lunch, fruit) en wie er al lekker bezig is. Kinderen krijgen in het weekend en de vakantie om 9 uur een wekmelding als ze nog niks deden, daarna elk uur. Op schooldagen niet onder schooltijd (8.15–15.00); na 15.30 een seintje als ze nog niet in de app zijn geweest. Nooit voor 7 uur, en niet vlak voor bedtijd of als iemand slaapt.

**Eenmalig in Supabase, ± 5 minuten**
1. **Edge Functions › Deploy a new function › Via Editor**. Noem hem precies `herinneringen`, plak de inhoud van `supabase/functions/herinneringen/index.ts` en klik op **Deploy**. Laat "Verify JWT" aan.
2. **SQL Editor › New query**: plak `supabase/herinneringen.sql` en klik op **Run**. Dit maakt de tabellen en zet de klok aan (elke 15 minuten).

Sleutels hoef je niet te maken: de functie maakt ze zelf bij de eerste keer.

**Aanzetten op elke telefoon**
Huiskamer › kaart **Herinneringen** › Zet aan (of Ik › Herinneringen). Daarna "Stuur een test".
- **iPhone**: alleen als FamilyFlow op het beginscherm staat (Safari › Deel › Zet op beginscherm), iOS 16.4 of nieuwer. Open de app vanaf het beginscherm en zet het daar aan.
- **Android**: werkt in Chrome en als app.

## Wat er nu in zit (stukje 1, 2, 3 en release 1)

- **Designsysteem "Zonsondergang"**: `src/styles/tokens.css`. Alle kleuren, letters, ruimtes, rondingen en bewegingen staan hier.
- **Avatar-engine**: `src/components/avatar/`. Opgebouwd uit lagen (huid, haar, extra's, kleding) met uitdrukkingen per gevoel. Ze bewegen: ademen, knipperen en reageren als het gevoel verandert. Energie uit quests geeft glans, maar zegt niets over het gevoel.
- **Huiskamer**: het startscherm. Het hele gezin in één kamer, met het licht van het moment van de dag (dag, avond, nacht). Maximaal één aandachtskaart tegelijk.
- **Check-in**: kies een gezicht. Bij een slecht gevoel of "even rust" volgt één zachte vervolgvraag en de keuze om te praten.
- **Avatar maken**: huid, haar (8 stijlen, waaronder een hoofddoek), extra's en kleding, plus "Verras me".
- **Taken**: een simpele takenlijst per persoon, elke dag of alleen vandaag, of om de beurt tussen de kinderen. Ouders voegen taken toe. Kinderen krijgen XP, en hun avatar krijgt energie als hun taken af zijn.
- **Huisdier is een keuze**: aan te zetten bij Ik › Gezin. Alleen dan verschijnen huisdiertaken.
- **Oefenen**: 10 oefenlevels met keuzes, wat er met jou gebeurt en wat de ander voelt, eerst afkoelen bij een hoge score, voorlezen.
- **Rustplan en "Ik word boos"**: eigen rustplan per gezinslid, ook voor ouders, en ademhalen met je eigen avatar.
- **Ik**: avatar, level en XP, rustplan, gezinsinstellingen.
- **Bekijk als** (stukje 3, alleen demo): balk bovenin om te wisselen tussen Papa, Mama, de kinderen, School en Zorg. In de echte app heeft iedereen een eigen login.
- **Ruzie oplossen**: kind start een ruzie (met wie, waarover, fysiek of niet), koelt eerst af bij een hoge score, vertelt zijn kant. De ander leest die kant, vertelt de eigen kant en ze kiezen samen een oplossing, of vragen een ouder. Daarna: "Hoe voel je je nu?".
- **Gezin** (alleen ouders): gezinsoverleg in 5 stappen (wat ging goed, cijfer per gezinslid, doelen 1–10, één ding oplossen, iets leuks plannen), voortgangsgrafiek, ruzies deze week tegenover vorige week, lopende ruzies met aanpak, beloningen per level.
- **School en Zorg**: eigen omgeving met een lijst gezinnen en een weekkleur (groen/oranje, alleen patronen). Ze kunnen taken klaarzetten (met label "Van school" of "Van coach") en berichten sturen. Zorg ziet ook de gezinsdoelen. Eigen notities zijn alleen voor de professional.
- **Toestemming**: ouders zetten delen met school en zorg aan of uit bij Ik.
- **Conflictcoach** (`src/lib/coach.ts`, `screens/Coach.tsx`): 8 vaste scenario's zonder AI, volgens het G-schema. Elke keuze is aanvallen, wegduiken of voor jezelf opkomen; je ziet de reactie en de thermometer van de ander. Daarna een terugblik met tijdlijn, "wat als", advies van coach en psycholoog en een opdracht voor het echte leven (quest). Zorg kan oefeningen klaarzetten; ouders en zorg zien alleen welke vaardigheden geoefend zijn.
- **Coach voor nu** (`src/lib/methodiek.ts`, `src/lib/conflicts.ts`, `screens/CoachNu.tsx`): hulp bij een échte ruzie, voor ouder en kind. Veiligheidscheck eerst (met hulplijnen), dan de zes vaste stappen met het stoplichtmodel, rust als keuze, één vraag per keer, herstel zonder afgedwongen sorry en een gezinsafspraak. Er wordt niet opgeslagen wat er gebeurde. De methodiek voor professionals staat in `docs/methodiek-conflictcoach.md` (wordt gemaakt uit de app-inhoud).
- **Leerplanner** (`src/lib/planner.ts`, `screens/Leerplanner.tsx`): Somtoday-week plakken (iPhone: screenshot › Foto's › tekst-icoon › Kopieer alles) of zelf invoeren. De app herkent vak, toets/SO/leren/huiswerk/inleveren en datum; het kind controleert. Daarna korte blokjes verspreid over de dagen ervoor (toets: 4 × 20 min in de week ervoor, laatste avond herhalen), rekening houdend met drukke dagen en een max per dag. 20 minuten leren = 10 XP.
- **Lezen**: minuten loggen, weekdoel van 4 dagen, 5 XP per 10 min (max 20 per dag), boek uit +25.
- **XP** (`src/lib/xp.ts`): oplopende levels (2 = 100, 3 = 250, 4 = 450, 5 = 700, 6 = 1000 XP), realistische punten per activiteit, en geen XP-farmen met ruzies, rustig worden of opnieuw oefenen.
- **Release 1**: aanmelden voor ouders, gezin aanmaken met bedtijden (telefoon een uur eerder aan de lader), uitnodigingscodes via mail of WhatsApp met installatie-uitleg, eerst je eigen avatar maken, grijs wie nog niet meedoet, gedeelde stand via Supabase (elke 5 seconden bijgewerkt), installeerbaar op het beginscherm. School en zorg staan in release 1 nog uit; die zitten alleen in de demo.

Data staat nu nog lokaal (`src/lib/store.ts`). De schermen praten alleen met `useFamily()` en `actions`, zodat Supabase er later achter kan zonder dat de schermen veranderen.

## Uitgangspunten

1. **Simpel.** Eén startscherm, vier knoppen onderin, maximaal één actie tegelijk. Belangrijk bij ADHD/ADD.
2. **Gevoel bepaalt het kind zelf.** De app raadt nooit een emotie. Een opgeloste ruzie betekent niet automatisch dat iemand blij is.
3. **Signaal, geen dossier.** Ouders zien gezicht, onderwerp en of het kind wil praten. Een coach ziet later alleen een weekkleur en doelen.
4. **Ouders checken ook in.** Het is van het hele gezin, niet alleen van de kinderen.
5. **Toegankelijk.** Knoppen van minimaal 44 px, taal op B1-niveau, geen diagnoses.

## Volgende stukjes

1. **Supabase**: tabellen `families`, `members`, `checkins` met Row Level Security, inloggen per gezinslid en Realtime, zodat een check-in direct bij de anderen verschijnt.
2. **Schermtijd-afspraken**: gamen verdienen met taken, timer en een rustige afsluiting.
3. **Opdrachten met uitleg** van zorg: korte oefening of filmpje dat het gezin samen doet.
4. **Weekrapport** voor ouders en (met toestemming) de coach, als PDF.
5. **Illustraties en animaties**: avatar-onderdelen laten tekenen (of via Higgsfield) en de bewegingen eventueel in Rive.
6. **PWA en Vercel**: installeerbaar op de telefoon.

## Mappen

```
src/
  app/                 Next.js-pagina's en layout
  components/
    avatar/            Avatar-engine en onderdelen
    screens/           Huiskamer, check-in, avatar maken
    ui/                Kleine bouwstenen (Sheet, Icon, MoodFace, Flo)
    FamilyFlowApp.tsx  Schermen en navigatie
  lib/                 Types, demogezin, store, stemming
  styles/              tokens.css (designsysteem) en app.css
preview/               Losse HTML-preview met esbuild
```
