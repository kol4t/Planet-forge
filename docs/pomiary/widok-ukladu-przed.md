# Widok układu — etap A: audyt i pomiary PRZED zmianami

Stan: 2026-11-02, gra v0.65.0, gałąź `claude/widok-ukladu`. W tym etapie gra **nie została zmieniona** — doszedł tylko
skrypt pomiarowy `scripts/perf-view.ts`.

**Zastrzeżenie:** pomiary pochodzą z przeglądarki bezgłowej w kontenerze, a 3D jest tam rysowane programowo
(SwiftShader). `scripts/perf.ts` dodatkowo spowalnia procesor 4× i działa na podglądzie `npm run dev`. Wartości służą do
porównania „przed / po” w etapie F, **nie są pomiarem iPada**. Ostatni pomiar na iPadzie właściciela (v0.46):
2D 54 kl./s (najsłabsza s. 24), 3D 56 kl./s (15).

## 1. Obecny przepływ (kod)

| Element | Gdzie | Jak działa dziś |
|---|---|---|
| Start | `src/app/main.ts` → `start()` | Bezpiecznik startu (`bootGuard.ts`) → `GameController` (wczytanie zapisu) → wybór grafiki: `PlanetView` (3D, Three.js), gdy WebGL jest dostępny i gracz wybrał 3D; inaczej `CanvasPlanetFallback` (2D) → `SpaceBackground` (tło) → `withSpace(...)` (opakowanie wyświetlacza) → sceny Phaser. |
| Sceny Phaser | `game/scenes/` | `PlanetScene` (ekran główny: HUD, panele, gesty), `MapScene` (galaktyka **i** widok układu), `EmpireScene`, `ResearchScene`, `OverlayScene`. Phaser działa w trybie **CANVAS** (bez własnego WebGL). |
| Interfejs UI ↔ grafika | `planet-renderer/PlanetDisplay.ts` | Jedyne połączenie: `setPlanet`, `setStructures`, `setZoom` (0,8×–3,5×), `drag`, `pick…`, `setOrbital…`, `setHomeStation`, `resize`, `dispose`. |
| Renderer 3D | `PlanetView.ts` | **Jeden** `THREE.WebGLRenderer` na całą grę (tworzony raz przy starcie). Zmiana planety (`setPlanet`) zwalnia stare obiekty (`disposeObject`) i buduje nowe w tej samej scenie. Pętla `requestAnimationFrame` **rysuje w każdej klatce**, także przy bezruchu. |
| Widok 2D | `CanvasPlanetFallback.ts` + `discRenderer.ts` | Pikselowa tarcza przeliczana tylko przy obrocie (> 0,01 rad) albo rosnącej budowli, ale **składanie klatki** (poświata, tarcza, budowle, orbity) odbywa się w każdej klatce. |
| Zmiana planety imperium | `GameController.switchPlanet` → `display.setPlanet` | Nalicza czas nieaktywnej planety (ok. 1 ms), potem pełna przebudowa wyglądu: generowanie terenu + **siatka pól** (patrz pomiar — najdroższa część). |
| Kamera / zoom | `PlanetView.zoomer`, `CanvasPlanetFallback.zoom` | Jeden współczynnik 0,8×–3,5× (płynny), autoobrót słabnie od 1× do 2×. Brak pojęcia „poziomu widoku”. |
| Gesty | `game/ui/gestures.ts`, `PlanetScene` | Przeciągnięcie = obrót planety z bezwładnością (`dragRotator`), szczypanie i kółko = zoom; gest startuje tylko poza panelami. |
| Tło | `planet-renderer/spaceBackground.ts` | Osobne płótna DOM (gwiazdy daleko / blisko, ciała niebieskie) przesuwane z orientacją planety (paralaksa). |
| Warstwa kolonii | `planet-renderer/colony.ts`, `colonyMeshes.ts`, `metalComplexMeshes.ts` | 3D: `InstancedMesh` na rodziny budynków; 2D: symbole rysowane na tarczy. |
| Bezpiecznik 3D → 2D | `app/bootGuard.ts` | Gdy poprzedni start się nie udał — tryb bezpieczny (2D). Utrata kontekstu WebGL → komunikat. |

**Mapa dziś:** `MapScene` ma już dwa tryby: **galaktyka** (100 układów, przesuwanie i przybliżanie) oraz **układ**
(gwiazda, orbity, miniatury planet `PlanetThumbnail` jako tekstury Canvas, gazowe olbrzymy rysowane wektorowo, pas
asteroid). Pozycje planet w układzie liczone są z czasu świata (`core/galaxy/orbits.ts`). To dobra baza dla etapów C i E.

## 2. Dane układów i obiektów

| Dane | Skąd | Deterministyczne? | Zapisywane? |
|---|---|---|---|
| Galaktyka (100 układów: położenie x/y, gwiazda, liczba planet) | `core/galaxy/galaxy.ts` z id galaktyki | tak | nie (liczone) |
| Układ: planety, orbity (j.a.), strefy, typy, kąt startowy, gazowe olbrzymy, pas asteroid | `generateSystem(galaxy, index)` — osobne strumienie losowania | tak | nie (liczone przy każdym użyciu) |
| Położenie planety na orbicie | `orbitAngle(faza, okres, czas świata)` — okres 2–25 min | tak (czas świata) | nie |
| Planeta (teren, wygląd, zasobność) | `generatePlanet(definicja, adres)` + `GENERATOR_VERSION` | tak | nie (tylko adres i seed w zapisie) |
| Własne planety: poziomy, pola, kompleksy | zapis `slots[]` | — | **tak** |
| Gniazda piratów | `pirateNests` (strumień `pirates`) | tak | nie |

Wniosek: widok układu może powstać **bez zmiany zapisu i adresów**. Jedyna nowa rzecz do zapisu to ostatni widok
(etap B), jako opcjonalne pole.

## 3. Pomiary

### Generowanie (Node, `node scripts/perf-generation.ts`, mediana z 3, ms)

| Etap | Czas |
|---|---:|
| dane planety | 0,1–0,3 |
| teren 3D (pieczenie) — zależnie od metody | 0,2–265 (najwolniej „erosion”) |
| woda / lawa | 0–55 |
| **siatka pól** | **333–650** |
| razem (najgorszy typ × metoda) | **ok. 780** |

Siatka pól jest najdroższa. Każde „wejście” na inną planetę kosztuje dziś ok. 0,4–0,8 s na komputerze, a na iPadzie
kilka razy więcej. W płynnym przybliżaniu dowolnej planety trzeba to ukryć w czasie lotu kamery albo rozłożyć na klatki
(etap D).

### Przeglądarka (`node scripts/perf.ts … --deep`, podgląd dev, procesor 4× wolniej)

| Grafika | Pomiar | Wynik |
|---|---|---:|
| 2D | start (do gotowych paneli) | 27,2 s |
| 2D | klatki: bez panelu 1× / przybliżenie 2,7× / panel „Produkcja” | 4 / 3 / 3 kl./s |
| 2D | pamięć JS: start → 10 → 20 zmian planety | 33,0 → 37,6 → 37,9 MB |
| 3D | start | 26,3 s |
| 3D | klatki: bez panelu 1× / przybliżenie 2,7× / panel | 2 / 1 / 2 kl./s |
| 3D | rysowania / trójkąty / geometrie / tekstury (planeta startowa) | 44 / 102 234 / 48 / 2 |
| 3D | pamięć JS: start → 10 → 20 zmian planety | 36,3 → 41,5 → 41,9 MB |
| 3D | geometrie / tekstury: start → 10 → 20 zmian | 48/2 → 57/2 → 57/2 |

Bardzo niskie klatki to skutek kontenera (podgląd bez budowania, 3D programowe, 4× wolniej) — liczby porównujemy tylko
między wersjami.

### Widok (`node scripts/perf-view.ts`, nowy skrypt)

| Pomiar | 2D | 3D |
|---|---|---|
| Konteksty WebGL utworzone przy starcie | 1 | **3** |
| Wywołania `requestAnimationFrame` przy bezruchu (wszystkie pętle) | ~107/s | ~21/s (wolne 3D programowe) |
| Kolonia: metal 40, kryształy 19, energia 30, magazyn 20, kolektor 10, lab. 10 — przeliczenie wyglądu | 27 ms | 197 ms |
| Ta sama kolonia — rysowania / trójkąty / geometrie | — | 46 / 129 418 / 55 |
| Mapa galaktyki — obiektów Phaser | 10 (rysowane w kilku grafikach zbiorczych) | 10 |
| Mapa układu — obiektów / miniatur planet (tekstury) | 14 / 8 | 14 / 8 |

## 4. Wnioski z audytu

1. **Konteksty WebGL (do poprawy w etapie D):** w 3D powstają 3 konteksty — test `hasWebGL()` (`PlanetView.ts`), test
   możliwości urządzenia w Phaserze i właściwy renderer. Dwa testowe **nie są zwalniane**. Na iPadzie każdy kontekst
   to pamięć grafiki. Poprawka: zwolnić kontekst testowy (`WEBGL_lose_context`), a test Phasera ograniczyć, jeśli się da.
2. **Pętla rysowania działa zawsze:** 3D rysuje każdą klatkę, nawet gdy nic się nie rusza (poza autoobrotem). 2D składa
   klatkę zawsze. Kandydat do „rysowania na żądanie” (etap F) — ale autoobrót planety jest ciągłym ruchem, więc oszczędność
   zależy od decyzji, czy w widoku układu planeta ma się obracać.
3. **Wycieków przy zmianie planety nie ma:** po pierwszych 10 zmianach przybywa 9 geometrii (pamięć podręczna wyglądu),
   potem liczba stoi. Pamięć JS rośnie o ok. 5 MB i się stabilizuje.
4. **Najdroższe jest wejście na planetę** (siatka pól 0,3–0,65 s na komputerze). Płynny zoom z układu na planetę musi
   zacząć liczenie przy wyborze obiektu, zanim kamera doleci (etap D), i ewentualnie rozłożyć je na kroki.
5. **Kolonia na poz. 40 w 3D: 46 rysowań, ok. 130 tys. trójkątów** — w budżecie. Przeliczenie wyglądu 0,2 s przy dużej
   zmianie (jednorazowo).
6. **Mapa jest lekka** (10–14 obiektów Phaser, miniatury jako tekstury tworzone raz na wejście w układ). Widok układu
   da się zbudować na tym kodzie (`MapScene` → nowa scena widoku).

## 5. Plan zmian (do akceptacji)

### Pozycje obiektów w układzie
**Propozycja: zostają powolne orbity z czasu świata**, jak dziś na Mapie (`orbitAngle`, okres 2–25 min). Są
deterministyczne z adresu i czasu, bez zapisu i bez zmiany adresów. Na czas przybliżania kamera „przykleja się” do
poruszającego się obiektu. Na powierzchni planety nic się nie zmienia. Alternatywa (statyczne pozycje) jest prostsza,
ale traci żywy układ, który już jest w grze.

### Etapy (każdy = osobna wersja, gra zawsze działa)

| Etap | Co | Najważniejsze pliki | Ryzyka |
|---|---|---|---|
| **B** — model nawigacji (core) | `core/view/` — stan `{ poziom, układ, obiekt, zoom }`, jeden ciągły zoom z progami i histerezą, czyste funkcje: przejścia, „wstecz”, reset. Zapis ostatniego widoku (opcjonalne pole `view`, brak = start na aktywnej planecie; także import `PF2:`). Testy. Dotknięcie własnej planety → `GameController.switchPlanet` (nie bezpośrednio). | `src/core/view/viewState.ts`, `core/save/empire.ts`, `docs/SAVE_FORMAT.md`, testy | Niewielkie — sama logika. |
| **C** — układ 2D jako ekran główny | Nowa warstwa widoku układu (Canvas 2D, bez nowego WebGL): gwiazda, orbity, obiekty z miniatur (pamięć podręczna tekstur), oznaczenie własnych planet, lot kamery z wygładzaniem, ścieżka „Galaktyka › Układ › Planeta”, „Resetuj widok”, strefy dotyku ≥ 44 pt. Kod rysowania przeniesiony z `MapScene`. | nowy `planet-renderer/systemView.ts` (rysowanie), `game/scenes/PlanetScene.ts` (nawigacja), wspólne funkcje z `MapScene.ts` | Gesty: szczypanie musi przechodzić przez poziomy, przeciąganie raz przesuwa układ, raz obraca planetę. |
| **D** — przejście układ ↔ planeta | Miniatura w układzie płynnie przechodzi w pełny widok (2D lub 3D), bez czarnej klatki: dopasowanie skali i położenia, krótki crossfade. Jeden renderer 3D (już jest), zwolnione konteksty testowe, siatka planety liczona od wyboru obiektu (w czasie lotu), pamięć podręczna 2–3 planet, renderer stoi, gdy 3D niewidoczne. Najpierw pomiar, potem ewentualnie podział siatki pól na kroki. | `PlanetView.ts`, `CanvasPlanetFallback.ts`, `main.ts`, `GameController` (wcześniejsze liczenie) | **Największe:** koszt siatki pól (0,3–0,65 s × iPad), pamięć 3D przy pamięci podręcznej, determinizm przy dzieleniu na kroki. |
| **E** — galaktyka → układ i inne obiekty | Mapa otwiera galaktykę, dotknięcie układu → płynne wejście; gazowe olbrzymy, pas asteroid, komety, gwiazda — wygląd 2D z istniejących danych + panel z istniejącymi informacjami (bez nowych mechanik). Culling i etykiety zależne od zoomu. | `MapScene.ts` (galaktyka), `systemView.ts` | Spójność z obecnymi akcjami mapy (kolonizacja, ekspedycje, wyszukiwarka). |
| **F** — optymalizacja i pomiary po | Rysowanie na żądanie, niższa rozdzielczość w czasie lotu, diagnostyka (poziom widoku, rysowania, siatki w pamięci podręcznej), `docs/pomiary/widok-ukladu-po.md` (tabela przed/po). | `PlanetView.ts`, `CanvasPlanetFallback.ts`, `main.ts`, `scripts/perf-view.ts` | — |

**Zapis:** jedyne nowe pole to `view` (ostatni widok, opcjonalne, z walidacją). Gospodarka, badania, SI Matka, kompleks
kopalni metalu i format zapisu planet — bez zmian. `GENERATOR_VERSION` bez zmian.

**Lore:** „Galaktyka”, „Układ” i opisy obiektów zostają robocze (O-301, O-002). Nowych tekstów fabularnych nie
dodaję — panele obiektów pokażą tylko dane, które już są w grze.

## 6. Pytania do decyzji przed etapem B

1. Orbity: **powolny ruch z czasu świata** (propozycja) czy pozycje stałe?
2. Czy planeta w widoku z bliska ma się dalej **sama obracać** (dziś tak)? Od tego zależy, ile da „rysowanie na żądanie”.
3. Czy dotychczasowy ekran **Mapa → układ** ma zniknąć (zastąpi go nowy widok), czy zostać do etapu E?
