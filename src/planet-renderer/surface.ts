// Próbkowanie powierzchni planety (wysokość i lód z `core/surface`, tu promień i kolor). Czysta matematyka,
// wspólna dla widoku 3D, awaryjnego widoku 2D i rozmieszczenia budynków.
import { createNoise3D, ridged } from '../core/random/noise.ts';
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
  /** Świecenie 0..1 (pęknięcia i strumienie lawy) — jasne także po nocnej stronie. */
  glow(h: number, x: number, y: number, z: number): number;
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

/**
 * Pęknięcia w skorupie lawy 0..1 (1 = jarząca się szczelina): sieć cienkich żył z szumu grzbietowego.
 * Wspólne dla widoku 2D, siatki lawy 3D i tekstury morza lawy — wszędzie ten sam wzór.
 */
export function createLavaVeins(noiseSeed: number): (x: number, y: number, z: number) => number {
  const noise = createNoise3D(noiseSeed ^ 0x27d4eb2f);
  const fine = createNoise3D(noiseSeed ^ 0x165667b1);
  // Szerokie szczeliny między płytami skorupy + drobniejsze pęknięcia wewnątrz płyt.
  return (x, y, z) =>
    Math.max(
      smoothstep(0.66, 0.9, ridged(noise, x * 4 + 11, y * 4, z * 4, 3)),
      0.7 * smoothstep(0.8, 0.95, ridged(fine, x * 11 + 3, y * 11, z * 11, 2)),
    );
}

/** Kolory skorupy i żaru lawy z wyglądu planety. */
export function lavaColors(planet: Planet): { crust: RGB; glow: RGB; hot: RGB } {
  const v = planet.visual;
  return {
    crust: mix(hexToRgb(v.palette.deepWater), [0.06, 0.04, 0.04], 0.55),
    glow: hexToRgb(v.ocean.emissive ?? v.palette.shallowWater),
    hot: [1, 0.62, 0.22],
  };
}

/** Kolor lądu z pasm materiałów profilu: płynne przejście (±`BAND_BLEND`) na granicy pasm. */
const BAND_BLEND = 0.05;

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
    peak: hexToRgb(v.palette.peak),
  };
  const bands = v.bands.map((band) => ({ upTo: band.upTo, color: hexToRgb(band.color) }));
  const sea = field.seaLevel;
  const inland = options.inland === false ? undefined : field.inland;
  const lavaSea = v.hydrology.liquid === 'lava';
  const veins = lavaSea ? createLavaVeins(v.noiseSeed) : () => 0;
  const lava = lavaColors(planet);
  const lakeLevel = inland ? inland.lakeLevel : () => -1;
  /** Skorupa z żyłami żaru; `heat` 1 = strumień przy źródle (prawie cały żarzy się). */
  const lavaAt = (heat: number, x: number, y: number, z: number) => {
    const hot = smoothstep(0.75, 1, heat);
    const glowing = Math.max(veins(x, y, z), hot * 0.85);
    return { glowing, color: mix(lava.crust, mix(lava.glow, lava.hot, hot * 0.6), glowing) };
  };
  const landColor = (t: number): RGB => {
    let c = bands[0]!.color;
    for (let i = 1; i < bands.length; i++) {
      const edge = bands[i - 1]!.upTo;
      const width = Math.min(BAND_BLEND, edge * 0.5);
      c = mix(c, bands[i]!.color, smoothstep(edge - width, edge + width, t));
    }
    return c;
  };

  return {
    ice: field.ice,
    height: field.height,
    lakeLevel,
    glow(h, x, y, z) {
      if (!lavaSea) return 0;
      if (h < sea) return veins(x, y, z) * 0.9;
      if (!inland) return 0;
      const heat = inland.lava(x, y, z);
      const lava = heat >= 0.5 || (inland.lavaLakes && inland.lakeLevel(x, y, z) >= 0);
      return lava ? lavaAt(heat, x, y, z).glowing * (0.6 + 0.4 * heat) : 0;
    },
    radius(h) {
      return 1 + Math.max(0, h - sea) * v.terrainAmplitude * 2.2;
    },
    color(h, x, y, z) {
      let c: RGB;
      if (h < sea) {
        // Morze lawy: zastygła skorupa z jarzącymi się pęknięciami (nie jednolita plama).
        if (lavaSea) return lavaAt(0, x, y, z).color;
        c = mix(p.deep, p.shallow, smoothstep(sea - 0.14, sea, h));
      } else {
        c = landColor((h - sea) / (1 - sea));
        if (inland) {
          const heat = inland.lava(x, y, z);
          const level = inland.lakeLevel(x, y, z);
          if (heat >= 0.5 || (level >= 0 && inland.lavaLakes)) return lavaAt(heat, x, y, z).color;
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
