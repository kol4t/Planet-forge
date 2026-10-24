import type { PlanetDefinition } from '../core/types.ts';
import { ARID, BARREN, ICE, OCEANIC, TERRESTRIAL, VOLCANIC } from './profiles/index.ts';

// Definicje typów planet. Nowy typ = nowy obiekt tutaj + test; renderer czyta tylko dane.
// Wygląd powierzchni i metody terenu pochodzą z profilu (`./profiles/`); `visual` w definicji może je nadpisać.
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
  surface: { profile: TERRESTRIAL },
  generation: {
    sizeClasses: SIZES_ROCKY,
    resourceRange: { metal: [0.75, 1.3], crystal: [0.65, 1.35], energy: [0.8, 1.2] },
    // Planeta startowa (STARTER) ma zawsze 100 pól — optymalnie dla gracza (decyzja właściciela).
    fixedFields: { 'KEPLER-186F-ALFA': 100 },
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
  surface: { profile: ARID },
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
  surface: { profile: ICE },
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
  surface: { profile: OCEANIC },
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
  surface: { profile: VOLCANIC },
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

export const BARREN_WORLD: PlanetDefinition = {
  id: 'barren',
  catalogs: ['LHS', 'Ross', 'Lacaille'],
  category: 'jałowa, bez atmosfery',
  status: 'robocza',
  weight: 1,
  surface: { profile: BARREN },
  generation: {
    sizeClasses: SIZES_ROCKY,
    resourceRange: { metal: [1.0, 1.45], crystal: [0.6, 1.05], energy: [0.75, 1.1] },
    environmentModifiers: [
      STABLE,
      {
        id: 'impacts',
        label: 'Deszcz meteorytów',
        description: 'Uderzenia odsłaniają rudy, ale niszczą linie przesyłowe.',
        weight: 1,
        effects: { metal: 1.15, energy: 0.92 },
      },
      {
        id: 'no-atmosphere',
        label: 'Brak atmosfery',
        description: 'Pełne światło gwiazdy dla elektrowni, lecz kryształy pękają od mrozu nocy.',
        weight: 1,
        effects: { energy: 1.12, crystal: 0.92 },
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
  BARREN_WORLD,
];

/** Planeta startowa (pierwsze uruchomienie). */
export const STARTER = { definition: KEPLER_186F, seed: 'KEPLER-186F-ALFA' } as const;

export function findDefinition(id: string): PlanetDefinition | undefined {
  return PLANET_DEFINITIONS.find((def) => def.id === id);
}
