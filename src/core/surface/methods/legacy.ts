// Metoda `legacy` = algorytm terenu v0.1–v0.17 bez zmian (fBm z zawinięciem dziedziny).
// Zostaje jako punkt odniesienia: test regresji i docelowy rozkład wysokości dla nowych metod.
import { createNoise3D, fbm } from '../../random/noise.ts';
import type { PlanetVisual } from '../../types.ts';
import type { SurfaceField } from '../types.ts';

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Lód (wspólny dla wszystkich metod): granica nieregularna (drobny szum) i wyraźna — bez rozmytych
 * „zacieków” nad morzem i bez prostej linii czapy polarnej.
 */
export function createIce(v: PlanetVisual): SurfaceField['ice'] {
  const warp = createNoise3D(v.noiseSeed ^ 0x9e3779b9);
  const sea = v.seaLevel;
  const cap = v.polarCap;
  return (h, x, y, z) => {
    const edge = (warp(x * 7 + 31, y * 7, z * 7) - 0.5) * 0.16 + (warp(x * 19, y * 19 + 5, z * 19) - 0.5) * 0.06;
    const iceLine = Math.abs(y) + Math.max(0, h - sea) * 0.25 + edge;
    return smoothstep(cap, cap + 0.025, iceLine);
  };
}

/** Wysokość terenu v0.1–v0.17. */
export function legacyHeight(v: PlanetVisual): SurfaceField['height'] {
  const terrain = createNoise3D(v.noiseSeed);
  const warp = createNoise3D(v.noiseSeed ^ 0x9e3779b9);
  const scale = v.terrainScale;
  return (x, y, z) => {
    const wx = (warp(x * 1.5 + 7, y * 1.5, z * 1.5) - 0.5) * 0.6;
    const wy = (warp(x * 1.5, y * 1.5 + 13, z * 1.5) - 0.5) * 0.6;
    return fbm(terrain, (x + wx) * scale + 10, (y + wy) * scale + 10, z * scale + 10, 6);
  };
}

export function legacyField(v: PlanetVisual): SurfaceField {
  return { method: 'legacy', seaLevel: v.seaLevel, height: legacyHeight(v), ice: createIce(v) };
}
