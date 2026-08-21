---
title: "Valtakunnallinen kaavatietomalli"
---

## Kaavatietomalli: perusteiden alkeet

Tietomallimuotoinen kaavoitus edustaa maankäytön suunnittelun digitaalista murrosta. Ennen kaavat tuotettiin ensisijaisesti visuaalisina karttoina ja tekstimuotoisina asiakirjoina (kuten PDF-tiedostoina). Nykyaikaisessa kaavoituksessa kaava ei ole vain kuva, vaan **rakennetun ympäristön standardoitu tietomalli**, jonka tiedot ovat koneellisesti luettavissa, käsiteltävissä ja siirrettävissä järjestelmästä toiseen.

Kaavatietomalli ei muuta kaavoituksen maankäytöllisiä tai juridisia periaatteita, vaan tekee suunnittelun tuloksista täsmällisiä, vertailukelpoisia ja digitaalisen yhteiskunnan tarpeisiin soveltuvia.

Tässä artikkelissa käydään läpi kaavatietomallin keskeisimmät peruskäsitteet ja periaatteet tiivistetysti.


### Mikä on Kaavatietomalli?

Suomen valtakunnallisesti yhteentoimiva Kaavatietomalli määrittelee rakenteen ja säännöt sille, miten kaavatiedot, kuten kaavan alueelliset rajaukset, kaavamääräykset ja kaavaselostukset, kuvataan digitaalisesti.

* **Standardoitu rakenne:** Tietomalli varmistaa, että kaikkien kunnissa ja maakunnissa laadittavien kaavojen tiedot noudattavat yhtenäistä rakennetta.
* **Koodistopohjaisuus:** Merkinnät ja määräykset nojaavat valtakunnallisiin koodistoihin, mikä poistaa tulkinnanvaraisuutta ja yhdenmukaistaa termistöä.
* **Geometrian ja tiedon yhdistäminen:** Jokaiseen kaavakohteeseen kytkeytyy sekä sen spatiaalinen geometria (alue, viiva tai piste) että siihen liittyvät laadulliset ja numeeriset ominaisuudesta vastaavat tiedot.

Kaavatietomallin kenties keskeisin soveltamisalue on Suomen ympäristökeskuksen ylläpitämä Rakennetun ympäristön tietojärjestelmä eli lyhemmin [Ryhti-järjestelmä](https://ryhti.syke.fi/). Yhteinen Kaavatietomalli mahdollistaa rakennetun ympäristön käyttöä ja kehittämistä koskevien suunnitelmien ja päätösten, eli kaavatiedon, yhteiskäytön eri käyttäjien ja tietojärjestelmien kesken.

Kaavatietomalli on niin sanottu loogisen tason tietomalli, josta voidaan tuottaa erilaisia teknisiä toteutuksia sekä tietojärjestelmien sisäiseen kaavatiedon hallintaan ja tallennukseen että eri tietojärjestelmien väliseen kaavatiedon vaihtoon. [Ryhti-järjestelmän rajapintakuvaukset](https://github.com/sykefi/Ryhti-rajapintakuvaukset/) sisältävät erään Kaavatietomallin teknisen toteutuksen kaavatiedon siirtämiseksi kuntien ja maakuntien tietojärjestelmistä keskitettyyn kansalliseen Ryhti-järjestelmään ja niiden hakemiseksi Ryhti-järjestelmästä. 

### Tietomallin keskeiset rakennuspalikat

Kaavatietomalli koostuu hierarkkisista ja toisiinsa liittyvistä tietokohteista. Tässä kuvataan niistä keskeisimmät.



#### Kaava (kaavasuunnitelma)
Kaava(suunnitelma) toimii kokonaisuuden kehyksenä. Siihen liittyvät yleiset tiedot, kuten:
* Kaavan hyväksymispäivä ja voimassaolotieto.
* Kaavasuunnitelman mittakaava.
* Kaavan elinkaaritila (esim. vireilletullut, ehdotusvaiheessa, hyväksytty, lainvoimainen).
* Alueen maantieteellinen ulottuvuus (kaavan rajaus).
* Kaavaan sisältyvät kaavakohteet ja yleismääräykset.

#### Kaavakohde
Kaavakohde edustaa tiettyä aluetta, viivaa tai pistettä kaavakartalla. Kaavakohde on tapa kohdistaa kaavamääräykset tiettyyn sijaintiin tai alueeseen kaavan maantieteellisen rajauksen sisällä. Sopivia kaavamääräyksiä kaavakohteisiin kohdistamalla saadaan aikaan esimerkiksi seuraavan tyyppisiä kohdistettuja kaavamääräyksiä:
* **Käyttötarkoitusalueet:** Asuinalueet (A), liikealueet (C), teollisuusalueet (T), puistoalueet (VP).
* **Osa-alueet ja rajat:** Rakennusala, suojelualue, kaava-alueen raja.
* **Pistemäiset ja viivamaiset kohteet:** Liittymäkiellot, suojeltavat puut, ajoneuvoliittymät.

#### Kaavamääräykset ja kaavamääräysryhmät
Jokaiseen kaavakohteeseen kytkeytyy yksi tai useampia kaavamääräyksiä. Määräykset voivat koskea muun muassa:
* Kerrosalaa ja tehokkuutta ($e$-luku tai kerrosala $m^2$).
* Kerroslukua ja korkeusasemaa.
* Suojelumääräyksiä, julkisivumateriaaleja tai hulevesien hallintaa.

Tietomallissa määräys ei ole pelkkää vapaamuotoista tekstiä, vaan se esitetään tietomallin kuvaamassa rakenteisessa määrämuodossa. Kaavan yksittäisen kaavamääräyksen tiedot voivat koostua useammasta koneluettavasta kentästä: kaavamääräyksen laji, määräyksen arvo, lisätieto mahdollisine omine arvoineen. Sanallisten kaavamääräysten avulla voidaan kuitenkin aina tarvittaessa kuvata määräyksen sisältö tekstiä, elleivät kenttien koneluettavat kentät riittävän hyvin taivu spesifiseen määräystarpeeseen. 

Kaavatietomallissa kaavamääräykset kootaan yhden tai useamman määräyksen kaavamääräysryhmiksi, joiden kautta kohdistaminen kaavakohteisiin tehdään. Kaavamääräysryhmille voidaan antaa otsikko ja kaavakartalla näkyvä kirjaintunnus. 

```mermaid
---
title: Kaavasuunnitelma, kaavakohde, kaavamääräys ja kaavasuositus
config:
    layout: elk
    class:
        hideEmptyMembersBox: true
---
classDiagram
    class Kaava {
        Kuvaus
        Mittakaava
        Aluerajaus
        Hyväksymispäivä
        Voimassaoloaika
        Elinkaaren tila
    }

    class Kaavamääräysryhmä {
        Otsikko
        Kirjaintunnus
    }

    class Yleismääräysryhmä {
        Otsikko
    }

    class Kaavamääräys {
        Kaavamääräyksen laji
        Kaavamääräyksen arvo
        Kaavamääräyksen lisätieto
        Voimassaoloaika
        Elinkaaren tila
    }

    class Kaavakohde {
        Kohteen nimi
        Sijaintigeometria
        Voimassaoloaika
        Elinkaaren tila
    }

    class Kaavasuositus {
        Kaavamääräyksen arvo
        Voimassaoloaika
        Elinkaaren tila
    }

    Kaava o--> "1..*" Kaavakohde
    Kaava o--> "0..*" Yleismääräysryhmä
    Kaavakohde "1..*" <--> "1..*" Kaavamääräysryhmä
    Kaavamääräysryhmä *--> "1..*" Kaavamääräys
    Yleismääräysryhmä *--> "0..*" Kaavamääräys
    Kaavamääräysryhmä *--> "0..*" Kaavasuositus
    Yleismääräysryhmä *--> "0..*" Kaavasuositus
```

### Kaavahanke ja sen vaiheet: Kaava-asia

Kaavatietomallin avulla voidaan kuvata kaavasuunnitelman lisäksi myös kaavahankkeen tai -prosessin yleistiedot ja vaiheet:

* Kaavan nimi, tunnus ja kaavalaji (asemakaava, yleiskaava, maakuntakaava).
* Kaavan pysyvä valtakunnallinen tunnus sekä sisäiset asianhallinta- ja diaaritunnukset.
* Tieto hallinnollisesta alueesta, johon kaava kuuluu (kunta tai maakunta).
* Kaavan osallistumis- ja arviointisuunnitelma.
* Kaava-asian ajalliset vaiheet ja vaiheesta toiseen siirtymiseen liittyvät hallinnolliset päätökset.

Kaavatietomallissa kaava-asian elinkaaren vaiheet on vakioitu. Seuraavassa on esitetty tyypillisimmät kaavan elinkaaren tilat ajallisessa järjestyksessä:

```mermaid
gantt
    title Kaavan elinkaaren tilat
    dateFormat YYYY-MM-DD
    axisFormat .
    tickInterval 1month
    todayMarker off

    Virelletullut           :sj1, 2026-01-01, 3M  
    Valmistelu              :sj2 , after sj1, 3M
    Kaavaehdotus            :sj3, after sj2, 3M
    Muutettu kaavaehdotus   :sj4, after sj3, 3M
    Hyväksytty kaava        :sj5, after sj4, 3M
    Voimassa                :sj6, after sj5, 3M
```

Kaavatietomallissa jokaisella kaavasuunnitelman versiolla ja niiden sisältämillä kaavakohteilla ja -määräyksillä on tilatieto (elinkaaren tila). Kaava-asiaan liitetään prosessin kuluessa kunkin vaiheen tiedot kaavasuunnitelmineen ja asiakirjoineen. Tämä mahdollistaa kaavan tarkastelun myös kaavaprosessin aikana, esimerkiksi sen ollessa julkisesti nähtävillä. Kaavan elinkaaren vaiheiden avulla on myös helppo nähdä onko kaava hyväksytty, onko valitusaika vielä kesken, onko se lainvoimainen ja mahdollisesti kokonaan tai osittain kumottu.

```mermaid
---
title: Kaava-asia, sen vaiheet, tapahtumat ja päätökset
config:
    layout: elk
    class:
        hideEmptyMembersBox: true
---
classDiagram
    
    class Kaava-asia {
        Kaavalaji
        Pysyvä kaavatunnus
        Diaarinumero
        Nimi
        Kuvaus
        Hallinnollisen alueen tunnus
        Virelletulopäivämäärä
    }

    class `Osallistumis- ja arviointisuunnitelma` {
        Tiedosto
    }

    class `Kaava-asian vaihe` {
        Elinkaaren tila
        Aluerajaus
    }

    class Vuorovaikutustapahtuma {
        Vuorovaikutustapahtuman laji
        Kuvaus
        Nimi
        Tapahtuma-aika
        Sijainti
    }

    class Käsittelytapahtuma {
        Käsittelytapahtuman laji
        Kuvaus
        Nimi
        Tapahtuma-aika
        Käsittelijä
    }

    class `Kaava-asian päätös` {
        Päätöksen nimi
        Päätöspäivämäärä
        Päätöksen antopäivämäärä
        Päätöksentekijän laji
    }

    class Kaava {
        Kuvaus
        Mittakaava
        Aluerajaus
        Hyväksymispäivä
        Voimassaoloaika
        Elinkaaren tila
    }

    Kaava-asia *-- "1..*" `Kaava-asian vaihe`
    Kaava-asia o--> "0..1" `Osallistumis- ja arviointisuunnitelma`
    `Kaava-asian vaihe` o-- "0..*" `Kaava-asian päätös`
    `Kaava-asian vaihe` o--> "0..*" Vuorovaikutustapahtuma
    `Kaava-asian vaihe` o--> "1..*" Käsittelytapahtuma
    `Kaava-asian päätös` o-- "0.." Kaava 
    
```

### Tietomallimuotoinen kaavatieto mahdollistaa paljon

1. **Yhteentoimivuus:** Mahdollistaa saumattoman tiedonvaihtamisen kuntien ja maakuntien CAD-pohjaisten suunnitteluohjelmistojen, paikkatietojärjestelmien (GIS), Rakennetun ympäristön tietojärjestelmän (Ryhti) sekä muiden viranomais- ja yksityissektorin järjestelmien kesken.
2. **Automaatio ja analysoitavuus:** Kun kaavamääräykset ja niiden arvot ovat koneluettavia ja paikkatiedoksi kuvattuna, voidaan kaavojen vaikutuksia ja rakennusoikeutta laskea sekä simuloida automaattisesti.
3. **Sujuvampi luvitus:** Rakennusvalvonta voi hyödyntää suoraan koneluettavaa kaavatietoa rakennuslupahakemusten kaavanmukaisuuden tietokoneavusteisessa arvioinnissa  tarkastuksessa ja käsittelyssä.
4. **Tekoälyavusteinen suunnittelu:** Laajamittaisesti sekä kone- että ihmisymmärrettävään muotoon tuotettu alueidenkäytön suunnittelutieto mahdollistaa tekoälyavusteisten suunnitteluohjelmistojen kouluttamisen kattavilla ja realistisilla aineistoilla. Alueellisia, haastaviakin suunnittelutarpeita ja tavoitteita kuvaavat kaavaselostukset yhdessä niiden ratkaisemiseen tuotettujen, koneluettavien kaavatietojen kanssa mahdollistavat parhaiden kaavoituskäytäntöjen ja -ratkaisumallien opettamisen kaavoituksen erikoistuneille tekoälymalleille.


## Kaavatietomallin rakenne ja sisältö tarkemmin

Valtakunnallisesti yhteentoimivan tietomallimuotoisen kaavatiedon tietomalli, eli lyhyemmin Kaavatietomallin tietorakenteet ja -sisällöt on määritelty DVV:n ylläpitämällä Yhteentoimivuusalustalla: Tietomallin rakenteet [Tietomallit-työkalussa](https://tietomallit.suomi.fi/), ja siinä käytetyt koodistot [Koodistot-työkalussa](https://koodistot.suomi.fi/).

Kaavoittajat eivät yleensä suoraan käytä Yhteentoimivuusalustan tietomäärityksiä, koska Kaavatietomallin mukaisten kaavojen laadintaan käytettävät suunnittelusovellukset on valmiiksi ohjelmoitu noudattamaan tietomallin määrityksiä. Tässä osiossa Kaavatietomallia käsitellään hieman teknisemmin, mikä saattaa kiinnostaa erityisesti Kaavatietomallin käyttöön perustuvien tietojärjestelmien suunnittelijoita ja kehittäjiä.

### Kaavatietomallin määrittely: UML-luokkamalli ja Yhteentoimivuusalusta

Yhteentoimivuusalustan [Tietomallit-työkalussa](https://tietomallit.suomi.fi/model/rytj-kaava) Kaavatietomalli on määritelty luokkamallin avulla. Kukin luokka esittää tietomallin kuvaamaa käsitettä tai rakenteista, useammasta tieto-osasta koostuvaa ominaisuutta. Kullakin luokalla on nimi ja lista ominaisuuksia, eli attribuutteja, joilla on nimen lisäksi tietotyypin ja moninkertaisuustiedot. Lisäksi luokkamallissa on esitetty mahdolliset luokkien väliset yhteydet. Myös näistä assosiaatioista on kuvattu yhteyden nimen lisäksi sen moninkertaisuus, eli voiko kyseisiä yhteyksiä olla samaan aikaan yksi vai useampi. Moninkertaisuuden avulla määritellään myös pakolliset attribuutit ja assosiaatiot: pakollisten tietojen monikertaisuus on yksi tai useampi.

Yhteentoimivuusalustalla luokkamalli esitetään graafisesti luokkakaaviona, jonka muoto ei kuitenkaan ole täysin tietojärjestelmien ja tietomallien standardoinnissa käytettävän [Unified Modeling Language -kielen (UML)](www.uml.org) mukainen, mistä aiheutuu tiettyjä hankaluuksia tietomallin tulkinnassa. Toisaalta näin on vältetty UML-standardin graafisen luokkakaavion mahdolliset monimutkaisuudet. Lopputulos on tyypillinen kompromissi, joka on sekä maallikolle että tietomallinnuksen ja ohjelmoinnin ammattilaiselle hieman luotaantyöntävä: ensimmäiselle liian monimutkainen ja jälkimmäiselle liian epätäsmällinen.

> [Info::UML-kieli ja Yhteentoimivuusalusta]
> Kaavatietomalli on alunperin määritelty käyttäen paikkatiedon tiedonmallinnusstandardeja: Se perustuu [ISO 19109-standardin](https://www.iso.org/standard/59193.html) yleiseen kohdetietomalliin (General Feature Model, GFM), joka määrittelee rakennuspalikat paikkatiedon ISO-standardiperheen mukaisten sovellusskeemojen määrittelyyn. GFM kuvaa muun muassa metaluokat *FeatureType*, *AttributeType* ja *FeatureAssociationType*. Lisäksi tietomalli perustuu muihin paikkatiedon ISO-standardeihin, joista keskeisimpiä ovat [ISO 19103](https://www.iso.org/standard/56734.html) (UML-kielen käyttö paikkatietojen mallinnuksessa), [ISO 19107](https://www.iso.org/standard/66175.html) (sijaintitiedon mallintaminen) ja [ISO 19108](https://www.iso.org/standard/26013.html) (aikaan sidotun tiedon mallintaminen).
>
> Valitettavasti UML-kielellä laadittua alkuperäistä luokkamallia ei ole voitu täysin siirtää Yhteentoimivuusalustan Tietomallit-työkaluun, joka ei tue kaikkia UML-luokkamallin ominaisuuksia. Kaavatietomallin määrittely Yhteentoimivuusalustalla ei siis ole täysin paikkatiedon kansainvälisten standardien mukainen, vaan tietynlainen hybridi: Toisaalta lähempänä käsitemallia (mm. sijaintigeometrioiden määrittely on puutteellinen, eikä vastaa paikkatiedon ISO-standardien kuvaustapaa), toisaalta loogisen tason tietomalliksi liiankin yksityiskohtainen sisältäen mm. luokkien avain-attribuutit, jotka on mallinnettu suoraan Ryhti-järjestelmän JSON-rajapintakuvausten OpenAPI-komponenttien UUID-tunnisteista.
>
> ISO-paikkatietostandardien mukainen UML-kielinen Kaavatietomalli, samoin kuin esimerkiksi rakentamisen sitovan tonttijaon, rakennusjärjestyksen ja rakentamisen lupapäätösten tietomallit, oli vuoden 2023 syksyyn saakka saatavilla Syken ylläpitämällä tietomallit.ymparisto.fi -sivustolla, joka on sittemmin ajettu alas. Kopio tietomallit.ymparisto.fi -sivustosta löytyy edelleen Spatineon ylläpitämältä [ry-tietomallit -sivustolta](https://spatineo.github.io/ry-tietomallit/). Kaavatietomallin osalta sivustolta löytävät mm. seuraavat tiedot (huom, tietoja ei ole päivitetty vastaamaan myöhempiä tietomallin muutoksia):
>
> * [UML-luokkakaavio](https://spatineo.github.io/ry-tietomallit/kaavatiedot/v1.1/looginenmalli/uml/doc/)
> * [Sanallinen dokumentaatio](https://spatineo.github.io/ry-tietomallit/kaavatiedot/v1.1/looginenmalli/dokumentaatio/) (ns. feature catalog)
> * [Elinkaari-](https://spatineo.github.io/ry-tietomallit/kaavatiedot/v1.1/looginenmalli/elinkaarisaannot.html) ja [laatusäännöt](https://spatineo.github.io/ry-tietomallit/kaavatiedot/v1.1/looginenmalli/laatusaannot.html) sisältäen selkeät vaatimusmäärittelyt.
> * Kaavatietomallin [asemakaavan](https://spatineo.github.io/ry-tietomallit/kaavatiedot/soveltamisprofiili/asemakaava/v1.0/) ja [yleiskaavan](https://spatineo.github.io/ry-tietomallit/kaavatiedot/soveltamisprofiili/yleiskaava/v1.0/) soveltamisprofiilit, jotka tarkentavat koodistojen käyttöä ja kaavamääräysten muodostamista.
>
> Nämä tiedot on nykyisin pääosin esitetty Syken [Rakennetun ympäristön tietojärjestelmä -sivustolla](https://ryhti.syke.fi/), pois lukien luokkamalli, joka on kuvattu Yhteentoimivuusalustalla, kuten edellä on kerrottu. Syken tietomallikuvauksen päätarkoitus on kuitenkin selkeästi Ryhti-järjestelmän kuvauksessa. 

Seuraavat osiot Syken ryhti.syke.fi -sivuston dokumentaatiossa ovat olennaisia Ryhti-järjestelmän Kaavatietomallin toteutuksen ymmärtämisessä:

* [Ryhti-järjestelmän yleiset tietomääritykset ja laatusäännöt](https://ryhti.syke.fi/ohjeet-ja-tuki/tietomallit/tietotyypit/)
* [Ryhti-järjestelmän kaavatietomallin tietomääritykset ja kuvaukset](https://ryhti.syke.fi/alueidenkaytto/tietomallimuotoinen-kaavoitus/kaavatietomallin-tietomaaritykset/)
* [Kaavatietomallin elinkaari- ja laatusäännöt](https://ryhti.syke.fi/alueidenkaytto/tietomallimuotoinen-kaavoitus/kaavatietomallin-elinkaari-ja-laatusaannot/)
* [Kaavasuunnitelman validointisäännöt](https://ryhti.syke.fi/alueidenkaytto/tietomallimuotoinen-kaavoitus/kaavasuunnitelman-validointisaannot/)
* [Kaavatiedon validointisäännöt ja paluuarvot](https://ryhti.syke.fi/wp-content/uploads/sites/2/2023/11/Kaavatiedon-validointisaannot-ja-paluuarvot.pdf) (Ryhti-järjestelmän kaavatiedon validointipalvelu, PDF)
* [Kaavakartan GeoTIFF-vaatimukset](https://ryhti.syke.fi/alueidenkaytto/tietomallimuotoinen-kaavoitus/kaavatietomallin-elinkaari-ja-laatusaannot/kaavakartan-geotiff-vaatimukset/)

Seuraavissa luvuissa on esitetty Kaavatietomallin keskeisimmät luokat yksityiskohtaisemmin Yhteentoimivuusalustalla kuvatun luokkamallin mukaisesti.

### Kaava-asia, sen vaiheet ja päätökset

Kaava-asia -luokka kuvaa kaavahankkeen perustiedot, muun muassa minkä tyyppinen kaava on kyseessä, minkä kunnan tai maakunnan hallinnolliselle alueelle se on laadittu, minkä niminen kaava on, milloin kaava on tullut vireille, onko kyseessä alunperin tietomallimuotoon laadittu kaava vai onko kyseessä aiemman, perinteisen kaavan digitointi Kaavatietomallin muotoon. Kaava-asia ei sisällä suunnitelmatietoja, mutta siihen voidaan liittää kuvauksia käytetyistä lähtötietoaineistoista ja osallistumis- ja arviointisuunnitelma, kaavahankkeen vastuutahon nimi ja erilaisia hankkeeseen liittyviä asiakirjoja. Kaava-asian tietoihin kuuluu kaavan pysyvä tunnus, joka haetaan Ryhti-järjestelmän kautta kaavahankkeen alussa. 

Kaava-asiaan liittyy aina vähintään yksi Kaava-asian vaihe, tyypillisesti ensimmäisen vaiheen elinkaaren tila on *Vireillä* tai *Valmistelu*. Kuhunkin vaiheeseen puolestaan liitetään vähintään yksi sen aloittanut käsittelytapahtuma, kuten nähtäville asettamisesta tai hyväksymisestä päättäminen. 

Käsittelytapahtuman lisäksi Kaava-asian vaiheeseen liitetään yleensä myös käsittelytapahtumassa tehdyn päätöksen tiedot, vähintään päätöksen laji (attribuutti *Päätöksen nimi*), päätöksen tekijän laji, ja päivämäärätiedot. Kaavatietomallin nykyisessä versiossa kukin vaiheen alun tilanne kaavasuunnitelmasta, eli kaavakohteista ja niihin kohdistetuista kaavamääräyksistä, liittyy kaavan vaiheeseen aina Kaava-asian päätös -luokan kautta. Tällä Ryhti-järjestelmän suunnittelun ja toteutuksen aikana tehdyllä muutoksella on haluttu tehdä selväksi, että Ryhti-järjestelmään vietävien suunnitelmien tulee aina sellaisia versioita, josta on kunnassa tai maakunnassa tehty jokin päätös. 

> [Info::Itsenäiset vaihekohtaiset suunnitelmat]
>Kaavatietomallin aiemmissa suunnitteluversioissa Kaava-asian ja kaavasuunnitelman tiedot oli kuvattu yhdellä Kaava-luokalla, jonka elinkaaren tila päivittyi kaavaprosessin edetessä. Kaava-luokkaan siihen liittyi sen elinkaaren aikana useampia päätöksiä ja tapahtumia ja sen kuvaamaan kaavasuunnitelman sisältö eli prosessin mukana. Kaikki kaavaan tehtävät muutokset voitiin jatkuvasti tallentaa kaavatietovarantoon, ja järjestelmä huolehtii muutostenhallinnasta ja tietojen versioinnista: Esimerkiksi siirryttäessä uuteen kaavan elinkaaren vaiheeseen aiemman elinkaaren vaiheen viimeisin tila koko kaavasta tallennetaan siten, että siihen voidaan tarvittaessa palata. 
> 
> Ryhti-järjestelmään tallentamisen selkeyttämiseksi Kaavatietomalliin haluttiin rakenne, jossa kunta tai maakunta tuo erikseen Ryhtiin hankkeen perustiedot (Kaava-asia ja ensimmäinen vaihe) ja myöhemmin erillisinä kokonaisuuksinaan yhden vaiheen kokonaisen kaavasuunnitelman uusine, aiemmista suunnitelman vaiheista erillisine kaavakohteineen ja -määräyksineen. 
>
> Tässä siis luovuttiin myös mahdollisuudesta kaavakohde- ja kaavamääräyskohtaisen muutoshistorian kuvaamiseen: Vaikka jokin kaavakohde ja siihen kohdistuvat kaavamääräykset olisivat täysin identtisiä esimerkiksi kaavaehdotusvaiheessa ja lopullisessa hyväksytyssä kaavassa, ne kuvataan tietomallissa erillisinä, eri vaiheisiin liittyviä kopiotietoina, joiden välillä ei ole tietomallissa mitään yhteyttä. Kaavan tekninen tiedonhallinta on näin toki helpompaa sikäli, että kukin kaavan vaiheen kaavasuunnitelma sisältää täydelliset tiedot kaikista sen kaavakohteista ja -määräyksistä, eikä ole tarvetta viitata aiempien vaiheiden suunnitelmiin kuuluviin kaavakohde- ja kaavamääräystietoihin siltä osin, kun tiedot ko. eivät ole muuttuneet. Ainoaksi tapaukseksi kaavasuunnitelmien (ja kaava-asioiden) välisille viittauksille kaavamääräysryhmien ja kaavakohteiden välillä jäävät vaihekaavojen aiempiin kaavakohteisiin viittaavat uudet kaavamääräysryhmät.

Ryhti-järjestelmään toteutetun Kaavatietomallin mukaiset kaava-asian, sen vaiheiden ja päätösten attribuutit ja luokkien keskinäiset suhteet on esitetty alla olevassa UML-luokkakaaviossa:

```data-model-snippet
    title: Kaava-asia, Kaava-asian vaihe ja Kaava-asian päätös
    modelId: rytj-kaava-1.0.5
    classes:
        - "https://iri.suomi.fi/model/rytj-kaava/Kaava-asia"
        - "https://iri.suomi.fi/model/rytj-kaava/Kaava-asianVaihe"
        - "https://iri.suomi.fi/model/rytj-kaava/Kaava-asianPaatos"
```

Kaaviossa on selkeyden vuoksi esitetty kokonaisuudessaan vain nämä kolme luokkaa ja niiden attribuuteissa käytetyt koodistot (stereotyyppi *codelist*). Näiden kolmen luokan assosiaaatiot muihin tietomallin luokkiin on myös esitetty, mutta näiden liittyvien luokkien yksityiskohtia ei. 

### Kaavasuunnitelma, kaavakohteet ja kaavamääräykset

Kaavan varsinainen alueidenkäyttöä ja rakentamista ohjaava sisältö kuvataan Kaavatietomallissa Kaava-luokan ja siihen liittyvien Kaavakohde-, Kaavamääräys-luokkien avulla. Kaava-luokka edustaa tietomallissa kokonaista yhden kaavan vaiheen suunnitelmaa kaavan sisältämistä kaavakohteista ja niihin kohdistetuista määräyksistä. Siihen kuuluvat myös viimeistään ehdotusvaiheessa myös kaavaselostus ja yksi tai useampi graafinen, GeoTIFF-tiedostona toimitettava kaavakartta ilman seliteosaa (ns. merkinnät ja määräykset). Kaava-luokkaan kytketään myös kaikki muut kaavan liitteet, mm. erilaiset selvitykset, raportit, karttaliitteet, mahdolliset PDF-muotoiset kaavakartat seliteosineen jne.

```data-model-snippet
    title: Kaava, Yleismääräysryhmä, Kaavakohde, Kaavamääräysryhmä, Kaavamääräys, Kaavamääräyksen lisätieto ja Kaavasuositus 
    modelId: rytj-kaava-1.0.5
    classes:
        - "https://iri.suomi.fi/model/rytj-kaava/Kaava"
        - "https://iri.suomi.fi/model/rytj-kaava/Yleismaaraysryhma"
        - "https://iri.suomi.fi/model/rytj-kaava/Kaavakohde"
        - "https://iri.suomi.fi/model/rytj-kaava/Kaavamaaraysryhma"
        - "https://iri.suomi.fi/model/rytj-kaava/Kaavamaarays"
        - "https://iri.suomi.fi/model/rytj-kaava/KaavamaarayksenLisatieto"
        - "https://iri.suomi.fi/model/rytj-kaava/Kaavasuositus"
```

Kaavatietomallissa yleismääräysten kaavamääräysryhmä ja muiden, kaavakohteisiin kohdistettavien kaavamääräysten kaavamääräysryhmä on erotettu omiksi luokikseen. Yleismääräysryhmä-luokasta puuttuvat Kaavamääräysryhmä-luokkaan verrattuna Kirjaintunnus- ja Värikoodi-attribuutit. Yleismääräysryhmään ei myöskään välttämättä tarvitse kuulua yhtään kaavamääräystä: myös puhtaasti Kaavasuosituksista koostuvat Yleismääräysryhmät ovat mahdollisia. Sekä Kaavamääräysryhmä- että Yleismääräysryhmä-luokkien objektit voivat koostua kaavamääräysten lisäksi kaavasuosituksista. Kaavasuositus on ei-velvoittaja kaavan tulkintaohje, joka on muuten rakenteeltaan Kaavamääräys-luokan kaltainen, paitsi että sen arvona on aina monikielinen teksti. Kaavasuositus-luokasta puuttuu myös Aihetunniste- ja sanallisen määräyksen laji -attribuutit.

> [Info::Kaavamääräysryhmän käyttö]
> Alunperin kaavamääräysryhmän tarkoitus Kaavatietomallissa oli toimia koostaa aihepiiriin liittyviä, kaavassa useampiin samankaltaisiin kaavakohteisiin kohdistettavia kaavamääräyksiä yhteen. Näin samoja kaavamääräyksiä ei tarvitsisi erikseen kohdistaa kaavakohteisiin, vaan kohdistaminen voitaisiin tehdä ryhmänä. Suunnittelutyössä esimerkkinä oli pientalojen alueen kaavamääräysryhmä, joka sisälsi käyttötarkoitusmääräyksen, kerroslukumääräyksen sekä julkisivujen väritykseen ja rakentamistapaan liittyviä määräyksiä. Tällainen ryhmä voitiin määritellä kerran ja kohdistaa "leimaamalla" kaikkiin kaavan suunniteltuihin pientaloalueisiin. Kaavamääräyksiä voitiin kohdistaa kaavakohteisiin myös suoraan ilman kaavamääräysryhmää, ja tietomallimielessä kaavamääräysryhmä oli itsekin kaavamääräys, joka koostuu sisäisesti useammasta eri kaavamääräyksestä (ns. kompositio-suunnittelumalli). Näin kaavamääräysryhmiä voitaisiin käyttää kunnan kaavamääräyskirjastojen koostamiseen: Ryhmään olisi valmiiksi koottu tiettyyn erityiseen ratkaisuun liittyvät kaavamääräykset, mukaan lukien kunnan sisällä harmonisoidut sanalliset määräykset, ja sillä olisi mahdollisesti kunnan kaavamääräyskirjastossa ylläpidetty yksilöivä kirjain- ja numerotunnus. Kaavamääräysryhmä voitaisiin ottaa kaavassa käyttöön yhtenä pakettina, ja kohdistaa haluttuihin kaavakohteisiin.
>
> Kompositio-mallia pidettiin ministeriön ja Syken suunnalta hankalana, kun näin kaavakohteisiin olisi mahdollista kohdistaa sekä yksittäisiä kaavamääräyksiä että ryhmiä. Ehkäpä tietomallin rakennetta ei vaan ymmärretty oikein: kaavamääräysryhmähän oli erikoistapaus kaavamääräys-luokasta, eli sikäli kaavakohteeseen olisi kohdistettu ainoastaan kaavamääräyksiä. Rakenteiselle kaavamääräykselle, joka sisältää samaan aihepiiriin kuuluvia määräyksiä, sen sijaan oli ilmeinen tarve. Esimerkiksi käyttötarkoitus teollisuus- ja varastoalue (T) oli näppärää muodostaa yhdistämällä teollisuusalue- ja varastoalue-lajien kaavamääräykset samaan kaavamääräysryhmään. Toinen esimerkki kaavamääräysryhmän käytöstä ovat tapaukset, joissa koodiston määrittelemää kaavamääräystä on tarpeen tarkentaa sanallisella määräyksellä. Jotta kaavamääräys- ja kaavakohde-luokkien välinen relaatio saatiin yhdenmukaistettua kaikissa tapauksissa, päädyttiin ratkaisuun, jossa kaavamääräykset liitetään kaavakohteisiin aina kaavamääräysryhmän kautta, vaikka ryhmässä olisi vain yksi määräys, mikä on mallintajan näkökulmasta tarpeettoman kömpelöä. Kaavamääräykset ihmisluettavaksi tarkoitettu otsikkoteksti ja mahdollinen, kaavakartalla kaavakohteen yhteydessä esitettävä kirjaintunnus tulivat tässä rakenteessa myös kaavamääräysryhmän tiedoiksi.
>
> Kaavamääräyksen ja kaavamääräysryhmän käyttäytyminen kaavan osittaisen kumoamisen tilanteessa piti tässä uudessa tilanteessa ratkaista: olisiko kaavamuutoksella tai vaihekaavalla mahdollista kumota sekä kokonaisia kaavamääräysryhmiä että yksittäisiä kaavamääräyksiä niiden sisältä? Ja jos kaavamääräysryhmän sisältä voitaisiin kumota kaavamääräyksiä, niin voisiko esimerkiksi vaihekaavalla myös lisätä uusia kaavamääräyksiä olemassa olevien kaavamääräysryhmien sisään kumottujen sijaan tai niiden rinnalle? Logiikka ja säännöstö menisi nopeasti melko monimutkaiseksi.
>
> Lopulta päädyttiin siihen, että yksittäisiä kaavamääräyksiä ei voi milloinkaan kumota, vaan aina kumotaan kokonaisia kaavamääräysryhmiä kaikkine määräyksineen. Tarvittaessa tehtäisiin tilalle uusi kaavamääräysryhmä, joka sisältäisi sekä ennallaan pysyvät että muuttuvat määräykset. Havaittiin,että tämä saattaisi helposti johtaa kaavamuutoksiin, joissa tulisi kumottavaksi ja uudelleen annettavaksi tarpeettoman paljon todellisuudessa ennallaan pysyviä kaavamääräyksiä. Jotta kaavoittajat eivät tahattomasti ajautuisi tähän "lukittujen" kaavamääräysten ansaan, asetettiin niin sanottuja suureellisten, eli esimerkiksi numeerisia arvoja, tunnuksia ja nimistöä koskevien kaavamääräysten ryhmittelylle rajoitus: tällaisten kaavamääräysten tulee esiintyä kaavassa aina yksin omassa kaavamääräysryhmässään, jotta ne voidaan yksitellen kumota. Pakollinen yksittäisten kaavamääräysten kaavamääräysryhmä tuntuu jo selvästi tietomallinnuksen ongelmalta, ja muutenkin hölmöltä. Ongelma tulisi ratkaista paremmalla mallinnuksella.

Kaavamääräys-luokka kuvaa yksittäisen kaavamääräyksen: sen lajin, mahdollisen arvon ja mahdollisen lisätiedon. Kaavamääräyksen lisätiedolla on edelleen laji-luokittelu ja mahdollinen arvo. Sekä kaavamääräyksen että sen lisätiedon arvot on kuvattu abstraktin OminaisuudenArvo-luokan avulla, jolla on kuusi konkreettista aliluokkaa erityyppisten arvojen kuvaamiseen. 

```data-model-snippet
    title: Ominaisuuden arvo ja sen aliluokat
    modelId: rytj-kaava-1.0.5
    classes:
        - "https://iri.suomi.fi/model/rytj-kaava/OminaisuudenArvo"
        - "https://iri.suomi.fi/model/rytj-kaava/NumeerinenArvo"
        - "https://iri.suomi.fi/model/rytj-kaava/NumeerinenArvovali"
        - "https://iri.suomi.fi/model/rytj-kaava/Korkeusvali"
        - "https://iri.suomi.fi/model/rytj-kaava/Korkeuspiste"
        - "https://iri.suomi.fi/model/rytj-kaava/Koodiarvo"
        - "https://iri.suomi.fi/model/rytj-kaava/Tekstiarvo"
```

Kaavatietomallin rakenne mahdollistaa minkä tahansa arvotyypin käyttämisen Kaavamääräys- ja Kaavamääräyksen lisätieto -luokkien arvona. Käytännössä mahdolliset arvot on sidottu kaavamääräyksen laji - ja Kaavamääräyksen lisätiedon laji -koodistojen koodeihin. Varsinaisen kaavatietomallin soveltamisprofiili-dokumentin puutteessa mahdollisten arvojen tyypit on kuvattu Yhteentoimivuusalustan Koodistot-palvelussa kunkin koodiarvon kuvaustekstissä. Arvoja voi kullakin määräyksellä tai lisätiedolla olla nolla tai yksi kappaletta.

### Kaavan ja sen osien kumoaminen

```data-model-snippet
    title: Kaavan kumoamistieto ja sen käyttö Kaava- ja Kaava-asian päätös -luokista
    modelId: rytj-kaava-1.0.5
    classes:
        - "https://iri.suomi.fi/model/rytj-kaava/Kaava-asianPaatos"
        - "https://iri.suomi.fi/model/rytj-kaava/Kaava"
        - "https://iri.suomi.fi/model/rytj-kaava/KaavanKumoamistieto"
        - "https://iri.suomi.fi/model/rytj-kaava/KaavakohteenKumoamistieto"
        - "https://iri.suomi.fi/model/rytj-kaava/KumottavanRyhmanKohdistus"
```