// Wspólne typy gry. Czysty TypeScript — bez importów z phaser/three/DOM.

export type ResourceId = 'metal' | 'crystal';
export type YieldId = ResourceId | 'energy';
export type BuildingId = 'metalMine' | 'crystalMine' | 'powerPlant' | 'storage' | 'antimatterCollector';

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
  /** Co daje budynek: wydobycie/energię, pojemność magazynu albo antymaterię (na godzinę). */
  produces: YieldId | 'storage' | 'antimatter';
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
  buildings: readonly BuildingDef[];
}
