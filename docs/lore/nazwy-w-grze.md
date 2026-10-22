# Nazwy w grze, które dotykają lore

Spis z 2026-10-22 (v0.21). **Nic tu nie jest kanonem** — wszystkie nazwy są robocze, dopóki `docs/lore/CANON_STATUS.md` nie mówi inaczej. Ten plik tylko wskazuje, gdzie w kodzie trzeba będzie coś zmienić, gdy lore podejmie decyzję. Kolumna „Pytanie w lore” — numery z `OPEN_QUESTIONS.md` wg planu działania (sprawdź po wgraniu lore).

| Nazwa w grze | Gdzie występuje (najważniejsze pliki) | Pytanie w lore |
|---|---|---|
| **Imperium** (ekran, „Imperium” na pasku, „Twoje imperium”) | `src/game/scenes/EmpireScene.ts`, `src/game/scenes/PlanetScene.ts`, `src/app/GameController.ts`, zapis `planet-forge.empire.v1` w `src/core/save/empire.ts` (klucz techniczny — nie zmieniać przy zmianie nazwy) | O-002 |
| **Forma obca** (planety zajęte przez obcych, fioletowy pierścień na mapie) | teksty: `src/game/scenes/MapScene.ts`, `src/app/GameController.ts`; reguły: `src/core/galaxy/galaxy.ts`, `src/data/galaxy.ts` (`alienChance`); typy: `src/core/types.ts` | O-301 |
| **Boty / „inny gracz”** (miejsca startowe innych graczy) | `src/core/galaxy/galaxy.ts`, `src/game/scenes/MapScene.ts`, `src/app/GameController.ts` | O-301 |
| **Galaktyka ze 100 układami**, adresy `1:układ:orbita`, „galaktyka = serwer” | `src/core/galaxy/galaxy.ts`, `src/data/galaxy.ts`, `src/game/scenes/MapScene.ts` | O-301 |
| **Rodzaje gwiazd** (czerwony karzeł, żółta gwiazda, niebieski olbrzym, gwiazda podwójna, pulsar, czarna dziura) z opisami | `src/data/galaxy.ts` | O-301 |
| **Statek kolonizacyjny**, badanie „Napęd międzygwiezdny” | `src/data/research.ts`, `src/app/GameController.ts`, `src/game/scenes/MapScene.ts` | O-302 |
| **Ramię badań „Flota”** (opis: „Flota cywilna: transportowce i statki ekspedycyjne. Walka w kolejnym etapie.”) | `src/data/research.ts` | K-005, O-206 |
| Pozostałe ramiona badań: Produktywność, Planetologia, Eksploracja, Stacja i handel, SI | `src/data/research.ts`, `src/game/scenes/ResearchScene.ts` | — |
| **Antymateria** (waluta, Kolektor antymaterii) | dane: `src/data/balance.ts`, `src/data/research.ts`; reguły: `src/core/economy/economy.ts`, `src/core/research/research.ts`, `src/core/ai/advisor.ts`; widok: `src/game/scenes/PlanetScene.ts`, `EmpireScene.ts`, `ResearchScene.ts`, `src/planet-renderer/colonyMeshes.ts`; zapis: `src/core/save/*.ts` | O-304 |
| **Metal, kryształy, energia** i budynki (Kopalnia metalu, Ekstraktor kryształów, Elektrownia, Magazyn, Laboratorium) | `src/data/balance.ts`, `src/game/scenes/PlanetScene.ts` | O-304 |
| **Typy planet**: umiarkowana (Kepler-186 f — planeta startowa), pustynna, lodowa, oceaniczna, wulkaniczna, jałowa; klasy rozmiaru Mała/Średnia/Duża; modyfikatory (np. „Burze jonowe”, „Kriowulkany”, „Deszcz meteorytów”) | `src/data/planets.ts` (wszystkie z `status: 'robocza'`), `src/core/types.ts`, `src/data/galaxy.ts`, `src/core/galaxy/galaxy.ts` | O-004 |
| **SI Matka**, „SI wykonawcze”, „Autonomia” | `src/data/research.ts`, `src/core/ai/advisor.ts`, `src/app/GameController.ts`, `src/game/scenes/PlanetScene.ts`, `EmpireScene.ts` | — |
| **Dziennik ekspedycji** | `src/game/scenes/EmpireScene.ts`, `src/app/GameController.ts`, `src/core/save/empire.ts`, `src/game/ui/theme.ts` | — |
| **„W klimacie OGame”** (opis gry) | `CLAUDE.md` („Czym jest gra”) | K-005, O-206 |

Przy zmianie nazwy: zmieniaj tylko teksty widoczne dla gracza. Identyfikatory w kodzie i klucze zapisu (`'bot'`, `'alien'`, `empire.v1`, `antimatter`) zostają, żeby stare zapisy działały.
