import type { SpecializationDef, SpecializationRules } from '../core/types.ts';

// Specjalizacje kolonii (v0.32.3). Nazwy, efekty i mnożniki są ROBOCZE (do strojenia przed MVP).
// Dopasowanie = mnożnik gwiazdy × mnożnik strefy orbity (np. Energetyczna przy niebieskim olbrzymie
// w gorącej strefie działa mocniej, przy czarnej dziurze — słabiej).

export const SPECIALIZATION_RULES: SpecializationRules = {
  changeSeconds: 60 * 60,
  affinityRange: [0.5, 2],
};

export const SPECIALIZATIONS: readonly SpecializationDef[] = [
  {
    id: 'mining',
    name: 'Górnicza',
    description: 'Kopalnie pracują wydajniej.',
    effects: [
      { kind: 'output', resource: 'metal', percent: 15 },
      { kind: 'output', resource: 'crystal', percent: 15 },
    ],
    affinity: {
      star: { 'red-dwarf': 1.2, 'black-hole': 1.2, pulsar: 0.9 },
      zone: { hot: 1.1, cold: 1.1, frozen: 1.1 },
    },
    status: 'robocza',
  },
  {
    id: 'energy',
    name: 'Energetyczna',
    description: 'Elektrownie dają więcej energii — najlepiej blisko jasnej gwiazdy.',
    effects: [{ kind: 'output', resource: 'energy', percent: 25 }],
    affinity: {
      star: { 'blue-giant': 1.5, binary: 1.3, pulsar: 1.1, 'red-dwarf': 0.8, 'black-hole': 0.7 },
      zone: { hot: 1.3, warm: 1.1, cold: 0.9, frozen: 0.7 },
    },
    status: 'robocza',
  },
  {
    id: 'science',
    name: 'Naukowa',
    description: 'Szybsze badania i więcej antymaterii z Kolektora — najlepiej przy pulsarze i czarnej dziurze.',
    effects: [
      { kind: 'researchTime', percent: -20 },
      { kind: 'output', resource: 'antimatter', percent: 20 },
    ],
    affinity: {
      star: { pulsar: 1.4, 'black-hole': 1.5, 'blue-giant': 0.9 },
      zone: { hot: 0.9, cold: 1.1, frozen: 1.2 },
    },
    status: 'robocza',
  },
  {
    id: 'industry',
    name: 'Przemysłowa',
    description: 'Szybsze i tańsze budowy — najlepiej w spokojnych, umiarkowanych układach.',
    effects: [
      { kind: 'buildTime', percent: -15 },
      { kind: 'buildCost', percent: -10 },
    ],
    affinity: {
      star: { yellow: 1.2, binary: 1.1, pulsar: 0.9, 'black-hole': 0.9 },
      zone: { warm: 1.1, temperate: 1.2 },
    },
    status: 'robocza',
  },
];

export function findSpecialization(id: string): SpecializationDef | undefined {
  return SPECIALIZATIONS.find((s) => s.id === id);
}
