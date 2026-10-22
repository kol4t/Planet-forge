import { createRng } from './rng.ts';

export type Noise3D = (x: number, y: number, z: number) => number;

/** Szum wartości 3D (0..1) z interpolacją quintic, deterministyczny dla seeda. */
export function createNoise3D(seed: number): Noise3D {
  const rng = createRng(seed);
  const size = 256;
  const perm = new Uint8Array(size * 2);
  const values = new Float32Array(size);
  const order = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  for (let i = 0; i < size * 2; i++) perm[i] = order[i & 255]!;
  for (let i = 0; i < size; i++) values[i] = rng.next();

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const at = (x: number, y: number, z: number) =>
    values[perm[perm[perm[x & 255]! + (y & 255)]! + (z & 255)]!]!;

  return (x, y, z) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const u = fade(x - xi);
    const v = fade(y - yi);
    const w = fade(z - zi);
    const x00 = lerp(at(xi, yi, zi), at(xi + 1, yi, zi), u);
    const x10 = lerp(at(xi, yi + 1, zi), at(xi + 1, yi + 1, zi), u);
    const x01 = lerp(at(xi, yi, zi + 1), at(xi + 1, yi, zi + 1), u);
    const x11 = lerp(at(xi, yi + 1, zi + 1), at(xi + 1, yi + 1, zi + 1), u);
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
  };
}

/** Szum fraktalny (fBm) znormalizowany do 0..1. */
export function fbm(noise: Noise3D, x: number, y: number, z: number, octaves = 5): number {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise(x * frequency, y * frequency, z * frequency);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return sum / norm;
}

/**
 * Szum grzbietowy (ridged) znormalizowany do 0..1: ostre grzbiety w miejscach, gdzie szum
 * przechodzi przez środek zakresu. `sharpness` 1 = łagodne, 2 = ostre (kwadrat).
 */
export function ridged(noise: Noise3D, x: number, y: number, z: number, octaves = 4, sharpness = 2): number {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  let weight = 1;
  for (let i = 0; i < octaves; i++) {
    let r = 1 - Math.abs(noise(x * frequency, y * frequency, z * frequency) * 2 - 1);
    r = sharpness >= 2 ? r * r : r;
    // Kolejne oktawy silniejsze na grzbietach (typowy „ridged multifractal”).
    r *= weight;
    weight = Math.min(1, r * 2);
    sum += amplitude * r;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return sum / norm;
}
