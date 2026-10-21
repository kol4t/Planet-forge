# Przebudowa generatora planet i UI — audyt, kontrakty danych i plan

Etap 1 specyfikacji `docs/specyfikacja-generatora-i-ui.md` (dokument właściciela, 2026-10-21).
Ten plik opisuje stan wyjściowy (v0.17), docelową architekturę i plan etapów z listą plików i ryzykami.
Kod gry w etapie 1 **nie jest zmieniany**.

---

## 1. Audyt stanu wyjściowego (v0.17)

### 1.1 Uruchamianie i stan testów przed zmianami

| Sprawdzenie | Wynik (2026-10-21, gałąź `main` = v0.17) |
|---|---|
| `npm test` | **139/139 zaliczone**, 0 błędów |
| `npm run typecheck` | bez błędów |
| `npm run build` | poprawny `dist/` |

Nie ma wcześniej istniejących błędów, które trzeba by odróżniać od skutków nowych zmian.

### 1.2 Gdzie co jest

| Obszar | Plik(i) | Stan |
|---|---|---|
| PRNG, szum | `core/random/rng.ts`, `noise.ts` | Seedowany PRNG z `fork`. Szum wartości 3D (value noise) i fBm. Zakaz `Math.random` w logice jest przestrzegany. |
| Generator „parametrów” | `core/generation/generatePlanet.ts` | Strumień `gameplay` (klasa wielkości, promień, bogactwo, modyfikator) i strumień `visual` (noiseSeed, poziom morza, amplituda, skala, nachylenie osi, próg chmur). **Nie tworzy terenu**, tylko liczby. |
| Definicje typów | `data/planets.ts` | 5 typów roboczych: Kepler-186 f (umiarkowana), pustynna, lodowa, oceaniczna, wulkaniczna. Każdy ma paletę 6 kolorów, zakresy, ocean, chmury, czapę i styl. |
| **Mapa wysokości i biomy** | `planet-renderer/surface.ts` | Wysokość = fBm (6 oktaw) z lekkim zawinięciem (domain warp). Kolor = gradient wysokości (głębia → płycizna → brzeg → nizina → wyżyna → szczyt) plus lód zależny od \|y\| i wysokości. **Nie ma klasyfikacji materiałów, hydrologii ani cech.** Kod leży w rendererze, choć jest czystą matematyką. |
| Ląd 3D low-poly | `planet-renderer/lowPoly.ts` | Ikosfera, tarasy, jeden kolor na fasetę, ciemne klify, tafla lodu nad zamarzniętym morzem. |
| Scena 3D | `planet-renderer/PlanetView.ts`, `atmosphere.ts` | Kamera **perspektywiczna**. Ląd = `IcosahedronGeometry(1, 40)` (33 620 trójkątów). Ocean = **jedna sfera r = 1,001** (detail 18), półprzezroczysta. Lawa = ta sama sfera z `emissive`. Chmury i atmosfera to osobne sfery. |
| Widok 2D | `CanvasPlanetFallback.ts`, `discRenderer.ts` | Tarcza liczona piksel po pikselu przez `SurfaceSampler`, poza tym wspólna z 3D. |
| Kolonia | `planet-renderer/colony.ts`, `colonyMeshes.ts` | Rozmieszczenie zależy od `SurfaceSampler` (`isLand`, `radius`). **Nie jest zapisywane**, liczy się z seeda. |
| Kamera i gesty | `game/ui/gestures.ts`, `input/dragRotator.ts`, `PlanetView.setZoom` | Obrót jednym palcem z bezwładnością. Pinch i kółko myszy 1×–3,5×, **ustawiane skokowo** (bez wygładzania). Brak oddalenia poniżej 1×, brak przycisków +/− i resetu. |
| UI | `game/scenes/PlanetScene.ts` (1203 linie), `OverlayScene` + 4 ekrany, `ui/layout.ts` | Phaser w trybie Canvas 2D. Panel planety i panel „Produkcja” są zwijane. Ekrany: Badania, Mapa, Imperium. |
| Typ planety w galaktyce | `core/galaxy/galaxy.ts`, `data/galaxy.ts` | Strefa (gorąca/ciepła/umiarkowana/zimna) ze średnimi wagami wybiera `definitionId`. Seed = adres `1:układ:orbita`. |
| Zapis | `core/save/save.ts`, `empire.ts`, `GameController.restoreSlots` | Zapis przechowuje tylko `definitionId`, `seed` i `generatorVersion`. Planeta jest odtwarzana generatorem przy każdym wczytaniu. |

### 1.3 Co jest proceduralne, a co stałe

Wszystko, co dotyczy planet, jest proceduralne: teren, kolory, chmury, kolonia, tło, miniatury i ikony PWA. Gra nie używa żadnych tekstur z plików. Stałe są tylko dane definicji (palety, zakresy) i wartości balansu.

### 1.4 Zależności planeta ↔ gra

- **Ekonomia** zależy wyłącznie od strumienia `gameplay` (promień, bogactwo, modyfikator). Teren nie wpływa na rozgrywkę.
- **Kolonia** zależy od terenu, ale tylko wizualnie: zmiana terenu przesunie budowle, a zapisy nie ucierpią.
- **Miniatury, mapa i sąsiedzi na niebie** wywołują `generatePlanet` i `discLook` dla wielu planet. To ważne przy kosztach generowania (§ 4.6).

### 1.5 Pomiary odniesienia (Node, ten kontener, seed `PF-BENCH`)

| Typ | Budowa lądu 3D | Udział lądu | Uwagi |
|---|---|---|---|
| Kepler-186 f | 140 ms | 52% | |
| pustynna | 130 ms | **99%** | woda praktycznie nie istnieje |
| lodowa | 158 ms | 45% | |
| oceaniczna | 125 ms | **39%** | lądu jest więcej, niż powinna mieć planeta oceaniczna |
| wulkaniczna | 115 ms | 69% | **31% powierzchni to świecąca lawa** (cała „woda” jest lawą) |

FPS na iPadzie właściciela (z wcześniejszych pomiarów): 60/53 kl./s. Przed etapem 6 trzeba zmierzyć go ponownie licznikiem z „Diagnostyki”.

### 1.6 Zgodność ze specyfikacją — najważniejsze luki

1. **Jedna „metoda” terenu.** Wszystkie planety to ten sam fBm; typy różnią się paletą i kilkoma liczbami (§ 3 spec.).
2. **Brak profili.** Paleta, ciecz i atmosfera siedzą w definicji typu (§ 4).
3. **Brak modelu danych powierzchni.** Wysokość i kolor liczą się „w locie” w rendererze; nie ma klasyfikacji materiałów, hydrologii, lawy ani cech (§ 6).
4. **Ciecz = jedna sfera.** Nie ma jezior powyżej poziomu morza ani rzek, a lawa pokrywa całe niziny (§ 7, § 8).
5. **Udziału lądu nie da się kontrolować.** Poziom morza to próg wysokości, nie kwantyl, więc udział lądu „wychodzi” przypadkiem (tabela wyżej).
6. **⚠️ Zapisy a wersja generatora.** `restoreSlots` **po cichu pomija** planety z inną wersją generatora. Podbicie `GENERATOR_VERSION` (wymagane przez `CLAUDE.md` przy zmianie generatora) skasowałoby więc graczowi imperium. Ponadto `GENERATOR_VERSION` jest częścią klucza strumienia `gameplay`, więc jego podbicie zmieniłoby również promień i bogactwo planet.
7. Zoom bez wygładzania i bez oddalenia (§ 11). UI ma panele, ale nie ma nawigacji ani panelu kontekstowego (§ 12).

---

## 2. Docelowa architektura

### 2.1 Zasada: kompozycja, bez drugiego systemu definicji

```
PlanetDefinition (istniejąca, data/planets.ts)       = typ rozgrywkowy: nazwy, klasy, surowce, modyfikatory
  └─ surface: { profile, methods }                   ← NOWE: odwołanie do profilu + dozwolone metody (wagi)
SurfaceProfile (NOWE, data/profiles/*.ts)            = materiały, biomy, ciecz, lawa, atmosfera, światło, parametry form
TerrainMethod  (NOWE, core/surface/methods/*.ts)     = algorytm wysokości (tectonic / erosion / fractured)
SurfaceModel   (NOWE, core/surface/)                 = wynik: siatka + wysokość + materiał + ciecz + cechy
```

`PlanetDefinition` pozostaje jedynym rejestrem typów planet. Nie powstaje drugi, równoległy rejestr. Profil i metoda są do niego dołączane przez odwołanie.

Seed pozostaje **tekstem** (adres `1:układ:orbita`), a nie liczbą jak w przykładzie specyfikacji. Tego wymaga zgodność z mapą i zapisami.

### 2.2 Potok generowania (czysty TypeScript w `core/`, testowalny bez renderera)

```
seed + definicja + SURFACE_VERSION
  1. grid        geodezyjna siatka sfery (ta sama co ikosfera 3D) + sąsiedzi
  2. method      wysokość surowa (tectonic | erosion | fractured), parametry z profilu
  3. normalize   0..1; poziom morza = kwantyl wysokości → KONTROLA UDZIAŁU LĄDU
  4. erosion     (metoda erosion: pełna; pozostałe: lekkie wygładzenie stoków)
  5. hydrology   ocean = połączone niziny poniżej morza; „priority-flood” → jeziora z własnym
                 poziomem; kierunek spływu → akumulacja → rzeki do jezior/oceanu
  6. lava        źródła w kalderach/szczelinach → spływ po spadku → aktywna lawa przy źródle,
                 zastygły bazalt dalej (tylko gdy profil ma lawę)
  7. classify    reguły biomów profilu (wysokość, nachylenie, szerokość geogr., wilgotność z
                 odległości od wody) → materiał
  8. features    kratery, kaldery, szczeliny (lista z pozycjami — później: miejsca budowy, anomalie)
  → SurfaceModel (z walidacją: brak NaN, granice cieczy poprawne)
```

Wszystkie ciężkie obliczenia odbywają się raz, przy generowaniu. W klatce animowany jest tylko materiał lawy i wody, nie geometria (§ 8 spec.).

### 2.3 Kontrakty danych (propozycja do etapu 2; nazwy mogą się doprecyzować)

```ts
// core/surface/types.ts
export type TerrainMethodId = 'tectonic' | 'erosion' | 'fractured';
export type SurfaceProfileId = 'terrestrial' | 'arid' | 'ice' | 'oceanic' | 'volcanic' | 'barren';

/** Parametry form terenu — metoda czyta te, które rozumie; profil ustawia wartości. */
export interface TerrainParams {
  continentScale: number;   // skala dużych form (niska częstotliwość)
  detailScale: number;      // skala drobnych detali — niezależna od dużych form
  detailAmount: number;     // udział detalu w wysokości
  landShare: Range;         // docelowy udział lądu 0..1 (kwantyl → poziom morza)
  relief: number;           // wysokość gór
  ridgeSharpness: number;   // ostrość grzbietów 0..1
  plates: Range;            // tectonic: liczba płyt
  erosion: { iterations: number; strength: number; deposition: number };  // erosion
  craters: { density: number; maxSize: number };                          // fractured
  faults: { density: number; depth: number };                              // fractured, tectonic
}

export interface TerrainMethod {
  id: TerrainMethodId;
  /** Wysokość surowa dla każdego węzła siatki. Deterministyczna z `rng`. */
  heights(grid: SphereGrid, params: TerrainParams, rng: Rng): { height: Float32Array; features: SurfaceFeature[] };
}

export type MaterialId =
  | 'deepWater' | 'shallowWater' | 'lakeWater' | 'river' | 'seaIce'
  | 'sand' | 'soil' | 'vegetation' | 'rock' | 'cliff' | 'snow' | 'glacier'
  | 'dune' | 'saltFlat' | 'dust' | 'ash' | 'basalt' | 'lavaCrust' | 'lava';

export interface MaterialLook { color: string; roughness: number; emissive?: string; emissiveIntensity?: number }

/** Reguła biomu: pierwsza pasująca wygrywa (kolejność = priorytet). */
export interface BiomeRule {
  material: MaterialId;
  height?: Range;      // nad poziomem morza, 0..1
  slope?: Range;       // 0 = płasko, 1 = pion
  latitude?: Range;    // |y| 0..1
  moisture?: Range;    // 0..1 (bliskość wody, rzeki)
}

export interface SurfaceProfile {
  id: SurfaceProfileId | string;   // string: siódmy profil to tylko dane
  label: string;
  status: DataStatus;              // 'robocza' do czasu Lore Bible
  materials: Partial<Record<MaterialId, MaterialLook>>;
  biomes: readonly BiomeRule[];
  terrain: Partial<TerrainParams>;
  hydrology: { liquid: 'water' | 'none'; lakes: boolean; rivers: number; frozen: { seaLatitude: number; glacierHeight: number } };
  lava: null | { sources: Range; flowLength: number; activeShare: number; glow: number };
  atmosphere: { color: string; intensity: number; width: number };
  lighting: { sun: number; ambient: number; night: number };
  clouds?: CloudLook;
  methods: { preferred: TerrainMethodId; allowed: readonly TerrainMethodId[]; incompatible?: readonly { method: TerrainMethodId; reason: string }[] };
}

export const enum Liquid { None = 0, Ocean = 1, Lake = 2, River = 3, Lava = 4, FrozenSea = 5 }

export interface SurfaceModel {
  version: number;                 // SURFACE_VERSION
  method: TerrainMethodId;
  profileId: string;
  grid: SphereGrid;                // kierunki węzłów, trójkąty, sąsiedzi (CSR)
  height: Float32Array;            // 0..1
  seaLevel: number;
  liquid: Uint8Array;              // Liquid na węzeł
  liquidLevel: Float32Array;       // poziom tafli (jeziora mają własny!)
  flow: Float32Array;              // akumulacja spływu (rzeki, kanały lawy)
  material: Uint8Array;            // indeks MaterialId
  features: readonly SurfaceFeature[];
  stats: SurfaceStats;             // udział lądu/wody/lawy, liczba jezior, czas generowania…
  /** Próbkowanie dowolnego punktu sfery (widok 2D, kolonia) — przez indeks przestrzenny. */
  sample(x: number, y: number, z: number): SurfaceSample;
}
```

Istniejący interfejs `SurfaceSampler` (`height`, `radius`, `color`, `isLand`, `ice`) zostaje jako **adapter** do `SurfaceModel`. Dzięki temu `lowPoly.ts`, `discRenderer.ts` i `colony.ts` działają dalej bez przepisywania. Renderery przechodzą na bogatszy model stopniowo, w etapie 5.

### 2.4 Lód, woda, lawa — co jest czym

| Zjawisko | Reprezentacja | Render 3D |
|---|---|---|
| Ocean | `Liquid.Ocean`, poziom = `seaLevel` | osobna sfera wody (jak dziś) |
| Jezioro | `Liquid.Lake`, własny `liquidLevel` | płaskie tafle (osobna siatka) |
| Rzeka | `Liquid.River` (węzły o dużym `flow`) | materiał na fasetach lądu (low-poly) |
| Lawa płynna | `Liquid.Lava` przy źródłach | osobna siatka z `emissive` i lekką animacją materiału |
| Zastygła lawa | materiał `basalt` / `lavaCrust` | ląd |
| Zamarznięte morze | `Liquid.FrozenSea` | tafla lodu nad wodą (jak dziś `FROZEN_SEA_RADIUS`) |
| Lodowiec / śnieg | materiał `glacier` / `snow` na lądzie | ląd (geometria + kolor) |

### 2.5 Wersjonowanie i zgodność zapisów

- `GENERATOR_VERSION` (= 1) zostaje **na stałe** kluczem strumienia `gameplay`. Promień, bogactwo i modyfikatory istniejących planet nigdy się nie zmienią.
- Nowa stała **`SURFACE_VERSION`** opisuje wygląd terenu: 1 = obecny `surface.ts` (zachowany jako metoda `legacy`), 2 = nowy potok.
- Zapis planety dostaje opcjonalne pole `surfaceVersion`. Jego brak oznacza zapis sprzed przebudowy.
- `restoreSlots`: nieznana wersja **nie kasuje** już planety. Planeta jest wczytywana, a powierzchnia migrowana według decyzji właściciela (pytanie 1 w § 5).
- Migracje są w jedną stronę i zgodne wstecz: stare zapisy `PF1:` i `PF2:` nadal się wczytują.

### 2.6 Koszty i pamięć

- Siatka węzłów jest tą samą siatką co ląd 3D (`SURFACE_DETAIL` 40, około 16,8 tys. węzłów). 3D nie potrzebuje więc interpolacji.
- Miniatury, mapa i sąsiedzi na niebie korzystają z modelu o niższej rozdzielczości (detail około 16, około 2,6 tys. węzłów) oraz pamięci podręcznej po kluczu `seed|definicja|wersja|rozdzielczość`.
- Budżet (do potwierdzenia pomiarem): pełna planeta ≤ 250 ms w Node. Erozja ma ograniczoną liczbę iteracji. Pamięć modelu wynosi około 16,8 tys. × ~20 B ≈ 0,35 MB na planetę.
- **Determinizm:** w `core/surface` używane są tylko `+ − × ÷ sqrt` (dokładne w IEEE 754). `sin`, `cos` i `exp` mogą się minimalnie różnić między silnikami JS, więc nie trafiają do decyzji progowych (np. rzeka albo nie rzeka).

---

## 3. Profile × metody (cel etapu 4)

| Profil | Preferowana | Inne sensowne | Ciecz | Mapowanie na obecne typy |
|---|---|---|---|---|
| terrestrial | tectonic | erosion, fractured | woda, jeziora, rzeki | Kepler-186 f |
| arid | erosion | tectonic, fractured | rzadkie jeziora, suche koryta | pustynna |
| ice | tectonic | erosion, fractured | ciemne morza, lód morski, lodowce | lodowa |
| oceanic | tectonic | erosion, fractured | woda 75–90%, archipelagi | oceaniczna |
| volcanic | fractured | tectonic, erosion | lawa w kalderach i kanałach, bazalt | wulkaniczna |
| barren | fractured | tectonic, erosion | brak (opcjonalnie zamarznięte złoża) | **brak typu — pytanie 2** |

Wszystkie 18 kombinacji ma być technicznie obsługiwane. Kombinacje mniej udane są jawnie oznaczane w danych (`incompatible` z powodem) i wykrywane walidacją.

**Narzędzie do porównań (etap 4):** `npm run atlas` renderuje wszystkie 18 kombinacji × kilka seedów do jednego obrazu PNG. Wykorzystuje istniejący `discRenderer` i `scripts/png.ts`, bez przeglądarki. Dodatkowo wypisuje tabelę metryk: udział lądu, wody i lawy, liczbę jezior, długość rzek, „płaskość” (odchylenie wysokości), „chaos” (udział energii wysokich częstotliwości) i czas. Testy pilnują granic tych metryk. Te obrazy mogę też oglądać sam, więc kontrola wizualna nie spada w całości na właściciela.

---

## 4. Plan etapów (każdy = osobna wersja, gałąź `claude/…`, akceptacja przed `main`)

### Etap 2 — wspólny model powierzchni (v0.18)
Cel: nowy potok z metodą `legacy` (obecny fBm). **Gra wygląda praktycznie tak samo**, ale wysokość, ciecz, materiał i cechy są już danymi w `core`. Zapisy są zabezpieczone przed zmianą wersji.

| Plik | Zmiana |
|---|---|
| `src/core/surface/types.ts` | nowy — kontrakty z § 2.3 |
| `src/core/surface/grid.ts` | nowy — siatka geodezyjna, sąsiedzi, indeks przestrzenny do `sample()` |
| `src/core/surface/buildSurface.ts` | nowy — potok § 2.2 (na tym etapie: legacy → morze → klasyfikacja) |
| `src/core/surface/validate.ts` | nowy — NaN/∞, zakresy, spójność cieczy |
| `src/core/surface/cache.ts` | nowy — pamięć modeli po kluczu |
| `src/core/surface/methods/legacy.ts` | nowy — obecna funkcja wysokości przeniesiona z `surface.ts` |
| `src/planet-renderer/surface.ts` | adapter `SurfaceModel` → `SurfaceSampler` |
| `src/core/generation/generatePlanet.ts`, `core/types.ts` | `SURFACE_VERSION`, `visual.surfaceVersion` |
| `src/core/save/save.ts`, `empire.ts`, `app/GameController.ts` | `surfaceVersion` w zapisie; `restoreSlots` bez cichego kasowania |
| `tests/surface.test.ts` | determinizm, brak NaN, zgodność legacy z dotychczasowym wyglądem, migracja zapisu |

Ryzyka: wydajność na iPadzie (dodatkowe kroki) → pomiar przed/po. Różnice wyglądu legacy → test porównawczy z dotychczasowym `height()`.

### Etap 3 — trzy metody terenu (v0.19)
| Plik | Zmiana |
|---|---|
| `src/core/random/noise.ts` | + szum grzbietowy (ridged), szum komórkowy (Worley) do płyt i kraterów |
| `src/core/surface/methods/tectonic.ts` | płyty (Worley), kontynenty z niskich częstotliwości, pasma górskie i rowy na granicach płyt, detal na końcu |
| `src/core/surface/methods/erosion.ts` | baza + erozja hydrauliczna (spływ po siatce, iteracje i siła z parametrów) i termiczna; osady u podnóży |
| `src/core/surface/methods/fractured.ts` | kratery (profil miski z wałem), uskoki i szczeliny (pasy wzdłuż wielkich kół), ostre grzbiety, płaskowyże |
| `src/core/surface/methods/index.ts` | rejestr metod (nowa metoda = nowy wpis) |
| `tests/terrainMethods.test.ts` | determinizm, metody różnią się metrykami, brak artefaktów (igły: maks. różnica z sąsiadami), czas |

Ryzyka: koszt erozji (limit iteracji, pomiar) i drobne różnice liczb zmiennoprzecinkowych między silnikami (§ 2.6).

### Etap 4 — sześć profili (v0.20)
| Plik | Zmiana |
|---|---|
| `src/data/profiles/{terrestrial,arid,ice,oceanic,volcanic,barren}.ts`, `index.ts` | nowe — dane profili (robocze) |
| `src/core/surface/classify.ts`, `validateProfile` | reguły biomów, walidacja zgodności metoda × profil |
| `src/data/planets.ts`, `core/types.ts` | `surface: { profile, methods }` w definicjach. Paleta, ocean i atmosfera przenoszą się do profilu; definicja może je nadpisać. |
| `scripts/atlas.ts`, `package.json` | `npm run atlas` — siatka 18 kombinacji + metryki |
| `tests/profiles.test.ts` | każdy profil × każda metoda: walidacja, metryki w granicach, profil dodany w teście bez zmian generatorów |

Ryzyka: wygląd istniejących planet się zmienia (pytanie 1), a nazwy profili wymagają Lore Bible (status „robocza”).

### Etap 5 — woda i lawa (v0.21)
| Plik | Zmiana |
|---|---|
| `src/core/surface/hydrology.ts` | priority-flood, jeziora, akumulacja spływu, rzeki |
| `src/core/surface/lava.ts` | źródła, spływ po spadku, aktywna lawa i bazalt |
| `src/planet-renderer/lowPoly.ts`, `PlanetView.ts` | osobne siatki jezior i lawy, ocean na poziomie morza, `renderOrder`/`polygonOffset` przeciw z-fightingowi, animacja tylko materiału lawy |
| `src/planet-renderer/discRenderer.ts` | jeziora, rzeki i lawa w 2D |
| `tests/hydrology.test.ts` | woda nie przechodzi przez grzbiet, jezioro ma płaski poziom, rzeki płyną w dół i kończą się w wodzie, lawa tylko przy źródłach i nie wyżej niż źródło |

Ryzyka: liczba draw calli (+2 siatki), przezroczystość w Safari i koszt shadera. Zapas mierzony licznikiem FPS.

### Etap 6 — światło, atmosfera, kamera (v0.22)
| Plik | Zmiana |
|---|---|
| `PlanetView.ts`, `atmosphere.ts` | światło i atmosfera z profilu, strona nocna |
| `PlanetView.ts`, `CanvasPlanetFallback.ts`, `PlanetDisplay.ts` | płynny zoom (cel + wygładzanie), zakres około 0,8×–3,5×, kamera nie wchodzi w teren (limit z maks. promienia), `resetView()` |
| `game/ui/gestures.ts`, `PlanetScene.ts` | przyciski „+”, „−” i „Resetuj widok”, klawisze + / − / 0 na komputerze |
| `tests/gestures.test.ts` | pinch kontra obrót, granice i wygładzanie |

Ryzyka: konflikt gestów. Istniejące testy gestów są punktem odniesienia.

### Etap 7 — przebudowa UI (v0.23)
Łączy się z planem „etap 4 interfejs” z v0.17 (`docs/decisions.md`).

| Plik | Zmiana |
|---|---|
| `src/game/ui/resourceBar.ts` | nowy — kompaktowy pasek: produkcja na godzinę, energia jako bilans i wykorzystanie/maksimum, animacja zmian |
| `src/game/ui/planetPanel.ts` | nowy — nazwa, typ, średnica, stan kolonii, zmiana planety |
| `src/game/ui/contextPanel.ts` | nowy — wysuwany panel budowy i szczegółów z prawdziwymi danymi kontrolera |
| `src/game/ui/navBar.ts` | nowy — Kolonia, Budowa, Badania, Mapa, Imperium (ikony, aktywna sekcja w turkusie lub złocie) |
| `src/game/scenes/PlanetScene.ts`, `ui/layout.ts` | odchudzenie sceny, nowy układ; `GameController` bez zmian w API |
| `tests/layout.test.ts` | układ na 8 rozmiarach ekranu, planeta niezasłonięta |

Ryzyka: największy obszar regresji. Logika gry się nie zmienia; zmienia się tylko widok.

### Etap 8 — laboratorium planet i walidacja (v0.24)
| Plik | Zmiana |
|---|---|
| `src/game/scenes/PlanetLabScene.ts` | nowy — Ustawienia → Diagnostyka → „Laboratorium planet”: wybór metody, profilu i seeda, ponowne generowanie, obrót, zoom, poziom wody |
| `README.md`, `docs/decisions.md` | lista kontrolna dla iPada, opis ograniczeń modelu (uproszczona hydrologia, nie symulacja fizyczna) |

Pomiary: czas generowania, wierzchołki, draw calle, FPS na iPadzie przed i po, brak wycieków przy przełączaniu planet (`dispose`).

---

## 5. Decyzje do podjęcia przez właściciela

1. **Wygląd istniejących planet po przebudowie.** Rozgrywka (surowce, promień) zostaje bez zmian w każdym wariancie.
   - **A (rekomendacja):** wszystkie planety, także zapisane, dostają nowy wygląd. Zmieni się tylko teren i miejsce budowli, a liczby zostaną te same.
   - B: zapisane planety zachowują stary wygląd, a nowy teren dostają tylko nowe planety.
2. **Profil „barren” (jałowy).** Na razie jest tylko profilem w narzędziach. Czy dodać roboczy typ planety „jałowa” na mapie galaktyki (strefy gorąca i zimna)? Nowy typ to sprawa Lore Bible, dlatego wymaga zgody właściciela.
