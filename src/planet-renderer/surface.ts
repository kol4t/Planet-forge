// Próbkowanie powierzchni planety (wysokość, promień, kolor). Czysta matematyka,
// wspólna dla widoku 3D, awaryjnego widoku 2D i rozmieszczenia budynków.
import { createNoise3D, fbm } from '../core/random/noise.ts';
import type { Planet } from '../core/types.ts';

export type RGB = [number, number, number];

export interface SurfaceSampler {
  /** Wysokość terenu 0..1 w punkcie sfery jednostkowej. */
  height(x: number, y: number, z: number): number;
  /** Promień powierzchni lądu dla wysokości `h` (≥ 1 nad poziomem morza). */
  radius(h: number): number;
  /** Kolor terenu dla wysokości `h` i szerokości `y` (-1..1). */
  color(h: number, y: number): RGB;
  isLand(h: number): boolean;
}

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export function createSurfaceSampler(planet: Planet): SurfaceSampler {
  const v = planet.visual;
  const terrain = createNoise3D(v.noiseSeed);
  const warp = createNoise3D(v.noiseSeed ^ 0x9e3779b9);
  const p = {
    deep: hexToRgb(v.palette.deepWater),
    shallow: hexToRgb(v.palette.shallowWater),
    shore: hexToRgb(v.palette.shore),
    low: hexToRgb(v.palette.lowland),
    high: hexToRgb(v.palette.highland),
    peak: hexToRgb(v.palette.peak),
  };
  const scale = v.terrainScale;
  const sea = v.seaLevel;
  const cap = v.polarCap;

  return {
    height(x, y, z) {
      const wx = (warp(x * 1.5 + 7, y * 1.5, z * 1.5) - 0.5) * 0.6;
      const wy = (warp(x * 1.5, y * 1.5 + 13, z * 1.5) - 0.5) * 0.6;
      return fbm(terrain, (x + wx) * scale + 10, (y + wy) * scale + 10, z * scale + 10, 6);
    },
    radius(h) {
      return 1 + Math.max(0, h - sea) * v.terrainAmplitude * 2.2;
    },
    color(h, y) {
      let c: RGB;
      if (h < sea) {
        c = mix(p.deep, p.shallow, smoothstep(sea - 0.14, sea, h));
      } else {
        const t = (h - sea) / (1 - sea);
        c = mix(p.shore, p.low, smoothstep(0, 0.06, t));
        c = mix(c, p.high, smoothstep(0.18, 0.42, t));
        c = mix(c, p.peak, smoothstep(0.5, 0.7, t));
      }
      const ice = smoothstep(cap, cap + 0.12, Math.abs(y) + (h - sea) * 0.25);
      return mix(c, p.peak, ice * 0.85);
    },
    isLand(h) {
      return h >= sea;
    },
  };
}
