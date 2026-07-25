---
title: "Mermaid-kaavioiden testitapaukset"
date: "2024-05-15"
author: "Ilkka Rinne"
authorSlug: "ilkka-rinne"
excerpt: "Testaamme eri Mermaid-kaaviotyyppejä varmistaaksemme, että tekstien piirtyminen ja skaalautuminen toimii oikein kaikissa tilanteissa."
tags: ["mermaid", "testaus", "kaaviot", "dokumentaatio"]
category: "journal"
---

Tämä sivu sisältää useita eri tyyppisiä Mermaid-kaavioita. Käytämme näitä varmistaaksemme, että fonttien renderöinti ja tekstien näkyminen on oikeellista eri diagrammityypeillä. Erityistä huomiota kiinnitetään tekstien katkeamiseen (truncation) laatikoiden reunoilla.

## 1. Flowchart (Vuokaavio)

Testataan pitkiä tekstejä ja erikokoisia solmuja.

```mermaid
graph TD
    Start[Aloituspiste pitkällä kuvauksella] --> Process1[Tämä on vaihe 1, jossa on erittäin pitkä teksti joka saattaa katketa]
    Process1 --> Condition{Onko tila valmis?}
    Condition -- Kyllä --> Success[Onnistuminen ja lopputulos]
    Condition -- Ei --> Error[Virhetilanne: Jotain meni pieleen ja teksti on pitkä]
    Error --> Process1
```

## 2. Sequence Diagram (Sekvenssikaavio)

Sekvenssikaavioissa on usein paljon tekstiä nuolten päällä.

```mermaid
sequenceDiagram
    participant Käyttäjä as User (Käyttäjä)
    participant Järjestelmä as System (Järjestelmä)
    participant Tietokanta as DB (Tietokanta)

    Käyttäjä->>Järjestelmä: Kirjaudu sisään erittäin pitkällä salasanalla
    Järjestelmä->>Tietokanta: Etsi käyttäjä-tietue täydellä nimellä
    Tietokanta-->>Järjestelmä: Palauta käyttäjän tiedot ja käyttöoikeudet
    Järjestelmä-->>Käyttäjä: Tervetuloa takaisin, tässä on työpöytäsi!
```

## 3. State Diagram (Tilakaavio)

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: Käynnistä käsittelyprosessi
    Processing --> Completed: Käsittely valmis onnistuneesti
    Processing --> Failed: Virhe havaittu prosessoinnissa
    Failed --> Idle: Nollaa ja yritä uudelleen
    Completed --> [*]
```

## 4. Entity Relationship Diagram (ER-kaavio)

ER-kaaviot ovat usein monimutkaisia ja niissä on paljon attribuutteja.

```mermaid
erDiagram
    KÄYTTÄJÄ ||--o{ TILAUS : tekee
    KÄYTTÄJÄ {
        string nimi "Käyttäjän koko nimi"
        string sahkoposti "Käyttäjän sähköpostiosoite"
        string puhelinnumero "Kansainvälinen puhelinnumero"
    }
    TILAUS ||--|{ TILAUSRIVI : sisältää
    TILAUS {
        int tilausnumero
        date pvm
        string toimitusosoite "Pitkä toimitusosoite kenttä"
    }
```

## 5. Gantt Chart (Gantt-kaavio)

```mermaid
gantt
    title Projektin aikataulu 2024
    dateFormat  YYYY-MM-DD
    section Suunnitteluvaihe
    Määrittely           :a1, 2024-01-01, 30d
    Tietomallinnus       :after a1, 20d
    section Toteutus
    Backend kehitys      :2024-02-15, 45d
    Frontend kehitys     :2024-03-01, 30d
```

## 6. Pie Chart (Piirakkakaavio)

```mermaid
pie title Tiedostomuotojen käyttö
    "GML/GeoJSON" : 45
    "Shapefile" : 25
    "DWG/DXF" : 20
    "Muut" : 10
```

## 7. Mindbox / Mindmap

```mermaid
mindmap
  root((Tietomalli))
    Suunnittelu
      Kaavataso
      Määräykset
    Toteutus
      SQL
      JSON
    Säädökset
      MRL
      Maankäyttö
```

## 8. Class Diagram (Luokkakaavio)

Luokkakaaviot ovat olleet ongelmallisia. Tässä testataan niitä uudelleen.

```mermaid
classDiagram
    class KaavaObjekti {
        +String nimi
        +Date luotuPvm
        +tallenna(String kayttaja)
        +validoi() Boolean
    }
    class Asemakaava {
        +String alueenNimi
        +Integer pintaAla
        +laskeRakennusoikeus() Float
    }
    KaavaObjekti <|-- Asemakaava
```

## 9. Instanssikaavio

Instanssikaavio on toteutettu muuntamalla koodi flowchart LR kaaviotyypin ymmärtämään muotoon ja hyödyntämällä sen kustomoitavaa HTML-sisältöä:

```instance

  instance alice : User {
    id = 101
    role = "ADMIN"
  }

  instance acc99 : Account {
    balance = 5000.00
    status = "ACTIVE"
  }

  instance ord1 : Order {
    total = $149.99
  }

  alice <-> acc99 : owner | account
  alice -> ord1 : places
```