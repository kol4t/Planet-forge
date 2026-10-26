// Ruch orbitalny planet (v0.34): okres z odległości od gwiazdy (jak w prawie Keplera: T ∝ a^1,5),
// rozciągnięty w każdym układzie na zakres z `ORBIT_RULES` (najbliższa ~2 min, najdalsza ~25 min).
// Kąt = faza początkowa + 2π · czas świata / okres — bez zapisywanego stanu, ta sama chwila daje
// to samo położenie na każdym ekranie, po przeładowaniu i po uśpieniu Safari.
import { ORBIT_RULES } from '../../data/galaxy.ts';
import { worldSeconds } from '../time/worldClock.ts';
import type { OrbitRules } from '../types.ts';

const TAU = Math.PI * 2;

/** Okres obiegu (s) planety na orbicie `orbit` (j.a.) w układzie o orbitach od `inner` do `outer`. */
export function orbitalPeriod(orbit: number, inner: number, outer: number, rules: OrbitRules = ORBIT_RULES): number {
  const [min, max] = rules.periodSeconds;
  const k = (a: number) => Math.max(a, 1e-6) ** 1.5;
  const span = k(outer) - k(inner);
  if (!(span > 0)) return min;
  const t = Math.min(1, Math.max(0, (k(orbit) - k(inner)) / span));
  return min + (max - min) * t;
}

/** Kąt planety (rad, 0..2π) w chwili `at` (ms czasu świata). */
export function orbitAngle(phase: number, period: number, at?: number): number {
  const turns = worldSeconds(at) / period;
  const angle = (phase + TAU * (turns - Math.floor(turns))) % TAU;
  return angle < 0 ? angle + TAU : angle;
}

/** Okresy wszystkich planet układu (w kolejności orbit). */
export function systemPeriods(orbits: readonly number[], rules: OrbitRules = ORBIT_RULES): number[] {
  const inner = Math.min(...orbits);
  const outer = Math.max(...orbits);
  return orbits.map((o) => orbitalPeriod(o, inner, outer, rules));
}
