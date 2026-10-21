// Wspólne typy gry. Czysty TypeScript — bez importów z phaser/three/DOM.

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
  visual: {
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
  };
  generation: {
    sizeClasses: readonly SizeClassDef[];
    resourceRange: Record<YieldId, Range>;
    environmentModifiers: readonly EnvironmentModifierDef[];
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
  /** Statek kolonizacyjny (kolonizacja innych układów): koszt i czas lotu = base + odległość × perUnit. */
  colonyShip: { cost: Resources; baseSeconds: number; secondsPerUnit: number };
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
  /** Odblokowanie funkcji gry (np. statek kolonizacyjny). */
  | { kind: 'unlock'; feature: 'colony-ship' | 'ai-mother' | 'ai-executors' | 'ai-offline' };

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
  /** Szansa na gazowego olbrzyma (zamiast planety skalistej) w każdej strefie. */
  gasGiantChance: Record<OrbitZone, number>;
  gasRingsChance: number;
  /** Pasy kolorów gazowych olbrzymów: ciepłe (bliżej gwiazdy) i zimne. */
  gasPalettes: { warm: readonly (readonly string[])[]; cold: readonly (readonly string[])[] };
  /** Szansa na pas asteroid (za 3. albo 4. planetą). */
  beltChance: number;
}

/** Adres w galaktyce: galaktyka : układ : orbita (np. 1:42:7). */
export interface GalaxyAddress {
  galaxy: number;
  system: number;
  position: number;
}

// ——— misje i dziennik ———

/** Statek kolonizacyjny w drodze do planety w innym układzie. */
export interface ColonyMission {
  /** Adres planety docelowej. */
  target: string;
  /** Adres planety, z której wyruszył (i która zapłaciła). */
  from: string;
  departedAt: number;
  arrivesAt: number;
  cost: Resources;
}

export type JournalKind = 'build' | 'research' | 'colony' | 'ship' | 'away' | 'empire' | 'ai';

/** Wpis w dzienniku ekspedycji. */
export interface JournalEntry {
  at: number;
  kind: JournalKind;
  text: string;
}
