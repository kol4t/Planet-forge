// Próbkowanie powierzchni planety (wysokość i lód z `core/surface`, tu promień i kolor). Czysta matematyka,
// wspólna dla widoku 3D, awaryjnego widoku 2D i rozmieszczenia budynków.
import { createSurfaceField } from '../core/surface/field.ts';
import type { Planet } from '../core/types.ts';

export type RGB = [number, number, number];

export interface SurfaceSampler {
  /** Wysokość terenu 0..1 w punkcie sfery jednostkowej. */
  height(x: number, y: number, z: number): number;
  /** Promień powierzchni lądu dla wysokości `h` (≥ 1 nad poziomem morza). */
  radius(h: number): number;
  /** Kolor terenu dla wysokości `h` w punkcie (x, y, z) sfery jednostkowej. */
  color(h: number, x: number, y: number, z: number): RGB;
  isLand(h: number): boolean;
  /** Ile lodu (0..1) jest w punkcie — np. zamarznięte morze tworzy w 3D lodową taflę nad wodą. */
  ice(h: number, x: number, y: number, z: number): number;
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
  // Wysokość i lód to dane terenu z `core/surface`; tutaj zostaje tylko wygląd (kolor, promień).
  const field = createSurfaceField(v);
  const p = {
    deep: hexToRgb(v.palette.deepWater),
    shallow: hexToRgb(v.palette.shallowWater),
    shore: hexToRgb(v.palette.shore),
    low: hexToRgb(v.palette.lowland),
    high: hexToRgb(v.palette.highland),
    peak: hexToRgb(v.palette.peak),
  };
  const sea = field.seaLevel;

  return {
    ice: field.ice,
    height: field.height,
    radius(h) {
      return 1 + Math.max(0, h - sea) * v.terrainAmplitude * 2.2;
    },
    color(h, x, y, z) {
      let c: RGB;
      if (h < sea) {
        c = mix(p.deep, p.shallow, smoothstep(sea - 0.14, sea, h));
      } else {
        const t = (h - sea) / (1 - sea);
        c = mix(p.shore, p.low, smoothstep(0, 0.06, t));
        c = mix(c, p.high, smoothstep(0.18, 0.42, t));
        c = mix(c, p.peak, smoothstep(0.5, 0.7, t));
      }
      const ice = field.ice(h, x, y, z);
      // Zamarznięte morze jest nieco ciemniejsze niż lód na lądzie.
      return mix(c, h < sea ? mix(p.shallow, p.peak, 0.82) : p.peak, ice * 0.9);
    },
    isLand(h) {
      return h >= sea;
    },
  };
}
