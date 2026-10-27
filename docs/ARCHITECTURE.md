# Architektura

Stan: v0.46 (audyt). Krótko: **core = reguły, data = liczby, planet-renderer = wygląd planety, game = interfejs (Phaser), app = spinanie wszystkiego.**

## Warstwy i katalogi

```
src/
  core/              czysty TypeScript — ZERO importów z phaser / three / DOM (wyjątek: bezpieczny dostęp do localStorage w save/empire.ts)
    random/          rng.ts (jedyny generator losowy w logice — zakaz Math.random), noise.ts
    generation/      generatePlanet.ts (GENERATOR_VERSION = 1 na stałe; SURFACE_VERSION = wygląd terenu), fields.ts (liczba pól)
    surface/         model powierzchni: grid.ts (siatka sfery), field.ts + methods/ (metody terenu: legacy, tectonic, erosion,
                     fractured), cube.ts (pieczenie do mapy sześciennej), hydrology.ts (jeziora, rzeki, lawa), profile.ts, metrics.ts
    colony/          fieldGrid.ts (pola planety z mapy powierzchni), plots.ts (obszary budynków), complexes.ts (kompleksy)
    economy/         economy.ts (produkcja, energia, magazyn, budowa, kolejka, offline), footprint.ts (etapy i pola),
                     asteroids.ts, comets.ts, starEnergy.ts, transport.ts, finds.ts, geology.ts, specialization.ts
    research/        research.ts (koszt, czas, efekty badań → balans)
    galaxy/          galaxy.ts (100 układów z numeru galaktyki), orbits.ts, discovery.ts, expeditions.ts, galaxyIndex.ts
    ai/              advisor.ts (SI Matka: reguły i propozycje), offline.ts (SI pod nieobecność — „Autonomia”)
    save/            save.ts (walidacja planety i gospodarki), empire.ts (zapis imperium, localStorage), transfer.ts (PF1/PF2)
    time/            worldClock.ts (wspólny czas świata — orbity)
    types.ts         wspólne typy
  data/              wartości robocze: balance.ts, planets.ts, profiles/, research.ts, galaxy.ts, footprint.ts, complexes.ts,
                     industry.ts, specializations.ts, finds.ts — tabele: docs/BALANCE.md (generowane)
  planet-renderer/   wygląd planety
    PlanetDisplay.ts JEDYNY interfejs między UI a rendererem (patrz niżej)
    PlanetView.ts    3D (Three.js): ląd low-poly, morze, chmury, atmosfera, kolonia (colonyMeshes.ts), linie pól
    CanvasPlanetFallback.ts + discRenderer.ts   2D (domyślny): pikselowa tarcza liczona piksel po pikselu
    czysta matematyka (bez three, testowana): surface.ts, colony.ts, complexLook.ts, pick.ts, fieldOverlay.ts, sky.ts,
                     lowPoly.ts, adaptiveResolution.ts, input/ (obrót palcem, zoom)
    spaceBackground.ts  tło kosmosu (DOM/Canvas) wspólne dla 2D i 3D
    PlanetThumbnail.ts  miniatury planet (2D, bez stanu) — używane bezpośrednio przez ekrany (świadomy wyjątek)
  game/              Phaser = interfejs
    scenes/          PlanetScene.ts (HUD: pasek zasobów, dolny pasek, panele, karty), ResearchScene.ts, MapScene.ts,
                     EmpireScene.ts, OverlayScene.ts (wspólna baza ekranów pełnoekranowych)
    ui/              layout.ts (czysty układ ekranu → prostokąty), gestures.ts, Button.ts, theme.ts, okna HTML (*Panel.ts,
                     buildingCard.ts), mapCamera.ts, galaxy.ts (układ „Badań”), uiPrefs.ts (ustawienia urządzenia)
  app/               main.ts (start, rozmiar, zapis co 10 s, dziennik błędów), GameController.ts (spina core + zapis + UI),
                     bootGuard.ts (bezpiecznik startu 2D/3D), fpsMeter.ts, feedback.ts (zgłoszenia), pwa.ts, serviceWorker.ts
tests/               node:test (*.test.ts) — docs/TESTING.md
scripts/             build.ts, dev.ts, icons.ts, atlas.ts, balance-doc.ts, preview-stages.ts, screens.ts, perf.ts, perf-generation.ts
dist/                gra w jednym pliku index.html + manifest, sw.js, ikony (publikowane na GitHub Pages)
```

## Przepływ danych

```
 dotyk / klawisz / mysz
        │
        ▼
 game/ (Phaser: PlanetScene, ekrany)  ──pytania o stan──▶  app/GameController  ──▶  core/* (czyste funkcje: stan → nowy stan albo błąd)
        │                                   │    ▲                                    │
        │ wygląd planety                    │    └──────── nowy stan ◀────────────────┘
        ▼                                   │
 PlanetDisplay (interfejs)                  ├──▶ core/save → localStorage (co 10 s, po akcji, przy schowaniu karty)
   ├─ PlanetView (3D, Three.js)             └──▶ zdarzenia (budowa gotowa, badanie, dostawa…) → komunikaty w UI
   └─ CanvasPlanetFallback (2D)
```

1. UI **nigdy** nie zmienia zasobów samo — woła metodę `GameController` (np. `upgrade`, `enqueue`, `startResearch`).
2. `GameController` najpierw nalicza czas (`tick` → `advance` w `core/economy`), potem woła czystą funkcję akcji
   (sprawdza warunki → odejmuje koszt → stosuje efekt → zwraca nowy stan albo błąd po polsku), zapisuje i powiadamia UI.
3. Renderer dostaje tylko dane do pokazania (`setPlanet`, `setStructures`, `setHighlight`…) przez `PlanetDisplay`.

## Zasady (z CLAUDE.md, sprawdzone w audycie v0.46)

| Zasada | Stan | Uwagi |
|---|---|---|
| core bez phaser / three / DOM | ✔ | jedyny wyjątek: `globalThis.localStorage` w `core/save/empire.ts`, w try/catch |
| UI zmienia stan tylko przez GameController | ✔ | ekrany importują z core wyłącznie czyste funkcje do odczytu i formatowania |
| zero `Math.random` w logice | ✔ | jedyne użycie: `planet-renderer/spaceBackground.ts` — spadające gwiazdy (tylko wygląd) |
| `PlanetDisplay` jedyny styk UI ↔ renderer | ✔ z wyjątkiem | `PlanetThumbnail` (miniatury 2D bez stanu) i start rendererów w `app/main.ts` |
| `GENERATOR_VERSION` nie podbijany | ✔ | = 1; wygląd terenu — `SURFACE_VERSION` |
| fallback Canvas przy każdej zmianie renderera | ✔ | 2D jest domyślny; 3D tylko z Ustawień, z bezpiecznikiem startu |
| ścieżki względne, SW tylko w buildzie | ✔ | `__PWA__` = false w `npm run dev` |

## Determinizm

- Planeta = `generatePlanet(definicja, seed)`; strumienie losowe `gameplay` i `visual` rozdzielone (`rng.fork`), nowe losowania
  w nowych strumieniach. Adres w galaktyce (`1:układ:orbita`) jest seedem.
- Siatka pól, obszary budynków, znaleziska, ekspedycje, ładunki komet — deterministyczne z seeda i chwil zapisanych w stanie.
- Czas świata (`core/time/worldClock.ts`) — orbity liczone z czasu, bez zapisu.

## Wydajność — gdzie są koszty

- Siatka pól (`buildFieldGrid`, ~200–300 ms na komputerze, liczona raz na planetę, pamięć 16 siatek) i pieczenie terenu
  (20–100 ms). Planety nieaktywne nie liczą siatek przy starcie (`SlotSave.fields`).
- 3D: jeden kontekst WebGL (panele w Canvas 2D), budżet pikseli i automatyczna rozdzielczość (`adaptiveResolution.ts`).
- Szczegóły i liczby: `docs/PERFORMANCE.md`.
