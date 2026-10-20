# Planet Forge — instrukcje dla Claude Code

Ten plik Claude Code czyta automatycznie przy każdej sesji w tym repozytorium.
Jest głównym briefem technicznym. Pełna wizja: `docs/technical-brief.md`. Decyzje: `docs/decisions.md`.

## Kim jest właściciel i jak z nim pracować

- Właściciel **nie programuje** i pracuje głównie na **iPadzie (Safari)**. Nie zakładaj terminala, skrótów klawiszowych desktopu ani narzędzi macOS/Windows po jego stronie.
- Odpowiadaj **po polsku**, prostym językiem. Na końcu każdej pracy napisz: co się zmieniło, jak to sprawdzić na iPadzie (konkretne kroki dotykowe) i co proponujesz dalej (jeden krok).
- Pracuj **małymi, sprawdzalnymi krokami**. Jeden etap = jeden działający rezultat.
- Nie twierdź, że coś przetestowałeś, jeśli tego nie uruchomiłeś. Testu na fizycznym iPadzie nie możesz wykonać sam — zawsze przekaż właścicielowi krótką listę kontrolną.

## Czym jest gra

Przeglądarkowa strategia sci-fi w klimacie OGame. Gracz zarządza **jedną planetą**: obraca ją palcem w 3D, gospodaruje zasobami, ulepsza budynki. Styl: kosmiczny dziennik ekspedycji — ciemne tło, stonowany turkus i kamień, złote akcenty, spokojna typografia. Interfejs po polsku.

## Stan obecny (v0.3 — działa)

- Planeta 3D (Three.js) generowana deterministycznie z **seeda**: ląd, ocean, chmury, atmosfera, gwiazdy. Obrót palcem z bezwładnością, powolny autoobrót.
- **5 typów planet** (dane robocze): umiarkowana (Kepler-186 f, planeta startowa), pustynna, lodowa, oceaniczna, wulkaniczna (świecąca lawa). Typ nowej planety wynika z seeda (`pickDefinition`).
- **Kolonia na powierzchni**: każdy poziom budynku = kolejna budowla na planecie (do 10 na typ, potem budowle rosną). Po ulepszeniu planeta obraca się, by pokazać nową budowlę, która „wyrasta” z animacją.
- Atmosfera: poświata zanikająca płynnie poza krawędzią + mgiełka na tarczy, słabsza po nocnej stronie (naprawiona „aureola” z v0.1).
- Awaryjny widok 2D (Canvas), gdy WebGL jest niedostępny — ta sama planeta z tego samego seeda, budowle jako świecące punkty.
- HUD w Phaser: pasek zasobów (metal, kryształy, bilans energii), panel planety (klasa, promień, złoża, środowisko), 3 budynki z ulepszaniem, komunikaty, okno „Nowa planeta”.
- Ekonomia w czasie rzeczywistym (na minutę), energia ogranicza wydajność kopalń.
- **Czas budowy**: ulepszenie trwa `buildSecondsPerLevel` (30 s) × docelowy poziom; naraz jedna budowa; koszt pobierany na starcie, anulowanie (drugim dotknięciem) zwraca go w całości. Budowa kończy się także offline (`advance` dzieli czas w chwili ukończenia). Na karcie pasek postępu i odliczanie, na planecie złote rusztowanie rosnące z postępem.
- Zapis w `localStorage` (co 10 s, przy schowaniu karty, po akcji, po ukończeniu budowy) + naliczanie produkcji offline (maks. 8 h). Trwająca budowa jest częścią zapisu (pole opcjonalne). Format zapisu i `GENERATOR_VERSION` bez zmian względem v0.1 — stare zapisy działają.
- Układ responsywny: iPad poziomo (kolumny), pionowo i telefon (wiersz kart); safe-area; brak przewijania/zoomu strony.
- 56 testów: seed/RNG, generator, zakresy i walidacja wszystkich typów planet, regresja planety startowej, ekonomia i budowa (kolejka, anulowanie, ukończenie offline), zapis, kontroler, gest obrotu, układ ekranu, rozmieszczenie kolonii.

## Architektura — zasady, których nie łamiesz

```
src/
  core/            czysty TypeScript — ZERO importów z phaser/three/DOM
    random/        rng.ts (jedyny PRNG; zakaz Math.random w logice), noise.ts
    generation/    generatePlanet.ts (GENERATOR_VERSION!, pickDefinition, validateDefinition)
    economy/       economy.ts — czyste funkcje: stan → nowy stan lub błąd
    save/          serializacja + bezpieczny dostęp do localStorage
    types.ts
  data/            planets.ts (definicje typów planet), balance.ts (wartości robocze)
  planet-renderer/ Three.js: PlanetView.ts, atmosphere.ts, colonyMeshes.ts, CanvasPlanetFallback.ts
                   czysta matematyka (bez three, testowalna): surface.ts, colony.ts, input/dragRotator.ts
                   PlanetDisplay.ts = JEDYNY interfejs między Phaser a rendererem
  game/            Phaser: scenes/PlanetScene.ts (HUD), ui/ (Button, layout, theme)
  app/             main.ts (start, resize), GameController.ts (spina core + zapis + UI)
tests/             node:test (*.test.ts)
scripts/build.mjs  esbuild → dist/index.html (jeden plik)
```

1. **Phaser = UI** (HUD, panele, przyciski, gesty → przekazanie do renderera). **Three.js = tylko wygląd planety.** **core = reguły.** Nie mieszaj.
2. UI **nigdy** nie ustawia zasobów bezpośrednio — tylko przez `GameController` → funkcje `core/economy`.
3. Każda akcja ekonomiczna: sprawdza zasoby i warunki → odejmuje koszt → stosuje efekt → zwraca nowy stan albo czytelny błąd po polsku. Testowalna bez renderowania.
4. Generowanie: seed + id definicji + `GENERATOR_VERSION`. Strumienie `gameplay` i `visual` są rozdzielone (`rng.fork`). Jeśli zmieniasz algorytm tak, że stare seedy dadzą inne planety — **podbij `GENERATOR_VERSION`**.
5. Nowy typ planety = nowy obiekt w `src/data/planets.ts` (dopisany do `PLANET_DEFINITIONS`) — testy automatycznie sprawdzą jego dane i kolonię. Renderer nie wymaga zmian: wygląd opisują pola `visual` (paleta, `ocean`, `clouds`, `polarCap`).
6. Dotyk: gest obrotu startuje tylko poza panelami (każdy panel ma blokującą strefę). Cele dotykowe ≥ 44 pt. Nic nie może zależeć od hovera.
7. Wydajność iPada: pilnuj liczby wierzchołków (`SURFACE_DETAIL`), draw calli i ciężkich shaderów. Nowe efekty dodawaj po jednym.
8. Zachowuj fallback Canvas przy każdej zmianie renderera.

## Komendy

```sh
npm install          # raz
npm run dev          # podgląd: http://localhost:5173 (też w sieci lokalnej), buduje przy odświeżeniu
npm test             # testy (node:test, Node ≥ 22.18)
npm run typecheck    # TypeScript
npm run build        # dist/index.html — jeden plik do wrzucenia gdziekolwiek
npm run check        # wszystko powyżej
```

**Po każdej zmianie kodu uruchom `npm run check`.** Napraw błędy w małym zakresie, bez przepisywania projektu.

## Zakres — czego NIE robić bez decyzji właściciela

Poza zakresem MVP: multiplayer, backend/serwer, konta i logowanie, synchronizacja między urządzeniami, walka/flota/dyplomacja, zadania/osiągnięcia/powiadomienia, sklep i płatności, analityka. Nie dodawaj też nowych frameworków (React, Vite itp.) ani płatnych usług, jeśli bieżący etap tego nie wymaga — najpierw zapytaj.

**Lore:** nazwy modyfikatorów, klas i wartości w `src/data` są **robocze** (`status: 'robocza'`). Nie wymyślaj nowych typów planet, biomów, anomalii ani cywilizacji jako kanonu — poproś o aktualną Planet Forge Lore Bible.

## Git

- Małe, logiczne commity z opisem po polsku. Przed większą zmianą `git status`.
- Nie twórz ani nie podpinaj zdalnego repozytorium GitHub bez potwierdzenia adresu przez właściciela.
- Istotne decyzje architektoniczne dopisuj do `docs/decisions.md`.

## Najbliższe etapy (proponowana kolejność — każdy to osobna sesja)

1. ~~Test na iPadzie~~ (v0.1 i v0.2 zaakceptowane) → **test v0.3 na iPadzie**: lista kontrolna z `README.md` (budowa, anulowanie, ukończenie offline).
2. ~~Czas budowy~~ (v0.3).
3. **Magazyny** — limit pojemności zasobów + budynek magazynu.
4. **Typy planet z Lore Bible** — podmiana roboczych danych w `src/data/planets.ts` na kanon (mechanizm już działa dla 5 typów).
5. **Wizualia** — pinch-zoom planety, pierścienie/księżyc jako opcja w danych, lepsze shadery (po pomiarze FPS na iPadzie).
6. **PWA** — „Dodaj do ekranu początkowego” jako pełnoekranowa aplikacja, praca offline.

Dopiero po stabilnym MVP: badania, anomalie, dawne cywilizacje, a na końcu backend/konta/multiplayer.
