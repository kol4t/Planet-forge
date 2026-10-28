// Wspólne typy gry. Czysty TypeScript — bez importów z phaser/three/DOM.
import type { HydrologyParams } from './surface/hydrology.ts';
import type { MaterialId, TerrainMethodId } from './surface/types.ts';

export type ResourceId = 'metal' | 'crystal';
export type YieldId = ResourceId | 'energy';
export type BuildingId = 'metalMine' | 'crystalMine' | 'powerPlant' | 'storage' | 'antimatterCollector' | 'laboratory';

export type Range = readonly [min: number, max: number];
export type Resources = Record<ResourceId, number>;
export type BuildingLevels = Record<BuildingId, number>;

/** Status danych: wartości robocze czekają na zatwierdzenie w Lore Bible. */
export type DataStatus = 'robocza' | 'kanon';

export interface SizeClassDef {
  id: string;
  label: string;
  radiusKm: Range;
  weight: number;
}

export interface EnvironmentModifierDef {
  id: string;
  label: string;
  description: string;
  weight: number;
  /** Mnożniki wydajności, np. { metal: 1.15 }. Brak klucza = 1. */
  effects: Partial<Record<YieldId, number>>;
}

export interface PlanetPalette {
  deepWater: string;
  shallowWater: string;
  shore: string;
  lowland: string;
  highland: string;
  peak: string;
}

export interface OceanLook {
  opacity: number;
  roughness: number;
  /** Kolor świecenia (np. lawa). Brak = ocean nie świeci. */
  emissive?: string;
  emissiveIntensity?: number;
}

export interface CloudLook {
  /** Próg szumu, powyżej którego są chmury: wyżej = mniej chmur. */
  threshold: Range;
  /** Maksymalne krycie chmur 0..1. */
  opacity: number;
  color: string;
}

/**
 * Styl low-poly planety 3D (bez wpływu na rozgrywkę i seed): rzeźba terenu, fasety, światło, atmosfera.
 * Wartości domyślne w `generatePlanet` — definicja planety może nadpisać dowolną z nich.
 */
export interface SurfaceStyle {
  /** Liczba „tarasów” wysokości lądu (płaskowyże i uskoki); 0 = gładko. */
  terraces: number;
  /** Mnożnik wysokości gór w 3D. */
  relief: number;
  /** Losowa różnica jasności między fasetami (0..0,15) — żywy, ale spokojny low-poly. */
  facetJitter: number;
  /** Przyciemnienie stromych ścian (szczeliny, klify) 0..1. */
  cliffShade: number;
  /** Jasność światła gwiazdy i otoczenia (strona nocna). */
  sunIntensity: number;
  ambient: number;
  /** Szerokość atmosfery nad powierzchnią (promień 1 = planeta). */
  atmosphereWidth: number;
}

/** Wygląd powierzchni opisany danymi (profil, z nadpisaniami w definicji typu planety). */
export interface SurfaceLook {
  palette: PlanetPalette;
  seaLevel: Range;
  terrainAmplitude: Range;
  terrainScale: Range;
  roughness: number;
  atmosphereColor: string;
  atmosphereIntensity: number;
  ocean?: OceanLook;
  clouds?: CloudLook;
  /** Szerokość (|y| 0..1), od której zaczyna się czapa lodowa. */
  polarCap?: number;
  /** Styl low-poly widoku 3D (opcjonalnie; brak = domyślny). */
  style?: Partial<SurfaceStyle>;
}

export interface MethodWeight {
  id: TerrainMethodId;
  weight: number;
}

/** Pasmo materiału lądu: do wysokości `upTo` (0 = brzeg, 1 = najwyższy szczyt) leży `material`. */
export interface MaterialBand {
  upTo: number;
  material: MaterialId;
  /** Kolor materiału w widoku 2D i 3D (lód, woda i lawa mają własne kolory). */
  color: string;
}

/**
 * Profil powierzchni (`src/data/profiles/`) — kategoria TECHNICZNA (R-003), nie kanoniczny typ planety.
 * Opisuje wygląd, dozwolone metody terenu z wagami i materiały; typ planety wskazuje swój profil.
 */
export interface SurfaceProfile {
  id: string;
  /** Nazwa robocza (do atlasu i laboratorium planet). */
  label: string;
  status: DataStatus;
  /** Dozwolone metody terenu z wagami losowania (pierwsza = preferowana). */
  methods: readonly MethodWeight[];
  /** Kombinacje świadomie wyłączone, z powodem (atlas pokazuje je osobno). */
  incompatible?: readonly { method: TerrainMethodId; reason: string }[];
  /** Ciecz na lądzie: jeziora i rzeki z wody, jeziora i strumienie lawy, albo nic (suche kotliny). */
  liquid: 'water' | 'lava' | 'none';
  /** Strojenie wód śródlądowych (brak = `DEFAULT_HYDROLOGY`). */
  hydrology?: Partial<Omit<HydrologyParams, 'liquid'>>;
  /** Oczekiwane granice metryk (testy i atlas). */
  expect: { land: Range };
  /** Materiały lądu od brzegu do szczytów (rosnące `upTo`, ostatnie ≥ 1). */
  bands: readonly MaterialBand[];
  look: SurfaceLook;
}

export interface PlanetDefinition {
  id: string;
  /** Stała nazwa planety. Gdy brak — nazwa powstaje z seeda i `catalogs`. */
  displayName?: string;
  /** Prefiksy katalogowe do nazw generowanych z seeda. */
  catalogs?: readonly string[];
  /** Typ planety pokazywany w panelu. */
  category: string;
  status: DataStatus;
  /** Szansa wylosowania przy „Nowa planeta”. */
  weight: number;
  /** Profil powierzchni (wygląd, metody terenu, materiały); `methods` nadpisuje metody profilu. */
  surface: { profile: SurfaceProfile; methods?: readonly MethodWeight[] };
  /** Nadpisania wyglądu profilu tylko dla tego typu (opcjonalnie). */
  visual?: Partial<SurfaceLook>;
  generation: {
    sizeClasses: readonly SizeClassDef[];
    resourceRange: Record<YieldId, Range>;
    environmentModifiers: readonly EnvironmentModifierDef[];
    /** Stała liczba pól dla wybranych seedów (planeta startowa ma zawsze ok. 100 — decyzja właściciela). */
    fixedFields?: Readonly<Record<string, number>>;
  };
}

export interface PlanetVisual {
  noiseSeed: number;
  seaLevel: number;
  terrainAmplitude: number;
  terrainScale: number;
  axialTiltDeg: number;
  palette: PlanetPalette;
  roughness: number;
  atmosphereColor: string;
  atmosphereIntensity: number;
  ocean: OceanLook;
  clouds: { threshold: number; opacity: number; color: string };
  polarCap: number;
  style: SurfaceStyle;
  /** Profil powierzchni (`SurfaceProfile.id`). */
  profile: string;
  /** Materiały lądu z profilu (klasyfikacja modelu powierzchni). */
  bands: readonly MaterialBand[];
  /** Wody śródlądowe i lawa z profilu. */
  hydrology: HydrologyParams;
  /** Metoda terenu (`core/surface/field.ts`). */
  terrainMethod: TerrainMethodId;
  /** Wersja wyglądu terenu (`SURFACE_VERSION`) — niezależna od rozgrywki. */
  surfaceVersion: number;
}

export interface Planet {
  definitionId: string;
  displayName: string;
  category: string;
  seed: string;
  generatorVersion: number;
  gameplay: {
    sizeClass: { id: string; label: string };
    radiusKm: number;
    /** Liczba pól siatki (30–200); budynki zajmują obszary pól rosnące z etapem (od v0.45). */
    fields: number;
    richness: Record<YieldId, number>;
    environment: {
      id: string;
      label: string;
      description: string;
      effects: Partial<Record<YieldId, number>>;
    };
  };
  visual: PlanetVisual;
}

/** Trwająca budowa (naraz tylko jedna). */
export interface Construction {
  building: BuildingId;
  /** Poziom, który budynek osiągnie po ukończeniu. */
  targetLevel: number;
  /** Znaczniki czasu (ms). */
  startedAt: number;
  finishesAt: number;
  /** Pobrany koszt — zwracany w całości przy anulowaniu. */
  cost: Resources;
}

export interface EconomyState {
  stock: Resources;
  levels: BuildingLevels;
  /** Znacznik czasu (ms) ostatniego naliczenia produkcji. */
  lastUpdate: number;
  construction: Construction | null;
  /** Waluta premium zdobywana w grze (ułamki się kumulują, wyświetlamy całość). */
  antimatter: number;
  /** Zarządzanie budynkami (od v0.26.1; brak = praca 100%, pierwszeństwo 100%). */
  settings?: Partial<Record<BuildingId, BuildingSettings>>;
  /**
   * Dopasowanie do terenu 0..1 na budynek (od v0.26.1): grupy na pasującym terenie pracują w 100%,
   * na innym — słabiej. Liczy gra z zajętych pól; brak = 1.
   */
  siteFactor?: Partial<Record<BuildingId, number>>;
  /** Mnożnik zużycia energii budynku (od v0.39: tryb pracy fabryki dla poziomów w kompleksie); brak = 1. */
  energyFactor?: Partial<Record<BuildingId, number>>;
  /**
   * Ile metalu i kryształów kopalnie wydobyły już ze złóż planety (od v0.27; brak = nic).
   * Zasób złoża = `depositTotal(planet)` − `mined`; zgromadzony zapas (`stock`) to osobna rzecz.
   */
  mined?: Resources;
  /**
   * Kolejka budowy (od v0.32.2; brak = pusta): budynki czekające na swoją kolej. Koszt pobierany
   * dopiero przy starcie; gdy wtedy brakuje surowców, kolejka czeka.
   */
  queue?: BuildingId[];
}

/** Ustawienia budynku z panelu „Zarządzanie” (0..1). */
export interface BuildingSettings {
  /** Produktywność: skaluje naraz wydobycie i zużycie energii (0 = wyłączony). */
  work: number;
  /** Pierwszeństwo do energii: przy niedoborze budynki z wyższym dostają ją najpierw. */
  priority: number;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  baseCost: Resources;
  costGrowth: number;
  /** Co daje budynek: wydobycie/energię, pojemność magazynu, antymaterię (na godzinę) albo badania. */
  produces: YieldId | 'storage' | 'antimatter' | 'research';
  baseOutput: number;
  baseEnergyUse: number;
}

export interface Balance {
  levelGrowth: number;
  passiveIncome: Resources;
  startingStock: Resources;
  startingLevels: BuildingLevels;
  maxLevel: number;
  maxOfflineSeconds: number;
  /** Czas budowy = ta liczba sekund × docelowy poziom. */
  buildSecondsPerLevel: number;
  /** Do tego poziomu włącznie budowę można ukończyć natychmiast za darmo. */
  freeFinishMaxLevel: number;
  /** Pojemność magazynu (osobno metal i kryształy) = base × growth^(poziom − 1). */
  storage: { base: number; growth: number };
  /** Miejsca na własne planety: `base` na start, do `max` po odblokowaniu (przyszłe akcje/lokacje). */
  planetSlots: { base: number; max: number };
  /** Miejsca w kolejce budowy (oprócz trwającej budowy); badania SI dodają kolejne. */
  buildQueue: number;
  antimatter: {
    /** Przyrost bez budynku (także offline). */
    passivePerHour: number;
    /** Zapas na start (także dla zapisów sprzed antymaterii). */
    startingStock: number;
    /** „Ukończ teraz” powyżej darmowego progu: 1 antymateria za każde rozpoczęte N sekund. */
    finishSecondsPerUnit: number;
  };
  /**
   * Siła kar środowiska planety (efekty < 1): 1 = pełna kara, 0 = brak kary.
   * Zmniejszają ją badania Planetologii.
   */
  environmentPenalty: number;
  /** Mnożnik czasu badań (badania „przyspieszające badania” go zmniejszają). */
  researchTimeFactor: number;
  /**
   * Naturalne złoża planety: zasób = `perHundredFields` × bogactwo złóż × (pola / 100).
   * Kopalnie je wyczerpują; przyrost podstawowy (`passiveIncome`) — nie (nigdy nie ma blokady).
   */
  deposits: { perHundredFields: Resources };
  /**
   * Stacja wydobywcza na pasie asteroid (v0.37): urobek na minutę = `output` × poziom × growth^(poz − 1),
   * trafia do magazynu planety jak przyrost podstawowy (bez złóż i energii). Koszt poziomu n =
   * `cost` × costGrowth^(n − 1), budowa trwa `secondsPerLevel` × n.
   */
  asteroid: { output: Resources; growth: number; cost: Resources; costGrowth: number; secondsPerLevel: number; maxLevel: number };
  /**
   * Przechwyt komet (v0.37.1): holownik z planety (jeden naraz na planetę) leci `seconds`, kosztuje `cost`,
   * przywozi losowy ładunek w granicach `cargoMin`–`cargoMax` (z adresu i chwili wysłania). Działa w każdym układzie.
   */
  comet: { cost: Resources; seconds: number; cargoMin: Resources; cargoMax: Resources };
  /**
   * Kolektor energii gwiazdy (v0.44): energia = `output` × poz. × growth^(poz − 1) × mnożnik jasności gwiazdy,
   * dla każdej planety gracza w układzie; koszt `cost` × costGrowth^(n − 1), budowa `secondsPerLevel` × n.
   */
  starCollector: { output: number; growth: number; cost: Resources; costGrowth: number; secondsPerLevel: number; maxLevel: number };
  /** Energia z zewnątrz planety (kolektory gwiazdy układu) doliczana do produkcji energii (v0.44; brak = 0). */
  extraEnergy?: number;
  /** Transportowce (v0.36): ładowność jednego lotu (metal + kryształy), czas lotu = base + odległość × perUnit, ile naraz. */
  transport: { capacity: number; baseSeconds: number; secondsPerUnit: number; maxActive: number };
  /** Statek kolonizacyjny (kolonizacja innych układów): koszt i czas lotu = base + odległość × perUnit. */
  colonyShip: { cost: Resources; baseSeconds: number; secondsPerUnit: number };
  /**
   * Paliwo lotów (v0.53, decyzja właściciela: antymateria = paliwo każdego lotu): antymateria za lot =
   * `inSystem` (ten sam układ) albo `base` + ⌈odległość / `unitsPerOne`⌉ (między układami).
   */
  fuel: Record<FuelKind, FuelRule>;
  /**
   * Wyeksploatowanie (v0.54, decyzja właściciela): po wydobyciu `threshold` złoża danego surowca kopalnia wydobywa
   * resztki z wydajnością `remnantOutput` (energia bez zmian); planeta z oboma złożami ≥ `threshold` = „wyeksploatowana”,
   * a `loopPlanets` takich planet zamyka pętlę MVP.
   */
  exploitation: { threshold: number; remnantOutput: number; loopPlanets: number };
  buildings: readonly BuildingDef[];
}

// ——— badania (galaktyka) ———

export type ResearchArmId = 'productivity' | 'planetology' | 'exploration' | 'station' | 'ai' | 'fleet';

/** Efekt badania. Procenty tego samego rodzaju sumują się (+10% i +15% = +25%). */
export type ResearchEffect =
  | { kind: 'output'; resource: YieldId | 'antimatter'; percent: number }
  | { kind: 'energyUse'; percent: number }
  | { kind: 'buildTime'; percent: number }
  | { kind: 'buildCost'; percent: number }
  | { kind: 'storage'; percent: number }
  | { kind: 'offlineHours'; hours: number }
  | { kind: 'antimatterPassive'; perHour: number }
  | { kind: 'finishPrice'; percent: number }
  | { kind: 'freeFinish'; levels: number }
  | { kind: 'researchTime'; percent: number }
  | { kind: 'environment'; percent: number }
  | { kind: 'planetSlots'; add: number }
  | { kind: 'buildQueue'; add: number }
  /** Większe złoża planety (procent zasobu złóż metalu i kryształów, v0.35). */
  | { kind: 'deposits'; percent: number }
  /** Ładowność transportowca (v0.36). */
  | { kind: 'transportCapacity'; percent: number }
  /** Czas lotu statków: kolonizacyjnego i transportowców (v0.36). */
  | { kind: 'travelTime'; percent: number }
  /** Wydobycie stacji na pasie asteroid (v0.37). */
  | { kind: 'asteroidOutput'; percent: number }
  /** Ekspedycje (v0.34.3): zasięg, jakość danych, szansa powodzenia, szybkość, zasięg sygnałów. */
  | { kind: 'expedition'; stat: ExpeditionStat; add: number }
  /** Odblokowanie funkcji gry (np. statek kolonizacyjny). */
  | { kind: 'unlock'; feature: UnlockFeature };

/** Funkcje gry odblokowywane badaniami (działają w całym imperium). */
export type UnlockFeature = 'colony-ship' | 'ai-mother' | 'ai-executors' | 'ai-offline' | 'specialization-change' | 'expeditions' | 'extreme-astrophysics' | 'build-ice' | 'build-water' | 'transport' | 'asteroid-mining' | 'comet-capture' | 'crystal-complex' | 'metal-factory' | 'tesla-grid' | 'megastructures' | 'star-energy';

/**
 * Rzadki obiekt astronomiczny (v0.34.4): rodzaj gwiazdy, którego bez badania „Astrofizyka ekstremalna”
 * nie da się odczytać ponad „wykryty”. Zbadany daje imperium trwałą premię z danych naukowych.
 */
export interface RareObjectDef {
  star: StarKind;
  label: string;
  description: string;
  /** Premia za każdy zbadany obiekt tego rodzaju (sumuje się do `maxCount` obiektów). */
  effects: readonly ResearchEffect[];
  maxCount: number;
  status: DataStatus;
}

/** Parametry ekspedycji rozwijane badaniami Eksploracji. */
export type ExpeditionStat = 'range' | 'quality' | 'success' | 'speed' | 'scan';

export interface ResearchArmDef {
  id: ResearchArmId;
  name: string;
  description: string;
  /** Kierunek ramienia w galaktyce (stopnie; 0 = w prawo, −90 = w górę). */
  angleDeg: number;
  color: number;
  /** Ramię aktywne (badania działają) albo „wkrótce” (widoczne, bez badań). */
  active: boolean;
  status: DataStatus;
}

export interface ResearchNodeDef {
  id: string;
  arm: ResearchArmId;
  /** Pierścień galaktyki: 1 = przy jądrze; dalej = drożej, dłużej i wyższe Laboratorium. */
  ring: number;
  /** Gałąź w szerokim ramieniu (przesunięcie w bok; 0 = środek ramienia). */
  lane: number;
  name: string;
  description: string;
  requires: readonly string[];
  effects: readonly ResearchEffect[];
  /** Gwiazda mistrzowska na krawędzi ramienia (naraz aktywne maks. 2 — w kolejnym etapie). */
  master?: boolean;
  /** Badanie widoczne, ale jeszcze niedostępne (kolejny etap), także w aktywnym ramieniu. */
  soon?: boolean;
}

export interface ResearchRules {
  /** Wymagany poziom Laboratorium dla pierścieni 1, 2, 3… */
  labLevelForRing: readonly number[];
  /** Koszt pierścienia 1; kolejne × `ringCostGrowth`; każde ukończone badanie × `doneCostGrowth`. */
  baseCost: Resources;
  ringCostGrowth: number;
  doneCostGrowth: number;
  /** Antymateria od pierścienia `antimatterFromRing`: `antimatterBase` × (pierścień − próg + 1). */
  antimatterFromRing: number;
  antimatterBase: number;
  /** Czas pierścienia 1 (s); kolejne × `ringTimeGrowth`. */
  baseSeconds: number;
  ringTimeGrowth: number;
  /** Każdy poziom Laboratorium ponad 1 przyspiesza badania o tyle (0,08 = 8%). */
  labSpeedPerLevel: number;
}

/** Trwające badanie (naraz jedno w całym imperium). */
export interface ResearchProject {
  id: string;
  startedAt: number;
  finishesAt: number;
  /** Pobrany koszt — zwracany przy anulowaniu. */
  cost: Resources;
  antimatter: number;
  /** Seed planety, która zapłaciła (zwrot trafia do niej). */
  paidBy: string;
}

export interface ResearchState {
  done: readonly string[];
  current: ResearchProject | null;
}

// ——— galaktyka (mapa) ———

export type StarKind = 'red-dwarf' | 'yellow' | 'blue-giant' | 'binary' | 'pulsar' | 'black-hole';

export interface StarKindDef {
  id: StarKind;
  label: string;
  description: string;
  /** Szansa wylosowania dla układu. */
  weight: number;
  /** Jasność względem Słońca — razem z odległością decyduje o temperaturze planet. */
  luminosity: number;
  color: string;
  status: DataStatus;
}

/** Strefa temperatury na orbicie (od niej zależą wagi typów planet). */
export type OrbitZone = 'hot' | 'warm' | 'temperate' | 'cold' | 'frozen';

export interface GalaxyRules {
  systemCount: number;
  /** Promień dysku galaktyki (jednostki mapy). */
  radius: number;
  /** Najmniejsza odległość między układami (miejsce na przyszłe stacje i porty). */
  minSpacing: number;
  planetCount: Range;
  /** Do tylu planet w układzie: 2 miejsca startowe graczy; więcej planet — 3. */
  twoHomesUpTo: number;
  /** Szansa, że planeta (nie startowa) ma formę obcą. */
  alienChance: number;
  /** Minimalna temperatura (wzgl. Ziemi = 1) dla każdej strefy, od najgorętszej. */
  zones: readonly [zone: OrbitZone, minTemperature: number][];
  /** Wagi typów planet (id definicji) w każdej strefie. */
  zoneTypes: Record<OrbitZone, Readonly<Record<string, number>>>;
  /**
   * Typy dodane po v0.11 (np. jałowa): osobny strumień losowania zamienia nimi część planet
   * (poza miejscami startowymi) — reszta mapy pozostaje taka sama jak przed dodaniem typu.
   * Kolejność wpisów jest częścią formatu (nowe typy dopisuj na końcu).
   */
  laterTypes: readonly { id: string; chance: Record<OrbitZone, number> }[];
  /** Szansa na gazowego olbrzyma (zamiast planety skalistej) w każdej strefie. */
  gasGiantChance: Record<OrbitZone, number>;
  gasRingsChance: number;
  /** Pasy kolorów gazowych olbrzymów: ciepłe (bliżej gwiazdy) i zimne. */
  gasPalettes: { warm: readonly (readonly string[])[]; cold: readonly (readonly string[])[] };
  /** Szansa na pas asteroid (za 3. albo 4. planetą). */
  beltChance: number;
}

/** Ruch orbitalny planet w widoku układu (v0.34). */
export interface OrbitRules {
  /** Okres obiegu najbliższej i najdalszej planety układu (s czasu rzeczywistego). */
  periodSeconds: Range;
}

/** Wiedza o galaktyce na start (v0.34.2, wartości robocze). */
export interface DiscoveryRules {
  /** Tylu najbliższych sąsiadów jest od razu rozpoznanych (gwiazda i liczba planet). */
  telescopeNeighbors: number;
  /** W tym zasięgu (jednostki mapy) od układów gracza widać sygnały. */
  signalRange: number;
}

/** Ekspedycje (v0.34.3, wartości robocze). */
export interface ExpeditionRules {
  /** Zasięg bez badań (jednostki mapy od najbliższego własnego układu). */
  baseRange: number;
  /** Jakość danych: o ile poziomów (ponad 1) rośnie wiedza o celu po udanej wyprawie. */
  baseQuality: number;
  /** Szansa powodzenia; od `easyDistance` maleje o `successPerUnit` na jednostkę; granice `successRange`. */
  baseSuccess: number;
  easyDistance: number;
  successPerUnit: number;
  successRange: Range;
  /** Czas: base + odległość × perUnit (s), skracany badaniami (procent). */
  baseSeconds: number;
  secondsPerUnit: number;
  /** Koszt: base + odległość × perUnit. */
  cost: Resources;
  costPerUnit: Resources;
  /** Ile wypraw naraz. */
  maxActive: number;
  /** Promień, w którym udana wyprawa łapie nowe sygnały wokół celu. */
  scanRadius: number;
}

/** Ekspedycja w drodze (parametry ustalone przy wysłaniu — późniejsze badania nie zmieniają wyniku). */
export interface Expedition {
  /** Indeks układu docelowego. */
  target: number;
  /** Adres planety, która wysłała i zapłaciła. */
  from: string;
  departedAt: number;
  returnsAt: number;
  cost: Resources;
  /** Szansa powodzenia 0..1 i jakość danych (poziomy wiedzy ponad 1). */
  chance: number;
  quality: number;
  /** Promień łapania sygnałów wokół celu. */
  scan: number;
  /** Czy przy wysłaniu znano „Astrofizykę ekstremalną” (odczyt rzadkich obiektów; brak = nie). */
  extreme?: boolean;
}

/** Adres w galaktyce: galaktyka : układ : orbita (np. 1:42:7). */
export interface GalaxyAddress {
  galaxy: number;
  system: number;
  position: number;
}

// ——— misje i dziennik ———

/** Statek kolonizacyjny w drodze do planety w innym układzie. */
/** Rodzaj lotu, który zużywa paliwo. */
export type FuelKind = 'transport' | 'colonyShip' | 'expedition' | 'comet';

export interface FuelRule {
  inSystem: number;
  base: number;
  unitsPerOne: number;
}

export interface ColonyMission {
  /** Adres planety docelowej. */
  target: string;
  /** Adres planety, z której wyruszył (i która zapłaciła). */
  from: string;
  departedAt: number;
  arrivesAt: number;
  cost: Resources;
  /** Paliwo (antymateria) zapłacone za lot — zwracane przy zawróceniu (v0.53; brak w starszych zapisach = 0). */
  fuel?: number;
}

export type JournalKind = 'build' | 'research' | 'colony' | 'ship' | 'away' | 'empire' | 'ai' | 'expedition' | 'find';

/** Stacja wydobywcza na pasie asteroid układu planety (v0.37); `level` działa od `readyAt`, wcześniej `level − 1`. */
export interface AsteroidStation {
  level: number;
  readyAt: number;
}

/** Holownik po kometę (v0.37.1): wraca na planetę `planet` z ładunkiem ustalonym przy wysłaniu. */
export interface CometHaul {
  planet: string;
  departedAt: number;
  returnsAt: number;
  cargo: Resources;
}

/** Transport surowców między planetami gracza (v0.36). */
export interface Shipment {
  /** Adres planety nadawcy i odbiorcy. */
  from: string;
  to: string;
  departedAt: number;
  arrivesAt: number;
  cargo: Resources;
}

/** Wpis w dzienniku ekspedycji. */
export interface JournalEntry {
  at: number;
  kind: JournalKind;
  text: string;
}

// ——— specjalizacje kolonii (v0.32.3) ———

export type SpecializationId = 'mining' | 'energy' | 'science' | 'industry';

export interface SpecializationDef {
  id: SpecializationId;
  name: string;
  description: string;
  /** Efekty przy zwykłym dopasowaniu (×1); położenie planety je wzmacnia albo osłabia. */
  effects: readonly ResearchEffect[];
  /** Mnożniki dopasowania: gwiazda (ciało w środku układu) i strefa orbity; brak = 1. */
  affinity: { star: Partial<Record<StarKind, number>>; zone: Partial<Record<OrbitZone, number>> };
  status: DataStatus;
}

export interface SpecializationRules {
  /** Czas zmiany specjalizacji (s) — w tym czasie planeta nie ma premii. */
  changeSeconds: number;
  /** Granice mnożnika dopasowania. */
  affinityRange: Range;
}

/** Specjalizacja planety w zapisie: działa od `readyAt` (pierwszy wybór — od razu, zmiana trwa). */
export interface PlanetSpecialization {
  id: SpecializationId;
  readyAt: number;
}

/** Położenie planety, od którego zależy dopasowanie specjalizacji. */
export interface SpecializationSite {
  star: StarKind;
  zone: OrbitZone;
}
