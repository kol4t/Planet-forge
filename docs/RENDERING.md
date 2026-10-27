# Rendering — generator planet, 2D i 3D, kamera i gesty

Stan: v0.46. Szczegółowy plan przebudowy generatora: `docs/generator-plan.md`, specyfikacja: `docs/specyfikacja-generatora-i-ui.md`.

## Generator planety

```
seed (np. adres „1:16:3”) + definicja typu (src/data/planets.ts) + GENERATOR_VERSION (= 1, na stałe)
  └─ generatePlanet → Planet { gameplay (bogactwo, środowisko, pola, rozmiar), visual (paleta, ocean, chmury, metoda terenu…) }
       strumienie losowe gameplay / visual rozdzielone (rng.fork) — wygląd nie zmienia rozgrywki
```

| Wersja | Wartość | Znaczenie |
|---|---|---|
| `GENERATOR_VERSION` | 1 | rozgrywka (surowce, pola) — **nie podbijać**, unieważniłoby zapisy |
| `SURFACE_VERSION` | 4 | wygląd terenu — niezapisywana; podbicie = nowy teren dla wszystkich planet |
| `FIELD_GRID_VERSION` | 3 | siatka pól — inna wersja w zapisie = przydział pól od nowa |
| `PLOTS_LAYOUT` | 2 | układ obszarów budynków (spójny kawałek od v0.45) |

### Teren (`src/core/surface/`)

1. **Profil powierzchni** (`src/data/profiles/`: terrestrial, arid, ice, oceanic, volcanic, barren — kategorie techniczne,
   R-003): paleta, materiały, ciecz (woda/lawa), oczekiwany ląd, metody terenu z wagami.
2. **Metoda terenu** (`methods/`): `legacy` (algorytm v0.1–v0.21), `tectonic` (płyty i pasma gór), `erosion` (doliny
   spływu), `fractured` (kratery, uskoki). Wybór z wag profilu (osobny strumień). Kształt „pieczony” raz do mapy
   sześciennej (`cube.ts`), wysokości przeliczane do rozkładu `legacy` (ten sam udział lądu).
3. **Hydrologia** (`hydrology.ts`): jeziora z płaskim lustrem, rzeki do morza, lawa (jeziora, strumienie ze szczytów).
4. **Siatka pól** (`core/colony/fieldGrid.ts`): 40 tys. punktów Fibonacciego → rodzaj (ląd/woda/lód/lawa) → pola
   dokładnie w liczbie z seeda (Lloyd po terenie, granica nie przechodzi przez wodę), teren pola (dolina, równina,
   wzgórze, góra), brzeg, granice do rysowania.

`npm run atlas` → `docs/atlas/` — obraz wszystkich profili × metod terenu z metrykami.

## 2D (domyślny) i 3D (opcja)

| | 2D — `CanvasPlanetFallback` + `discRenderer` | 3D — `PlanetView` (Three.js) |
|---|---|---|
| Kiedy | domyślnie (decyzja właściciela); też gdy brak WebGL albo 3D się nie uruchomiło | Ustawienia → Grafika → „Włącz 3D” |
| Planeta | pikselowa tarcza liczona piksel po pikselu z próbek terenu, światło dnia/nocy, mgiełka | ląd low-poly (ikosfera `SURFACE_DETAIL` = 40), tarasy, klify, morze, lustra jezior, lawa, chmury, atmosfera |
| Kolonia | grunt kompleksu w tarczy (`complexGround`), pikselowa zabudowa z konturem, obrys obszaru | ściany lądu pomalowane gruntem, odkrywka obniżona tarasami, zabudowa InstancedMesh, obrys linią |
| Koszt | CPU (ImageData), ostre piksele przy zbliżeniu | GPU: ~43 rysowania, ~105 tys. trójkątów, 2 tekstury (pomiar v0.46) |

- **Jedyny styk z UI: `PlanetDisplay`** (`setPlanet`, `setStructures`, `pickStructure`, `showBuilding`, `setZoom`,
  `setHighlight`, `pickCell`, `setOrbital`, `gpuStats`…). Między nimi i tłem kosmosu pośredniczy `withSpace` w `main.ts`.
- **Tło kosmosu** (`spaceBackground.ts` + czysty `sky.ts`) wspólne dla 2D i 3D: gwiazdy w warstwach z paralaksą, pas
  galaktyki, mgławice, sąsiednie ciała układu, rzadkie spadające gwiazdy.
- **Bezpiecznik startu** (`app/bootGuard.ts`): start w 3D, który nie przetrwał 8 s, przełącza grę na stałe na 2D.
  Przełączenie 2D ↔ 3D przeładowuje stronę i zachowuje obrót oraz przybliżenie (sessionStorage).
- **Pamięć grafiki iPada**: jeden kontekst WebGL (panele Phaser w Canvas 2D), budżet pikseli `renderPixelRatio`, bez MSAA
  na Retinie, automatyczna rozdzielczość 60–100% (`adaptiveResolution.ts`).
- **Ogranicz ruch** (ustawienie systemu): bez animacji wyrastania, obrotu satelity, migotania.

## Kamera i gesty

- **Obrót**: jeden palec (albo mysz), z bezwładnością, bez limitu pochylenia — przez bieguny (`input/dragRotator.ts`);
  powolny autoobrót, wygasa przy przybliżeniu i po pokazaniu budynku.
- **Przybliżenie**: dwa palce (szczypanie), kółko myszy, klawisze + − 0, przyciski + / − / reset (`input/zoom.ts`,
  `game/ui/gestures.ts`); zakres 0,8×–3,5×.
- **Stuknięcie** (`tap`): krótkie dotknięcie bez przesunięcia — wybór budynku (`pickComplex`: dowolne miejsce obszaru),
  kamera podjeżdża do 1,5× (albo 3× z Ustawień), otwiera się karta budowli z obrysem pól.
- Gest obrotu startuje tylko poza panelami (każdy panel ma strefę blokującą dotyk).
