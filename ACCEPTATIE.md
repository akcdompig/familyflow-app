# FamilyFlow 2.0 – acceptatieversie

Deze versie staat op de tak `acceptatie`. De pilot (tak `main`, map `dist/`) is niet veranderd.
Bouwen: `FF_UI=v2 node preview/build.mjs` → `preview/dist/index.html` (demo, raakt `dist/` niet aan).

## Het doel van de app, in één zin
Kinderen leren zelfstandig hun dag te doen (hygiëne, eten, school, klussen), met aandacht voor lijf en hoofd, en weten wat ze moeten doen bij ruzie of boosheid. Ouders hoeven minder te sturen.

## Van 5 tabs en ±12 kaarten naar 4 tabs met een duidelijke taak

| Tab | Voor wie | Wat erin staat |
|---|---|---|
| **Vandaag** | iedereen, vooral de kinderen | Eén dagprogramma: voortgangsring, water/fruit met één tik, gevoel met één tik, **Nu doen** (één ding tegelijk) en de dag per dagdeel. Werk en school staan er vanzelf in. |
| **Gezin** | het hele gezin | Nu (huiskamer, aandacht voor ouders, berichten school/zorg, net gedaan, klassement) · Eten · Klussen · Potje · Planning (taken van iedereen + week). |
| **Hulp** | iedereen | Ik word boos · Ruzie of gedoe · coach-tip van vandaag · oefeningen · leerplanner. |
| **Ik** | iedereen | Level, schatkist, achievements, interesses, herinneringen, avatar, werk/rooster, rustplan; ouders: overleg, beloningen, school en zorg. |

## Keuzes (bekeken als app-ontwikkelaar)

**Samengevoegd**
- Huiskamer + Thuis + Taken → *Vandaag* (mijn dag) en *Gezin* (ons huis). Eén plek per vraag: "wat moet ik?" en "hoe gaat het thuis?".
- Mijn dag-paneel, Jouw dag-kaart, Klussen-kaart, Taken-lijst → één dagprogramma met dezelfde vinkjes.
- Oefenen + coach + rust → *Hulp*.
- Check-in: 5 gezichtjes direct op Vandaag; het uitgebreide scherm alleen bij "niet goed" of "⋯".

**Voor kinderen met ADHD/ADD**
- Eén lijst, op volgorde van de dag; alleen het huidige dagdeel staat open.
- "Nu doen" toont precies één ding met één grote knop.
- Tijdens werk/school staat er "Nu bezig" met een balk, en wat er straks komt.
- Direct effect: vinkje springt, +punten vliegen omhoog, ring loopt vol.

**Geparkeerd voor deze versie** (code blijft bestaan, alleen niet in beeld)
- Leeslog (lezen-minuten) – kan later terug als quest.
- Losse "Wie doet wat"-statistieken – ouders zien het nu in klassement en planning.
- Uurlijkse tips bovenaan – vervangen door één coach-tip in Hulp.

**Niet veranderd onder de motorkap**
- Zelfde gezinsstand en database: geen migratie nodig, pilotdata blijft bruikbaar.
- Somtoday, herinneringen, achievements, schatkist, koken, klussen, potje en werk werken hetzelfde.

## Testen (acceptatie)
1. Kies **Noah** bovenaan. Vink de ochtendroutine af via "Nu doen". Klopt de volgorde? Is het duidelijk?
2. Zet de klok op schooltijd (of kijk na 8.30): staat "Nu bezig · School" goed?
3. Kies **Papa** › Gezin › Nu: zie je in één oogopslag wat aandacht nodig heeft?
4. Gezin › Eten/Klussen/Potje: alles bereikbaar in 1–2 tikken?
5. Ik: snap je schatkist en achievements zonder uitleg?

Wat goed is, gaat naar `main` en wordt de nieuwe pilotversie.
