// Metryki kształtu terenu na modelu powierzchni — do testów i porównań metod (później `npm run atlas`).
import type { SurfaceModel } from './types.ts';

export interface SurfaceMetrics {
  /** Udział lądu 0..1. */
  land: number;
  /** Odchylenie standardowe wysokości (jak bardzo teren jest „pofałdowany” w dużej skali). */
  spread: number;
  /** Średnia różnica wysokości z sąsiadem (stromość w drobnej skali). */
  roughness: number;
  /** „Chaos”: średnie odchylenie węzła od średniej sąsiadów względem `spread` (udział wysokich częstotliwości). */
  chaos: number;
  /** Największe odchylenie węzła od średniej sąsiadów (igły). */
  spike: number;
  /** Udział lądu prawie płaskiego (niziny, płaskowyże, dna kraterów). */
  flat: number;
}

/** Płaski węzeł: największa różnica z sąsiadem poniżej tego progu. */
const FLAT = 0.006;

export function surfaceMetrics(model: SurfaceModel): SurfaceMetrics {
  const { count, neighborStart, neighbors } = model.grid;
  const h = model.height;
  let mean = 0;
  for (let i = 0; i < count; i++) mean += h[i]!;
  mean /= count;
  let variance = 0;
  let edges = 0;
  let roughness = 0;
  let deviation = 0;
  let spike = 0;
  let land = 0;
  let flat = 0;
  for (let i = 0; i < count; i++) {
    const hi = h[i]!;
    variance += (hi - mean) ** 2;
    let sum = 0;
    let steepest = 0;
    const n = neighborStart[i + 1]! - neighborStart[i]!;
    for (let k = neighborStart[i]!; k < neighborStart[i + 1]!; k++) {
      const hj = h[neighbors[k]!]!;
      const diff = Math.abs(hi - hj);
      roughness += diff;
      edges++;
      sum += hj;
      if (diff > steepest) steepest = diff;
    }
    const dev = Math.abs(hi - sum / n);
    deviation += dev;
    if (dev > spike) spike = dev;
    if (hi >= model.seaLevel) {
      land++;
      if (steepest < FLAT) flat++;
    }
  }
  const spread = Math.sqrt(variance / count);
  return {
    land: land / count,
    spread,
    roughness: roughness / edges,
    chaos: spread > 0 ? deviation / count / spread : 0,
    spike,
    flat: land > 0 ? flat / land : 0,
  };
}
