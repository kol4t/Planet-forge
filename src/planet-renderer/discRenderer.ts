// Rysowanie tarczy planety piksel po pikselu (widok 2D i miniatury w oknie „Twoje planety”).
// Czysta matematyka na tablicy RGBA — bez DOM, testowalna.
import type { Planet } from '../core/types.ts';
import { createSurfaceSampler, hexToRgb, type RGB, type SurfaceSampler } from './surface.ts';

const LIGHT = normalize([-0.6, 0.45, 0.65]);

export interface DiscLook {
  sampler: SurfaceSampler;
  seaLevel: number;
  atmosphere: RGB;
  /** Świecące „morze” (lawa): minimalna jasność wody także po nocnej stronie (0 = brak). */
  seaGlow?: number;
  /** Jasność nocnej strony i mnożnik światła gwiazdy (z profilu — jak w 3D). */
  night?: number;
  sun?: number;
}

/** Wygląd tarczy 2D z danych planety (planeta 2D, miniatury, sąsiedzi w tle). */
export function discLook(planet: Planet, options: { inland?: boolean } = {}): DiscLook {
  const v = planet.visual;
  return {
    sampler: createSurfaceSampler(planet, options),
    night: v.style.ambient * 0.6,
    sun: v.style.sunIntensity / 2.4,
    seaLevel: v.seaLevel,
    atmosphere: hexToRgb(v.atmosphereColor),
    // Morze lawy świeci tylko pęknięciami (`sampler.glow`), nie całą powierzchnią.
    seaGlow: v.ocean.emissive && v.hydrology.liquid !== 'lava' ? Math.min(1, (v.ocean.emissiveIntensity ?? 1) * 1.4) : 0,
  };
}

/**
 * Wypełnia `data` (size × size × 4) obrazem planety obróconej o `yaw`/`pitch`.
 * Piksele poza tarczą zostają przezroczyste.
 */
export function renderDisc(
  data: Uint8ClampedArray,
  size: number,
  look: DiscLook,
  yaw: number,
  pitch: number,
  /** Grunt kompleksów (v0.45): kolor i świecenie w punkcie sfery albo null (zwykły teren). */
  overlay?: (x: number, y: number, z: number) => { rgb: readonly [number, number, number]; glow: number } | null,
): void {
  const { sampler, seaLevel, atmosphere } = look;
  const glow = look.seaGlow ?? 0;
  const night = look.night ?? 0.07;
  const sun = look.sun ?? 1;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  data.fill(0);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const sx = ((col + 0.5) / size) * 2 - 1;
      const syy = -(((row + 0.5) / size) * 2 - 1);
      const d2 = sx * sx + syy * syy;
      if (d2 > 1) continue;
      const sz = Math.sqrt(1 - d2);
      // Ekran → współrzędne planety (odwrotność pochylenia i obrotu).
      const py = syy * cp + sz * sp;
      const hz = -syy * sp + sz * cp;
      const px = sx * cy - hz * sy;
      const pz = sx * sy + hz * cy;
      const height = sampler.height(px, py, pz);
      const over = overlay?.(px, py, pz) ?? null;
      const color = over ? over.rgb : sampler.color(height, px, py, pz);
      const dot = sx * LIGHT[0] + syy * LIGHT[1] + sz * LIGHT[2];
      const light = Math.max(0, dot);
      // Wyraźna granica dnia i nocy; noc ciemna, ale nie czarna (widać zarys lądu).
      const day = smoothstep(-0.12, 0.35, dot);
      let shade = night + day * (0.4 + 0.72 * light) * sun + (height < seaLevel ? 0.25 * light ** 24 : 0);
      if (glow > 0 && height < seaLevel) shade = Math.max(shade, glow);
      // Lawa na lądzie świeci także nocą.
      const lava = over ? 0 : sampler.glow(height, px, py, pz);
      if (lava > 0) shade = Math.max(shade, 0.3 + 0.9 * lava);
      if (over && over.glow > 0) shade = Math.max(shade, over.glow);
      // Cienka poświata przy krawędzi, słabsza po nocnej stronie (bez „mleka” na tarczy).
      const haze = (1 - sz) ** 4 * 0.5 * (0.12 + 0.88 * day);
      const i = (row * size + col) * 4;
      data[i] = 255 * Math.min(1, color[0] * shade + atmosphere[0] * haze);
      data[i + 1] = 255 * Math.min(1, color[1] * shade + atmosphere[1] * haze);
      data[i + 2] = 255 * Math.min(1, color[2] * shade + atmosphere[2] * haze);
      data[i + 3] = 255;
    }
  }
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function normalize(v: RGB): RGB {
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}
