// Dok handlowy (etap 3a planu stacji, decyzje właściciela 2026-11-09): moduł stacji (po badaniu „Dok handlowy”)
// i stały rynek — wymiana metalu i kryształów z magazynu stacji oraz sprzedaż antymaterii (po badaniu „Handel
// antymaterią”). Kurs = wartości towarów × wahania (co 6 h, z czasu świata — takie same dla wszystkich) × (1 − marża);
// marża maleje z poziomem doku i po badaniu „Kursy wymiany”. Od kroku 3b wymiana idzie przez kredyty (`merchants.ts`). Czysta logika.
import { stationLevelAt } from '../economy/asteroids.ts';
import type { HomeStation, Resources } from '../types.ts';

export type TradeGood = 'metal' | 'crystal' | 'antimatter';

/** Liczby rynku (robocze, strojenie na końcu). */
export const TRADE = {
  /** Wartość jednostki w jednostkach metalu. */
  value: { metal: 1, crystal: 2, antimatter: 1500 } as Record<TradeGood, number>,
  /** Marża rynku: na poz. 1, mniej o `perLevel` z każdym poziomem, najmniej `min`; badanie „Kursy wymiany” — `research`. */
  spread: { base: 0.3, perLevel: 0.04, min: 0.08, research: 0.05 },
  /** Wahania kursu: co `periodMs` nowa wartość w granicach ±`drift`. */
  periodMs: 6 * 3600 * 1000,
  drift: 0.2,
  dock: { cost: { metal: 20_000, crystal: 30_000 } as Resources, costGrowth: 1.6, secondsPerLevel: 1800, maxLevel: 5 },
  status: 'robocza' as const,
};

export const dockLevel = (station: HomeStation | null, at: number) => (station && at >= station.core.readyAt ? stationLevelAt(station.dock, at) : 0);

export function dockCost(level: number): Resources {
  const f = TRADE.dock.costGrowth ** (level - 1);
  return { metal: Math.round(TRADE.dock.cost.metal * f), crystal: Math.round(TRADE.dock.cost.crystal * f) };
}

/** Wahanie kursu towaru w okresie (deterministyczne z numeru okresu): 1 ± drift. */
export function driftFactor(good: TradeGood, at: number): number {
  if (good === 'metal') return 1;
  const period = Math.floor(at / TRADE.periodMs);
  let h = (period * 2654435761 + (good === 'crystal' ? 97 : 193)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  const t = ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  return 1 + TRADE.drift * (t * 2 - 1);
}

/** Marża rynku przy danym poziomie doku. */
export function marketSpread(level: number, ratesResearch: boolean): number {
  const s = TRADE.spread;
  return Math.max(s.min, s.base - s.perLevel * Math.max(0, level - 1) - (ratesResearch ? s.research : 0));
}
