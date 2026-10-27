# Acceptatie 3.23: Groene dagen + 3.22: Mijn geld

## 3.23 Groene dagen (de weekkaart, opnieuw ontworpen)
De weekkaart was te ingewikkeld: drie soorten procenten, een balk met streepjes zonder uitleg, sterren +3% en turven −5%,
en "nog 6 vinkjes" klonk alsof je met 6 vinkjes klaar was voor de hele week.
- **Kind ziet geen procenten meer.** Zeven bolletjes (ma–zo). Groen = die dag 80% gedaan. Oranje = meer dan de helft.
- **Eén doel**: "Nog 3 groene dagen voor € 2,50". **Eén actie**: "Vandaag: nog 2 vinkjes voor een groene dag".
- **Elke dag begint opnieuw.** In één keer inhalen kan niet: dat is één groene dag.
- **Turf = die dag wordt niet groen** (geen −5% meer). Goedgemaakt telt weer.
- **Bonus in groene dagen** (bijv. 5 → € 2,50, 6 → € 5). Oude afspraken worden vanzelf omgezet: 70% → 5 dagen, 85% → 6.
- **Op Vandaag** één regel: de bolletjes + "Nog 2 vinkjes voor een groene dag".
- **Ouder**: dezelfde bolletjes per kind, "Per dag bekijken", afsluiten in dagen ("Net niet: 1 groene dag te weinig").
- "Hoe werkt het?" legt het in 4 korte regels uit.

Testen: kies **Noah** › Week en Vandaag. Snapt een kind van 13 het in 5 seconden? Kies **Papa** › Week › Noah.

---


Tak `acceptatie-geld`. De pilot (`main`, map `dist/`) is niet veranderd. Testen gaat met de demo (geen echte gezinsdata).
Bouwen: `FF_DEV=1 npm run build` → `preview/dist/index.html`.

## Waarom
Kinderen leren de waarde van geld: geld komt binnen (zakgeld, loon uit een bijbaan, weekbonus, cadeau) en gaat eraf als je iets koopt.
Ze zien wat thuis kost (douchen, apparaten) en wat een eigen huis straks per maand kost. Geen bank: de ouder is de bank.

## Wat erin zit
- **Mijn geld** (Ik): saldo, in/uit per maand, ＋ Erbij en − Uitgegeven, waar het heen ging (per soort), geschiedenis.
- **In uren werk**: met een uurloon zie je bij elke aankoop hoeveel uur werken het is ("Sneakers = 15 uur werken").
- **Bijbaan**: uurloon bij School en bijbaan. Uren uit vaste dagen en diensten × uurloon = bruto loon per maand. "Loon ontvangen" zet het erbij.
- **Spaardoel**: hoeveel nog, en hoeveel weken bij je tempo van de laatste 4 weken.
- **Zakgeld** (alleen ouders): per week (maandag) of maand (1e), komt vanzelf binnen. Verhogen verandert het verleden niet.
- **Weekbonus**: "Uitbetaald" bij de week zet het bedrag uit de bonus (bijv. "€ 2,50") in Mijn geld.
- **Zuinig thuis en goed voor het milieu** (idee Rodney): douchen (schuif minuten, ik of hele gezin) in euro, liters water en kg CO₂, apparaten per uur/keer met CO₂ per jaar, en "Straks op jezelf" (Nibud) met hoeveel uur je daarvoor moet werken.
- Privacy: kind ziet alleen eigen geld; ouders zien alle kinderen; broers en zussen niet bij elkaar.

## Bronnen (oktober 2026)
Minimumjeugdloon 1 juli 2026 (15: € 4,50 · 16: € 5,17 · 17: € 5,92 · 18: € 7,50 · 21+: € 14,99). Gas € 1,76/m³ en stroom € 0,32/kWh (gemiddelde oktober 2026).
Water € 1,82/m³ (Vitens 2026). CO₂: aardgas 2,134 kg/m³, stroom 0,328 kg/kWh (co2emissiefactoren.nl 2026). Douchen ±8 liter en ±0,04 m³ gas per minuut (Milieu Centraal). Vaste lasten: Nibud-minimumbegroting alleenstaande, juli 2025.

## Testen (acceptatie)
1. Kies **Lina** › Ik › Mijn geld. Snap je in één blik wat je hebt en wat eraf ging?
2. Tik − Uitgegeven, typ 89,99: zie je hoeveel uur werken dat is?
3. Zuinig thuis › schuif het douchen. Voelen euro, liters en CO₂ per jaar echt?
4. Kies **Papa** › Ik › Geld van de kinderen › Noah › zakgeld instellen.
5. Papa › Week › sluit een week af met bonus "€ 2,50" en tik Uitgebetaald: staat hij bij Lina's geld?

Wat goed is, gaat naar `main` en wordt de nieuwe pilotversie.
