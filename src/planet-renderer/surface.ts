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
  /** Suchy ląd: nad poziomem morza, a gdy podano punkt — także poza jeziorem, rzeką i lawą. */
  isLand(h: number, x?: number, y?: number, z?: number): boolean;
  /** Ile lodu (0..1) jest w punkcie — np. zamarznięte morze tworzy w 3D lodową taflę nad wodą. */
  ice(h: number, x: number, y: number, z: number): number;
  /** Lustro jeziora w punkcie (−1 = brak). */
  lakeLevel(x: number, y: number, z: number): number;
  /** Świecenie 0..1 (lawa) — jasna także po nocnej stronie. */
  glow(x: number, y: number, z: number): number;
}

/** Kolor najgorętszej lawy (przy źródle). */
const LAVA_HOT: RGB = [1, 0.82, 0.45];

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

/**
 * `inland: false` — bez jezior, rzek i lawy na lądzie (miniatury, sąsiedzi na niebie): nie trzeba
 * liczyć hydrologii, a w kilkudziesięciu pikselach i tak jej nie widać.
 */
export function createSurfaceSampler(planet: Planet, options: { inland?: boolean } = {}): SurfaceSampler {
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
  const inland = options.inland === false ? undefined : field.inland;
  const lava = hexToRgb(v.ocean.emissive ?? v.palette.shallowWater);
  const lakeLevel = inland ? inland.lakeLevel : () => -1;
  const glow = inland ? (x: number, y: number, z: number) => smoothstep(0.4, 0.6, inland.lava(x, y, z)) * inland.lava(x, y, z) : () => 0;

  return {
    ice: field.ice,
    height: field.height,
    lakeLevel,
    glow,
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
        if (inland) {
          const hot = inland.lava(x, y, z);
          if (hot >= 0.5) return mix(lava, LAVA_HOT, smoothstep(0.6, 1, hot) * 0.7);
          const level = inland.lakeLevel(x, y, z);
          if (level >= 0) {
            // Jezioro: płytko przy brzegu, głębiej w środku.
            c = mix(p.shallow, p.deep, smoothstep(0, 0.06, level - h) * 0.7);
          } else {
            const river = inland.river(x, y, z);
            if (river >= 0.5) c = mix(c, p.shallow, 0.85);
          }
        }
      }
      const ice = field.ice(h, x, y, z);
      // Zamarznięte morze jest nieco ciemniejsze niż lód na lądzie.
      return mix(c, h < sea ? mix(p.shallow, p.peak, 0.82) : p.peak, ice * 0.9);
    },
    isLand(h, x, y, z) {
      if (h < sea) return false;
      if (!inland || x === undefined || y === undefined || z === undefined) return true;
      return inland.lakeLevel(x, y, z) < 0 && inland.river(x, y, z) < 0.5 && inland.lava(x, y, z) < 0.5;
    },
  };
}
