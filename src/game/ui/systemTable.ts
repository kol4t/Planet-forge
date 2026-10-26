// Mapa — widok układu jako atlas złóż (v0.33): tabela planet, filtry podświetlania i barwy stref.
// Czysta logika (bez Phasera), testowana w tests/systemTable.test.ts.
import type { MapOccupant } from '../../app/GameController.ts';
import type { OrbitZone, Resources } from '../../core/types.ts';
import { RICH_FROM } from './empireCards.ts';
import { formatAmount } from './theme.ts';

export type MapFilter = 'all' | 'free' | 'metal' | 'crystal';

export const MAP_FILTERS: readonly { id: MapFilter; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'free', label: 'Wolne' },
  { id: 'metal', label: 'Bogate w metal' },
  { id: 'crystal', label: 'Bogate w kryształy' },
];

/** Barwy stref temperatury (od najgorętszej) — pierścienie orbit i legenda. */
export const ZONE_COLORS: Record<OrbitZone, number> = {
  hot: 0xe0785a,
  warm: 0xd8b463,
  temperate: 0x72c4b6,
  cold: 0x8fb0d8,
  frozen: 0xc8d8ec,
};

/** Dane planety układu potrzebne do wiersza tabeli. */
export interface SystemRowInput {
  position: number;
  gas: boolean;
  occupant: MapOccupant;
  /** Krótki opis typu („umiarkowana”, „gazowy olbrzym”). */
  kind: string;
  richness: Resources;
  /** Złoże całkowite (gazowe olbrzymy — 0). */
  total: Resources;
}

export interface SystemRow {
  position: number;
  letter: string;
  kind: string;
  occupant: MapOccupant;
  gas: boolean;
  /** Złoża względem największego w układzie (0..1) — długość pasków. */
  metal: number;
  crystal: number;
  metalText: string;
  crystalText: string;
  /** Pasuje do filtra (pozostałe są przygaszone na mapie i w tabeli). */
  match: boolean;
}

/** Czy planeta pasuje do filtra podświetlania. */
export function matchesFilter(p: SystemRowInput, filter: MapFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'free':
      return p.occupant === 'free' && !p.gas;
    case 'metal':
      return !p.gas && p.richness.metal >= RICH_FROM;
    case 'crystal':
      return !p.gas && p.richness.crystal >= RICH_FROM;
  }
}

/** Wiersze tabeli złóż: każda planeta w jednym wierszu, paski względem najbogatszej w układzie. */
export function systemRows(planets: readonly SystemRowInput[], filter: MapFilter): SystemRow[] {
  const maxMetal = Math.max(1, ...planets.map((p) => p.total.metal));
  const maxCrystal = Math.max(1, ...planets.map((p) => p.total.crystal));
  return planets.map((p) => ({
    position: p.position,
    letter: String.fromCharCode(97 + p.position),
    kind: p.kind,
    occupant: p.occupant,
    gas: p.gas,
    metal: p.gas ? 0 : p.total.metal / maxMetal,
    crystal: p.gas ? 0 : p.total.crystal / maxCrystal,
    metalText: p.gas ? '—' : formatAmount(p.total.metal),
    crystalText: p.gas ? '—' : formatAmount(p.total.crystal),
    match: matchesFilter(p, filter),
  }));
}

/** Ile planet pasuje do filtra (do etykiety „Wolne (3)”). */
export function filterCount(planets: readonly SystemRowInput[], filter: MapFilter): number {
  return planets.filter((p) => matchesFilter(p, filter)).length;
}
