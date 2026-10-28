// Paliwo lotów (v0.53, decyzja właściciela): każdy lot zużywa antymaterię — w układzie mało, między układami
// więcej, rośnie z odległością. Czysta logika; kontroler sprawdza portfel i odejmuje paliwo przy starcie lotu.
import type { Balance, FuelKind } from '../types.ts';
import { antimatterAmount } from './economy.ts';

/** Antymateria za lot rodzaju `kind` na odległość `distance` (jednostki mapy; 0 = ten sam układ). */
export function fuelCost(kind: FuelKind, distance: number, balance: Balance): number {
  const rule = balance.fuel[kind];
  if (!(distance > 0)) return rule.inSystem;
  return rule.base + Math.ceil(distance / rule.unitsPerOne);
}

/** Komunikat, gdy w portfelu brakuje paliwa (null — wystarczy). */
export function fuelShortage(fuel: number, wallet: number): string | null {
  if (wallet + 1e-9 >= fuel) return null;
  const missing = Math.ceil(fuel - wallet);
  return `Brak paliwa: lot kosztuje ${antimatterAmount(fuel)}, brakuje ${missing} (antymateria przybywa co godzinę i z Kolektora antymaterii).`;
}

/** „paliwo: 3 antymaterie” — do opisów lotów. */
export const fuelLabel = (fuel: number) => `paliwo: ${antimatterAmount(fuel)}`;
