// Wspólny potok nowych metod terenu: kształt liczony raz („pieczenie” do mapy sześciennej,
// opcjonalnie symulacja na siatce), w klatce tylko odczyt mapy + drobny detal + przeliczenie wysokości.
//
// Przeliczenie wysokości: metoda zmienia KSZTAŁT terenu, nie bilans lądu i wody. Wysokości są
// przemapowane tak, by udział lądu przy `seaLevel` planety i zakres gór były jak w terenie `legacy`
// tej samej planety (kwantyle 1%, poziom morza, 99%). Dzięki temu paleta, promień, lód i dane typów
// planet (zakresy `seaLevel`) działają bez zmian.
import type { PlanetVisual } from '../../types.ts';
import { bakeCube, sampleCube } from '../cube.ts';
import { sphereGrid } from '../grid.ts';
import type { SphereGrid, SurfaceField, TerrainMethodId } from '../types.ts';
import { createIce, legacyHeight } from './legacy.ts';

export interface TerrainRecipe {
  /** Kształt terenu w kierunku (x, y, z) sfery jednostkowej — liczony tylko przy pieczeniu. */
  base(x: number, y: number, z: number): number;
  /** Symulacja na siatce (np. erozja): wysokości bazowe w węzłach + szacowany poziom morza. */
  simulate?: { detail: number; run(grid: SphereGrid, height: Float32Array, sea: number): void };
  /** Drobny detal dodawany przy każdym odczycie (musi być tani — widok 2D liczy go co klatkę). */
  detail(x: number, y: number, z: number): number;
}

/** Rozdzielczość ściany mapy sześciennej (6 × 48² ≈ 13,8 tys. tekseli). */
export const CUBE_RES = 48;
/** Siatka, na której liczony jest rozkład wysokości do przeliczenia. */
const REFERENCE_DETAIL = 20;
const MIN_H = 0.0005;
const MAX_H = 0.9995;

const quantile = (sorted: Float32Array, f: number) => {
  const pos = f * (sorted.length - 1);
  const i = Math.floor(pos);
  const j = Math.min(sorted.length - 1, i + 1);
  return sorted[i]! + (sorted[j]! - sorted[i]!) * (pos - i);
};

function sampleNodes(grid: SphereGrid, fn: (x: number, y: number, z: number) => number): Float32Array {
  const out = new Float32Array(grid.count);
  const n = grid.nodes;
  for (let i = 0; i < grid.count; i++) out[i] = fn(n[i * 3]!, n[i * 3 + 1]!, n[i * 3 + 2]!);
  return out;
}

/** Gładka interpolacja wartości z węzłów siatki (węzeł najbliższy + sąsiedzi, waga malejąca z odległością). */
export function gridInterpolator(grid: SphereGrid, values: Float32Array): (x: number, y: number, z: number) => number {
  const n = grid.nodes;
  const first = grid.neighbors[grid.neighborStart[0]!]!;
  const edge2 = (n[0]! - n[first * 3]!) ** 2 + (n[1]! - n[first * 3 + 1]!) ** 2 + (n[2]! - n[first * 3 + 2]!) ** 2;
  const r2 = edge2 * 2.25;
  return (x, y, z) => {
    const c = grid.nearest(x, y, z);
    let sum = 0;
    let wsum = 0;
    const add = (k: number) => {
      const d2 = (n[k * 3]! - x) ** 2 + (n[k * 3 + 1]! - y) ** 2 + (n[k * 3 + 2]! - z) ** 2;
      if (d2 >= r2) return;
      const t = 1 - d2 / r2;
      const w = t * t;
      sum += w * values[k]!;
      wsum += w;
    };
    add(c);
    for (let k = grid.neighborStart[c]!; k < grid.neighborStart[c + 1]!; k++) add(grid.neighbors[k]!);
    return wsum > 0 ? sum / wsum : values[c]!;
  };
}

export function bakedField(v: PlanetVisual, method: TerrainMethodId, recipe: TerrainRecipe): SurfaceField {
  const reference = sphereGrid(REFERENCE_DETAIL);
  const legacy = sampleNodes(reference, legacyHeight(v)).sort();
  let below = 0;
  while (below < legacy.length && legacy[below]! < v.seaLevel) below++;
  const seaShare = below / legacy.length;

  let shape = recipe.base;
  if (recipe.simulate) {
    const grid = sphereGrid(recipe.simulate.detail);
    const height = sampleNodes(grid, recipe.base);
    recipe.simulate.run(grid, height, quantile(height.slice().sort(), seaShare));
    shape = gridInterpolator(grid, height);
  }
  const cube = bakeCube(CUBE_RES, shape);
  const detail = recipe.detail;
  const raw = (x: number, y: number, z: number) => sampleCube(cube, x, y, z) + detail(x, y, z);

  // Węzły przeliczenia: kwantyl 1%, poziom morza, 99% (bez poziomu morza, gdy prawie cała planeta to ląd/morze).
  const sorted = sampleNodes(reference, raw).sort();
  const fractions = seaShare > 0.03 && seaShare < 0.97 ? [0.01, seaShare, 0.99] : [0.01, 0.99];
  const from = fractions.map((f) => quantile(sorted, f));
  const to = fractions.map((f) => quantile(legacy, f));
  for (let k = 1; k < from.length; k++) if (from[k]! <= from[k - 1]!) from[k] = from[k - 1]! + 1e-6;
  const last = from.length - 1;
  const slope = (k: number) => (to[k + 1]! - to[k]!) / (from[k + 1]! - from[k]!);

  return {
    method,
    seaLevel: v.seaLevel,
    height(x, y, z) {
      const r = raw(x, y, z);
      let k = 0;
      while (k < last - 1 && r > from[k + 1]!) k++;
      const h = to[k]! + (r - from[k]!) * slope(k);
      return h < MIN_H ? MIN_H : h > MAX_H ? MAX_H : h;
    },
    ice: createIce(v),
  };
}
