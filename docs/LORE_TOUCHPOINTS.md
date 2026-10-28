# Nazwy w grze dotykające świata (lore)

Stan: v0.46 (audyt). **Ten plik niczego nie ustala w kanonie** — tylko wskazuje, gdzie w kodzie są nazwy, które zmienią się,
gdy lore podejmie decyzję. Źródło prawdy: `docs/lore/CANON_STATUS.md` (kopia z Projektu na claude.ai); otwarte kwestie:
`docs/lore/OPEN_QUESTIONS.md`. Wcześniejszy spis: `docs/lore/nazwy-w-grze.md`.

**Status** (z CANON_STATUS): w kanonie **nie ma żadnych nazw** (K-001 „NIE obejmuje: nazw, postaci, frakcji, planet”).
Wszystkie nazwy poniżej są **ROBOCZE** — R-002 (nazwy w `src/data`, `status: 'robocza'`), R-003 (profile powierzchni);
estetyka interfejsu — C-001 (decyzja częściowa); zasoby — C-002 (mechanika jest, uzasadnienie fabularne brak).

Przy zmianie nazwy zmieniamy tylko teksty dla gracza. **Identyfikatory i klucze zapisu zostają** (`'bot'`, `'alien'`,
`planet-forge.empire.v1`, `antimatter`, `metalMine`…), żeby stare zapisy działały.

| Nazwa w grze | Gdzie (najważniejsze pliki) | Status / kwestie lore |
|---|---|---|
| **Imperium** (ekran, przycisk, „Sytuacja imperium”, zapis `empire`) | `src/game/scenes/EmpireScene.ts`, `PlanetScene.ts`, `src/app/GameController.ts`, `src/core/save/empire.ts` (klucz techniczny) | ROBOCZE; **O-002** — możliwa kolizja z K-001 pkt 3 (ludzkość jako niedobitek) |
| **Formy obce** (planety zajęte przez obcych, fioletowy pierścień) | `src/core/galaxy/galaxy.ts` (`alien`), `src/data/galaxy.ts`, `src/game/scenes/MapScene.ts`, `GameController.ts` | ROBOCZE; obcy nie występują w kanonie; **O-301**; do sprawdzenia filtrem K-011 |
| **Boty / „inny gracz”** (miejsca startowe innych graczy) | `src/core/galaxy/galaxy.ts` (`bot`), `MapScene.ts`, `GameController.ts` | ROBOCZE; **O-001** (gra wieloosobowa poza MVP), **O-301** |
| **Galaktyka 1, 100 układów, adresy `1:układ:orbita`**, katalogi nazw (Kepler, TOI, HD, Gliese…) | `src/data/galaxy.ts` (`GALAXY_NAMES`, `SYSTEM_CATALOGS`), `src/core/galaxy/galaxy.ts` | ROBOCZE; **O-301** (skala obszaru graczy) |
| **Rodzaje gwiazd**: czerwony karzeł, żółta gwiazda, niebieski olbrzym, gwiazda podwójna, pulsar, czarna dziura | `src/data/galaxy.ts` (`STAR_KINDS`) | ROBOCZE; K-006 (space opera) |
| **Rzadkie obiekty** (pulsar, czarna dziura) i „Astrofizyka ekstremalna” | `src/data/galaxy.ts` (`RARE_OBJECTS`), `src/data/research.ts` | ROBOCZE; K-007 (cena wiedzy), K-012 (zasady świata) |
| **Typy planet**: Kepler-186 f (startowa, umiarkowana), pustynna, lodowa, oceaniczna, wulkaniczna, jałowa; klasy Mała/Średnia/Duża; modyfikatory (Burze jonowe, Kriowulkany, Deszcz meteorytów…) | `src/data/planets.ts` (`status: 'robocza'`), `src/core/types.ts` | ROBOCZE (R-002); **O-004**; „Niepotwierdzone”: wcześniejsze propozycje typów planet nie są kanonem |
| **Profile powierzchni** (terrestrial, arid, ice, oceanic, volcanic, barren — gracz ich nie widzi) | `src/data/profiles/` | R-003 (kategorie techniczne); **O-004** |
| **Zasoby: metal, kryształy, energia** | `src/data/balance.ts`, `src/game/scenes/PlanetScene.ts` | C-002; **O-304** |
| **Antymateria** (waluta, Kolektor antymaterii) | `src/data/balance.ts`, `src/data/research.ts`, `src/core/economy/economy.ts`, `src/core/research/research.ts`, `src/core/ai/advisor.ts`, sceny, `src/core/save/*` | C-002; **O-003**, **O-304** (lore: „w UI, nie w kodzie” — rozbieżność, jest w grze od v0.5) |
| **Budynki**: Kopalnia metalu, Ekstraktor kryształów, Elektrownia, Magazyn, Kolektor antymaterii, Laboratorium | `src/data/balance.ts` | ROBOCZE; C-002 |
| **Etapy budynków** (v0.45): Kopalnia → Zakład przetwórczy → Huta → Megakompleks metalowy; Wiertło → Szyb wiertniczy → Odkrywka → Megaodkrywka; Farma wiatrowa → Generator fuzyjny → Elektrownia jądrowa → Reaktor antymaterii (od 2026-10-28); Skład → Magazyn → Terminal magazynowy → Megaskład; Pułapka → Kolektor → Pole pułapek → Megakolektor; Pracownia → Laboratorium → Instytut → Kampus badawczy | `src/data/footprint.ts` (`STAGE_NAMES`), `src/data/industry.ts` | ROBOCZE |
| **Przemysł**: Kompleks wiertniczy, Wielka fabryka, Sieć Tesli, megakompleksy, tryby pracy | `src/data/complexes.ts`, `src/data/industry.ts`, `src/data/research.ts` | ROBOCZE (prompt właściciela „Industrial Evolution”) |
| **Znaleziska**: Kryształ rdzeniowy, Odłamek rezonansowy, Stop o nieznanym składzie, Obrobiona płyta, Ogniwo spoczynkowe, Naładowana siatka, Zapis z głębi — opisy celowo dwuznaczne | `src/data/finds.ts` | ROBOCZE; **K-008** (niepewne świadectwa), **K-011**, **K-012** — bez faktów o dawnej cywilizacji, do weryfikacji w Projekcie lore |
| **Ramiona badań**: Produktywność, Planetologia, Eksploracja, Stacja i handel, SI, **Flota** („flota cywilna: transportowce i statki ekspedycyjne”) i nazwy badań | `src/data/research.ts`, `src/game/scenes/ResearchScene.ts` | ROBOCZE; Flota — **K-005**, **O-205** (walka poza MVP) |
| **Statek kolonizacyjny**, „Napęd międzygwiezdny”, **Transportowce**, sondy, holownik po kometę, stacja na pasie, kolektor energii gwiazdy | `src/data/research.ts`, `src/data/balance.ts`, `src/core/economy/*`, `MapScene.ts`, `GameController.ts` | ROBOCZE; **O-302** (podróże), **O-303** (łączność) |
| **Specjalizacje kolonii**: Górnicza, Energetyczna, Naukowa, Przemysłowa | `src/data/specializations.ts` | ROBOCZE |
| **SI Matka**, „SI wykonawcze”, „Autonomia” | `src/data/research.ts`, `src/core/ai/advisor.ts`, `GameController.ts`, `PlanetScene.ts`, `EmpireScene.ts` | ROBOCZE; brak w kanonie |
| **Dziennik ekspedycji** (zakładka, wpisy) | `src/game/scenes/EmpireScene.ts`, `GameController.ts`, `src/core/save/empire.ts` | **K-008** (rama dziennika ekspedycji); **O-207** (kto prowadzi dziennik) |
| **„W klimacie OGame”** (opis gry) | `CLAUDE.md` („Czym jest gra”) | **K-005**, **O-206** — zmiana sformułowania czeka na decyzję właściciela |
| Opis w manifeście PWA i `package.json` („Strategia sci-fi: planeta w dłoni, kolonie i galaktyka do odkrycia.”) | `scripts/build.ts`, `package.json` | zmienione w audycie v0.46 (było „z jedną planetą 3D” — nieaktualne); nawiązuje do K-010 pkt 1, bez nowych faktów |

## Rozbieżności lore ↔ gra (do poprawienia w Projekcie lore, nie tutaj)

- C-002 / O-003: antymateria jest w grze od v0.5.
- O-002: gra ma kilka planet (v0.7), statki (v0.13), ekran „Imperium”, transportowce (v0.36).
- O-301: gra ma galaktykę ze 100 układami, gwiazdy, boty i formy obce (wszystko robocze).
- O-005: repozytorium jest dostępne; `docs/technical-brief.md` nie istnieje.
- Kopia lore w `docs/lore/` jest ze stanu 2026-10-22 — jeśli wygląda na nieaktualną, zapytaj właściciela o nową.
