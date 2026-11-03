# Pomiary audytu 2026-11 (v0.69.1, gałąź main)

Wszystkie liczby **zmierzone** w kontenerze (Linux, komputer, przeglądarka bezgłowa Chromium). To nie iPad: liczby
służą do porównań między wersjami, nie do oceny płynności u gracza. Ostatni pomiar z iPada właściciela (v0.69.0,
3D, gra z ekranu początkowego): średnio 58 kl./s, najsłabsza sekunda 35 kl./s, 50 rysowań, 132 954 trójkątów.

## Stan przed audytem (`npm run check`, main @ v0.69.1)

| Pomiar | Wynik |
|---|---|
| TypeScript (`tsc --noEmit`) | 0 błędów, 0 ostrzeżeń |
| Testy (node:test) | 406 / 406 zaliczone, 0 pominiętych, ok. 36 s |
| Build | dist/index.html 2 460 742 B (2,35 MB), sw.js, manifest, 3 ikony |
| Cały `npm run check` | ok. 45 s |

## Z czego składa się gra (`node scripts/audyt/bundle.ts`)

```
JS po minifikacji: 2392 KB
node_modules/phaser                        1182 KB  49.4%
node_modules/three                          548 KB  22.9%
src/game                                    212 KB  8.9%
src/planet-renderer                         157 KB  6.5%
src/app                                     114 KB  4.8%
src/core                                    110 KB  4.6%
src/data                                     43 KB  1.8%
node_modules/three/examples/jsm              20 KB  0.8%

Największe pliki gry:
src/app/GameController.ts                            102 KB
src/game/scenes/PlanetScene.ts                        64 KB
src/planet-renderer/colonyMeshes.ts                   39 KB
src/game/scenes/MapScene.ts                           34 KB
src/game/scenes/EmpireScene.ts                        32 KB
src/planet-renderer/PlanetView.ts                     29 KB
src/planet-renderer/CanvasPlanetFallback.ts           24 KB
src/game/scenes/ResearchScene.ts                      18 KB
src/data/research.ts                                  13 KB
src/core/research/research.ts                         11 KB
```

## Logika bez przeglądarki (`node scripts/audyt/core-pomiary.ts`)

| Pomiar | Wynik |
|---|---|
| Generowanie planety startowej (dane) | 0.2 ms |
| Siatka pól kepler-186f (262 pól) — pierwsze liczenie | 508 ms |
| Siatka pól arid (175 pól) — pierwsze liczenie | 570 ms |
| Siatka pól ice (420 pól) — pierwsze liczenie | 459 ms |
| Siatka pól ocean (237 pól) — pierwsze liczenie | 358 ms |
| Siatka pól volcanic (251 pól) — pierwsze liczenie | 335 ms |
| Siatka pól barren (145 pól) — pierwsze liczenie | 262 ms |
| Planety w imperium | 5 |
| Rozmiar zapisu (localStorage) | 7.0 KB |
| Czas zapisu (serializacja + setItem) | 0.07 ms |
| Rozmiar eksportu PF2 | 9.5 KB |
| Wczytanie gry po 8 h nieobecności (5 planet) | 5 ms |
| Wczytanie gry po 30 dniach nieobecności | 1 ms |
| Jeden tick gospodarki (co klatkę UI) | 0.05 ms |
| Przełączenie planety (z siatką w pamięci) | 0.3 ms (×2) |
| colony() — przeliczenie pól (co 250 ms w UI) | 1.24 ms |
| Gospodarka + panel: rates (co odświeżenie) | 0.020 ms |

Wnioski: zapis i naliczanie są tanie. **Najdroższe jest pierwsze liczenie siatki pól planety (300–640 ms na komputerze,
na iPadzie przypuszczalnie 2–4× dłużej)** — to ono daje przycięcie przy zmianie planety i przy przejściu 2D↔3D
(zgłoszenie właściciela 2026-11-03). Siatka jest potem w pamięci (przełączenie 0,2 ms).

## Przeglądarka (`node scripts/perf.ts http://localhost:5173/ audyt-2026-11 --deep`)

Podgląd dev (kod bez minifikacji), procesor spowolniony 4×, 3D programowe (SwiftShader) — dlatego klatki są bardzo niskie.

| Grafika | Pomiar | Wynik |
|---|---|---:|
| 2D | start (do gotowych paneli) | 11.1 s |
| 2D | klatki: bez panelu, 1× | 6 (najsłabsza s: 6) |
| 2D | klatki: bez panelu, przybliżenie ~2,7× | 4 (4) |
| 2D | klatki: panel „Produkcja”, 1× | 5 (5) |
| 2D | pamięć JS: start → po 10 → po 20 zmianach planety | 34.4 → 38.7 → 39.1 MB |
| 3D | start (do gotowych paneli) | 14.1 s |
| 3D | klatki: bez panelu, 1× | 3 (najsłabsza s: 2) |
| 3D | klatki: bez panelu, przybliżenie ~2,7× | 2 (2) |
| 3D | klatki: panel „Produkcja”, 1× | 2 (2) |
| 3D | rysowania / trójkąty / geometrie / tekstury | 49 / 110674 / 53 / 2 |
| 3D | pamięć JS: start → po 10 → po 20 zmianach planety | 37.6 → 42.7 → 43.1 MB |
| 3D | geometrie / tekstury: start → po 10 → po 20 zmianach | 53/2 → 67/3 → 67/3 |

Porównanie z pomiarem przed widokiem układu (`docs/pomiary/widok-ukladu-przed.md`, ta sama metoda): start 27 s → 11 s (2D)
i 26 s → 14 s (3D); pamięć po 20 zmianach planety rośnie jak wtedy (+4–5 MB = pamięć podręczna siatek i 3 modeli 3D), potem stoi.
Geometrie 53 → 67 po 10 zmianach i bez zmian po 20 — to pamięć 3 modeli 3D (v0.66), **nie wyciek**.

## Modele 3D (`node scripts/audyt/modele.ts`)

Rodzaje kształtów budowli: 41 (każdy = 4 InstancedMesh: bryła, wykop, część ruchoma, światło)
| Kształt | Wierzchołki | Trójkąty |
|---|---:|---:|
| fusionGenerator | 6888 | 2296 |
| antimatterReactor | 5508 | 1836 |
| trapField | 4068 | 1356 |
| fusionCell | 3876 | 1292 |
| collectorMega | 3876 | 1292 |
| campus | 3348 | 1116 |
| storageTerminal | 3312 | 1104 |
| metalMega | 3216 | 1072 |
| nuclearPlant | 3204 | 1068 |
| storageMega | 3096 | 1032 |
| collector | 2772 | 924 |
| smelter | 2424 | 808 |
| storageHouse | 2280 | 760 |
| institute | 1968 | 656 |
| siloModule | 1692 | 564 |
| crystalMega | 1488 | 496 |
| antimatterTank | 1452 | 484 |
| lab | 1260 | 420 |
| metalPlant | 1248 | 416 |
| pitStation | 1224 | 408 |
| teslaNode | 1224 | 408 |
| storageDepot | 1200 | 400 |
| trap | 1140 | 380 |
| containerYard | 1080 | 360 |
| mineHead | 1038 | 346 |
| crystalShaft | 1020 | 340 |
| workshop | 876 | 292 |
| trapPylon | 840 | 280 |
| magCoil | 828 | 276 |
| crystalRefinery | 810 | 270 |
| coolingModule | 750 | 250 |
| metalBlock | 744 | 248 |
| labBlock | 720 | 240 |
| crystalDrillRig | 708 | 236 |
| windFarm | 684 | 228 |
| substation | 612 | 204 |
| dishModule | 480 | 160 |
| crystalOutpost | 456 | 152 |
| windTurbine | 456 | 152 |
| metalPlaza | 432 | 144 |
| metalYard | 270 | 90 |
| Stacja macierzysta (4 moduły, stocznia) | 720 | 594 |
| Megakonstrukt metalu na orbicie | 2676 | 892 |
| Wiertnica kryształów (5 lin) | 947 | 428 |

Cała scena 3D planety startowej: 49 rysowań, 110 674 trójkątów, 53 geometrie, 2 tekstury (pomiar wyżej).
