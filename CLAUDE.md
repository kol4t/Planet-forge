# Planet Forge — instrukcje dla Claude Code

Ten plik Claude Code czyta automatycznie przy każdej sesji w tym repozytorium.
Jest głównym briefem technicznym. Decyzje: `docs/decisions.md`. Plan przebudowy generatora i UI: `docs/generator-plan.md`. Lore (świat gry): `docs/lore/`. (Dawny `docs/technical-brief.md` nie istnieje — nie szukaj go.)

## Kim jest właściciel i jak z nim pracować

- Właściciel **nie programuje** i pracuje głównie na **iPadzie (Safari)**. Nie zakładaj terminala, skrótów klawiszowych desktopu ani narzędzi macOS/Windows po jego stronie.
- Odpowiadaj **po polsku**, prostym językiem. Na końcu każdej pracy napisz: co się zmieniło, jak to sprawdzić na iPadzie (konkretne kroki dotykowe) i co proponujesz dalej (jeden krok).
- Pracuj **małymi, sprawdzalnymi krokami**. Jeden etap = jeden działający rezultat.
- Nie twierdź, że coś przetestowałeś, jeśli tego nie uruchomiłeś. Testu na fizycznym iPadzie nie możesz wykonać sam — zawsze przekaż właścicielowi krótką listę kontrolną.

## Czym jest gra

Przeglądarkowa strategia sci-fi w klimacie OGame. Gracz zarządza **jedną planetą**: obraca ją palcem w 3D, gospodaruje zasobami, ulepsza budynki. Styl: kosmiczny dziennik ekspedycji — ciemne tło, stonowany turkus i kamień, złote akcenty, spokojna typografia. Interfejs po polsku. (Porównanie z OGame dotyczy gospodarki i budowy; walka flot nie jest sercem gry — K-005, otwarte O-206.)

## Stan obecny (v0.22 — na gałęzi, czeka na akceptację; opublikowana v0.21)

- **Planeta 2D (domyślnie, decyzja właściciela)**: pikselowa tarcza (Canvas, `CanvasPlanetFallback.ts`) z obrotem palcem, budowle jako kwadratowe piksele. **3D (Three.js) to opcja** w Ustawieniach → Grafika. Obie wersje generowane deterministycznie z **seeda**: ląd, ocean, chmury, atmosfera, gwiazdy. Obrót palcem z bezwładnością, powolny autoobrót.
- **Przybliżanie dwoma palcami** (1×–3,5×, `game/ui/gestures.ts` → `PlanetDisplay.setZoom`); w 2D ostre piksele przy zbliżeniu.
- **Imperium — kilka planet**: 5 miejsc na start (do 10 po odblokowaniu w przyszłości), ekran „Imperium” z miniaturami planet (`PlanetThumbnail`, przejdź / usuń; nowe planety z mapy), nieaktywne planety nadrabiają czas jak offline, antymateria wspólna. Zapis `empire.ts` (`planet-forge.empire.v1`), miejsca mają `kind` (na razie `'planet'`; później księżyce, stacje…).
- **5 typów planet** (dane robocze): umiarkowana (Kepler-186 f, planeta startowa), pustynna, lodowa, oceaniczna, wulkaniczna (świecąca lawa). Typ nowej planety wynika z seeda (`pickDefinition`).
- **Kolonia na powierzchni**: każdy poziom budynku = kolejna budowla na planecie (do 10 na typ, potem budowle rosną). Po ulepszeniu planeta obraca się, by pokazać nową budowlę, która „wyrasta” z animacją.
- Atmosfera: poświata zanikająca płynnie poza krawędzią + mgiełka na tarczy, słabsza po nocnej stronie (naprawiona „aureola” z v0.1).
- Widok 2D działa też jako zabezpieczenie, gdy WebGL jest niedostępny albo start w 3D się nie powiódł.
- **Magazyn** (4. budynek): pojemność metalu i kryształów osobno = 1000 × 1,6^(poz − 1). Pełny magazyn zatrzymuje przyrost (nadwyżka nie przepada). Koszt ponad pojemność → „Za mały magazyn”.
- **Antymateria** (waluta premium zdobywana w grze, bez płatności): 1/h pasywnie (także offline, w limicie 8 h) + budynek **Kolektor antymaterii** (startuje od poz. 0, zużywa energię). Zapas startowy 5.
- **„Ukończ teraz”**: do poziomu `freeFinishMaxLevel` (5) za darmo, wyżej 1 antymateria za każde rozpoczęte 15 min pozostałej budowy (`finishSecondsPerUnit`).
- Ekonomia w czasie rzeczywistym (na minutę), energia ogranicza wydajność kopalń.
- **Czas budowy**: ulepszenie trwa `buildSecondsPerLevel` (30 s) × docelowy poziom; naraz jedna budowa; koszt pobierany na starcie, anulowanie (drugim dotknięciem) zwraca go w całości. Budowa kończy się także offline (`advance` dzieli czas w chwili ukończenia). Na karcie pasek postępu i odliczanie, na planecie złote rusztowanie rosnące z postępem.
- Zapis w `localStorage` (co 10 s, przy schowaniu karty, po akcji, po ukończeniu budowy) + naliczanie produkcji offline (maks. 8 h). Trwająca budowa jest częścią zapisu (pole opcjonalne). Format zapisu i `GENERATOR_VERSION` bez zmian względem v0.1 — stare zapisy działają.
- **PWA**: manifest, ikony (180/192/512 px, renderowane skryptem z planety startowej), meta tagi iOS (pełny ekran, przezroczysty pasek statusu, `viewport-fit=cover`), service worker (offline, cache-first; nowa wersja → pasek „Dostępna aktualizacja” z przyciskiem „Odśwież”).
- **Bezpiecznik startu** (`app/bootGuard.ts`): tryb grafiki (`'2d'` domyślnie / `'3d'`); start w 3D, który nie dotrwał do 8 s pracy, przełącza na stałe na 2D; Ustawienia → „Grafika” i „Diagnostyka” (z licznikiem płynności `app/fpsMeter.ts`). Panele Phaser w **Canvas 2D** — jedyny kontekst WebGL ma planeta (pamięć grafiki iPada!).
- **Ustawienia** (przycisk w panelu planety): „Kopiuj zapis” (tekst `PF2:…` — całe imperium — do schowka; `PF1:` nadal się wczytuje), „Wczytaj zapis” (pole tekstowe HTML, walidacja, błędy po polsku), wersja gry. „Nowa planeta” jest w oknie „Twoje planety”. Na iPadzie Safari i aplikacja z ekranu początkowego mają osobną pamięć — zapis przenosi się tym tekstem.
- **Skalowanie komputer/tablet/telefon**: `u` z rozmiaru ekranu (0,8–1,1), boczne panele tylko na szerokich i wysokich ekranach, karty w kolumnach/siatce wg miejsca; safe-area; brak przewijania/zoomu strony; komputer: kółko myszy = przybliżenie.
- **Badania — galaktyka (v0.10)**: ekran „Badania” (`game/scenes/ResearchScene.ts`, układ `game/ui/galaxy.ts`) — jądro i 6 spiralnych ramion; aktywne Produktywność i Planetologia, reszta „wkrótce”, gwiazdy mistrzowskie (maks. 2 aktywne — kolejny krok). Reguły `core/research/research.ts`, dane `data/research.ts`. Od v0.15 **badania przypisane do planety** (własne Laboratorium i kolejka, efekty tylko na niej; balans liczony per planeta `balanceFor`); odblokowania (statek, SI, miejsca) działają w całym imperium, gdy zbadała je którakolwiek planeta. Budynek **Laboratorium** (6. karta; poziomo pod panelem planety) ogranicza pierścień.
- **Mapa galaktyki (v0.11)**: `core/galaxy/galaxy.ts` (deterministycznie z numeru galaktyki; galaktyka = przyszły serwer), dane `data/galaxy.ts`; 100 układów (gwiazda/pulsar/czarna dziura…, 3–10 planet, 2–3 miejsca startowe graczy — bez serwera zajmują je boty, formy obce, wolne planety). Adres planety `1:układ:orbita` = seed; typ z gwiazdy i odległości. Ekran „Mapa” (`game/scenes/MapScene.ts`): galaktyka → układ → planeta; „Skolonizuj” wolną planetę własnego układu (inne układy — po badaniu i ze statkiem, później). Ekrany pełnoekranowe dziedziczą z `OverlayScene.ts`. v0.12: galaktyka spiralna (zgrubienie + 2 ramiona, tło jako tekstura), komety w widoku galaktyki, gazowe olbrzymy (nie do kolonizacji) i pasy asteroid za 3./4. planetą (osobny strumień RNG — planety skaliste bez zmian).
- **v0.13**: statek kolonizacyjny do innych układów (badanie „Napęd międzygwiezdny” w aktywnym ramieniu Eksploracja; wysyłanie/zawracanie z mapy, trasa na mapie galaktyki, przylot też offline), ekran **„Imperium”** (`game/scenes/EmpireScene.ts`, zastępuje okno „Twoje planety”) z kartami planet i zakładką **„Dziennik”** ekspedycji (zapis `missions`, `journal`).
- **SI Matka (v0.14)**: `core/ai/advisor.ts` — reguły energia/magazyn/badania/kopalnie, propozycje z powodem; badania „SI Matka” (propozycje) i „SI wykonawcze” (poziom „działa samo”); dymek nad planetą (Tak / Nie / Zawsze tak rób), zakładka „SI” w „Imperium”, wpisy w dzienniku; zapis `ai`.
- **v0.15**: SI buduje najwyżej do poziomu Laboratorium planety (Laboratorium ulepsza gracz); badanie „Autonomia” — SI buduje przy zamkniętej grze, budowy o 50% dłuższe (`core/ai/offline.ts`).
- **v0.16**: planeta 3D w stylu low-poly (`planet-renderer/lowPoly.ts`): fasety z jednym kolorem, tarasy, ciemne klify, tafle lodu na zamarzniętym morzu, ACES, ciemniejsza noc, cieńsza atmosfera, gwiazdy w 2 warstwach z paralaksą, płynny powrót autoobrotu, „Ogranicz ruch”; styl per typ w `visual.style` (`DEFAULT_SURFACE_STYLE`).
- **v0.17**: tło kosmosu wspólne dla 2D/3D (`planet-renderer/spaceBackground.ts` + czysty `sky.ts`): gwiazdy w warstwach z paralaksą (`PlanetDisplay.orientation()`), pas galaktyki, mgławice, migotanie, rzadkie spadające gwiazdy, 1–2 prawdziwi sąsiedzi z układu; mocniejszy kontrast dnia/nocy w 2D, świecąca lawa (`discLook`).
- **v0.18 (przebudowa generatora, etap 2)**: teren jako dane w `core/surface` — siatka geodezyjna (`grid.ts`, węzły = wierzchołki lądu 3D), pole terenu z rejestrem metod (`field.ts`, na razie `legacy` = algorytm v0.1–v0.17 bez zmian), model na siatce z cieczą, materiałem, statystykami i walidacją (`buildSurface.ts`). `planet-renderer/surface.ts` jest adapterem (wysokość/lód z core, kolor/promień w rendererze). `GENERATOR_VERSION` = 1 na stałe (rozgrywka), wygląd terenu = `SURFACE_VERSION` (niezapisywana — nowy teren dostają wszystkie planety, decyzja właściciela). Roboczy typ **jałowa** (`barren`) — na mapie przez `GALAXY_RULES.laterTypes` (osobny strumień, reszta mapy bez zmian). Plan dalszych etapów: `docs/generator-plan.md`.
- **v0.19 (nowy układ ekranu, szkice właściciela)**: pasek zasobów u góry, **dolny pasek** (menu ☰ + Produkcja, Badania, Mapa, Imperium, Planeta, SI), nad nim **jeden wysuwany panel** (Produkcja / Planeta / SI) po lewej (komputer, tablet) albo na całą szerokość (telefon pionowo). Planeta ≤ 30% dłuższego boku ekranu, w wolnym miejscu obok panelu. Zastępuje boczne zwijane panele z v0.9–v0.18.
- **v0.20**: **ulepszanie dotknięciem budowli na planecie** (2D i 3D) od przybliżenia 3× (`PICK_ZOOM`, 80% drogi do maks.) — okienko „Budynek” z kartą jak w „Produkcji”; tap w `game/ui/gestures.ts`, wybór w `planet-renderer/pick.ts` (`PlanetDisplay.pickStructure`).
- **v0.21**: przycisk ☰ wysuwa panel **„Planety”** — lista planet (miniatury, stan, przełączanie dotknięciem), pod nią Ustawienia i przyciski, które nie zmieściły się na pasku.
- **v0.22 (przebudowa generatora, etap 3)**: trzy metody terenu w `core/surface/methods/` (rejestr `index.ts`): `tectonic` (płyty, pasma gór na zderzeniach), `erosion` (erozja wodna, doliny wzdłuż spływu), `fractured` (kratery, uskoki, płaskowyże); `legacy` = teren v0.1–v0.21 (test regresji). Metoda preferowana typu w `visual.terrainMethod` danych planety. Kształt „pieczony” raz do mapy sześciennej (`cube.ts`, wspólny potok `methods/baked.ts`), pamięć 24 pól w `field.ts`; wysokości przeliczane do rozkładu `legacy` (udział lądu i paleta bez zmian). `SURFACE_VERSION` = 2. Metryki terenu: `core/surface/metrics.ts`. Obrót palcem bez limitu pochylenia — przez bieguny (`input/dragRotator.ts`).
- 165 testów (w tym metody terenu, badania na planetę, galaktyka, mapa, statki, dziennik, SI i SI podczas nieobecności): seed/RNG, generator, zakresy i walidacja wszystkich typów planet, regresja planety startowej, ekonomia i budowa (kolejka, anulowanie, ukończenie offline, „Ukończ teraz”), magazyn, antymateria, zapis, kontroler, gest obrotu, układ ekranu (8 rozmiarów × 4 stany paneli), rozmieszczenie kolonii, eksport/import zapisu (imperium, PF1/PF2), kilka planet (limit, przełączanie, wspólna antymateria, migracja), licznik płynności, gesty (obrót/szczypanie), tarcza 2D, zawartość buildu (manifest, ikony, service worker), bezpiecznik startu.

## Architektura — zasady, których nie łamiesz

```
src/
  core/            czysty TypeScript — ZERO importów z phaser/three/DOM
    random/        rng.ts (jedyny PRNG; zakaz Math.random w logice), noise.ts
    generation/    generatePlanet.ts (GENERATOR_VERSION = rozgrywka, na stałe 1; SURFACE_VERSION = wygląd terenu)
    surface/       model powierzchni: grid.ts (siatka sfery), field.ts (metody terenu), buildSurface.ts (ciecz, materiał, walidacja)
    economy/       economy.ts — czyste funkcje: stan → nowy stan lub błąd
    save/          save.ts (walidacja planety/gospodarki), empire.ts (zapis imperium + localStorage), transfer.ts (eksport/import „PF2:”)
    types.ts
  data/            planets.ts (definicje typów planet), balance.ts (wartości robocze)
  planet-renderer/ Three.js: PlanetView.ts, atmosphere.ts, colonyMeshes.ts, CanvasPlanetFallback.ts, spaceBackground.ts (tło, DOM)
                   PlanetThumbnail.ts (miniatury), discRenderer.ts (tarcza 2D piksel po pikselu)
                   czysta matematyka (bez three, testowalna): surface.ts, colony.ts, discRenderer.ts, input/dragRotator.ts
                   PlanetDisplay.ts = JEDYNY interfejs między Phaser a rendererem
  game/            Phaser: scenes/PlanetScene.ts (HUD), ui/ (Button, layout, uiPrefs, theme, gestures, textPanel)
  app/             main.ts (start, resize), GameController.ts (spina core + zapis + UI),
                   pwa.ts (rejestracja SW), serviceWorker.ts (→ dist/sw.js)
tests/             node:test (*.test.ts)
scripts/           build.ts (→ dist/), dev.ts (podgląd), icons.ts + png.ts (ikony bez zewnętrznych usług)
dist/              index.html (gra w jednym pliku), manifest.webmanifest, sw.js, icons/*.png
```

1. **Phaser = UI** (HUD, panele, przyciski, gesty → przekazanie do renderera). **Three.js = tylko wygląd planety.** **core = reguły.** Nie mieszaj.
2. UI **nigdy** nie ustawia zasobów bezpośrednio — tylko przez `GameController` → funkcje `core/economy`.
3. Każda akcja ekonomiczna: sprawdza zasoby i warunki → odejmuje koszt → stosuje efekt → zwraca nowy stan albo czytelny błąd po polsku. Testowalna bez renderowania.
4. Generowanie: seed + id definicji + `GENERATOR_VERSION`. Strumienie `gameplay` i `visual` są rozdzielone (`rng.fork`). **`GENERATOR_VERSION` nie podbijaj** (zmieniłby surowce planet i unieważnił zapisy). Zmiana wyglądu terenu (`core/surface`) = podbij `SURFACE_VERSION`. Nowe losowania dopisuj w nowych strumieniach albo na końcu istniejących.
5. Nowy typ planety = nowy obiekt w `src/data/planets.ts` (dopisany do `PLANET_DEFINITIONS`) — testy automatycznie sprawdzą jego dane i kolonię. Renderer nie wymaga zmian: wygląd opisują pola `visual` (paleta, `ocean`, `clouds`, `polarCap`).
6. Dotyk: gest obrotu startuje tylko poza panelami (każdy panel ma blokującą strefę). Cele dotykowe ≥ 44 pt. Nic nie może zależeć od hovera.
7. Wydajność iPada: pilnuj liczby wierzchołków (`SURFACE_DETAIL`), draw calli, ciężkich shaderów i **pamięci grafiki** (jeden kontekst WebGL, budżet pikseli `renderPixelRatio`, bez MSAA na Retinie). Nowe efekty dodawaj po jednym.
8. Zachowuj fallback Canvas przy każdej zmianie renderera.
9. Ścieżki w buildzie są **względne** (gra może działać w podfolderze, np. GitHub Pages). Service worker tylko w `npm run build` (`__PWA__`), nigdy w `npm run dev`. Każda zmiana plików w `dist/` = nowa wersja pamięci podręcznej i komunikat o aktualizacji u graczy.

## Komendy

```sh
npm install          # raz
npm run dev          # podgląd: http://localhost:5173 (też w sieci lokalnej), buduje przy odświeżeniu
npm test             # testy (node:test, Node ≥ 22.18)
npm run typecheck    # TypeScript
npm run build        # dist/ — cały folder do wrzucenia na hosting https (PWA)
npm run check        # wszystko powyżej
```

**Po każdej zmianie kodu uruchom `npm run check`.** Napraw błędy w małym zakresie, bez przepisywania projektu.

## Zakres — czego NIE robić bez decyzji właściciela

Poza zakresem MVP: multiplayer, backend/serwer, konta i logowanie, synchronizacja między urządzeniami, walka/flota/dyplomacja, zadania/osiągnięcia/powiadomienia, sklep i płatności, analityka. Nie dodawaj też nowych frameworków (React, Vite itp.) ani płatnych usług, jeśli bieżący etap tego nie wymaga — najpierw zapytaj.

**Balans (decyzja właściciela):** ceny, czasy i koszty (budynki, badania, antymateria) stroimy **na końcu, przed MVP** — do tego czasu wartości w `src/data` są robocze; nie proponuj strojenia liczb jako osobnego kroku.

**Lore:** nazwy modyfikatorów, klas i wartości w `src/data` są **robocze** (`status: 'robocza'`). Nie wymyślaj nowych typów planet, biomów, anomalii ani cywilizacji jako kanonu. **Przed dodaniem lub zmianą treści fabularnych** (nazwy, opisy, teksty dziennika, frakcje, technologie) sprawdź `docs/lore/CANON_STATUS.md` (kanon K-xxx) i filtr K-011; wszystko spoza kanonu oznaczaj jako robocze. Gdzie w kodzie są nazwy dotykające lore: `docs/lore/nazwy-w-grze.md`. Lore powstaje w Projekcie na claude.ai — w repozytorium jest kopia; jeśli wygląda na nieaktualną, zapytaj właściciela.

## Git

- Małe, logiczne commity z opisem po polsku. Przed większą zmianą `git status`.
- **`main` = gra opublikowana** (każde wypchnięcie do `main` publikuje grę na GitHub Pages). Pracuj na gałęzi `claude/…`; do `main` scalaj dopiero po akceptacji właściciela. Wyjątek: poprawka błędu, przez który opublikowana gra nie działa (hotfix) — od razu, z informacją dla właściciela.
- Nie twórz ani nie podpinaj zdalnego repozytorium GitHub bez potwierdzenia adresu przez właściciela.
- Istotne decyzje architektoniczne dopisuj do `docs/decisions.md`.

## Najbliższe etapy (każdy to osobna sesja, gałąź `claude/…`, akceptacja przed `main`)

**W toku: przebudowa generatora planet i UI** według `docs/specyfikacja-generatora-i-ui.md` — plan, kontrakty i lista plików w `docs/generator-plan.md`. Etap 1 audyt ✔, etap 2 wspólny model powierzchni ✔ (v0.18).

0. ~~Porządki w dokumentacji, lore w repozytorium~~ (2026-10-22).
1. ~~Pomiar płynności~~ (v0.21: 3D 59/48 kl./s, 2D 58/50 — `docs/decisions.md`).
2. ~~Trzy metody terenu~~ (v0.22, etap 3 planu generatora) — czeka na test na iPadzie.
3. **Sześć profili i `npm run atlas`** (v0.23, etap 4) — profile to kategorie techniczne, nie kanoniczne typy planet.
4. **Woda i lawa** (v0.24, etap 5) — po etapie ponowny pomiar kl./s.
5. **Światło, atmosfera, kamera** (v0.25, etap 6).
6. **Dokończenie UI** (v0.26, reszta etapu 7 — dolny pasek i panel już są od v0.19).
7. **Laboratorium planet** (v0.27, etap 8) i raport końcowy przebudowy.

**Potem — do wyboru przez właściciela:** księżyc jako pierwsza lokacja wokół planety; gwiazdy mistrzowskie i mosty w badaniach; osobny ekran SI; typy planet z Lore Bible (gdy lore rozstrzygnie O-004).

**Zrobione wcześniej:** czas budowy (v0.3), magazyn (v0.4), antymateria (v0.5; zakup za pieniądze — dopiero z backendem), PWA (v0.6) i hosting — GitHub Pages `https://kol4t.github.io/Planet-forge/`, automatycznie z `main` (`.github/workflows/pages.yml`), pinch-zoom (v0.8), poprawki UI (v0.9, v0.19–v0.21), badania — galaktyka (v0.10; szczegóły w `docs/decisions.md`; aktywne ramiona: Produktywność, Planetologia, Eksploracja, SI; dalej Stacja i handel, Flota), SI Matka i wykonawcze (v0.14), SI przy zamkniętej grze (v0.15).

**Do zrobienia później (decyzja właściciela — odłożone, nie zapominać):** **DNA** — generator planet, SI i badania oparte na „DNA”, z którego powstają stworzenia (do doprecyzowania z właścicielem i Lore Bible); stacja badawcza — badania dla całego imperium; osobny ekran SI (priorytety, parametry, zadania, wybór planet); mapa — wydobycie z gazowych olbrzymów i pasów asteroid, Stocznia (razem z flotą), działania botów i form obcych, obiekty między układami (stacje, porty handlowe, planety gildii), kolejne galaktyki = serwery; badania — gwiazdy mistrzowskie (maks. 2 aktywne naraz, zamiana) i mosty między ramionami; lokacje wokół planety — księżyc jako pierwsza (mała pikselowa kulka na orbicie w 2D, opcja w danych planety), potem stacje kosmiczne, ekspedycje, szlaki handlowe; odblokowują miejsca 6–10 w „Twoje planety” (`planetSlots.max`, `SlotSave.kind`); wizualia — pierścienie jako opcja w danych (zapas płynności: 60/53 kl./s na iPadzie właściciela).

Dopiero po stabilnym MVP: anomalie, dawne cywilizacje (z Lore Bible), a na końcu backend/konta/multiplayer.
