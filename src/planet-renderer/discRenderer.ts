// Rysowanie tarczy planety piksel po pikselu (widok 2D i miniatury w oknie „Twoje planety”).
// Czysta matematyka na tablicy RGBA — bez DOM, testowalna.
import type { RGB, SurfaceSampler } from './surface.ts';

const LIGHT = normalize([-0.6, 0.45, 0.65]);

export interface DiscLook {
  sampler: SurfaceSampler;
  seaLevel: number;
  atmosphere: RGB;
}

/**
 * Wypełnia `data` (size × size × 4) obrazem planety obróconej o `yaw`/`pitch`.
 * Piksele poza tarczą zostają przezroczyste.
 */
export function renderDisc(data: Uint8ClampedArray, size: number, look: DiscLook, yaw: number, pitch: number): void {
  const { sampler, seaLevel, atmosphere } = look;
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
      const color = sampler.color(height, px, py, pz);
      const light = Math.max(0, sx * LIGHT[0] + syy * LIGHT[1] + sz * LIGHT[2]);
      const shade = 0.18 + 0.95 * light + (height < seaLevel ? 0.25 * light ** 24 : 0);
      const haze = (1 - sz) ** 3 * 0.45 * (0.3 + 0.7 * light);
      const i = (row * size + col) * 4;
      data[i] = 255 * Math.min(1, color[0] * shade + atmosphere[0] * haze);
      data[i + 1] = 255 * Math.min(1, color[1] * shade + atmosphere[1] * haze);
      data[i + 2] = 255 * Math.min(1, color[2] * shade + atmosphere[2] * haze);
      data[i + 3] = 255;
    }
  }
}

function normalize(v: RGB): RGB {
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}
