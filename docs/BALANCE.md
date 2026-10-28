# Balans — wartości z kodu

> Plik **generowany** przez `npm run balance-doc` (skrypt `scripts/balance-doc.ts`) z `src/data/*` i reguł `src/core/*`.
> Nie edytuj ręcznie — zmień dane i uruchom skrypt. **Wszystkie liczby są robocze** (decyzja właściciela: strojenie na końcu, przed MVP).

## Parametry ogólne (`src/data/balance.ts`)

| Parametr | Wartość |
|---|---|
| Przyrost podstawowy (bez kopalń) | 6 metalu/min, 3 kryształów/min |
| Zapas startowy | 250 metalu, 120 kryształów, 5 antymaterii |
| Wzrost wydobycia z poziomem (`levelGrowth`) | wydobycie = baza × poziom × 1.1^poziom |
| Maksymalny poziom budynku | 40 |
| Limit naliczania nieobecności | 8 h (badania mogą wydłużyć) |
| Czas budowy | 30 s × docelowy poziom |
| „Ukończ teraz” za darmo do poziomu | 5 |
| „Ukończ teraz” powyżej | 1 antymateria za każde rozpoczęte 15 min |
| Antymateria pasywnie | 1/h |
| Magazyn | 1000 × 1.6^(poz − 1) (metal i kryształy osobno) |
| Miejsca na planety | 5 na start, maks. 10 |
| Kolejka budowy | 1 miejsce na start (więcej z badań SI) |
| Złoża na 100 pól (× bogactwo planety) | 2 000 000 metalu, 1 200 000 kryształów |
| Teren poza dedykowanym | 75% wydajności (`OFF_SITE_FACTOR`) |

## Budynki — koszt, czas, wydobycie, pola

Wydobycie przy bogactwie 100% i bez kar środowiska. Pola — obszar budynku (`fieldsFor`), etap — `src/data/footprint.ts`.

### Kopalnia metalu (`metalMine`)

Koszt poz. 1: 60 metalu, 15 kryształów; wzrost kosztu ×1.5 na poziom.

| Poziom | Koszt metalu | Koszt kryształów | Czas budowy | Wydobycie (metal/min) | Zużycie energii | Pola | Etap |
|---|---|---|---|---|---|---|---|
| 1 | 60 | 15 | 30 s | 19,8 | 11 | 1 | Kopalnia |
| 2 | 90 | 22 | 1 min | 43,6 | 24,2 | 2 | Kopalnia |
| 3 | 135 | 33 | 1 min 30 s | 71,9 | 39,9 | 2 | Kopalnia |
| 5 | 303 | 75 | 2 min 30 s | 144,9 | 80,5 | 3 | Kopalnia |
| 6 | 455 | 113 | 3 min | 191,3 | 106,3 | 6 | Zakład przetwórczy |
| 8 | 1025 | 256 | 4 min | 308,7 | 171,5 | 8 | Zakład przetwórczy |
| 10 | 2306 | 576 | 5 min | 466,9 | 259,4 | 10 | Zakład przetwórczy |
| 12 | 5189 | 1297 | 6 min | 677,9 | 376,6 | 16 | Huta |
| 15 | 17 515 | 4378 | 7 min 30 s | 1127,9 | 626,6 | 19 | Huta |
| 19 | 88 673 | 22 168 | 9 min 30 s | 2091,6 | 1162,0 | 22 | Huta |
| 20 | 133 010 | 33 252 | 10 min | 2421,9 | 1345,5 | 40 | Megakompleks metalowy |
| 25 | 1 010 046 | 252 511 | 12 min 30 s | 4875,6 | 2708,7 | 50 | Megakompleks metalowy |
| 30 | 7 670 042 | 1 917 510 | 15 min | 9422,7 | 5234,8 | 50 | Megakompleks metalowy |
| 40 | 442 293 292 | 110 573 323 | 20 min | 32 587 | 18 104 | 50 | Megakompleks metalowy |

### Ekstraktor kryształów (`crystalMine`)

Koszt poz. 1: 48 metalu, 24 kryształów; wzrost kosztu ×1.6 na poziom.

| Poziom | Koszt metalu | Koszt kryształów | Czas budowy | Wydobycie (kryształy/min) | Zużycie energii | Pola | Etap |
|---|---|---|---|---|---|---|---|
| 1 | 48 | 24 | 30 s | 11 | 11 | 1 | Wiertło |
| 2 | 76 | 38 | 1 min | 24,2 | 24,2 | 2 | Wiertło |
| 3 | 122 | 61 | 1 min 30 s | 39,9 | 39,9 | 2 | Wiertło |
| 5 | 314 | 157 | 2 min 30 s | 80,5 | 80,5 | 3 | Wiertło |
| 6 | 503 | 251 | 3 min | 106,3 | 106,3 | 6 | Szyb wiertniczy |
| 8 | 1288 | 644 | 4 min | 171,5 | 171,5 | 8 | Szyb wiertniczy |
| 10 | 3298 | 1649 | 5 min | 259,4 | 259,4 | 10 | Szyb wiertniczy |
| 12 | 8444 | 4222 | 6 min | 376,6 | 376,6 | 16 | Odkrywka |
| 15 | 34 587 | 17 293 | 7 min 30 s | 626,6 | 626,6 | 19 | Odkrywka |
| 19 | 226 673 | 113 336 | 9 min 30 s | 1162,0 | 1162,0 | 22 | Odkrywka |
| 20 | 362 677 | 181 338 | 10 min | 1345,5 | 1345,5 | 40 | Megaodkrywka |
| 25 | 3 802 951 | 1 901 475 | 12 min 30 s | 2708,7 | 2708,7 | 50 | Megaodkrywka |
| 30 | 39 876 839 | 19 938 419 | 15 min | 5234,8 | 5234,8 | 50 | Megaodkrywka |
| 40 | 4 384 504 911 | 2 192 252 455 | 20 min | 18 104 | 18 104 | 50 | Megaodkrywka |

### Elektrownia (`powerPlant`)

Koszt poz. 1: 75 metalu, 30 kryształów; wzrost kosztu ×1.5 na poziom.

| Poziom | Koszt metalu | Koszt kryształów | Czas budowy | Wydobycie (energia) | Zużycie energii | Pola | Etap |
|---|---|---|---|---|---|---|---|
| 1 | 75 | 30 | 30 s | 24,2 | 0 | 1 | Farma wiatrowa |
| 2 | 112 | 45 | 1 min | 53,2 | 0 | 2 | Farma wiatrowa |
| 3 | 168 | 67 | 1 min 30 s | 87,8 | 0 | 2 | Farma wiatrowa |
| 5 | 379 | 151 | 2 min 30 s | 177,2 | 0 | 3 | Farma wiatrowa |
| 6 | 569 | 227 | 3 min | 233,8 | 0 | 6 | Generator fuzyjny |
| 8 | 1281 | 512 | 4 min | 377,3 | 0 | 8 | Generator fuzyjny |
| 10 | 2883 | 1153 | 5 min | 570,6 | 0 | 10 | Generator fuzyjny |
| 12 | 6487 | 2594 | 6 min | 828,5 | 0 | 16 | Elektrownia jądrowa |
| 15 | 21 894 | 8757 | 7 min 30 s | 1378,5 | 0 | 19 | Elektrownia jądrowa |
| 19 | 110 841 | 44 336 | 9 min 30 s | 2556,4 | 0 | 22 | Elektrownia jądrowa |
| 20 | 166 262 | 66 505 | 10 min | 2960,1 | 0 | 40 | Reaktor antymaterii |
| 25 | 1 262 558 | 505 023 | 12 min 30 s | 5959,1 | 0 | 50 | Reaktor antymaterii |
| 30 | 9 587 552 | 3 835 021 | 15 min | 11 517 | 0 | 50 | Reaktor antymaterii |
| 40 | 552 866 616 | 221 146 646 | 20 min | 39 828 | 0 | 50 | Reaktor antymaterii |

### Magazyn (`storage`)

Koszt poz. 1: 70 metalu, 35 kryształów; wzrost kosztu ×1.55 na poziom.

| Poziom | Koszt metalu | Koszt kryształów | Czas budowy | Wydobycie (pojemność) | Zużycie energii | Pola | Etap |
|---|---|---|---|---|---|---|---|
| 1 | 70 | 35 | 30 s | 1000 | 0 | 1 | Skład |
| 2 | 108 | 54 | 1 min | 1600 | 0 | 2 | Skład |
| 3 | 168 | 84 | 1 min 30 s | 2560 | 0 | 2 | Skład |
| 5 | 404 | 202 | 2 min 30 s | 6553 | 0 | 2 | Skład |
| 6 | 626 | 313 | 3 min | 10 485 | 0 | 3 | Magazyn |
| 8 | 1504 | 752 | 4 min | 26 843 | 0 | 4 | Magazyn |
| 10 | 3614 | 1807 | 5 min | 68 719 | 0 | 5 | Magazyn |
| 12 | 8684 | 4342 | 6 min | 175 921 | 0 | 6 | Terminal magazynowy |
| 15 | 32 340 | 16 170 | 7 min 30 s | 720 575 | 0 | 8 | Terminal magazynowy |
| 19 | 186 667 | 93 333 | 9 min 30 s | 4 722 366 | 0 | 9 | Terminal magazynowy |
| 20 | 289 334 | 144 667 | 10 min | 7 555 786 | 0 | 10 | Megaskład |
| 25 | 2 588 563 | 1 294 281 | 12 min 30 s | 79 228 162 | 0 | 14 | Megaskład |
| 30 | 23 158 865 | 11 579 432 | 15 min | 830 767 497 | 0 | 14 | Megaskład |
| 40 | 1 853 677 884 | 926 838 942 | 20 min | 91 343 852 333 | 0 | 14 | Megaskład |

### Kolektor antymaterii (`antimatterCollector`)

Koszt poz. 1: 400 metalu, 260 kryształów; wzrost kosztu ×1.7 na poziom.

| Poziom | Koszt metalu | Koszt kryształów | Czas budowy | Wydobycie (antymateria/h) | Zużycie energii | Pola | Etap |
|---|---|---|---|---|---|---|---|
| 1 | 400 | 260 | 30 s | 0,7 | 19,8 | 1 | Pułapka |
| 2 | 680 | 442 | 1 min | 1,5 | 43,6 | 2 | Pułapka |
| 3 | 1155 | 751 | 1 min 30 s | 2,4 | 71,9 | 2 | Pułapka |
| 5 | 3340 | 2171 | 2 min 30 s | 4,8 | 144,9 | 2 | Pułapka |
| 6 | 5679 | 3691 | 3 min | 6,4 | 191,3 | 3 | Kolektor |
| 8 | 16 413 | 10 668 | 4 min | 10,3 | 308,7 | 4 | Kolektor |
| 10 | 47 435 | 30 832 | 5 min | 15,6 | 466,9 | 5 | Kolektor |
| 12 | 137 087 | 89 106 | 6 min | 22,6 | 677,9 | 6 | Pole pułapek |
| 15 | 673 511 | 437 782 | 7 min 30 s | 37,6 | 1127,9 | 8 | Pole pułapek |
| 19 | 5 625 233 | 3 656 401 | 9 min 30 s | 69,7 | 2091,6 | 9 | Pole pułapek |
| 20 | 9 562 897 | 6 215 883 | 10 min | 80,7 | 2421,9 | 10 | Megakolektor |
| 25 | 135 779 468 | 88 256 654 | 12 min 30 s | 162,5 | 4875,6 | 14 | Megakolektor |
| 30 | 1 927 874 288 | 1 253 118 287 | 15 min | 314,1 | 9422,7 | 14 | Megakolektor |
| 40 | 388 658 280 630 | 252 627 882 409 | 20 min | 1086,2 | 32 587 | 14 | Megakolektor |

### Laboratorium (`laboratory`)

Koszt poz. 1: 200 metalu, 400 kryształów; wzrost kosztu ×1.6 na poziom.

| Poziom | Koszt metalu | Koszt kryształów | Czas budowy | Wydobycie (—) | Zużycie energii | Pola | Etap |
|---|---|---|---|---|---|---|---|
| 1 | 200 | 400 | 30 s | — | 6,6 | 1 | Pracownia |
| 2 | 320 | 640 | 1 min | — | 14,5 | 2 | Pracownia |
| 3 | 512 | 1024 | 1 min 30 s | — | 24,0 | 2 | Pracownia |
| 5 | 1310 | 2621 | 2 min 30 s | — | 48,3 | 2 | Pracownia |
| 6 | 2097 | 4194 | 3 min | — | 63,8 | 3 | Laboratorium |
| 8 | 5368 | 10 737 | 4 min | — | 102,9 | 4 | Laboratorium |
| 10 | 13 743 | 27 487 | 5 min | — | 155,6 | 5 | Laboratorium |
| 12 | 35 184 | 70 368 | 6 min | — | 226,0 | 6 | Instytut |
| 15 | 144 115 | 288 230 | 7 min 30 s | — | 376,0 | 8 | Instytut |
| 19 | 944 473 | 1 888 946 | 9 min 30 s | — | 697,2 | 9 | Instytut |
| 20 | 1 511 157 | 3 022 314 | 10 min | — | 807,3 | 10 | Kampus badawczy |
| 25 | 15 845 632 | 31 691 265 | 12 min 30 s | — | 1625,2 | 14 | Kampus badawczy |
| 30 | 166 153 499 | 332 306 998 | 15 min | — | 3140,9 | 14 | Kampus badawczy |
| 40 | 18 268 770 466 | 36 537 540 933 | 20 min | — | 10 862 | 14 | Kampus badawczy |

## Etapy obszaru budynku (`src/data/footprint.ts`)

- **Kopalnia metalu:** Kopalnia od poz. 1 — 1–3 pól; Zakład przetwórczy od poz. 6 — 6–10 pól; Huta od poz. 12 — 16–22 pól; Megakompleks metalowy od poz. 20 — 40–50 pól.
- **Ekstraktor kryształów:** Wiertło od poz. 1 — 1–3 pól; Szyb wiertniczy od poz. 6 — 6–10 pól; Odkrywka od poz. 12 — 16–22 pól; Megaodkrywka od poz. 20 — 40–50 pól.
- **Elektrownia:** Farma wiatrowa od poz. 1 — 1–3 pól; Generator fuzyjny od poz. 6 — 6–10 pól; Elektrownia jądrowa od poz. 12 — 16–22 pól; Reaktor antymaterii od poz. 20 — 40–50 pól.
- **Magazyn:** Skład od poz. 1 — 1–2 pól; Magazyn od poz. 6 — 3–5 pól; Terminal magazynowy od poz. 12 — 6–9 pól; Megaskład od poz. 20 — 10–14 pól.
- **Kolektor antymaterii:** Pułapka od poz. 1 — 1–2 pól; Kolektor od poz. 6 — 3–5 pól; Pole pułapek od poz. 12 — 6–9 pól; Megakolektor od poz. 20 — 10–14 pól.
- **Laboratorium:** Pracownia od poz. 1 — 1–2 pól; Laboratorium od poz. 6 — 3–5 pól; Instytut od poz. 12 — 6–9 pól; Kampus badawczy od poz. 20 — 10–14 pól.

## Kompleksy i megakompleksy (`src/data/complexes.ts`)

| Rodzina | Budynek | Premia | Koszt | Badanie | Tryby |
|---|---|---|---|---|---|
| Kompleks wiertniczy | Ekstraktor kryształów | +30% | 1500 / 2500 | „Wspólne szyby” (Badania → Produktywność) | — |
| Wielka fabryka | Kopalnia metalu | +30% | 3000 / 1500 | „Metalurgia przemysłowa” (Badania → Produktywność) | Zrównoważony (×1 wydobycia, ×1 energii); Maksymalna produkcja (×1.25 wydobycia, ×1.6 energii); Oszczędzanie energii (×0.8 wydobycia, ×0.5 energii) |
| Sieć Tesli | Elektrownia | +30% | 2000 / 2000 | „Przesył bezprzewodowy” (Badania → Produktywność) | — |

Megakompleks: premia +60%, koszt 6000 metalu / 6000 kryształów, badanie „Megastruktury” (Badania → Produktywność).

Znaleziska megakompleksów: co 4–8 h; wagi rzadkości pospolite 70, rzadkie 25, bardzo rzadkie 5.

| Znalezisko | Rzadkość | Premia za sztukę | Maks. sztuk |
|---|---|---|---|
| Kryształ rdzeniowy | pospolite | +2% kryształów | 5 |
| Odłamek rezonansowy | rzadkie | −3% czasu badań | 3 |
| Stop o nieznanym składzie | pospolite | +2% metalu | 5 |
| Obrobiona płyta | rzadkie | −3% kosztu budynków | 3 |
| Ogniwo spoczynkowe | pospolite | +3% energii | 5 |
| Naładowana siatka | rzadkie | −4% zużycia energii | 3 |
| Zapis z głębi | bardzo rzadkie | +0,25 antymaterii/h | 2 |

## Budowle w kosmosie

| Obiekt | Wydobycie poz. 1 | Wzrost | Koszt poz. 1 | Wzrost kosztu | Czas | Maks. |
|---|---|---|---|---|---|---|
| Stacja na pasie asteroid | 20 metalu + 10 kryształów/min | ×1.1 | 800 / 500 | ×1.6 | 120 s × poz. | 10 |
| Kolektor energii gwiazdy | 30 energii × (0,5 + 0,5 × jasność gwiazdy) | ×1.1 | 1200 / 800 | ×1.6 | 150 s × poz. | 10 |

Kometa: koszt 200/100, lot 1 h 0 min, ładunek 400–900 metalu i 600–1500 kryształów.

Transportowiec: ładowność 5000, lot 60 s + 5 s/jedn., maks. 3 naraz. Statek kolonizacyjny: 2500 / 1800, lot 120 s + 6 s/jedn.

## Badania (`src/data/research.ts`)

Koszt: 240 metalu / 320 kryształów × 2.6^(pierścień − 1) × 1.03^(liczba zbadanych); antymateria od pierścienia 4. Czas: 90 s × 2.2^(pierścień − 1), szybciej o 8% za każdy poziom Laboratorium ponad 1. Pierścień wymaga Laboratorium: 1→poz. 1, 2→poz. 2, 3→poz. 4, 4→poz. 6, 5→poz. 8, 6→poz. 10.

Koszt i czas w tabeli: bez wcześniejszych badań, przy Laboratorium wymaganym dla pierścienia.

### Produktywność

| Badanie | Pierścień | Koszt (metal / kryształy / antymateria) | Czas | Efekt |
|---|---|---|---|---|
| Podstawy przemysłu | 1 | 240 / 320 / 0 | 1 min 30 s | +5% metalu · +5% kryształów |
| Wiertła diamentowe | 2 | 624 / 832 / 0 | 3 min 3 s | +10% metalu |
| Rezonans kryształów | 3 | 1622 / 2163 / 0 | 5 min 51 s | +10% kryształów |
| Głębokie szyby | 4 | 4218 / 5624 / 2 | 11 min 25 s | +15% metalu · +15% kryształów · złoża planety +15% |
| Automatyczne rafinerie | 5 | 10 967 / 14 623 / 4 | 22 min 31 s | +20% metalu · +20% kryształów |
| Wspólne szyby | 4 | 4218 / 5624 / 2 | 11 min 25 s | łączenie trzech sąsiednich pełnych pól wierteł kryształu w kompleks wiertniczy |
| Metalurgia przemysłowa | 3 | 1622 / 2163 / 0 | 5 min 51 s | łączenie trzech sąsiednich zakładów metalu w wielką fabrykę z trybami pracy |
| Energia gwiazdy | 6 | 28 515 / 38 020 / 6 | 44 min 57 s | kolektor energii gwiazdy na orbicie planety |
| Megastruktury | 6 | 28 515 / 38 020 / 6 | 44 min 57 s | łączenie dwóch stykających się kompleksów w megakompleks |
| Przesył bezprzewodowy | 5 | 10 967 / 14 623 / 4 | 22 min 31 s | łączenie trzech sąsiednich węzłów elektrowni w sieć Tesli |
| Sieci nadprzewodzące | 2 | 624 / 832 / 0 | 3 min 3 s | −10% zużycia energii |
| Ogniwa fuzyjne | 3 | 1622 / 2163 / 0 | 5 min 51 s | +15% energii |
| Inteligentna sieć | 4 | 4218 / 5624 / 2 | 11 min 25 s | −15% zużycia energii |
| Reaktor gwiazdowy | 5 | 10 967 / 14 623 / 4 | 22 min 31 s | +25% energii |
| Prefabrykaty | 2 | 624 / 832 / 0 | 3 min 3 s | −10% czasu budowy |
| Lekkie stopy | 3 | 1622 / 2163 / 0 | 5 min 51 s | −8% kosztu budynków |
| Roboty budowlane | 4 | 4218 / 5624 / 2 | 11 min 25 s | −15% czasu budowy |
| Nanomontaż | 5 | 10 967 / 14 623 / 4 | 22 min 31 s | −20% czasu budowy |
| Zagęszczanie ładunków | 2 | 624 / 832 / 0 | 3 min 3 s | +20% pojemności magazynu |
| Autonomiczne kopalnie | 3 | 1622 / 2163 / 0 | 5 min 51 s | +4 h pracy podczas nieobecności |
| Magazyny próżniowe | 4 | 4218 / 5624 / 2 | 11 min 25 s | +30% pojemności magazynu |
| Ciągłość produkcji | 5 | 10 967 / 14 623 / 4 | 22 min 31 s | +4 h pracy podczas nieobecności |
| Pułapki magnetyczne | 2 | 624 / 832 / 0 | 3 min 3 s | +25% antymaterii z Kolektora |
| Kondensacja próżni | 3 | 1622 / 2163 / 0 | 5 min 51 s | +0,5 antymaterii/h |
| Stabilne pola | 4 | 4218 / 5624 / 2 | 11 min 25 s | −25% ceny „Ukończ teraz” |
| Skok czasowy | 5 | 10 967 / 14 623 / 4 | 22 min 31 s | darmowe „Ukończ teraz” o 2 poz. dłużej |
| Przemysłowe imperium | 6 | 28 515 / 38 020 / 6 | 44 min 57 s | — |

### Planetologia

| Badanie | Pierścień | Koszt (metal / kryształy / antymateria) | Czas | Efekt |
|---|---|---|---|---|
| Badania geologiczne | 1 | 240 / 320 / 0 | 1 min 30 s | +5% metalu · +5% kryształów |
| Geologia głębinowa | 3 | 1622 / 2163 / 0 | 5 min 51 s | złoża planety +20% |
| Adaptacja do środowiska | 2 | 624 / 832 / 0 | 3 min 3 s | kary środowiska −50% |
| Terraformacja | 5 | 10 967 / 14 623 / 4 | 22 min 31 s | kary środowiska −50% |
| Budowa na lodzie | 2 | 624 / 832 / 0 | 3 min 3 s | wszystkie budynki także na polach lodu |
| Osadnictwo | 3 | 1622 / 2163 / 0 | 5 min 51 s | +1 miejsce na planetę |
| Platformy przybrzeżne (wkrótce) | 4 | 4218 / 5624 / 2 | 11 min 25 s | pola na płytkiej wodzie przy brzegu |
| Przebudowa kolonii | 3 | 1622 / 2163 / 0 | 5 min 51 s | zmiana specjalizacji kolonii (trwa 1 h) |
| Architekt światów | 6 | 28 515 / 38 020 / 6 | 44 min 57 s | — |

### Eksploracja

| Badanie | Pierścień | Koszt (metal / kryształy / antymateria) | Czas | Efekt |
|---|---|---|---|---|
| Napęd międzygwiezdny | 1 | 240 / 320 / 0 | 1 min 30 s | statek kolonizacyjny — kolonizacja innych układów |
| Księżyce (wkrótce) | 2 | 624 / 832 / 0 | 3 min 3 s | — |
| Sondy zwiadowcze | 2 | 624 / 832 / 0 | 3 min 3 s | ekspedycje — wyprawy do sygnałów i nieznanych układów |
| Sondy dalekiego zasięgu | 3 | 1622 / 2163 / 0 | 5 min 51 s | +20 jedn. zasięgu ekspedycji |
| Napęd jonowy sond | 4 | 4218 / 5624 / 2 | 11 min 25 s | +25 jedn. zasięgu ekspedycji · ekspedycje o 25% szybsze |
| Teleskop orbitalny | 3 | 1622 / 2163 / 0 | 5 min 51 s | dokładniejsze raporty ekspedycji (+1 poziom wiedzy) |
| Spektroskopia gwiazd | 4 | 4218 / 5624 / 2 | 11 min 25 s | +8 pkt proc. szansy powodzenia ekspedycji |
| Analiza sygnałów | 4 | 4218 / 5624 / 2 | 11 min 25 s | +10 jedn. zasięgu wykrywania sygnałów |
| Astrofizyka ekstremalna | 5 | 10 967 / 14 623 / 4 | 22 min 31 s | odczyt pulsarów i czarnych dziur — ich zbadanie daje premie z danych naukowych |
| Pionier | 6 | 28 515 / 38 020 / 6 | 44 min 57 s | — |

### Stacja i handel

| Badanie | Pierścień | Koszt (metal / kryształy / antymateria) | Czas | Efekt |
|---|---|---|---|---|
| Górnictwo asteroid | 1 | 240 / 320 / 0 | 1 min 30 s | stacja wydobywcza na pasie asteroid (w układzie z Twoją planetą) |
| Rafinacja w próżni | 3 | 1622 / 2163 / 0 | 5 min 51 s | wydobycie stacji na pasie asteroid +50% |
| Moduł orbitalny (wkrótce) | 2 | 624 / 832 / 0 | 3 min 3 s | — |
| Przechwyt komet | 2 | 624 / 832 / 0 | 3 min 3 s | holownik po kometę — metal i kryształy w każdym układzie |
| Dok handlowy (wkrótce) | 3 | 1622 / 2163 / 0 | 5 min 51 s | — |
| Rynek galaktyczny (wkrótce) | 4 | 4218 / 5624 / 2 | 11 min 25 s | — |
| Planeta-stacja | 6 | 28 515 / 38 020 / 6 | 44 min 57 s | — |

### SI

| Badanie | Pierścień | Koszt (metal / kryształy / antymateria) | Czas | Efekt |
|---|---|---|---|---|
| SI Matka | 1 | 240 / 320 / 0 | 1 min 30 s | SI Matka — propozycje działań |
| SI wykonawcze | 2 | 624 / 832 / 0 | 3 min 3 s | SI działa sama (poziom „działa samo”) |
| Autonomia | 3 | 1622 / 2163 / 0 | 5 min 51 s | SI buduje przy zamkniętej grze (budowy o 50% dłuższe) |
| Plan budowy | 2 | 624 / 832 / 0 | 3 min 3 s | +1 miejsce w kolejce budowy |
| Harmonogram | 3 | 1622 / 2163 / 0 | 5 min 51 s | +1 miejsce w kolejce budowy |
| Świadoma Matka | 6 | 28 515 / 38 020 / 6 | 44 min 57 s | — |

### Flota

| Badanie | Pierścień | Koszt (metal / kryształy / antymateria) | Czas | Efekt |
|---|---|---|---|---|
| Transportowce | 1 | 240 / 320 / 0 | 1 min 30 s | transportowce — przesyłanie metalu i kryształów między Twoimi planetami |
| Ładownie modułowe | 2 | 624 / 832 / 0 | 3 min 3 s | ładowność transportowca +100% |
| Lżejsze kadłuby | 2 | 624 / 832 / 0 | 3 min 3 s | czas lotu statków −30% |
| Szlaki konwojów (wkrótce) | 3 | 1622 / 2163 / 0 | 5 min 51 s | — |
| Admiralicja | 6 | 28 515 / 38 020 / 6 | 44 min 57 s | — |

## Specjalizacje kolonii (`src/data/specializations.ts`)

Zmiana trwa 1 h 0 min; dopasowanie miejsca 0.5–2 (gwiazda × strefa orbity).

| Specjalizacja | Efekt (przy dopasowaniu 1) |
|---|---|
| Górnicza | +15% metalu · +15% kryształów |
| Energetyczna | +25% energii |
| Naukowa | −20% czasu badań · +20% antymaterii z Kolektora |
| Przemysłowa | −15% czasu budowy · −10% kosztu budynków |

## Galaktyka (`src/data/galaxy.ts`)

| Rodzaj gwiazdy | Opis |
|---|---|
| Czerwony karzeł | Mała, chłodna gwiazda — planety blisko niej bywają umiarkowane, dalej szybko zamarzają. |
| Żółta gwiazda | Spokojna gwiazda jak Słońce — szeroka strefa umiarkowana. |
| Niebieski olbrzym | Ogromna, gorąca gwiazda — bliskie planety to pustynie i wulkany. |
| Gwiazda podwójna | Dwie gwiazdy krążące wokół siebie — cieplej niż przy jednej. |
| Pulsar | Wirująca gwiazda neutronowa — słabe światło, silne promieniowanie. |
| Czarna dziura | Ciemne serce układu z jasnym dyskiem materii — planety są zimne i odległe. |

Obieg planet: 2–25 min. Wiedza na start: 4 najbliższych układów rozpoznanych, sygnały do 40 jedn.

Ekspedycje: zasięg 40 jedn., szansa 88% (maleje o 0.4% na jednostkę ponad 15, w granicach 50–97%), czas 150 s + 8 s/jedn., koszt 300/200 + 12/8 na jednostkę, maks. 2 naraz.

| Rzadki obiekt | Premia (za każdy zbadany) | Maks. |
|---|---|---|
| Pulsar | +0,25 antymaterii/h | 4 |
| Czarna dziura | −5% czasu badań | 4 |

## Typy planet (`src/data/planets.ts`)

| Typ | Kategoria | Profil powierzchni | Bogactwo metal / kryształy / energia | Modyfikatory środowiska |
|---|---|---|---|---|
| Kepler-186 f | skalista, umiarkowana | terrestrial | 75–130% / 65–135% / 80–120% | Stabilny klimat, Aktywna tektonika, Burze jonowe, Silne wiatry |
| arid | pustynna, gorąca | arid | 95–145% / 55–100% / 100–135% | Stabilny klimat, Burze piaskowe, Silne nasłonecznienie |
| ice | lodowa, zimna | ice | 60–100% / 100–150% / 70–105% | Stabilny klimat, Kriowulkany, Długa noc |
| ocean | oceaniczna, wilgotna | oceanic | 55–95% / 90–140% / 90–130% | Stabilny klimat, Silne pływy, Sztormy |
| volcanic | wulkaniczna, aktywna | volcanic | 110–150% / 70–120% / 100–140% | Stabilny klimat, Częste erupcje, Gejzery |
| barren | jałowa, bez atmosfery | barren | 100–145% / 60–105% / 75–110% | Stabilny klimat, Deszcz meteorytów, Brak atmosfery |
