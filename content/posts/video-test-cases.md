---
title: "Video-upotusten testitapaukset (YouTube & Vimeo)"
date: "2026-05-24"
author: "Ilkka Rinne"
authorSlug: "ilkka-rinne"
excerpt: "Tämä artikkeli esittelee uudet interaktiiviset YouTube- ja Vimeo-videokoodilohat ja niiden kattavat ominaisuudet."
tags: ["video", "youtube", "vimeo", "testaus", "kaaviot"]
category: "journal"
---

Tämä sivu sisältää useita eri tyyppisiä videoupotuksia ja niiden konfiguraatio-esimerkkejä. Käytämme näitä varmistaaksemme, että automaattinen upotus, kuvasuhteet (aspectRatio), ja soittimen lisäasetukset toimivat oikeellisesti.

## 1. Vakio YouTube-upotus (16:9)

Yksinkertaisin konfiguraatio vaatii vain videon yksilöllisen tunnisteen (`id`).

```youtube
id: dQw4w9WgXcQ
title: Rick Astley - Never Gonna Give You Up
```

---

## 2. YouTube-upotus lisäasetuksilla (Kuvasuhde 2.39:1 / 4:3 matalampi kuvasuhde ja aloituskohta)

Tässä testataan aloituskohtaa sekunteina (`start`), mykistystä (`mute`) ja ohjaimien piilottamista (`controls`).

```youtube
id: dQw4w9WgXcQ
title: Rick Astley - Aloitus 30s kohdalta ilman ohjaimia
start: 30
controls: false
mute: true
aspectRatio: 4:3
```

---

## 3. Vakio Vimeo-upotus (16:9)

Vimeo-upotukseen tarvitaan numeerinen tunniste.

```vimeo
id: 76979871
title: Vimeo Testivideo
```

---

## 4. Vimeo-upotus mukautetulla värillä ja toistolla

Tässä testataan soittimen ohjaimien päävärin muuttamista (`color`), toiston looppaamista (`loop`) ja käyttäjän portretin piilottamista (`portrait`).

```vimeo
id: 76979871
color: ff0055
loop: true
portrait: false
```

---

## Sääntökirja & Tuetut Asetukset

Kaikki valinnat validoidaan automaattisesti käännösvaiheessa (build time). Mikäli jokin parametri on väärän tyyppinen tai tuntematon, build-prosessi antaa selkeän virheilmoituksen.

### YouTube-parametrit:
- `id` (pakollinen): 11-merkkinen merkkijono
- `autoplay`: toista heti (`true` tai `false`)
- `mute`: vaimenna äänet (`true` tai `false`)
- `controls`: näytä soittimen ohjaimet (`true` tai `false`)
- `start`: toiston aloitusaika sekunneissa (numero)
- `end`: toiston lopetusaika sekunneissa (numero)
- `loop`: toista jatkuvasti (`true` tai `false`)
- `aspectRatio`: kuvasuhde, esim. `16:9`, `4:3`, `1:1`, `9:16`

### Vimeo-parametrit:
- `id` (pakollinen): numeerinen tunniste (esim. `76979871`), voi sisältää myös suojatun hash-osan muodossa `TUNNISTE/HASH`.
- `color`: ohjainten värikoodi hex-muodossa ilman ristikkoa (esim. `00adef`).
- `loop`: toista jatkuvasti (`true` tai `false`).
- `portrait`: näytä/piilota lataajan kuva (`true` tai `false`).
- `byline`: näytä/piilota lataajan nimi (`true` tai `false`).
- `quality`: videon laatu (`auto`, `1080p`, `720p` jne.)
- `aspectRatio`: kuvasuhde, esim. `16:9`, `4:3`, `1:1`, `9:16`
