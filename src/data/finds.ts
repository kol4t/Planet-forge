// Znaleziska megakompleksów (v0.43.1, decyzja właściciela: „rzadsze przedmioty/artefakty”). Wszystko ROBOCZE:
// nazwy i opisy nie ustalają niczego o dawnej cywilizacji (K-011, K-012) — pochodzenie zostaje niepewne,
// jak w dzienniku ekspedycji (K-008). Premie wynikają z wiedzy i gospodarki (filtr K-011, pkt 3).
import type { ResearchEffect } from '../core/types.ts';

export type FindRarity = 'common' | 'rare' | 'very-rare';

export interface FindDef {
  id: string;
  name: string;
  rarity: FindRarity;
  /** Rodziny kompleksów (`COMPLEX_FAMILIES`), których megakompleksy mogą to znaleźć; puste — każda. */
  families: readonly string[];
  /** Wpis jak z dziennika: co widać i czego nie wiadomo. */
  description: string;
  /** Premia jednej sztuki dla całego imperium (sztuki się sumują do `max`). */
  effect: ResearchEffect;
  max: number;
  status: 'robocza';
}

export const FIND_DEFS: readonly FindDef[] = [
  {
    id: 'core-crystal',
    name: 'Kryształ rdzeniowy',
    rarity: 'common',
    families: ['crystal-drill'],
    description: 'Z dna szybu. Sieć kryształu jest zbyt regularna jak na zwykły wzrost — geolodzy się spierają.',
    effect: { kind: 'output', resource: 'crystal', percent: 2 },
    max: 5,
    status: 'robocza',
  },
  {
    id: 'resonant-shard',
    name: 'Odłamek rezonansowy',
    rarity: 'rare',
    families: ['crystal-drill'],
    description: 'Drga w rytmie, którego nie umiemy zapisać. Laboratorium uczy się na nim szybciej.',
    effect: { kind: 'researchTime', percent: -3 },
    max: 3,
    status: 'robocza',
  },
  {
    id: 'unknown-alloy',
    name: 'Stop o nieznanym składzie',
    rarity: 'common',
    families: ['metal-factory'],
    description: 'Wytopiony w hali — albo tylko odnaleziony w rudzie. Raport huty jest niejasny.',
    effect: { kind: 'output', resource: 'metal', percent: 2 },
    max: 5,
    status: 'robocza',
  },
  {
    id: 'worked-plate',
    name: 'Obrobiona płyta',
    rarity: 'rare',
    families: ['metal-factory'],
    description: 'Pod warstwą skały ślady narzędzi. Czyich — dziennik nie rozstrzyga. Inżynierowie kopiują profil.',
    effect: { kind: 'buildCost', percent: -3 },
    max: 3,
    status: 'robocza',
  },
  {
    id: 'dormant-cell',
    name: 'Ogniwo spoczynkowe',
    rarity: 'common',
    families: ['tesla-grid'],
    description: 'Wciąż trzyma ładunek. Nikt nie wie, od kiedy.',
    effect: { kind: 'output', resource: 'energy', percent: 3 },
    max: 5,
    status: 'robocza',
  },
  {
    id: 'charged-lattice',
    name: 'Naładowana siatka',
    rarity: 'rare',
    families: ['tesla-grid'],
    description: 'Krata przewodzi bez strat w temperaturze, w której nie powinna. Sieć planet uczy się od niej oszczędności.',
    effect: { kind: 'energyUse', percent: -4 },
    max: 3,
    status: 'robocza',
  },
  {
    id: 'deep-record',
    name: 'Zapis z głębi',
    rarity: 'very-rare',
    families: [],
    description: 'Uporządkowany wzór w skale. Może zapis, może przypadek — dziennik zostawia to otwarte.',
    effect: { kind: 'antimatterPassive', perHour: 0.25 },
    max: 2,
    status: 'robocza',
  },
];

/** Robocze: co ile godzin megakompleks coś znajduje i jak często która rzadkość. */
export const FIND_RULES = {
  intervalHours: [4, 8] as const,
  weights: { common: 70, rare: 25, 'very-rare': 5 } as Record<FindRarity, number>,
  rarityNames: { common: 'pospolite', rare: 'rzadkie', 'very-rare': 'bardzo rzadkie' } as Record<FindRarity, string>,
};

