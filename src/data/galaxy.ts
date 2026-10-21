import type { GalaxyRules, StarKindDef } from '../core/types.ts';

// Galaktyka (v0.11). Nazwy gwiazd, wagi i liczby są ROBOCZE (do potwierdzenia w Lore Bible).

export const STAR_KINDS: readonly StarKindDef[] = [
  {
    id: 'red-dwarf',
    label: 'Czerwony karzeł',
    description: 'Mała, chłodna gwiazda — planety blisko niej bywają umiarkowane, dalej szybko zamarzają.',
    weight: 30,
    luminosity: 0.35,
    color: '#e0785a',
    status: 'robocza',
  },
  {
    id: 'yellow',
    label: 'Żółta gwiazda',
    description: 'Spokojna gwiazda jak Słońce — szeroka strefa umiarkowana.',
    weight: 26,
    luminosity: 1,
    color: '#f2d27a',
    status: 'robocza',
  },
  {
    id: 'blue-giant',
    label: 'Niebieski olbrzym',
    description: 'Ogromna, gorąca gwiazda — bliskie planety to pustynie i wulkany.',
    weight: 9,
    luminosity: 3.2,
    color: '#9cc4ff',
    status: 'robocza',
  },
  {
    id: 'binary',
    label: 'Gwiazda podwójna',
    description: 'Dwie gwiazdy krążące wokół siebie — cieplej niż przy jednej.',
    weight: 15,
    luminosity: 1.7,
    color: '#ffe3a8',
    status: 'robocza',
  },
  {
    id: 'pulsar',
    label: 'Pulsar',
    description: 'Wirująca gwiazda neutronowa — słabe światło, silne promieniowanie.',
    weight: 11,
    luminosity: 0.25,
    color: '#b9a8f0',
    status: 'robocza',
  },
  {
    id: 'black-hole',
    label: 'Czarna dziura',
    description: 'Ciemne serce układu z jasnym dyskiem materii — planety są zimne i odległe.',
    weight: 6,
    luminosity: 0.18,
    color: '#f0a060',
    status: 'robocza',
  },
];

export const GALAXY_RULES: GalaxyRules = {
  systemCount: 100,
  radius: 100,
  minSpacing: 9,
  planetCount: [3, 10],
  twoHomesUpTo: 7,
  alienChance: 0.2,
  zones: [
    ['hot', 1.6],
    ['warm', 1.15],
    ['temperate', 0.75],
    ['cold', 0.45],
    ['frozen', 0],
  ],
  gasGiantChance: { hot: 0.06, warm: 0.08, temperate: 0.1, cold: 0.4, frozen: 0.5 },
  gasRingsChance: 0.45,
  gasPalettes: {
    warm: [
      ['#e8c79a', '#c99a6a', '#f0dcb8', '#b07a52', '#dcb488'],
      ['#e0a77a', '#f2c9a0', '#b9724e', '#e8b48c', '#c98860'],
    ],
    cold: [
      ['#9cc4d8', '#7aa6c2', '#c2e0ea', '#6b92b0', '#a8d0e0'],
      ['#a8b8e8', '#8494c8', '#c8d4f4', '#7280b8', '#b4c2ec'],
      ['#b8e0d4', '#8cc4b4', '#d4eee6', '#78ac9c', '#a4d4c4'],
    ],
  },
  beltChance: 0.6,
  zoneTypes: {
    hot: { volcanic: 6, arid: 4 },
    warm: { arid: 5, 'kepler-186f': 3, ocean: 2, volcanic: 1 },
    temperate: { 'kepler-186f': 5, ocean: 4, arid: 1 },
    cold: { ice: 5, ocean: 2, 'kepler-186f': 2 },
    frozen: { ice: 1 },
  },
  // v0.18: planety jałowe (robocze) — bez atmosfery, najczęściej blisko gwiazdy i daleko od niej.
  laterTypes: [{ id: 'barren', chance: { hot: 0.3, warm: 0.1, temperate: 0.04, cold: 0.15, frozen: 0.35 } }],
};

export const ZONE_LABELS = {
  hot: 'gorąca',
  warm: 'ciepła',
  temperate: 'umiarkowana',
  cold: 'chłodna',
  frozen: 'mroźna',
} as const;

/** Nazwy galaktyk (na razie jedna; kolejne = przyszłe serwery). */
export const GALAXY_NAMES: Readonly<Record<number, string>> = { 1: 'Galaktyka 1' };
export const SYSTEM_CATALOGS = ['Kepler', 'TOI', 'HD', 'Gliese', 'LHS', 'Ross', 'Wolf', 'Lacaille', 'Tau'] as const;
