// Statki floty (v0.58, decyzja właściciela: statki budowane w stoczni na stacji macierzystej). Nazwy i opisy robocze
// (K-005: konflikt rzadki i kosztowny — eskorta chroni misje, nie podbija planet).
import type { ShipType } from '../core/types.ts';

export interface ShipDef {
  id: ShipType;
  name: string;
  /** Liczba mnoga do licznika („3 transportowce”). */
  plural: string;
  description: string;
  status: 'robocza';
}

export const SHIPS: readonly ShipDef[] = [
  { id: 'transport', name: 'Transportowiec', plural: 'transportowce', description: 'Wozi metal i kryształy między planetami i stacją; po przylocie wraca do floty.', status: 'robocza' },
  { id: 'colonyShip', name: 'Statek kolonizacyjny', plural: 'statki kolonizacyjne', description: 'Zakłada nową kolonię — zostaje na niej (zużywa się).', status: 'robocza' },
  { id: 'tug', name: 'Holownik', plural: 'holowniki', description: 'Przyciąga kometę z surowcami; wraca do floty.', status: 'robocza' },
  { id: 'escort', name: 'Okręt eskorty', plural: 'okręty eskorty', description: 'Leci z transportem albo megakonstruktem i chroni go w drodze (ochrona działa od etapu ryzyka misji).', status: 'robocza' },
];

export const SHIP_TYPES: readonly ShipType[] = SHIPS.map((s) => s.id);
export const findShip = (id: ShipType): ShipDef => SHIPS.find((s) => s.id === id)!;
