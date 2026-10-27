// Rodziny kompleksów przemysłowych (v0.38, nazwy i liczby robocze). Kompleks = kilka pełnych grup
// budowli (pole z 3 poziomami) na sąsiednich polach + wolne pole pod wspólną konstrukcję (np. szyb główny).
// Kolejne rodziny (zakłady metalu, węzły energetyczne) dopisuje się tutaj.
import type { BuildingId, Resources, UnlockFeature } from '../core/types.ts';

export interface ComplexFamily {
  id: string;
  building: BuildingId;
  name: string;
  /** Nazwa wspólnej konstrukcji na dodatkowym polu (do opisu). */
  hubName: string;
  /** Ile pełnych grup (pól po 3 poziomy) łączy jeden kompleks. */
  groups: number;
  /** Ile dodatkowych wolnych pól zajmuje wspólna konstrukcja. */
  extraFields: number;
  /** Premia wydobycia poziomów w kompleksie (%). */
  bonus: number;
  /** Koszt połączenia (pobierany z planety). */
  cost: Resources;
  /** Badanie, które pozwala łączyć. */
  unlock: UnlockFeature;
  status: 'robocza';
}

export const COMPLEX_FAMILIES: readonly ComplexFamily[] = [
  {
    id: 'crystal-drill',
    building: 'crystalMine',
    name: 'Kompleks wiertniczy',
    hubName: 'szyb główny',
    groups: 3,
    extraFields: 1,
    bonus: 30,
    cost: { metal: 1500, crystal: 2500 },
    unlock: 'crystal-complex',
    status: 'robocza',
  },
];

export const findFamily = (building: BuildingId): ComplexFamily | undefined => COMPLEX_FAMILIES.find((f) => f.building === building);
