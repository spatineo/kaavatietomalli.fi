---
title: "Kaavatiedon yhteentoimivuus kuntoon kansallisella standardilla"
date: "2026-05-01"
author: "Ilkka Rinne"
authorSlug: "ilkka-rinne"
excerpt: ""
tags: ["tietomalli", "standardointi" ]
category: "journal"
draft: true
---

Ryhti-järjestelmän JSON-muotoinen kaavatiedon sisääntuontiformaatti on yleisesti käytössä tiedonsiirrossa myös kuntien ja maakuntien suunnitteluohjelmistojen ja kaavarekisterijärjestelmien välillä, vaikka sitä ei siihen on suunniteltu, eikä se yksittäisten kaavasuunnitelmien osalta tällaiseen tiedonvaihtoon erityisen hyvin sovellu. Tämä johtuu siitä parempaakaan yhteistä siirtoformaattia ei ole toistaiseksi olemassa. Nämä JSON-tietorakenteen on kuvattu taulukkomuodossa Syken Ryhti-sivuston [Kaavatiedon tietomääritykset -sivulla](https://ryhti.syke.fi/alueidenkaytto/tietomallimuotoinen-kaavoitus/kaavatietomallin-tietomaaritykset/) ja koneluettavasti OpenAPI-muodossa GitHub-repossa [sykefi/Ryhti-rajapintakuvaukset](https://github.com/sykefi/Ryhti-rajapintakuvaukset).

Kuntien, maakuntien liittojen ja yksityisten kaavakonsulttien käyttämissä suunnittelu- ja rekisterijärjestelmissä on selkeä tarve standardimuotoisen kaavatiedon välittämiselle järjestelmien välillä sekä tietomallimuotoisten kaavojen pysyvälle säilömiselle ja arkistoinnille. Kaavan tiedot tulisi saada, kaavakartan esitystapamäärittelyineen, siirrettyä järjestelmästä toiseen siten, että kaavatietoa voidaan edelleen hyödyntää paikkatietoaineistona, ja että siirrettävässä aineistossa voidaan käyttää ainakin osin kansallista kaavamääräyskokoelmaa laajentavaa, koneluettavaa määrääräysisältöä, vaikkei sitä Ryhti-järjestelmään olisikaan mahdollista sellaisenaan viedä. Jotta tämän toteuttaminen onnistuu valtakunnallisesti kaikkien käytössä olevien ohjelmistojen kesken, tulee tietomallit ja siirtoformaatit kuvata teknisenä standardina, jossa teknisen yhteentoimivuuden kannalta olennaiset piirteet on kuvattu selkeinä, testattavina vaatimuksina standardin mukaisille kohdejärjestelmille.

(kesken)