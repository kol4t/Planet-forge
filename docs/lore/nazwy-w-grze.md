# Nazwy w grze, które dotykają lore

Spis z 2026-10-22 (v0.21). **Nic tu nie jest kanonem** — wszystkie nazwy są robocze, dopóki `docs/lore/CANON_STATUS.md` nie mówi inaczej. Ten plik tylko wskazuje, gdzie w kodzie trzeba będzie coś zmienić, gdy lore podejmie decyzję. Kolumna „Lore” — numery z `CANON_STATUS.md` (K-xxx, C-xxx) i `OPEN_QUESTIONS.md` (O-xxx).

| Nazwa w grze | Gdzie występuje (najważniejsze pliki) | Lore |
|---|---|---|
| **Imperium** (ekran, „Imperium” na pasku, „Twoje imperium”) | `src/game/scenes/EmpireScene.ts`, `src/game/scenes/PlanetScene.ts`, `src/app/GameController.ts`, zapis `planet-forge.empire.v1` w `src/core/save/empire.ts` (klucz techniczny — nie zmieniać przy zmianie nazwy) | O-002 (kolizja z K-001 pkt 3: ludzkość jako niedobitek) |
| **Forma obca** (planety zajęte przez obcych, fioletowy pierścień na mapie) | teksty: `src/game/scenes/MapScene.ts`, `src/app/GameController.ts`; reguły: `src/core/galaxy/galaxy.ts`, `src/data/galaxy.ts` (`alienChance`); typy: `src/core/types.ts` | O-301; obcy nie występują w kanonie — sprawdzić z K-011 |
| **Boty / „inny gracz”** (miejsca startowe innych graczy) | `src/core/galaxy/galaxy.ts`, `src/game/scenes/MapScene.ts`, `src/app/GameController.ts` | O-301, O-001 (gra wieloosobowa poza MVP) |
| **Galaktyka ze 100 układami**, adresy `1:układ:orbita`, „galaktyka = serwer” | `src/core/galaxy/galaxy.ts`, `src/data/galaxy.ts`, `src/game/scenes/MapScene.ts` | O-301 |
| **Rodzaje gwiazd** (czerwony karzeł, żółta gwiazda, niebieski olbrzym, gwiazda podwójna, pulsar, czarna dziura) z opisami | `src/data/galaxy.ts` | O-301 |
| **Statek kolonizacyjny**, badanie „Napęd międzygwiezdny” | `src/data/research.ts`, `src/app/GameController.ts`, `src/game/scenes/MapScene.ts` | O-302 |
| **Ramię badań „Flota”** (opis: „Flota cywilna: transportowce i statki ekspedycyjne. Walka w kolejnym etapie.”) | `src/data/research.ts` | K-005, O-205 |
| Pozostałe ramiona badań: Produktywność, Planetologia, Eksploracja, Stacja i handel, SI | `src/data/research.ts`, `src/game/scenes/ResearchScene.ts` | — |
| **Antymateria** (waluta, Kolektor antymaterii) | dane: `src/data/balance.ts`, `src/data/research.ts`; reguły: `src/core/economy/economy.ts`, `src/core/research/research.ts`, `src/core/ai/advisor.ts`; widok: `src/game/scenes/PlanetScene.ts`, `EmpireScene.ts`, `ResearchScene.ts`, `src/planet-renderer/colonyMeshes.ts`; zapis: `src/core/save/*.ts` | O-304, O-003, C-002 |
| **Metal, kryształy, energia** i budynki (Kopalnia metalu, Ekstraktor kryształów, Elektrownia, Magazyn, Laboratorium) | `src/data/balance.ts`, `src/game/scenes/PlanetScene.ts` | O-304, C-002 |
| **Typy planet**: umiarkowana (Kepler-186 f — planeta startowa), pustynna, lodowa, oceaniczna, wulkaniczna, jałowa; klasy rozmiaru Mała/Średnia/Duża; modyfikatory (np. „Burze jonowe”, „Kriowulkany”, „Deszcz meteorytów”) | `src/data/planets.ts` (wszystkie z `status: 'robocza'`), `src/core/types.ts`, `src/data/galaxy.ts`, `src/core/galaxy/galaxy.ts` | O-004, R-002, R-003 |
| **Profile powierzchni** (ziemiopodobny, pustynny, lodowy, oceaniczny, wulkaniczny, jałowy) — kategorie techniczne, gracz ich nie widzi (tylko atlas) | `src/data/profiles/` | R-003, O-004 |
| **SI Matka**, „SI wykonawcze”, „Autonomia” | `src/data/research.ts`, `src/core/ai/advisor.ts`, `src/app/GameController.ts`, `src/game/scenes/PlanetScene.ts`, `EmpireScene.ts` | — |
| **Dziennik ekspedycji** | `src/game/scenes/EmpireScene.ts`, `src/app/GameController.ts`, `src/core/save/empire.ts`, `src/game/ui/theme.ts` | K-008 (rama dziennika ekspedycji), O-207 |
| **Przemysł**: „Kompleks wiertniczy”, „Wielka fabryka”, „Węzeł Tesli”, „Sieć Tesli”, megakompleksy (robocze, z promptu właściciela v0.50) | `src/data/complexes.ts`, `src/data/industry.ts`, `src/data/research.ts` | — |
| **Etapy kompleksów** (v0.45): Kopalnia → Zakład przetwórczy → Huta → Megakompleks metalowy; Wiertło → Szyb wiertniczy → Odkrywka → Megaodkrywka; Farma wiatrowa → Węzeł energetyczny → Wielka elektrownia → Megasieć energetyczna (od 2026-10-28 kierunek: wiatr → generator fuzyjny → elektrownia jądrowa → reaktor antymaterii); Skład/Magazyn/Terminal/Megaskład; Pułapka/Kolektor/Pole pułapek/Megakolektor; Pracownia/Laboratorium/Instytut/Kampus badawczy — robocze | `src/data/footprint.ts` | — |
| **Znaleziska** megakompleksów: „Kryształ rdzeniowy”, „Odłamek rezonansowy”, „Stop o nieznanym składzie”, „Obrobiona płyta”, „Ogniwo spoczynkowe”, „Naładowana siatka”, „Zapis z głębi” — opisy dwuznaczne, bez faktów o dawnej cywilizacji | `src/data/finds.ts` | K-008, K-011, K-012 — do weryfikacji |
| **„W klimacie OGame”** (opis gry) | `CLAUDE.md` („Czym jest gra”) | K-005, O-206 |

Przy zmianie nazwy: zmieniaj tylko teksty widoczne dla gracza. Identyfikatory w kodzie i klucze zapisu (`'bot'`, `'alien'`, `empire.v1`, `antimatter`) zostają, żeby stare zapisy działały.

## Rozbieżności lore ↔ repozytorium (stan 2026-10-22)

Do poprawienia w Projekcie lore (pliki w `docs/lore/` są kopią — nie poprawiamy ich tu bez decyzji właściciela):

- **C-002 i O-003** mówią, że antymateria jest „w specyfikacji UI, nie w kodzie”. W grze jest od v0.5 (waluta, Kolektor antymaterii).
- **O-002** mówi „gra to jedna planeta bez floty”. Od v0.7 gra ma kilka planet, od v0.13 statek kolonizacyjny i ekran „Imperium”.
- **O-005** — repozytorium jest już dostępne; `docs/technical-brief.md` nie istnieje, `docs/decisions.md` i `src/data/planets.ts` nie zawierają ustaleń fabularnych poza roboczymi nazwami (R-002).
- **O-301** — gra ma już galaktykę ze 100 układami, gwiazdy, boty i formy obce (wszystko robocze).
- **O-206** — w `CLAUDE.md` zostało „w klimacie OGame” z dopiskiem o K-005; zmiana samego sformułowania czeka na decyzję właściciela.
