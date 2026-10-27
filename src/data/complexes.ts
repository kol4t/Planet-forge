// Rodziny kompleksów przemysłowych (v0.38, nazwy i liczby robocze). Kompleks = kilka pełnych grup
// budowli (pole z 3 poziomami) na sąsiednich polach + wolne pole pod wspólną konstrukcję (np. szyb główny).
// Kolejne rodziny (zakłady metalu, węzły energetyczne) dopisuje się tutaj.
import type { BuildingId, Resources, UnlockFeature } from '../core/types.ts';

/** Tryb pracy kompleksu (v0.39): mnożniki wydobycia i zużycia energii poziomów w kompleksie. */
export interface ComplexMode {
  id: string;
  name: string;
  description: string;
  output: number;
  energy: number;
}

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
  /** Nazwa badania (do komunikatów) i jego ramię. */
  research: string;
  /** Tryby pracy (pierwszy = domyślny); brak — kompleks bez wyboru trybu. */
  modes?: readonly ComplexMode[];
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
    research: '„Wspólne szyby” (Badania → Produktywność)',
    status: 'robocza',
  },
  {
    id: 'metal-factory',
    building: 'metalMine',
    name: 'Wielka fabryka',
    hubName: 'hala główna',
    groups: 3,
    extraFields: 1,
    bonus: 30,
    cost: { metal: 3000, crystal: 1500 },
    unlock: 'metal-factory',
    research: '„Metalurgia przemysłowa” (Badania → Produktywność)',
    modes: [
      { id: 'balanced', name: 'Zrównoważony', description: 'Zwykła praca hal i pieców.', output: 1, energy: 1 },
      { id: 'max', name: 'Maksymalna produkcja', description: 'Piece na pełnej mocy: więcej metalu, dużo więcej energii.', output: 1.25, energy: 1.6 },
      { id: 'eco', name: 'Oszczędzanie energii', description: 'Część pieców wygaszona: mniej metalu, o połowę mniej energii.', output: 0.8, energy: 0.5 },
    ],
    status: 'robocza',
  },
];

/** Tryb kompleksu (nieznany albo brak — pierwszy z listy; rodziny bez trybów — neutralny). */
export function complexMode(family: ComplexFamily | undefined, id: string | undefined): ComplexMode {
  const modes = family?.modes ?? [];
  return modes.find((m) => m.id === id) ?? modes[0] ?? { id: 'balanced', name: 'Zrównoważony', description: '', output: 1, energy: 1 };
}

export const findFamily = (building: BuildingId): ComplexFamily | undefined => COMPLEX_FAMILIES.find((f) => f.building === building);
