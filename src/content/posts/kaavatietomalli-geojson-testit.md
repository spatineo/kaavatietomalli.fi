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

## 4. Virheenkäsittelyn testaus

Mikäli upotettuun GeoJSON- tai JSON-FG-koodiin eksyy rakenne- tai syntaksivirhe, järjestelmä näyttää siitä käyttäjälle selkeän virhekansion sen sijaan, että sivu kaatuisi. Alapuolella olevasta JSON-välilehdestä voit tarkastaa raakakoodin milloin tahansa.
