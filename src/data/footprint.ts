// Zajętość pól budynku według etapów (v0.45, zgłoszenie właściciela: budowle mają się zrastać w jeden
// kompleks i zajmować dużo pól). Wartości ROBOCZE — strojenie balansu przed MVP.
// Etap zaczyna się od poziomu `from`; w obrębie etapu liczba pól rośnie od `fields[0]` do `fields[1]`
// (ostatni etap dochodzi do maksimum po 6 poziomach). Każdy etap to inny wygląd kompleksu.
import type { BuildingId } from '../core/types.ts';

export interface FootprintStage {
  /** Od którego poziomu budynku. */
  from: number;
  /** Pola na początku i na końcu etapu. */
  fields: readonly [number, number];
}

/** Kopalnie i elektrownia: mała instalacja → zakład → wielka fabryka → megakonstrukt. */
const MAIN: readonly FootprintStage[] = [
  { from: 1, fields: [1, 3] },
  { from: 6, fields: [6, 10] },
  { from: 12, fields: [16, 22] },
  { from: 20, fields: [40, 50] },
];

/** Magazyn, Kolektor antymaterii, Laboratorium: ten sam rytm etapów, mniejsze kompleksy. */
const SMALL: readonly FootprintStage[] = [
  { from: 1, fields: [1, 2] },
  { from: 6, fields: [3, 5] },
  { from: 12, fields: [6, 9] },
  { from: 20, fields: [10, 14] },
];

export const FOOTPRINT: Record<BuildingId, readonly FootprintStage[]> = {
  metalMine: MAIN,
  crystalMine: MAIN,
  powerPlant: MAIN,
  storage: SMALL,
  antimatterCollector: SMALL,
  laboratory: SMALL,
};

/** Ostatni etap rośnie przez tyle poziomów. */
export const LAST_STAGE_LEVELS = 6;

/** Nazwy etapów kompleksu (robocze; kolejność jak w `FOOTPRINT`). */
export const STAGE_NAMES: Record<BuildingId, readonly [string, string, string, string]> = {
  metalMine: ['Kopalnia', 'Zakład przetwórczy', 'Huta', 'Megakompleks metalowy'],
  crystalMine: ['Wiertło', 'Szyb wiertniczy', 'Odkrywka', 'Megaodkrywka'],
  powerPlant: ['Farma wiatrowa', 'Generator fuzyjny', 'Elektrownia jądrowa', 'Reaktor antymaterii'],
  storage: ['Skład', 'Magazyn', 'Terminal magazynowy', 'Megaskład'],
  antimatterCollector: ['Pułapka', 'Kolektor', 'Pole pułapek', 'Megakolektor'],
  laboratory: ['Pracownia', 'Laboratorium', 'Instytut', 'Kampus badawczy'],
};
