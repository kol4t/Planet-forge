// Informacja geologiczna planety (od v0.28): pola i złoża do mapy i wyboru kolonii.
// Tylko odczyt istniejących danych planety — bez nowych losowań.
import { BALANCE } from '../../data/balance.ts';
import type { Balance, EconomyState, Planet, Resources } from '../types.ts';
import { depositsLeft, depositTotal } from './economy.ts';

export interface Geology {
  /** Pola planety z seeda (`gameplay.fields`). */
  fields: number;
  /** Złoże całkowite — potencjał planety. */
  total: Resources;
  /** Ile zostało (tylko własna planeta; null — planeta bez gospodarki gracza). */
  left: Resources | null;
}

/** Różnica względem planety odniesienia: złoża jako ułamek (+0,16 = o 16% więcej), pola jako liczba. */
export interface GeologyDiff {
  metal: number;
  crystal: number;
  fields: number;
}

export function geologyOf(planet: Planet, economy: EconomyState | null = null, balance: Balance = BALANCE): Geology {
  return {
    fields: planet.gameplay.fields,
    total: depositTotal(planet, balance),
    left: economy ? depositsLeft(economy, planet, balance) : null,
  };
}

/** Porównanie potencjału (złóż całkowitych i pól) — nie zależy od tego, ile już wydobyto. */
export function compareGeology(planet: Geology, base: Geology): GeologyDiff {
  const ratio = (a: number, b: number) => (b > 0 ? a / b - 1 : 0);
  return {
    metal: ratio(planet.total.metal, base.total.metal),
    crystal: ratio(planet.total.crystal, base.total.crystal),
    fields: planet.fields - base.fields,
  };
}
