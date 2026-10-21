import type { PlanetDefinition } from '../core/types.ts';

// Definicje typów planet. Nowy typ = nowy obiekt tutaj + test; renderer czyta tylko dane.
// UWAGA: wszystkie nazwy, opisy i liczby są ROBOCZE (status: 'robocza') —
// to warianty do testów rozgrywki, nie kanon. Do podmiany po Planet Forge Lore Bible.

const SIZES_ROCKY = [
  { id: 'S', label: 'Mała', radiusKm: [3800, 5200], weight: 1 },
  { id: 'M', label: 'Średnia', radiusKm: [5200, 7000], weight: 2 },
  { id: 'L', label: 'Duża', radiusKm: [7000, 8800], weight: 1 },
] as const;

const STABLE = {
  id: 'stable',
  label: 'Stabilny klimat',
  description: 'Brak premii i kar.',
  weight: 2,
  effects: {},
} as const;

export const KEPLER_186F: PlanetDefinition = {
  id: 'kepler-186f',
  displayName: 'Kepler-186 f',
  category: 'skalista, umiarkowana',
  status: 'robocza',
  weight: 2,
  visual: {
    palette: {
      deepWater: '#0f2e3c',
      shallowWater: '#2a6670',
      shore: '#b8a77e',
      lowland: '#4f6b4b',
      highland: '#7b6a54',
      peak: '#dcd5c6',
    },
    seaLevel: [0.44, 0.56],
    terrainAmplitude: [0.05, 0.085],
    terrainScale: [1.3, 2.3],
    roughness: 0.88,
    atmosphereColor: '#7fd0c4',
    atmosphereIntensity: 0.9,
  },
  generation: {
    sizeClasses: SIZES_ROCKY,
    resourceRange: { metal: [0.75, 1.3], crystal: [0.65, 1.35], energy: [0.8, 1.2] },
    environmentModifiers: [
      STABLE,
      {
        id: 'tectonic',
        label: 'Aktywna tektonika',
        description: 'Więcej metalu blisko powierzchni, lecz słabsza sieć energetyczna.',
        weight: 1,
        effects: { metal: 1.15, energy: 0.92 },
      },
      {
        id: 'ion-storms',
        label: 'Burze jonowe',
        description: 'Wyładowania sprzyjają krystalizacji, ale zakłócają elektrownie.',
        weight: 1,
        effects: { crystal: 1.2, energy: 0.9 },
      },
      {
        id: 'strong-winds',
        label: 'Silne wiatry',
        description: 'Darmowa energia z atmosfery.',
        weight: 1,
        effects: { energy: 1.15 },
      },
    ],
  },
};

export const ARID_WORLD: PlanetDefinition = {
  id: 'arid',
  catalogs: ['TOI', 'HD', 'Wolf'],
  category: 'pustynna, gorąca',
  status: 'robocza',
  weight: 1,
  visual: {
    palette: {
      deepWater: '#173238',
      shallowWater: '#3f6f69',
      shore: '#d9c08e',
      lowland: '#c49a5e',
      highland: '#9a6a43',
      peak: '#e8d6b4',
    },
    seaLevel: [0.26, 0.34],
    terrainAmplitude: [0.055, 0.09],
    terrainScale: [1.6, 2.6],
    roughness: 0.94,
    atmosphereColor: '#e7b98a',
    atmosphereIntensity: 0.75,
    ocean: { opacity: 0.6, roughness: 0.4 },
    clouds: { threshold: [0.6, 0.66], opacity: 0.5, color: '#f3e6d2' },
    polarCap: 0.93,
  },
  generation: {
    sizeClasses: SIZES_ROCKY,
    resourceRange: { metal: [0.95, 1.45], crystal: [0.55, 1.0], energy: [1.0, 1.35] },
    environmentModifiers: [
      STABLE,
      {
        id: 'sandstorms',
        label: 'Burze piaskowe',
        description: 'Wiatr odsłania żyły rudy, ale pył osłabia elektrownie.',
        weight: 1,
        effects: { metal: 1.12, energy: 0.9 },
      },
      {
        id: 'harsh-sun',
        label: 'Silne nasłonecznienie',
        description: 'Bliska gwiazda zasila sieć energetyczną.',
        weight: 1,
        effects: { energy: 1.2 },
      },
    ],
  },
};

export const ICE_WORLD: PlanetDefinition = {
  id: 'ice',
  catalogs: ['LHS', 'Ross', 'Gliese'],
  category: 'lodowa, zimna',
  status: 'robocza',
  weight: 1,
  visual: {
    palette: {
      deepWater: '#1d3a52',
      shallowWater: '#8fb8cf',
      shore: '#c9d6dc',
      lowland: '#a9bccb',
      highland: '#7d8f9f',
      peak: '#f2f6f8',
    },
    seaLevel: [0.46, 0.56],
    terrainAmplitude: [0.04, 0.07],
    terrainScale: [1.2, 2.0],
    roughness: 0.7,
    atmosphereColor: '#a9c8ff',
    atmosphereIntensity: 0.8,
    ocean: { opacity: 0.88, roughness: 0.55 },
    clouds: { threshold: [0.55, 0.6], opacity: 0.6, color: '#eef4ff' },
    polarCap: 0.42,
    // Lód: wyraźne grzbiety i tarasy lodowców, ciemne szczeliny, jasne (ale nie wypalone) światło.
    style: { terraces: 6, relief: 1.7, cliffShade: 0.45, facetJitter: 0.04, sunIntensity: 2.1 },
  },
  generation: {
    sizeClasses: SIZES_ROCKY,
    resourceRange: { metal: [0.6, 1.0], crystal: [1.0, 1.5], energy: [0.7, 1.05] },
    environmentModifiers: [
      STABLE,
      {
        id: 'cryovolcanoes',
        label: 'Kriowulkany',
        description: 'Wyrzuty lodu wynoszą kryształy na powierzchnię.',
        weight: 1,
        effects: { crystal: 1.15 },
      },
      {
        id: 'long-night',
        label: 'Długa noc',
        description: 'Mróz sprzyja krystalizacji, ale elektrownie pracują ciężej.',
        weight: 1,
        effects: { crystal: 1.1, energy: 0.85 },
      },
    ],
  },
};

export const OCEAN_WORLD: PlanetDefinition = {
  id: 'ocean',
  catalogs: ['TOI', 'Kepler', 'HD'],
  category: 'oceaniczna, wilgotna',
  status: 'robocza',
  weight: 1,
  visual: {
    palette: {
      deepWater: '#0a2440',
      shallowWater: '#1f6f8f',
      shore: '#d4c79a',
      lowland: '#3f7a4a',
      highland: '#5f6e4d',
      peak: '#d8dccf',
    },
    seaLevel: [0.57, 0.61],
    terrainAmplitude: [0.045, 0.07],
    terrainScale: [1.4, 2.4],
    roughness: 0.85,
    atmosphereColor: '#78b4ea',
    atmosphereIntensity: 1,
    ocean: { opacity: 0.62, roughness: 0.22 },
    clouds: { threshold: [0.47, 0.51], opacity: 0.85, color: '#f7f9fb' },
  },
  generation: {
    sizeClasses: SIZES_ROCKY,
    resourceRange: { metal: [0.55, 0.95], crystal: [0.9, 1.4], energy: [0.9, 1.3] },
    environmentModifiers: [
      STABLE,
      {
        id: 'tides',
        label: 'Silne pływy',
        description: 'Elektrownie pływowe dają więcej energii.',
        weight: 1,
        effects: { energy: 1.15 },
      },
      {
        id: 'storms',
        label: 'Sztormy',
        description: 'Fale odsłaniają kryształy na rafach, ale niszczą linie przesyłowe.',
        weight: 1,
        effects: { crystal: 1.1, energy: 0.9 },
      },
    ],
  },
};

export const VOLCANIC_WORLD: PlanetDefinition = {
  id: 'volcanic',
  catalogs: ['Gliese', 'Wolf', 'LHS'],
  category: 'wulkaniczna, aktywna',
  status: 'robocza',
  weight: 1,
  visual: {
    palette: {
      deepWater: '#5a1406',
      shallowWater: '#d8561c',
      shore: '#3a2a26',
      lowland: '#2d2626',
      highland: '#4a3d39',
      peak: '#8a7c74',
    },
    seaLevel: [0.4, 0.48],
    terrainAmplitude: [0.06, 0.095],
    terrainScale: [1.8, 2.8],
    roughness: 0.96,
    atmosphereColor: '#e08a5f',
    atmosphereIntensity: 0.7,
    ocean: { opacity: 0.92, roughness: 0.75, emissive: '#ff5a14', emissiveIntensity: 0.55 },
    clouds: { threshold: [0.58, 0.63], opacity: 0.55, color: '#8c8580' },
    polarCap: 1.1,
  },
  generation: {
    sizeClasses: SIZES_ROCKY,
    resourceRange: { metal: [1.1, 1.5], crystal: [0.7, 1.2], energy: [1.0, 1.4] },
    environmentModifiers: [
      STABLE,
      {
        id: 'eruptions',
        label: 'Częste erupcje',
        description: 'Lawa wynosi rudy, ale popiół zakłóca elektrownie.',
        weight: 1,
        effects: { metal: 1.2, energy: 0.9 },
      },
      {
        id: 'geysers',
        label: 'Gejzery',
        description: 'Ciepło z wnętrza planety zasila sieć.',
        weight: 1,
        effects: { energy: 1.15 },
      },
    ],
  },
};

export const PLANET_DEFINITIONS: readonly PlanetDefinition[] = [
  KEPLER_186F,
  ARID_WORLD,
  ICE_WORLD,
  OCEAN_WORLD,
  VOLCANIC_WORLD,
];

/** Planeta startowa (pierwsze uruchomienie). */
export const STARTER = { definition: KEPLER_186F, seed: 'KEPLER-186F-ALFA' } as const;

export function findDefinition(id: string): PlanetDefinition | undefined {
  return PLANET_DEFINITIONS.find((def) => def.id === id);
}
