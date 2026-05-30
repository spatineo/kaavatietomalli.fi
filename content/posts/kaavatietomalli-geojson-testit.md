---
title: "Interaktiiviset kartta- ja paikkatietoupotukset (GeoJSON & JSON-FG)"
date: "2026-05-24"
author: "Ilkka Rinne"
authorSlug: "ilkka-rinne"
excerpt: "Tämä artikkeli esittelee uuden kartta-elementin ja sen kyvyn visualisoida GeoJSON- ja JSON-FG-koordinaattidataa suoraan kaavajulkaisuissa."
tags: ["paikkatieto", "geojson", "json-fg", "kartat", "visualisointi"]
category: "journal"
---

Kaavoitus- ja maankäyttötietojen esittämisessä dynaaminen karttatieto on korvaamaton apuväline. Tämä artikkeli esittelee uuden interaktiivisen `geojson`- ja `jsonfg`-koodilohkoilla toimivan karttaupotuksen. Voit selata karttaa, klikata yksittäisiä kohteita nähdäksesi niiden ominaisuustiedot, vaihtaa tumman ja vaalean pohjakartan välillä tai laajentaa kartan kokoruututilaan painamalla otsikkopalkin laajennuskuvaketta.

---

## 1. Esimerkki: Yleiskaavan suunnittelualue (GeoJSON)

Alla on esitetty dynaaminen maantieteellinen kuvitteellinen esimerkkialue Helsingin Kruunuvuorenrannasta ja sen lähialueista GeoJSON-rakenteella. Kartalla näkyy alueen keskuspiste, suunniteltu joukkoliikennereitti sekä alueen rajauspolygoni ominaisuustietoineen.

```geojson
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "nimi": "Kruunuvuorenranta Kehitysalue",
        "tyyppi": "Yleiskaavamerkintä",
        "pinta_ala_ha": 145.2,
        "rakennusoikeus_kem2": 600000,
        "tila": "Suunnitteluvaihe"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [24.991, 60.165],
            [25.015, 60.165],
            [25.015, 60.155],
            [24.991, 60.155],
            [24.991, 60.165]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "nimi": "Kruunusillat-pikaraitiotie",
        "tyyppi": "Raideliikenneverkko",
        "pituus_km": 4.2,
        "arvioitu_valmistuminen": "2027"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [24.952, 60.171],
          [24.975, 60.168],
          [24.995, 60.162],
          [25.012, 60.158]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "nimi": "Laajasalon keskusliikennepiste",
        "tyyppi": "Liikenteen solmukohta",
        "syöttölinjat": "Bussi 84, 85, 86, 88"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [25.016, 60.159]
      }
    }
  ]
}
```

---

## 2. Esimerkki: JSON-FG (OGC Features and Geometries JSON)

JSON-FG on uusi OGC standardiluonnos, joka parantaa GeoJSON-formaatin ominaisuuksia lisäämällä muun muassa parannellun koordinaattijärjestelmä-tuen (CRS), 3D-geometriat seka erilliset tila- ja aikaviitaukset (`place`). 

Toteutus lukee automaattisesti JSON-FG `place`-rakenteen, jos standardi GeoJSON `geometry` puuttuu, varmistaen täyden yhteensopivuuden tulevaisuuden kaavatietomallien kanssa.

```jsonfg
{
  "type": "FeatureCollection",
  "conformsTo": [
    "http://www.opengis.net/spec/json-fg-1/0.2/conf/core"
  ],
  "features": [
    {
      "type": "Feature",
      "id": "asema-kaava-102",
      "time": "2026-05-24",
      "place": {
        "type": "Polygon",
        "coordinates": [
          [
            [24.935, 60.175],
            [24.945, 60.175],
            [24.945, 60.170],
            [24.935, 60.170],
            [24.935, 60.175]
          ]
        ]
      },
      "properties": {
        "tunnus": "Asemakaava-102-M",
        "nimi": "Töölönlahden puistoalue",
        "kaavalaji": "Asemakaava",
        "hyväksytty": "Kyllä"
      }
    },
    {
      "type": "Feature",
      "id": "asema-kaava-point",
      "time": "2026-05-24",
      "place": {
        "type": "Point",
        "coordinates": [24.940, 60.173]
      },
      "properties": {
        "nimi": "Musiikkitalon maanalainen laajennus",
        "koron_korkeus": "12.5m"
      }
    }
  ]
}
```

---

## 3. Esimerkki: JSON-FG ja vaihtoehtoiset koordinaatistot (EPSG:3067 TM35FIN)

JSON-FG tukee vaihtoehtoisia koordinaattijärjestelmiä (`coordRefSys`) toisin kuin perinteinen GeoJSON, joka on sidottu WGS84-pohjaiseen maantieteelliseen koordinaatistoon (EPSG:4326). 

Tämä esimerkki käyttää Suomen kansallista **ETRS89-TM35FIN (EPSG:3067)** tasokoordinaattijärjestelmää. Järjestelmä muuntaa ja projisoi nämä metriset tasokoordinaatit dynaamisesti taustalla `proj4`-kirjaston avulla, jollof ne piirtyvät Leaflet-kartalle täydellisesti oikeaan paikkaansa Helsingin päärautatieaseman taakse:

```jsonfg
{
  "type": "FeatureCollection",
  "coordRefSys": "http://www.opengis.net/def/crs/EPSG/0/3067",
  "features": [
    {
      "type": "Feature",
      "id": "tm35-alue-1",
      "featureType": "type-2",
      "properties": {
        "nimi": "Kaisaniemen puiston korjausalue",
        "tunnus": "Kaisa-TM35-A",
        "koordinaatisto": "ETRS89 / TM35FIN (EPSG:3067)",
        "pinta_ala_m2": 40000
      },
      "place": {
        "type": "Polygon",
        "coordinates": [
          [
            [385650.0, 6671850.0],
            [385850.0, 6671850.0],
            [385850.0, 6671650.0],
            [385650.0, 6671650.0],
            [385650.0, 6671850.0]
          ]
        ]
      }
    },
     {
      "type": "Feature",
      "id": "tm35-alue-2",
      "featureType": "type-3",
      "properties": {
        "nimi": "Muu korjausalue",
        "tunnus": "Kaista-TM35-A",
        "koordinaatisto": "ETRS89 / TM35FIN (EPSG:3067)",
        "pinta_ala_m2": 40000
      },
      "place": {
        "type": "Polygon",
        "coordinates": [
          [
            [384650.0, 6672850.0],
            [384850.0, 6672850.0],
            [384850.0, 6672650.0],
            [384650.0, 6672650.0],
            [384650.0, 6672850.0]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "id": "tm35-piste-1",
      "featureType": "type-2",
      "properties": {
        "nimi": "Kaisaniemen sääasema (referenssi)",
        "koordinaatti_x": 385750.0,
        "koordinaatti_y": 6671750.0
      },
      "place": {
        "type": "Point",
        "coordinates": [385750.0, 6671750.0]
      }
    }
  ]
}
```

---


## 4. Helsinki test

```geojson
{
"type": "FeatureCollection",
"name": "helsinki-wgs84",
"features": [
{ "type": "Feature", "properties": { "id": 1 }, "geometry": { "type": "MultiPolygon", "coordinates": [ [ [ [ 24.9509096682097, 60.176037530101624 ], [ 24.953474825023655, 60.176834484207617 ], [ 24.95628443295977, 60.176635504275687 ], [ 24.957493814490917, 60.176745027726511 ], [ 24.959202363008959, 60.176650180808991 ], [ 24.96049127581437, 60.176457976750768 ], [ 24.960868916578061, 60.176251740970905 ], [ 24.961165163855767, 60.176377469138693 ], [ 24.962040054901063, 60.175997124809697 ], [ 24.962321688300626, 60.17439595485213 ], [ 24.966858142407023, 60.173799202528365 ], [ 24.967544081665213, 60.174506451113203 ], [ 24.968637536947316, 60.174523217940227 ], [ 24.970174905345537, 60.174243852372705 ], [ 24.970472052243096, 60.173369924230002 ], [ 24.970179531294718, 60.173183689184981 ], [ 24.969503861621924, 60.173294506889803 ], [ 24.96948704621115, 60.17356688089933 ], [ 24.969063694368543, 60.173530100554188 ], [ 24.969086119483475, 60.173166935298127 ], [ 24.969463668650327, 60.172960674470296 ], [ 24.969888881634503, 60.172967189717795 ], [ 24.97014680251408, 60.172728801755618 ], [ 24.968565583000448, 60.172734862286227 ], [ 24.967580584935696, 60.172931804841483 ], [ 24.967013307038744, 60.173256319402313 ], [ 24.967053475426908, 60.17359015242716 ], [ 24.962890906459773, 60.17404119710887 ], [ 24.962290942407208, 60.173910802464952 ], [ 24.960068769360099, 60.169544783399168 ], [ 24.959279175197771, 60.169532624480482 ], [ 24.958920380777823, 60.169436220291054 ], [ 24.958942914118804, 60.169073057095559 ], [ 24.96349820983243, 60.169143151255675 ], [ 24.964225186339778, 60.169184615497777 ], [ 24.964506402240339, 60.169552445663399 ], [ 24.965780034244229, 60.169602298088101 ], [ 24.966049185296121, 60.169182335626459 ], [ 24.966599565258733, 60.169130198403849 ], [ 24.966973342313299, 60.168984471890823 ], [ 24.96774796986637, 60.169238695039986 ], [ 24.968303955685286, 60.169095759424572 ], [ 24.968559988171364, 60.168887638102738 ], [ 24.970102695253839, 60.168517480450262 ], [ 24.975663678246395, 60.17002630184367 ], [ 24.975672990443833, 60.169874982292107 ], [ 24.973578813573376, 60.169328000342773 ], [ 24.973774076962954, 60.169118939854847 ], [ 24.9751009943311, 60.169290687045063 ], [ 24.976072805007995, 60.169305535167773 ], [ 24.977416489490771, 60.169204883922426 ], [ 24.979226231777059, 60.168444896592703 ], [ 24.979819325063495, 60.167696632557309 ], [ 24.979710864184209, 60.167482932418892 ], [ 24.980154590345954, 60.167186774388661 ], [ 24.979873218521629, 60.166818976538295 ], [ 24.977013831629332, 60.165866576934349 ], [ 24.974346117423643, 60.164765582532404 ], [ 24.96983710864798, 60.162969895337078 ], [ 24.969404554128541, 60.16308443586599 ], [ 24.969509198780649, 60.163358671813278 ], [ 24.965769310608302, 60.163876856375744 ], [ 24.966243909195246, 60.164065897705811 ], [ 24.958417550322736, 60.166762730256508 ], [ 24.958128912762056, 60.16651594187983 ], [ 24.957210410964702, 60.166622953346035 ], [ 24.957413882556661, 60.167262233959555 ], [ 24.957679975550203, 60.167872186874973 ], [ 24.956347569666598, 60.167791056633241 ], [ 24.956673799910497, 60.167432577560035 ], [ 24.955884258092322, 60.167420398671979 ], [ 24.955961915362455, 60.16714896370344 ], [ 24.954386610306337, 60.167064065765416 ], [ 24.954001507273389, 60.167391337734998 ], [ 24.952847565137844, 60.167373512978614 ], [ 24.952822613088461, 60.166797568168406 ], [ 24.953853187215259, 60.166843780726531 ], [ 24.953830100013437, 60.166237572457682 ], [ 24.953348011912411, 60.166169540961555 ], [ 24.953334347456408, 60.165412015039657 ], [ 24.95382207102946, 60.165389255973913 ], [ 24.953848922216213, 60.165934937275864 ], [ 24.954215191002419, 60.165910300872568 ], [ 24.954222206303058, 60.164819876078283 ], [ 24.957513514660004, 60.162719886405476 ], [ 24.957350125969594, 60.16241444159072 ], [ 24.962444245195037, 60.158676029997494 ], [ 24.931364727925335, 60.158073159202424 ], [ 24.930956672327682, 60.158763521454645 ], [ 24.930269561811617, 60.160025086764747 ], [ 24.927205006195589, 60.160431563299923 ], [ 24.924870932258301, 60.160819121559065 ], [ 24.922618124859113, 60.161844064674241 ], [ 24.920967148779543, 60.161999922377944 ], [ 24.913874141397503, 60.16170665829079 ], [ 24.913102898162684, 60.168116623679424 ], [ 24.914452468692428, 60.167925823438217 ], [ 24.915405025089061, 60.168243743758026 ], [ 24.91500993205857, 60.168722214094807 ], [ 24.915662674861217, 60.16897482798764 ], [ 24.916309676798036, 60.169318227073475 ], [ 24.91499969539726, 60.169842892106246 ], [ 24.914016391271247, 60.170009172603876 ], [ 24.913323325863967, 60.170392067880528 ], [ 24.912210837509743, 60.170677472555369 ], [ 24.911721206679911, 60.175516630941878 ], [ 24.912579351646194, 60.175408980084242 ], [ 24.914306470397566, 60.175981448496955 ], [ 24.914030844620299, 60.176492089795232 ], [ 24.921223669671395, 60.177180684310237 ], [ 24.922998820399247, 60.176996469195238 ], [ 24.929633753885991, 60.177857615384603 ], [ 24.931448707671443, 60.178007129334667 ], [ 24.931845580220696, 60.177498346921041 ], [ 24.932904991639219, 60.1770907780922 ], [ 24.934425667240905, 60.177084197240781 ], [ 24.935380583115936, 60.177371712785877 ], [ 24.937303759381852, 60.178704247800511 ], [ 24.937081626500568, 60.17933693673357 ], [ 24.938235976876204, 60.179354900861171 ], [ 24.938272063985373, 60.179749267162329 ], [ 24.939912478852342, 60.179774777501649 ], [ 24.940508467839695, 60.178027066294277 ], [ 24.944498817696442, 60.176453218073426 ], [ 24.948236686295612, 60.175996170552288 ], [ 24.948236686295612, 60.175996170552288 ], [ 24.94811707554101, 60.175964025928138 ], [ 24.949328290825637, 60.176043360267165 ], [ 24.9509096682097, 60.176037530101624 ] ] ] ] } }
]
}
```

---

## 5. Helsingin kirkkoja (piste, WGS84)
```geojson
{
"type": "FeatureCollection",
"name": "helsinki-churches-wgs84",
"features": [
{ "type": "Feature", "properties": { "id": 1 }, "geometry": { "type": "Point", "coordinates": [ 24.952234046682747, 60.170393291110535 ] } },
{ "type": "Feature", "properties": { "id": 2 }, "geometry": { "type": "Point", "coordinates": [ 24.944929982664128, 60.16176796502225 ] } },
{ "type": "Feature", "properties": { "id": 3 }, "geometry": { "type": "Point", "coordinates": [ 24.939351427986509, 60.166406974974585 ] } },
{ "type": "Feature", "properties": { "id": 4 }, "geometry": { "type": "Point", "coordinates": [ 24.925255613920918, 60.173033168937636 ] } },
{ "type": "Feature", "properties": { "id": 5 }, "geometry": { "type": "Point", "coordinates": [ 24.949302849036847, 60.184252254165735 ] } },
{ "type": "Feature", "properties": { "id": 6 }, "geometry": { "type": "Point", "coordinates": [ 24.986386527977245, 60.147803675545859 ] } }
]
}

```


## 6. Helsingin kirkkoja (piste, TM35FIN)
```jsonfg
{
"type": "FeatureCollection",
"name": "helsinki-churches-tm35fin",
"coordRefSys": "http://www.opengis.net/def/crs/EPSG/0/3067",
"features": [
{ "type": "Feature", "properties": { "id": 1 }, "geometry": { "type": "Point", "coordinates": [ 386380.442074403574225, 6672149.416209113784134 ] } },
{ "type": "Feature", "properties": { "id": 2 }, "geometry": { "type": "Point", "coordinates": [ 385945.374654310580809, 6671201.711208757944405 ] } },
{ "type": "Feature", "properties": { "id": 3 }, "geometry": { "type": "Point", "coordinates": [ 385651.957091922289692, 6671727.839251661673188 ] } },
{ "type": "Feature", "properties": { "id": 4 }, "geometry": { "type": "Point", "coordinates": [ 384893.118568504578434, 6672490.050390739925206 ] } },
{ "type": "Feature", "properties": { "id": 5 }, "geometry": { "type": "Point", "coordinates": [ 386265.77314197603846, 6673697.446796888485551 ] } },
{ "type": "Feature", "properties": { "id": 6 }, "geometry": { "type": "Point", "coordinates": [ 388198.281914946972392, 6669576.110460814088583 ] } }
]
}

```
## 4. Virheenkäsittelyn testaus

Mikäli upotettuun GeoJSON- tai JSON-FG-koodiin eksyy rakenne- tai syntaksivirhe, järjestelmä näyttää siitä käyttäjälle selkeän virhekansion sen sijaan, että sivu kaatuisi. Alapuolella olevasta JSON-välilehdestä voit tarkastaa raakakoodin milloin tahansa.
