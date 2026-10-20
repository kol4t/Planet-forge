import type { Balance } from '../core/types.ts';

/** Wartości robocze ekonomii (do strojenia po testach na iPadzie). */
export const BALANCE: Balance = {
  levelGrowth: 1.1,
  passiveIncome: { metal: 6, crystal: 3 },
  startingStock: { metal: 250, crystal: 120 },
  startingLevels: { metalMine: 1, crystalMine: 1, powerPlant: 1 },
  maxLevel: 40,
  maxOfflineSeconds: 8 * 60 * 60,
  buildings: [
    {
      id: 'metalMine',
      name: 'Kopalnia metalu',
      description: 'Wydobywa metal. Zużywa energię.',
      baseCost: { metal: 60, crystal: 15 },
      costGrowth: 1.5,
      produces: 'metal',
      baseOutput: 18,
      baseEnergyUse: 10,
    },
    {
      id: 'crystalMine',
      name: 'Ekstraktor kryształów',
      description: 'Pozyskuje kryształy. Zużywa energię.',
      baseCost: { metal: 48, crystal: 24 },
      costGrowth: 1.6,
      produces: 'crystal',
      baseOutput: 10,
      baseEnergyUse: 10,
    },
    {
      id: 'powerPlant',
      name: 'Elektrownia',
      description: 'Dostarcza energię kopalniom. Brak energii spowalnia wydobycie.',
      baseCost: { metal: 75, crystal: 30 },
      costGrowth: 1.5,
      produces: 'energy',
      baseOutput: 22,
      baseEnergyUse: 0,
    },
  ],
};
