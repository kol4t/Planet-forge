// Automatyka SI stacji (krok 2d-3 planu stacji, decyzje właściciela 2026-11-09):
// - automatyczne dostawy — gdy magazyn planety zapełni się powyżej progu ustawionego przez gracza, SI wysyła nadwyżkę
//   transportowcem na stację (najwyżej co 30 min z jednej planety);
// - SI nocna — gdy laboratorium jest wolne, SI zaczyna po kolei najtańsze dostępne badanie w wybranej kategorii;
// - kolejka stacji — jedno badanie zlecone „po” bieżącym;
// - autonomia stacji — SI rozbudowuje magazyn orbitalny, gdy jest prawie pełny, i laboratorium, gdy blokuje badania
//   wybranej kategorii (płaci magazyn stacji).
// Czysta logika (decyzje), wykonanie — w kontrolerze.
import { STATION_CATEGORIES, STATION_RESEARCH, type StationCategoryId } from '../../data/stationResearch.ts';
import type { Resources } from '../types.ts';
import { stationResearchCost, stationResearchStatus, type StationResearchState } from './stationResearch.ts';

/** Progi zapełnienia magazynu planety do wyboru (null — dostawy wyłączone). */
export const SUPPLY_THRESHOLDS = [0.5, 0.75, 0.9] as const;
export type SupplyThreshold = (typeof SUPPLY_THRESHOLDS)[number];

export const AUTO_RULES = {
  /** Najkrótszy odstęp automatycznych dostaw z jednej planety (ms). */
  supplyEveryMs: 30 * 60 * 1000,
  /** Autonomia: magazyn stacji „prawie pełny” od tego zapełnienia. */
  storageFull: 0.9,
  status: 'robocza' as const,
};

export interface StationAuto {
  /** Próg automatycznych dostaw (zapełnienie magazynu planety); brak — wyłączone. */
  supply?: SupplyThreshold;
  /** Kategoria badań SI nocnej; brak — wyłączona. */
  night?: StationCategoryId;
}

/**
 * Nadwyżka do wysłania na stację: to, co ponad `threshold` pojemności magazynu planety, najwyżej ładowność
 * transportowca i wolne miejsce na stacji (po równo z obu surowców, gdy trzeba ciąć). null — nic do wysłania.
 */
export function supplyCargo(stock: Resources, capacity: number, threshold: number, transport: number, room: Resources): Resources | null {
  if (capacity <= 0 || transport <= 0) return null;
  const over = (v: number) => Math.max(0, Math.floor(v - capacity * threshold));
  let metal = Math.min(over(stock.metal), Math.floor(room.metal));
  let crystal = Math.min(over(stock.crystal), Math.floor(room.crystal));
  if (metal + crystal <= 0) return null;
  if (metal + crystal > transport) {
    const half = Math.floor(transport / 2);
    const m = Math.min(metal, Math.max(half, transport - crystal));
    crystal = Math.min(crystal, transport - m);
    metal = m;
  }
  return metal + crystal > 0 ? { metal, crystal } : null;
}

/** Najtańsze dostępne badanie kategorii, na które starcza magazynu stacji (null — brak). */
export function pickNightResearch(state: StationResearchState, category: StationCategoryId, lab: number, lanes: number, stock: Resources): string | null {
  const options = STATION_RESEARCH.filter((n) => n.category === category && stationResearchStatus(n, state, lab, lanes) === 'available')
    .map((n) => ({ n, cost: stationResearchCost(n) }))
    .filter(({ cost }) => cost.metal <= stock.metal && cost.crystal <= stock.crystal)
    .sort((a, b) => a.cost.metal + a.cost.crystal - (b.cost.metal + b.cost.crystal) || a.n.ring - b.n.ring);
  return options[0]?.n.id ?? null;
}

/** Czy wybrana kategoria czeka na wyższe laboratorium (jest badanie z wymaganiami, ale za niskim laboratorium). */
export function categoryNeedsLab(state: StationResearchState, category: StationCategoryId, lab: number): boolean {
  return STATION_RESEARCH.some((n) => n.category === category && stationResearchStatus(n, state, lab, 99) === 'needs-lab');
}

/** Odczyt ustawień z zapisu (błędne pomijane). */
export function parseStationAuto(raw: unknown): StationAuto | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const out: StationAuto = {};
  if (SUPPLY_THRESHOLDS.includes(r.supply as SupplyThreshold)) out.supply = r.supply as SupplyThreshold;
  if (STATION_CATEGORIES.some((c) => c.id === r.night)) out.night = r.night as StationCategoryId;
  return out.supply || out.night ? out : null;
}
