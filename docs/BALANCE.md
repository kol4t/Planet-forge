# Balans — wartości z kodu

> Plik **generowany** przez `npm run balance-doc` (skrypt `scripts/balance-doc.ts`) z `src/data/*` i reguł `src/core/*`.
> Nie edytuj ręcznie — zmień dane i uruchom skrypt. **Wszystkie liczby są robocze** (decyzja właściciela: strojenie na końcu, przed MVP).

## Parametry ogólne (`src/data/balance.ts`)

| Parametr | Wartość |
|---|---|
| Przyrost podstawowy (bez kopalń) | 6 metalu/min, 3 kryształów/min |
| Zapas startowy | 250 metalu, 120 kryształów, 5 antymaterii |
| Wzrost wydobycia z poziomem (`levelGrowth`) | wydobycie = baza × poziom × 1.05^poziom |
| Maksymalny poziom budynku | 40 |
| Limit naliczania nieobecności | 8 h (badania mogą wydłużyć) |
| Czas budowy | 30 s × docelowy poziom |
| „Ukończ teraz” za darmo do poziomu | 5 |
| „Ukończ teraz” powyżej | 1 antymateria za każde rozpoczęte 15 min |
| Antymateria pasywnie | 1/h |
| Magazyn | 1000 × 1.6^(poz − 1) (metal i kryształy osobno) |
| Miejsca na planety | 5 na start, maks. 10 |
| Kolejka budowy | 5 miejsce na start (więcej z badań SI) |
| Złoża na 100 pól (× bogactwo planety) | 2 000 000 metalu, 1 200 000 kryształów |
| Teren poza dedykowanym | 75% wydajności (`OFF_SITE_FACTOR`) |

## Budynki — koszt, czas, wydobycie, pola

Wydobycie przy bogactwie 100% i bez kar środowiska. Pola — obszar budynku (`fieldsFor`), etap — `src/data/footprint.ts`.

### Kopalnia metalu (`metalMine`)

Koszt poz. 1: 60 metalu, 15 kryształów; wzrost kosztu ×1.2 na poziom.

| Poziom | Koszt metalu | Koszt kryształów | Czas budowy | Wydobycie (metal/min) | Zużycie energii | Pola | Etap |
|---|---|---|---|---|---|---|---|
| 1 | 60 | 15 | 30 s | 18,9 | 10,5 | 1 | Kopalnia |
| 2 | 72 | 18 | 1 min 4 s | 39,7 | 22,1 | 1 | Kopalnia |
| 3 | 86 | 21 | 1 min 43 s | 62,5 | 34,7 | 1 | Kopalnia |
| 5 | 124 | 31 | 3 min 17 s | 114,9 | 63,8 | 2 | Kopalnia |
| 6 | 149 | 37 | 4 min 12 s | 144,7 | 80,4 | 2 | Zakład przetwórczy |
| 8 | 214 | 53 | 6 min 25 s | 212,8 | 118,2 | 3 | Zakład przetwórczy |
| 10 | 309 | 77 | 9 min 12 s | 293,2 | 162,9 | 5 | Zakład przetwórczy |
| 12 | 445 | 111 | 12 min 38 s | 387,9 | 215,5 | 6 | Huta |
| 15 | 770 | 192 | 19 min 20 s | 561,3 | 311,8 | 7 | Huta |
| 19 | 1597 | 399 | 32 min 7 s | 864,2 | 480,1 | 8 | Huta |
| 20 | 1916 | 479 | 36 min 10 s | 955,2 | 530,7 | 10 | Kombinat metalowy |
| 25 | 4769 | 1192 | 1 h 3 min | 1523,9 | 846,6 | 12 | Kombinat metalowy |
| 30 | 11 868 | 2967 | 1 h 46 min | 2333,8 | 1296,6 | 15 | Kombinat metalowy |
| 40 | 73 488 | 18 372 | 4 h 39 min | 5068,8 | 2816,0 | 20 | Kombinat metalowy |

### Ekstraktor kryształów (`crystalMine`)

Koszt poz. 1: 48 metalu, 24 kryształów; wzrost kosztu ×1.22 na poziom.

| Poziom | Koszt metalu | Koszt kryształów | Czas budowy | Wydobycie (kryształy/min) | Zużycie energii | Pola | Etap |
|---|---|---|---|---|---|---|---|
| 1 | 48 | 24 | 30 s | 10,5 | 10,5 | 1 | Wiertło |
| 2 | 58 | 29 | 1 min 4 s | 22,1 | 22,1 | 2 | Wiertło |
| 3 | 71 | 35 | 1 min 43 s | 34,7 | 34,7 | 2 | Wiertło |
| 5 | 106 | 53 | 3 min 17 s | 63,8 | 63,8 | 3 | Wiertło |
| 6 | 129 | 64 | 4 min 12 s | 80,4 | 80,4 | 6 | Szyb wiertniczy |
| 8 | 193 | 96 | 6 min 25 s | 118,2 | 118,2 | 8 | Szyb wiertniczy |
| 10 | 287 | 143 | 9 min 12 s | 162,9 | 162,9 | 10 | Szyb wiertniczy |
| 12 | 427 | 213 | 12 min 38 s | 215,5 | 215,5 | 16 | Odkrywka |
| 15 | 776 | 388 | 19 min 20 s | 311,8 | 311,8 | 19 | Odkrywka |
| 19 | 1720 | 860 | 32 min 7 s | 480,1 | 480,1 | 22 | Odkrywka |
| 20 | 2099 | 1049 | 36 min 10 s | 530,7 | 530,7 | 40 | Megaodkrywka |
| 25 | 5673 | 2836 | 1 h 3 min | 846,6 | 846,6 | 50 | Megaodkrywka |
| 30 | 15 334 | 7667 | 1 h 46 min | 1296,6 | 1296,6 | 50 | Megaodkrywka |
| 40 | 112 014 | 56 007 | 4 h 39 min | 2816,0 | 2816,0 | 50 | Megaodkrywka |

### Elektrownia (`powerPlant`)

Koszt poz. 1: 75 metalu, 30 kryształów; wzrost kosztu ×1.2 na poziom.

| Poziom | Koszt metalu | Koszt kryształów | Czas budowy | Wydobycie (energia) | Zużycie energii | Pola | Etap |
|---|---|---|---|---|---|---|---|
| 1 | 75 | 30 | 30 s | 23,1 | 0 | 1 | Farma wiatrowa |
| 2 | 90 | 36 | 1 min 4 s | 48,5 | 0 | 2 | Farma wiatrowa |
| 3 | 108 | 43 | 1 min 43 s | 76,4 | 0 | 2 | Farma wiatrowa |
| 5 | 155 | 62 | 3 min 17 s | 140,4 | 0 | 3 | Farma wiatrowa |
| 6 | 186 | 74 | 4 min 12 s | 176,9 | 0 | 4 | Generator fuzyjny |
| 8 | 268 | 107 | 6 min 25 s | 260,0 | 0 | 5 | Generator fuzyjny |
| 10 | 386 | 154 | 9 min 12 s | 358,4 | 0 | 6 | Generator fuzyjny |
| 12 | 557 | 222 | 12 min 38 s | 474,1 | 0 | 8 | Elektrownia jądrowa |
| 15 | 962 | 385 | 19 min 20 s | 686,0 | 0 | 10 | Elektrownia jądrowa |
| 19 | 1996 | 798 | 32 min 7 s | 1056,3 | 0 | 12 | Elektrownia jądrowa |
| 20 | 2396 | 958 | 36 min 10 s | 1167,5 | 0 | 16 | Reaktor antymaterii |
| 25 | 5962 | 2384 | 1 h 3 min | 1862,5 | 0 | 22 | Reaktor antymaterii |
| 30 | 14 836 | 5934 | 1 h 46 min | 2852,5 | 0 | 22 | Reaktor antymaterii |
| 40 | 91 860 | 36 744 | 4 h 39 min | 6195,2 | 0 | 22 | Reaktor antymaterii |

### Magazyn (`storage`)

Koszt poz. 1: 70 metalu, 35 kryształów; wzrost kosztu ×1.2 na poziom.

| Poziom | Koszt metalu | Koszt kryształów | Czas budowy | Wydobycie (pojemność) | Zużycie energii | Pola | Etap |
|---|---|---|---|---|---|---|---|
| 1 | 70 | 35 | 30 s | 1000 | 0 | 1 | Skład |
| 2 | 84 | 42 | 1 min 4 s | 1600 | 0 | 2 | Skład |
| 3 | 100 | 50 | 1 min 43 s | 2560 | 0 | 2 | Skład |
| 5 | 145 | 72 | 3 min 17 s | 6553 | 0 | 2 | Skład |
| 6 | 174 | 87 | 4 min 12 s | 10 485 | 0 | 3 | Magazyn |
| 8 | 250 | 125 | 6 min 25 s | 26 843 | 0 | 4 | Magazyn |
| 10 | 361 | 180 | 9 min 12 s | 68 719 | 0 | 5 | Magazyn |
| 12 | 520 | 260 | 12 min 38 s | 175 921 | 0 | 6 | Terminal magazynowy |
| 15 | 898 | 449 | 19 min 20 s | 720 575 | 0 | 8 | Terminal magazynowy |
| 19 | 1863 | 931 | 32 min 7 s | 4 722 366 | 0 | 9 | Terminal magazynowy |
| 20 | 2236 | 1118 | 36 min 10 s | 7 555 786 | 0 | 10 | Megaskład |
| 25 | 5564 | 2782 | 1 h 3 min | 79 228 162 | 0 | 14 | Megaskład |
| 30 | 13 846 | 6923 | 1 h 46 min | 830 767 497 | 0 | 14 | Megaskład |
| 40 | 85 736 | 42 868 | 4 h 39 min | 91 343 852 333 | 0 | 14 | Megaskład |

### Kolektor antymaterii (`antimatterCollector`)

Koszt poz. 1: 400 metalu, 260 kryształów; wzrost kosztu ×1.25 na poziom.

| Poziom | Koszt metalu | Koszt kryształów | Czas budowy | Wydobycie (antymateria/h) | Zużycie energii | Pola | Etap |
|---|---|---|---|---|---|---|---|
| 1 | 400 | 260 | 30 s | 0,6 | 18,9 | 1 | Pułapka |
| 2 | 500 | 325 | 1 min 4 s | 1,3 | 39,7 | 2 | Pułapka |
| 3 | 625 | 406 | 1 min 43 s | 2,1 | 62,5 | 2 | Pułapka |
| 5 | 976 | 634 | 3 min 17 s | 3,8 | 114,9 | 2 | Pułapka |
| 6 | 1220 | 793 | 4 min 12 s | 4,8 | 144,7 | 3 | Kolektor |
| 8 | 1907 | 1239 | 6 min 25 s | 7,1 | 212,8 | 4 | Kolektor |
| 10 | 2980 | 1937 | 9 min 12 s | 9,8 | 293,2 | 5 | Kolektor |
| 12 | 4656 | 3026 | 12 min 38 s | 12,9 | 387,9 | 6 | Pole pułapek |
| 15 | 9094 | 5911 | 19 min 20 s | 18,7 | 561,3 | 8 | Pole pułapek |
| 19 | 22 204 | 14 432 | 32 min 7 s | 28,8 | 864,2 | 9 | Pole pułapek |
| 20 | 27 755 | 18 041 | 36 min 10 s | 31,8 | 955,2 | 10 | Megakolektor |
| 25 | 84 703 | 55 057 | 1 h 3 min | 50,8 | 1523,9 | 14 | Megakolektor |
| 30 | 258 493 | 168 021 | 1 h 46 min | 77,8 | 2333,8 | 14 | Megakolektor |
| 40 | 2 407 412 | 1 564 818 | 4 h 39 min | 169,0 | 5068,8 | 14 | Megakolektor |

### Laboratorium (`laboratory`)

Koszt poz. 1: 200 metalu, 400 kryształów; wzrost kosztu ×1.22 na poziom.

| Poziom | Koszt metalu | Koszt kryształów | Czas budowy | Wydobycie (—) | Zużycie energii | Pola | Etap |
|---|---|---|---|---|---|---|---|
| 1 | 200 | 400 | 30 s | — | 6,3 | 1 | Pracownia |
| 2 | 244 | 488 | 1 min 4 s | — | 13,2 | 2 | Pracownia |
| 3 | 297 | 595 | 1 min 43 s | — | 20,8 | 2 | Pracownia |
| 5 | 443 | 886 | 3 min 17 s | — | 38,3 | 2 | Pracownia |
| 6 | 540 | 1081 | 4 min 12 s | — | 48,2 | 3 | Laboratorium |
| 8 | 804 | 1609 | 6 min 25 s | — | 70,9 | 4 | Laboratorium |
| 10 | 1197 | 2394 | 9 min 12 s | — | 97,7 | 5 | Laboratorium |
| 12 | 1782 | 3564 | 12 min 38 s | — | 129,3 | 6 | Instytut |
| 15 | 3236 | 6472 | 19 min 20 s | — | 187,1 | 8 | Instytut |
| 19 | 7169 | 14 339 | 32 min 7 s | — | 288,1 | 9 | Instytut |
| 20 | 8747 | 17 494 | 36 min 10 s | — | 318,4 | 10 | Kampus badawczy |
| 25 | 23 641 | 47 282 | 1 h 3 min | — | 508,0 | 14 | Kampus badawczy |
| 30 | 63 894 | 127 789 | 1 h 46 min | — | 777,9 | 14 | Kampus badawczy |
| 40 | 466 727 | 933 455 | 4 h 39 min | — | 1689,6 | 14 | Kampus badawczy |

## Etapy obszaru budynku (`src/data/footprint.ts`)

- **Kopalnia metalu:** Kopalnia od poz. 1 — 1–3 pól; Zakład przetwórczy od poz. 6 — 6–10 pól; Huta od poz. 12 — 16–22 pól; Kombinat metalowy od poz. 20 — 40–50 pól.
- **Ekstraktor kryształów:** Wiertło od poz. 1 — 1–3 pól; Szyb wiertniczy od poz. 6 — 6–10 pól; Odkrywka od poz. 12 — 16–22 pól; Megaodkrywka od poz. 20 — 40–50 pól.
- **Elektrownia:** Farma wiatrowa od poz. 1 — 1–3 pól; Generator fuzyjny od poz. 6 — 4–6 pól; Elektrownia jądrowa od poz. 12 — 8–12 pól; Reaktor antymaterii od poz. 20 — 16–22 pól.
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
| Moduł orbitalny | 2 | 624 / 832 / 0 | 3 min 3 s | stacja macierzysta na orbicie — magazyn orbitalny i węzeł transportu |
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
