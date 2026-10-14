# FamilyFlow

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
