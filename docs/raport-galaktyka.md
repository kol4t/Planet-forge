# Raport: galaktyka do odkrywania (v0.34–v0.34.4)

Przebudowa według planu z ChatGPT (redesign galaktyki, ekspedycje, progresja odkryć, globalny czas orbitalny), po audycie i decyzjach właściciela z 2026-10-26. Każdy krok był osobną wersją, akceptowaną przed publikacją.

## 1. Zmiany wizualne

- **Widok układu pod kątem** (v0.34): orbity jako elipsy (spłaszczenie 0,42 na szerokim ekranie, do 0,7 w pionie), planety krążą, po dalszej stronie chowają się za gwiazdą i są odrobinę mniejsze. Wcześniej widok był z góry, a planety stały.
- **Galaktyka** (v0.34.1): nowe tło — miękka poświata ramion, gromady gwiazd, obłoki wodoru, pasma pyłu, gęste zgrubienie; rozdzielczość dopasowana do ekranu (bez „szachownicy” na telefonie). Układy jako małe gwiazdy z jasnym środkiem (wielkość z rodzaju gwiazdy, czarna dziura z dyskiem).
- **Twój układ**: złoty celownik stałej wielkości, strzałka przy krawędzi, gdy układ jest poza widokiem, przycisk „Mój układ”, zachowanie kamery po powrocie z układu.
- **Wiedza** (v0.34.2): nieznane niewidoczne, sygnały jako blade obwódki, wykryte szare, znane w kolorze; rzadkie obiekty z fioletowym pierścieniem (v0.34.4).

## 2. Odkrywanie galaktyki

Rozdzielone: istnienie układu (generator, bez zmian), wiedza gracza (`EmpireSave.discoveries`: indeks układu → poziom 1–4) i ekspedycje, które tę wiedzę podnoszą. Poziomy: nieznany obszar → sygnał → wykryty → rozpoznany → zbadany. Wiedza nigdy nie maleje. Na start: układy z planetami i statkami gracza zbadane (zawsze), 4 najbliższych sąsiadów rozpoznanych, sygnały do 40 jedn. Mapa nie pokazuje danych, których gracz nie zna; widok układu i statek kolonizacyjny — tylko do zbadanych.

## 3. Badania i ekspedycje

Ramię Eksploracja: „Sondy zwiadowcze” odblokowują ekspedycje; sondy dalekiego zasięgu i napęd jonowy — zasięg i szybkość; teleskop orbitalny — więcej wiedzy z jednej wyprawy; spektroskopia — większa szansa; analiza sygnałów — sygnały dalej wokół celu; astrofizyka ekstremalna — odczyt rzadkich obiektów. Badania nie ujawniają układów — dają możliwości; odkrycie zależy od wyprawy (koszt, czas, szansa 50–97%, może się nie udać).

## 4. Rzadkie obiekty

Pulsary i czarne dziury (z generatora, bez zmian). Bez astrofizyki ekstremalnej wyprawa kończy na „niezwykły sygnał”; po badaniu można je zbadać. Każdy zbadany daje imperium premię z danych naukowych (pulsar +0,25 antymaterii/h, czarna dziura −5% czasu badań, do 4 każdego rodzaju). Model rozszerzalny: `RARE_OBJECTS`.

## 5. Wspólny czas świata

`core/time/worldClock.ts`: jedno źródło czasu (`worldNow`, podmienialne — testy, przyszły zegar serwera), stała epoka. Ruch planet liczony z czasu przy każdej klatce widocznego układu; nic nie liczy się w tle i nic nie trzeba zapisywać.

## 6. Okresy orbitalne

T ∝ a^1,5 (odległość w j.a. z generatora), rozciągnięte w każdym układzie na 2–25 min (`ORBIT_RULES`). Kąt = faza z generatora + 2π · (czas − epoka) / okres. Ta sama chwila = to samo położenie na każdym ekranie, po przeładowaniu i uśpieniu Safari.

## 7. Zgodność zapisów

Nowe pola opcjonalne (`discoveries`, `expeditions`, `Expedition.extreme`); stare zapisy dostają wiedzę na start jak nowa gra; układy z planetami i statkami gracza zawsze zbadane. `GENERATOR_VERSION`, `GALAXY_VERSION` i dane galaktyki bez zmian.

## 8. Testy

Automatyczne (`npm run check`: typy, 259 testów, build) — wszystkie przechodzą. Nowe: orbity i zegar świata (okres z odległości, niezależność od klatek, podmiana zegara), kamera mapy, wiedza o galaktyce (poziomy, start, zapis, migracja), ekspedycje (plan, determinizm, porażki, rozliczenie raz, offline), rzadkie obiekty (blokada bez badania, premie, limit). Zrzuty ekranu z przeglądarki (tablet poziomo i pionowo, telefon). **Testów na fizycznym iPadzie nie wykonano** — listy kontrolne w README (pkt 188–203).

## 9. Zmienione pliki

Nowe: `src/core/time/worldClock.ts`, `src/core/galaxy/orbits.ts`, `src/core/galaxy/discovery.ts`, `src/core/galaxy/expeditions.ts`, `src/game/ui/mapCamera.ts`, testy `orbits`, `mapCamera`, `discovery`, `expeditions`, `rareObjects`. Zmienione: `src/app/GameController.ts`, `src/core/types.ts`, `src/core/save/empire.ts`, `src/core/research/research.ts`, `src/data/galaxy.ts`, `src/data/research.ts`, `src/game/scenes/MapScene.ts`, `EmpireScene.ts`, `PlanetScene.ts`, `src/game/ui/galaxy.ts`, dokumentacja.

## 10. Co zostaje

**Wdrożone w pełni:** ruch planet z czasu świata, widok pod kątem, nowy wygląd galaktyki, „Mój układ” i strzałka, stany wiedzy, ekspedycje z badaniami, rzadkie obiekty z premiami.

**Częściowo:** wspólny zegar używają orbity; gospodarka i wyprawy liczą się dalej ze znaczników czasu (`Date.now()`) — przejście całości na `worldNow` przy backendzie. Osobna lista raportów (punkt 9.1 planu) — nie zrobiona; raporty są w dzienniku „Imperium”. Wyszukiwarka i filtry — dodane w v0.34.5.

**Propozycje na przyszłość:** zwijany panel, specjalistyczne misje do rzadkich obiektów, anomalie (po lore), ruch flot na tym samym zegarze, autorytatywny zegar serwera.
