---
title: "Tietosuojaseloste - kaavatietomalli.fi"
---

**Päivitetty:** 13.11.2026

Tässä tietosuojaselosteessa kerrotaan, miten henkilötietoja käsitellään **kaavatietomalli.fi**-verkkopalvelussa (jäljempänä ”Palvelu”) EU:n yleisen tietosuoja-asetuksen (GDPR) mukaisesti.

## Rekisterinpitäjä ja yhteystiedot

* **Rekisterinpitäjä:** Spatineo Oy
* **Y-tunnus:** 2387758-5
* **Osoite:** Malminkatu 30, 00100 Helsinki
* **Sähköposti:** info@spatineo.com

## Henkilötietojen käsittelyn tarkoitus ja oikeusperuste

Palvelu on avoin tietosivusto, jonka sisällön selaaminen ei edellytä rekisteröitymistä eikä henkilötietojen antamista. Palvelussa ei ole lomakkeita tai muita toimintoja, joilla kerättäisiin käyttäjien yhteystietoja suoraan rekisterinpitäjän omaan tietokantaan.

Henkilötietoja käsitellään Palvelussa vain seuraaviin tarkoituksiin:

1. **Sivuston tekninen toimivuus ja tietoturva**
* **Tarkoitus:** Verkkopalvelun tekninen toimittaminen käyttäjän selaimeen, palvelinlokien ylläpito sekä tietoturvapoikkeamien ja väärinkäytösten estäminen.
* **Oikeusperuste:** Rekisterinpitäjän oikeutettu etu (GDPR 6 artiklan 1 kohdan f alakohta) tai lakisääteisen velvoitteen noudattaminen julkishallinnon tietoturvan varmistamiseksi (6 artiklan 1 kohdan c alakohta).


2. **Kommentointitoiminnallisuus (Giscus ja GitHub)**
* **Tarkoitus:** Mahdollistaa sisällön kommentointi ja keskustelu Palvelun sivuilla.
* **Oikeusperuste:** Rekisteröidyn suostumus (GDPR 6 artiklan 1 kohdan a alakohta), jonka käyttäjä antaa kirjautumalla vapaaehtoisesti sisään GitHub-tilillään ja julkaisemalla kommentin.


3. **Kävijäseuranta ja analytiikka (Google Analytics)**
* **Tarkoitus:** Sivuston käytön tilastointi ja kehittäminen (esim. suosituimpien sivujen ja kävijämäärien seuranta).
* **Oikeusperuste:** Rekisteröidyn nimenomainen suostumus (GDPR 6 artiklan 1 kohdan a alakohta), joka pyydetään evästebannerin kautta ennen analytiikkaevästeiden asettamista.

## Käsiteltävät tietoryhmät ja tietolähteet

* **Palvelun tekniset lokitiedot:** IP-osoite, aikaleima, pyydetty sivu, selaintyyppi ja käyttöjärjestelmä. Tiedot saadaan suoraan käyttäjän päätelaitteelta sivustoa ladattaessa.
* **Kommentointitiedot:** Palvelun kommentointiosio on toteutettu avoimen lähdekoodin **Giscus**-komponentilla, joka hyödyntää taustalla GitHub Discussions -keskustelualuetta. Kun käyttäjä tunnistautuu GitHub-tunnuksillaan ja lähettää kommentin, kommentti sekä käyttäjän julkisen GitHub-profiilin tiedot (käyttäjänimi, profiilikuva, linkki profiiliin ja kommentin aikaleima) tallentuvat julkiseen GitHub-repositorioon ([github.com/spatineo/kaavatietomalli.fi](https://github.com/spatineo/kaavatietomalli.fi/discussions)) ja näytetään Palvelussa. Rekisterinpitäjä ei tallenna näitä tietoja erilliseen omaan rekisteriinsä.
* **Analytiikkatiedot (vain suostumuksella):** Mikäli käyttäjä hyväksyy analytiikkaevästeet, Google Analytics kerää evästeiden avulla tietoja sivuston käytöstä (kuten sivulataukset, istunnon kesto, likimääräinen maantieteellinen sijainti, laite- ja selaintiedot sekä anonymisoitu/käsitelty IP-osoite).

## Tietojen luovutukset, siirrot ja kolmannet osapuolet

Palvelun toteutuksessa käytetään seuraavia ulkopuolisia palveluntarjoajia:

* **Palvelininfrastruktuuri ja hosting:** Amazon Web Services EMEA SARL (Luxemburg). Palvelun tiedot ja palvelimet sijaitsevat EU/ETA-alueella AWS:n Tukholman datakeskusalueella (eu-north-1).
* **GitHub Inc. (Giscus-kommentointi):** Kommentointiominaisuutta käyttävän henkilön tiedot siirtyvät ja tallentuvat suoraan GitHubin palveluun. GitHub toimii omalta osaltaan itsenäisenä rekisterinpitäjänä käyttäjän GitHub-tilin tietojen osalta. Lisätietoja: [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
* **Google Ireland Limited (Google Analytics):** Jos käyttäjä antaa suostumuksensa analytiikkaevästeille, käyttötilastotietoja käsitellään Google Analytics -palvelussa.

**Tietojen siirto EU/ETA-alueen ulkopuolelle:**
GitHubin ja Googlen palveluiden käytön yhteydessä henkilötietoja (kuten IP-osoitteita tai GitHub-profiilitietoja) voidaan siirtää Yhdysvaltoihin. Siirrot toteutetaan EU:n komission hyväksymien suojatoimien mukaisesti, ensisijaisesti **EU–USA Data Privacy Framework (DPF)** -tietosuojakehyksen nojalla (sekä GitHub Inc. että Google LLC ovat sertifioituja DPF-järjestelmään) tai komission vakiosopimuslausekkeita (SCC) hyödyntäen.

## Evästeet ja paikallinen tallennustila

Palvelu käyttää evästeitä ja selaimen paikallista tallennustilaa (Local Storage) seuraavasti:

1. **Välttämättömät tallenteet:**
* Evästevalintojen tallentaminen (tieto siitä, onko käyttäjä hyväksynyt vai hylännyt analytiikkaevästeet).
* Giscus-kommentointikomponentin istuntotunniste (tallennetaan selaimen Local Storageen vain, jos käyttäjä kirjautuu sisään GitHub-tunnuksillaan kommentoidakseen).


2. **Analytiikkaevästeet (valinnaiset):**
* Google Analyticsin asettamat evästeet (`_ga`, `_ga_*`), joiden avulla erotetaan yksittäiset kävijät ja seurataan sivuston käyttöä. Nämä evästeet asetetaan **vain, jos käyttäjä on antanut niille nimenomaisen suostumuksensa**.

Käyttäjä voi milloin tahansa muuttaa evästeasetuksiaan tai peruuttaa antamansa suostumuksen sivuston sivujen alalaidassa olevasta evästeasetukset-painikkeesta sekä tyhjentää evästeet selaimensa asetuksista.

## Henkilötietojen säilytysaika

* **Tekniset palvelinlokit:** Säilytetään tietoturvan varmistamiseksi 12kk, minkä jälkeen ne poistetaan automaattisesti.
* **Kommentit (GitHub):** Julkaistut kommentit ja niihin liittyvät julkiset GitHub-käyttäjätiedot säilyvät GitHub-keskustelualueella ja Palvelussa toistaiseksi, kunnes käyttäjä itse poistaa kommenttinsa GitHubissa tai keskustelualue suljetaan.
* **Google Analytics -tiedot:** Evästeisiin perustuvat käyttäjä- ja tapahtumatason tiedot säilytetään Google Analyticsissa 14 kuukautta viimeisestä käyttäjän aktiviteetista.

## Rekisteröidyn oikeudet

EU:n yleisen tietosuoja-asetuksen mukaisesti sinulla on oikeus:

* **Saada pääsy tietoihin (15 art.):** Oikeus tarkastaa, mitä tietoja sinusta on tallennettu.
* **Oikaista tietoja (16 art.):** Oikeus vaatia epätarkkojen tai virheellisten tietojen korjaamista.
* **Poistaa tiedot (17 art.):** Oikeus pyytää tietojesi poistamista ("oikeus tulla unohdetuksi"). *Huomioi, että voit itse muokata ja poistaa julkaisemasi kommentit suoraan oman GitHub-tilisi kautta kyseisessä GitHub-repositoriossa.*
* **Rajoittaa käsittelyä (18 art.) ja vastustaa käsittelyä (21 art.):** Oikeus rajoittaa tietojen käsittelyä tietyissä tilanteissa tai vastustaa oikeutettuun etuun perustuvaa käsittelyä.
* **Peruuttaa suostumus (7 art.):** Siltä osin kuin käsittely perustuu suostumukseen (analytiikkaevästeet), voit peruuttaa suostumuksesi milloin tahansa ilman, että se vaikuttaa ennen peruuttamista suoritetun käsittelyn lainmukaisuuteen.

Voit käyttää oikeuksiasi ottamalla yhteyttä kohdassa 1 mainittuun rekisterinpitäjään.

Jos katsot, että henkilötietojesi käsittelyssä rikotaan tietosuojalainsäädäntöä, sinulla on oikeus tehdä valitus valvontaviranomaiselle. Suomessa valvontaviranomaisena toimii **Tietosuojavaltuutetun toimisto** ([www.tietosuoja.fi](https://tietosuoja.fi)).

## Tietosuojaselosteen muutokset

Rekisterinpitäjä voi päivittää tätä tietosuojaselostetta, mikäli Palvelun toiminnallisuudet tai tietosuojalainsäädäntö muuttuvat. Ajantasainen versio on aina nähtävillä osoitteessa [kaavatietomalli.fi/tietosuoja](https://kaavatietomalli.fi/tietosuoja).
