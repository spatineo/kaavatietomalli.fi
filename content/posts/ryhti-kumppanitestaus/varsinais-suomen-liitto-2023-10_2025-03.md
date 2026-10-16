---
title: "Maakuntakaavan kumppanitestaus"
date: "2025-03-01"
author: "Ilkka Rinne"
authorSlug: "ilkka-rinne"
excerpt: "Varsinais-Suomen liiton vetämässä hankkeessa vahvistui, että maakuntakaavojen ylläpito HAME-skeeman mukaisessa PostGIS-tietokannassa ei enää onnistu ohjelmistoriippumattomasti."
tags: ["kumppanitestaus","loppuraportti", "esri-finland", "gispo"]
category: "journal"
aiAssisted: true
coverImage: "/images/Gemini_Generated_Image_qnwgtaqnwgtaqnwg.jpeg"
---

# Maakuntakaavoituksessa joudutaan luopumaan HAME-tietokannasta

Maakuntakaavan kumppanitestaushankkeessa saatiin vahvistusta sille, että Ryhti-järjestelmän kaavatietomallin monimutkaisuus estää aiemman alustariippumattoman, PostGIS-tietokantaan pohjautuvan HAME-toimintatavan jatkamisen ja edellyttää maakuntien liitoilta siirtymistä toimittajaspesifeihin kaavoitusohjelmistoihin. Esri Finlandin selvitykseen tuloksena todettiin, ettei ArcGIS-ohjelmistolla ole mahdollista tuottaa ja päivittää Ryhti-vaatimusten mukaista kaavatietoa HAME-tietokantaan.

Alla on yhteenveto päättyneestä hankkeesta. Yhteenveto on laadittu tekoälyä hyödyntäen loppuraportin tekstin pohjalta. Alkuperäinen loppuraportti on linkitetty artikkelin loppuun.

## Nopeat faktat

* **Hankkeen nimi:** Maakuntakaavan kumppanitestaus.
* **Päähakija:** Varsinais-Suomen liitto / Lounaistieto.
* **Hankkeen toteutusaika:** 1.10.2023–31.3.2025.
* **Avustusmäärä:** Ympäristöministeriön valtionavustuksen mukainen kokonaisbudjetti oli 275 100,00 euroa ja toteuma 257 960,83 euroa.
* **Ohjelmistotoimittajat:** Gispo Suomi Oy ja Esri Finland Oy (ArcGIS-selvitystyö).


## Hankkeen käynnistyminen, tavoitteet ja osallistujat

Päähakijana toimineen Varsinais-Suomen liiton (Lounaistiedon) ohella hankkeen toteutukseen osallistuivat Kymenlaakson liitto ja Uudenmaan liitto. Hankkeen keskeisinä tavoitteina oli selvittää vaihtoehtoiset tavat laatia maakuntakaavaa valtakunnallisen kaavatietomallin mukaisesti, konvertoida olemassa olevia HAME-maakuntakaavoja uuteen tietomalliin sekä rakentaa tarvittavat tietokanta- ja tiedonsiirtoratkaisut Ryhti-järjestelmään. Taustalla vaikutti tarve sopeuttaa liittojen vakiintuneet kaavoitus- ja tiedonhallintaprosessit vastaamaan rakennetun ympäristön digitalisaation ja lainsäädännön tuomia uusia velvoitteita.

## Hankkeen keskeiset tulokset ja tavoitteisiin pääseminen

Teknisten tavoitteiden osalta hanke eteni onnistuneesti: projektissa luotiin Ryhti-yhteensopiva PostGIS-kaavatietokanta, kehitettiin tiedonsiirron ja validoinnin rajapintaratkaisut sekä toteutettiin QGIS-kaavoitustyökalun ensimmäinen kokeiluversio, jolla testattiin tiedonsiirtoyhteyksiä. Olemassa olevien HAME-kaavojen laaja konvertointi ei sen sijaan toteutunut suunnitellussa laajuudessa, sillä kaavatietomallin mukaisen datan tuottaminen osoittautui käytännössä mahdottomaksi ilman työtä ohjaavaa kaavoitusohjelmistoa. Hankkeen merkittävimpänä antina oli ymmärryksen kirkastuminen siitä, että maakuntakaavoitus tarvitsee toimittajaspesifin järjestelmän, ja näistä tulevaisuuden työkaluvalinnoista viestittiin kattavasti lähes kaikille maakuntien liitoille kolmessa laajassa työpajassa.

## Resurssit ja budjetin jakautuminen

Hankkeen 275 100,00 euron kokonaisbudjetista toteutui 257 960,83 euroa, ja kokonaiskustannukset alittuivat noin 17 000 eurolla ennakoitua pienempien henkilöstömenojen vuoksi. Valtaosa resursseista suunnattiin tekniseen kehitykseen: ohjelmistoyritysten ostopalveluihin käytettiin 204 190,00 euroa eli 79,2 prosenttia toteutuneista varoista (Gispo Suomi Oy 187 720,00 euroa ja Esri Finland Oy 16 470,00 euroa). Liittojen omaan työhön kohdistui suoraan henkilöstökuluina 42 241,17 euroa (16,4 prosenttia) ja kokonaisuudessaan yleis-, matka- ja muun muassa ohjelmistolisenssikulujen kera 53 770,83 euroa (20,8 prosenttia). Omaan työhön varattuja varoja siirrettiin suunnitellusti ohjelmistokehityksen ostopalveluihin konvertointitöiden supistuttua.

## Yhteydet muihin hankkeisiin ja jatkokehitys

Projektissa aloitettua QGIS-työkalua jatkokehitettiin rinnakkaisessa Paimion OsKaTi-hankkeessa Arho-sovellukseksi, ja työ jatkuu Varsinais-Suomen ja Pirkanmaan liittojen jatkohankkeissa kahden rinnakkaisen vaihtoehdon parissa (avoin QGIS Arho ja kaupallinen Esri dmCity). Hankkeessa koottiin useita muutosehdotuksia Ryhti-määrityksiin: kaavamääräysryhmille ehdotettiin sanallista kuvauskenttää, koodistoja ja validointiviestien kieltä toivottiin selkeytettävän, virheiden paikantamiseen esitettiin ID-tunnisteita ja liiteasiakirjat tulisi voida tallentaa linkkeinä. Lisäksi Katja-asetuksen visualisointisäännöt koettiin maakuntakaavatasolla osin epäselviksi, ja raportissa suositeltiin varautumaan vanhojen kaavojen työläisiin konvertointeihin tulevissa valtionavustushauissa.

Hankkeen [loppuraportti](https://api.hankeikkuna.fi/asiakirjat/ad1914a5-be30-4ea6-b3bd-5396164788af/1b7be3ff-a8fa-4901-9a65-ad00f993ca0b/RAPORTTI_20250904152329.PDF) PDF-muodossa (ympäristöministeriön hankeikkuna)