# Acceptatie 3.22: Mijn geld

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
