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

## Voortgang

| Datum | Functio. | Code | Beveil. | UI/UX | Mobiel/a11y | Prestaties | Tests | Product | Prod.rijp | Gem. |
|---|---|---|---|---|---|---|---|---|---|---|
| 15-10-2026 nulmeting | 6,5 | 5,5 | 4 | 7 | 7 | 6,5 | 3 | 8 | 4 | **5,7** |
