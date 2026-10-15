# FamilyFlow – kwaliteitsrapport

Beoordeling vanuit vijf rollen: senior software engineer, software-architect, product engineer, UX-specialist en innovation partner.
Cijfers worden alleen verhoogd met bewijs, en verlaagd als nieuwe bevindingen daar reden voor geven.

---

## Nulmeting · 15 oktober 2026 · versie 1.13 (live) + 2.0 (acceptatie)

### Wat ik heb onderzocht
- Alle broncode: 63 bestanden, ± 10.500 regels TypeScript/React, plus 2 Edge Functions en 4 SQL-bestanden (± 1.160 regels).
- Database-regels (RLS) en de functies `save_family`, `join_family`, `make_invite`.
- Gebruikersstromen in de demo, met Playwright op telefoonformaat (390×844): ochtendroutine, klussen, koken, potje, werkweek, achievements, claimen, coach-tip, acceptatieversie 2.0.
- Gesimuleerde tests van de herinneringen-logica (12 scenario's) en de Somtoday-tokenvernieuwing met twee telefoons tegelijk.
- Toegankelijkheid (steekproef): 34 knoppen, allemaal met een naam; 2 kleiner dan 36 px; kleurcontrast van de zachte tekst ± 5,9:1 (voldoende).
- Laadtijd lokaal: ± 0,4 s. Bundel: 560 kB JS, inline in één HTML van 639 kB.

### Wat ik níet heb kunnen controleren
- De echte Supabase-omgeving: of de Edge Functions `herinneringen` en `somtoday` (nieuwe versie) gedeployd zijn en draaien, en of de pg_cron-taken lopen.
- Echte pushmeldingen op een iPhone of Android.
- De Somtoday-koppeling tegen de echte Somtoday-server.
- `next build` en een volledige `tsc` met de echte React-types: npm-pakketten konden hier niet worden geïnstalleerd. Typecheck is gedaan met een vereenvoudigde React-definitie.
- Een volledige toegankelijkheidsaudit (schermlezer, axe).

### Scores

| Onderdeel | Score | Kern van de onderbouwing |
|---|---:|---|
| Functionaliteit en betrouwbaarheid | **6,5** | Veel functies werken in de demo zonder fouten in de console. Maar: geen enkele automatische test, Edge Functions niet getest tegen de echte omgeving, Somtoday is een onofficiële API. |
| Codekwaliteit en architectuur | **5,5** | Leesbaar, consequent Nederlands, logica netjes in `src/lib`. Maar: de hele gezinsstand is één JSON-blob die de telefoon in z'n geheel overschrijft; regels staan dubbel in app én Edge Function; twee bouwsystemen (Next.js wordt in productie niet gebruikt); bestanden tot 620 regels. |
| Beveiliging en privacy | **4** | Goed: RLS per gezin, Somtoday-tokens alleen op de server, geen geheimen in de app. Kritiek: elk gezinslid, ook een kind, kan de hele stand overschrijven (ook rollen, punten, beloningen). Alles staat in één blob die iedereen kan lezen, dus ook de check-in-onderwerpen van een broer of zus, ruzieverhalen en notities van school of zorg. Somtoday-tokens van minderjarigen staan onversleuteld. Onderhoudsfuncties zijn met de openbare sleutel aan te roepen. Geen privacyverklaring of AVG-afspraken. |
| UI/UX en visuele afwerking | **7** (live) · **7,5** (2.0) | Sterke eigen stijl: avatars, huiskamer, vieringen. De live-versie is te vol (± 12 kaarten op de start). Versie 2.0 is rustiger met één dagprogramma, maar nog niet getest met echte kinderen. |
| Mobiel en toegankelijkheid | **7** | PWA, safe areas, alle knoppen hebben een naam, `prefers-reduced-motion` wordt gerespecteerd, contrast is voldoende. Minpunten: veel betekenis zit in emoji, 2 kleine tiktargets, push op iPhone alleen vanaf het beginscherm. |
| Prestaties en efficiëntie | **6,5** | Snel genoeg voor één gezin. Maar: elke tik uploadt de hele stand, er wordt elke 5 s gepeild, de JS kan niet los gecachet worden (inline in de HTML) en er is geen code-splitting. |
| Testbaarheid en onderhoudbaarheid | **3** | 0 tests, geen CI, geen lint of typecheck die ergens wordt afgedwongen. De logica is wel goed testbaar: veel pure functies. |
| Productvisie, onderscheidend vermogen en gebruikswaarde | **8** | Uniek concept: een Sims-achtige gezinsapp met echte opvoedhulp, een conflictcoach met veiligheidsprotocol, en een school- en zorgkoppeling. Lost echte problemen thuis op. Risico: te veel functies tegelijk. |
| Productierijpheid en toekomstbestendigheid | **4** | Klaar voor een pilot met je eigen gezin. Niet klaar voor andere gezinnen of instanties: autorisatie, privacy/AVG, tests, monitoring, back-ups en herstel ontbreken nog. |
| **Gemiddeld** | **5,7** | Sterk product-idee, de technische basis moet nog volwassen worden. |

### Kritieke problemen (eerst oplossen vóór meer gezinnen of instanties)
1. **Autorisatie zit alleen in de app.** `save_family` accepteert elke stand van elk gezinslid. Een kind kan zijn eigen rol op "ouder" zetten, punten geven, beloningen of berichten wissen. De oplossing hoort in de database: ouder-velden afschermen en wijzigingen per lid controleren.
2. **Privacy tussen gezinsleden.** Gevoelige dingen (check-in-onderwerpen, "wil praten", ruzieverhalen, school- en zorgnotities, berichten aan ouders) staan voor iedereen leesbaar in de blob. Die horen in eigen tabellen met RLS: een kind ziet alleen zijn eigen gegevens, ouders zien de kinderen.
3. **Geen tests en geen CI.** Elke wijziging kan ongemerkt iets anders breken. Dat gebeurde in deze sessie al: de klusstatus telde "nooit gedaan" verkeerd, en dat kwam pas aan het licht via een screenshot.
4. **AVG bij minderjarigen.** Er zijn een privacyverklaring, toestemming van ouders, export en verwijderen van gegevens nodig, en een verwerkersovereenkomst vóór school of zorg erop gaat.

### Belangrijke verbeteringen
5. Eén bouwsysteem: Next.js wordt niet gebruikt in productie. Kies esbuild of Vite en schrap de rest.
6. Somtoday-tokens versleutelen (Supabase Vault). Onderhoudsfuncties alleen met een geheime sleutel aanroepbaar maken.
7. Foutmeldingen vastleggen, zodat je weet wanneer iets misgaat bij een gezin. Ook versiegeschiedenis van de stand (herstel na een fout of ruzie over een wijziging) en dagelijkse back-ups.
8. Kleinere synchronisatie: alleen de wijziging versturen, of de blob opsplitsen (punten, klussen en logboeken apart).
9. Versie 2.0 testen met de kinderen en daarna live zetten. De live-versie is nu te druk voor kinderen met ADHD/ADD.
10. Gedeelde regels (werk/school, honger, klussen) op één plek, zodat app en meldingen hetzelfde rekenen.

### Optioneel
- Code-splitting (coach en leerplanner pas laden als ze nodig zijn).
- Pilotmetingen voor instanties: wat verbetert er na 4 weken (ochtenden, ruzies, zelfstandigheid)? Dat is ook je verkoopargument.
- Donker thema; meerdere talen voor gezinnen met een andere thuistaal.

### Bewust níet doen (nu)
- **Een native app**: de PWA met push volstaat voor deze fase.
- **Alles in één keer naar een volledig relationeel model**: alleen de gevoelige en drukke delen opsplitsen.
- **Realtime websockets**: peilen elke 5 s is prima voor een gezin. Liever eerst de payload kleiner maken.
- **Een AI-coach voor kinderen**: vaste, controleerbare teksten zijn nu veiliger en verkoopbaarder richting zorg.
- **Nog meer functies**: eerst de basis (2.0) laten landen.

### Wat ik als eerste zou doen als eigenaar van de technische kwaliteit
1. Tests plus CI op de rekenregels: dag, klussen, badges, dagprogramma, herinneringen.
2. Autorisatie in de database: ouder-velden en rollen afschermen.
3. Gevoelige gegevens uit de gedeelde stand halen.
4. Versie 2.0 live zetten na een test met de kinderen.

---

## Ronde 1 · 15 oktober 2026 · versie 2.1 (tak `kwaliteit`, daarna `main`)

### Wat er is gedaan, met bewijs
| Wat | Bewijs |
|---|---|
| **55 unit-tests** op alle rekenregels (dag, klussen, koken, werk/school, badges, dagprogramma, punten, store, meldingen, Somtoday-tokens) | `npm test`, groen in CI |
| **42 database-tests** tegen een echte Postgres 16 met nagebootste Supabase-auth | `bash tests/sql/run.sh`, groen in CI (service-container) |
| **10 end-to-end-scenario's** in Chromium op telefoonformaat, beide versies, incl. toegankelijkheidscontrole per tabblad | `npm run e2e`, groen in CI |
| **CI op elke push**: typecheck met echte React-types, tests, database-tests, build, controle dat `dist/` klopt met de broncode, e2e | GitHub Actions "Controle", run 38719581958 groen |
| **Rechten in de database**: kind kan zichzelf geen ouder maken, bedtijd/beloningen/bevestigingen/taken van anderen/punten van anderen niet wijzigen, hooguit 300 punten per opslag aan zichzelf geven | database-tests "kind kan …" |
| **Privacy per gezinslid**: kind ziet geen school/zorg-notities, berichten aan ouders, onderwerpen of ruzies van anderen, e-mailadressen; de tabel is niet direct leesbaar | database-tests "kind ziet …" |
| **Versiegeschiedenis** (300 versies) met terugzetten door ouders | database-tests + Privacy-scherm |
| **AVG**: gegevens downloaden, gezin verwijderen (alles inclusief geschiedenis), concept-privacyverklaring | `PRIVACY.md`, database-test "ouder kan het hele gezin verwijderen" |
| **Uitnodigingscodes**: 8 tekens uit een cryptografische bron, max. 10 foute pogingen per uur, gebruikte code werkt niet op een andere telefoon | database-tests |
| **Somtoday-tokens versleuteld** (AES-GCM, met geheim `SOMTODAY_SLEUTEL`), oude tokens blijven werken | unit-test "versleuteld in de database" |
| **Klok-taken alleen met geheime sleutel** (herinneringen, Somtoday-onderhoud) | code in beide Edge Functions + `beveiliging.sql` |
| **Foutlog** (zonder inhoud, max. 50 per lid per dag, 30 dagen) en een vangnet bij schermfouten | `foutlog.ts`, `Root.tsx`, database-test |
| **Eén bouwsysteem**: Next.js verwijderd (werd in productie niet gebruikt), versies vastgezet, `npm run dev` | `package.json` |
| **Snellere herstart**: JS als los bestand met hash (1 jaar cache, ± 178 kB gzip), service worker cache-first voor app-bestanden | productiebuild geladen via HTTP: index, config en asset 200, geen fouten |
| **Gevonden en opgelost door de tests**: herinnering "wie is al bezig" rekende met de echte klok; codeveld kapte af op 6 tekens; tikdoel van 30 px | commits in deze ronde |

### Nieuwe scores
| Onderdeel | Was | Nu | Onderbouwing |
|---|---:|---:|---|
| Functionaliteit en betrouwbaarheid | 6,5 | **8** | Kernlogica en beveiliging aantoonbaar getest, 3 fouten gevonden en opgelost. Niet 10: echte push, echte Somtoday en de gedeployde Edge Functions zijn nog niet in de echte omgeving geverifieerd. |
| Codekwaliteit en architectuur | 5,5 | **7,5** | Eén bouwsysteem, typecheck afgedwongen, server bewaakt de regels. Niet 10: één JSON-blob als opslag (door de servermerge veilig, maar groot), `store.ts` is 620 regels, meldingenregels staan bewust dubbel (server rekent in NL-tijd). |
| Beveiliging en privacy | 4 | **8,5** | Rechten en privacy in de database, 42 tests. Niet 10: pas veilig na het draaien van `beveiliging.sql`; spelregels voor eigen punten blijven grotendeels in de app (begrensd op 300 per opslag); geen externe pentest. |
| UI/UX en visuele afwerking | 7 / 7,5 | **7 / 7,5** | Geen nieuw bewijs. Versie 2.0 moet eerst met de kinderen getest worden. |
| Mobiel en toegankelijkheid | 7 | **8** | Automatische controle in CI: alle knoppen benoemd, alle tikdoelen ≥ 32 px, geen horizontaal scrollen, op elk tabblad van beide versies. Niet 10: geen schermlezer-test, veel betekenis in emoji. |
| Prestaties en efficiëntie | 6,5 | **7,5** | JS langdurig gecachet, assets cache-first, peilen pauzeert op de achtergrond. Niet 10: hele stand per wijziging, geen code-splitting (± 178 kB gzip). |
| Testbaarheid en onderhoudbaarheid | 3 | **9** | 55 unit + 42 database + 10 e2e, alles in CI, inclusief controle dat de gebouwde app klopt met de broncode. Niet 10: nog geen tests per scherm (componenttests). |
| Productvisie en gebruikswaarde | 8 | **8,5** | Privacy per gezinslid en AVG maken het verkoopbaar richting school en zorg. |
| Productierijpheid en toekomstbestendigheid | 4 | **7** | CI, herstelbare versies, foutlog, AVG-functies. Niet 10: `beveiliging.sql` en Edge Functions nog deployen, privacyverklaring juridisch laten checken, test op echte telefoons, en meldingen bij fouten (alerting). |
| **Gemiddeld** | **5,7** | **7,9** | |

### Wat nodig is voor een 10 (kan ik niet allemaal zelf)
**Door jou (± 30 minuten):**
1. Supabase: nieuwe Edge Functions `herinneringen` en `somtoday` deployen, `beveiliging.sql` draaien, geheim `SOMTODAY_SLEUTEL` zetten.
2. Op elke telefoon: de app openen, herinneringen testen ("Stuur een test"), Kian opnieuw koppelen met Somtoday.
3. Versie 2.0 een week laten testen door het gezin. Wat werkt, wat niet?
4. De privacyverklaring laten nakijken (bijv. via een AVG-jurist of de KvK-check) en de [gemarkeerde] delen invullen.

**Door mij (volgende ronde):**
5. Versie 2.0 live na jullie test, met componenttests op het dagprogramma.
6. Opslag opsplitsen (logboeken en punten los), zodat niet elke tik de hele stand verstuurt.
7. Meldingen bij nieuwe fouten (dagelijks overzicht uit de foutlog).
8. Code-splitting voor coach en leerplanner.

---

## Audit 2 · 15 oktober 2026 (na versie 2.1)

**Vastgesteld en direct opgelost**
- Synchronisatie: na opslaan door een kind kon de telefoon een andere stand tonen dan de database (de database voegt samen volgens kind-rechten). Nu haalt de telefoon van een kind na opslaan de echte stand op.
- Service worker: oude app-bestanden bleven in de cache staan na elke update. Nu worden ze opgeruimd.

**Vastgesteld, nog open**
1. Beveiliging is pas actief na `beveiliging.sql` + nieuwe Edge Functions (niet uitgerold).
2. Twee volledige gebruikersinterfaces (1.x en 2.0) worden naast elkaar onderhouden en zitten allebei in de productiebundel.
3. Opslag als één JSON-blob: elke tik verstuurt de hele stand (geschat 50–250 kB bij een actief gezin na een paar weken).
4. `store.ts` combineert synchronisatie en ± 50 acties in 650 regels.
5. School/zorg-accounts bestaan alleen in de demo; er is nog geen echte koppeling voor professionals.

**Mogelijke risico's (niet vastgesteld als fout)**
- Tijdzone: de app rekent in de tijd van de telefoon, de server in Nederlandse tijd. Op vakantie in een andere tijdzone kunnen dagen verspringen.
- De Somtoday-API is onofficieel en kan zonder aankondiging veranderen.
- Herinneringen-ronde laadt elke 15 minuten de stand van alle gezinnen met meldingen: prima voor tientallen gezinnen, niet voor duizenden.

---

## Voortgang

| Datum | Functio. | Code | Beveil. | UI/UX | Mobiel/a11y | Prestaties | Tests | Product | Prod.rijp | Gem. |
|---|---|---|---|---|---|---|---|---|---|---|
| 15-10-2026 nulmeting | 6,5 | 5,5 | 4 | 7 | 7 | 6,5 | 3 | 8 | 4 | **5,7** |
| 15-10-2026 ronde 1 | 8 | 7,5 | 8,5 | 7 | 8 | 7,5 | 9 | 8,5 | 7 | **7,9** |

---

## Ronde 3 · 15 oktober 2026 · versie 2.3: samenwerken, verbinden en eerlijk verdelen

### Wat er is gebouwd
| Onderdeel | Waar | Bewijs |
|---|---|---|
| Eerlijke verdeling in **minuten** (niet in aantal), elke dag één vaste verdeling | `src/lib/verdeling.ts` | 15 unit-tests, waaronder een simulatie van 14 dagen: niemand doet meer dan 1,5× de ander (naar verwachting) |
| Verwachting per dag: school < weekend < vrij; +10 min als beide ouders werken; werkende ouder ±5 min | `verwachting()` | test "verwachting" |
| Vol op een schooldag? Wat kan wachten schuift door; dagelijks en echt te laat gaat altijd door | `uitgesteld` | test "drukke schooldag" |
| Vrije dag: hooguit één klus extra, nooit boven de verwachting | stap 2 in `bereken()` | test "vrije dag" |
| Niet steeds dezelfde de vaatwasser (zelfde klus telt mee, langst niet gedaan gaat voor) | `kies()` | test "niet steeds dezelfde" |
| Afspraken: voorstel vs. vastgelegd, klussen aan/uit, minuten, wie wel/niet, leeftijd, verwachting per kind, vrijstelling | `AfsprakenSheet`, `klusAfspraken` | e2e "ouder legt afspraken vast", DB-test "kind kan afspraken niet wijzigen" |
| Waarom jij? Bij elke klus | `reden` | e2e "verdeling met minuten en waarom" |
| Samen beslissen: steen-papier-schaar, eerlijke loting, om de beurt, samen doen; vrijwillig, met neutrale uitweg | `KlusSheet` | e2e "samen beslissen" |
| Pech-bescherming: na 2× pech voorsprong; na 3× vandaag geen spel/loting meer; max 3 per dag; geen winnaar/verliezer in Net gedaan | `pech`, `heeftVoorsprong`, `genoegPech` | unit-test + e2e controleert dat "verloor/won" nergens staat |
| Lukt me niet / hulp vragen → ouder: oké / samen / ik doe het / toch (met uitleg) | `Vragen`, `samenwerken.antwoord` | e2e "lukt me niet", DB-test "kind kan geen antwoord van een ouder maken" |
| Samen: 22 ideeën met filters (tijd, budget, energie, vrienden), plannen, terugblik, band alleen voor jezelf | `src/v2/Samen.tsx`, `src/lib/samen.ts` | e2e "samen plannen, doen en terugkijken" |
| Groeidoelen: 8 vaardigheden, per leeftijd concreet, oefenen telt vanzelf, weekterugblik zonder cijfer | `src/v2/Groei.tsx` | e2e "groeidoelen" |
| Database: kind kan geen klus bij een ander neerleggen zonder besluit waar het bij was, geen besluit verzinnen, anderen hooguit 30 punten geven | `ff_ruil`, `ff_uitdagingen`, `ff_samen`, `ff_punten_max` | 13 nieuwe DB-tests (55 totaal) |

Totaal: 72 unit-tests, 55 database-tests, 18 browserscenario's. Alles groen.

### Pedagogische onderbouwing: wat is onderbouwd, wat is keuze, wat moeten we testen
- **Onderbouwd:** meehelpen in huis bij de leeftijd passend draagt bij aan zelfstandigheid en verantwoordelijkheid; voorspelbare, eerlijke en uitlegbare regels verminderen ruzie tussen broers en zussen; vergelijken en publiek verlies schaadt motivatie (daarom geen ranglijst, geen verliesstatistiek, band alleen voor jezelf).
- **Ontwerpkeuze:** minuten als maat; 15/25 minuten als standaard; 2 weken als geheugen; voorsprong na 2× pech; één extra klus op een vrije dag.
- **Nog te testen in het gezin (2 weken):** wordt het spel leuk of een bron van ruzie (zie "Samen beslist" bij Eerlijk verdeeld); kloppen de minuten; voelt een vrije dag niet als straf; gebruiken de kinderen "lukt me niet" eerlijk.

### Risico's die bewust open blijven
- Steen-papier-schaar op één telefoon vertrouwt erop dat de ander niet kijkt. Het is een spel, geen beveiliging; de uitkomst staat in de geschiedenis voor ouders.
- Een kind kan in de app een samen-moment als gedaan markeren. Daar staan maximaal 10 punten per deelnemer tegenover en ouders zien het in Net gedaan.

### Score (alle rollen)
| Rol | Score |
|---|---|
| Product architect (geen parallel systeem, hergebruik klusLog/punten/dagprogramma) | 9 |
| Pedagoog (vrijwillig, herstel, ouder blijft verantwoordelijk) | 9 |
| Ontwikkelingspsycholoog (geen vergelijking, pech-bescherming, "nog lastig" is oké) | 8,5 |
| UX (elke dag één lijst met waarom, eenmalig afspraken-scherm) | 8,5 |
| QA (simulatie, DB-regels, browserscenario's) | 9,5 |
| **Totaal** | **8,9** |

Naar een 10: twee weken echt gebruik, dan de minuten en verwachtingen bijstellen op wat het gezin écht doet, en één gesprek met de kinderen over of het eerlijk voelt.
