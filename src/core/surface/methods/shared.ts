// Drobne narzędzia metod terenu (tylko + − × ÷ sqrt — wynik jednakowy w każdej przeglądarce).
import type { Rng } from '../../random/rng.ts';

export type Vec3 = [number, number, number];

/** Losowy kierunek na sferze (losowanie z kuli + normalizacja, bez funkcji trygonometrycznych). */
export function randomDirection(rng: Rng): Vec3 {
  for (;;) {
    const x = rng.range(-1, 1);
    const y = rng.range(-1, 1);
    const z = rng.range(-1, 1);
    const len2 = x * x + y * y + z * z;
    if (len2 > 0.01 && len2 <= 1) {
      const len = Math.sqrt(len2);
      return [x / len, y / len, z / len];
    }
  }
}

/** Losowy wektor styczny do sfery w punkcie `p` o długości z przedziału [0, 1]. */
export function randomTangent(rng: Rng, p: Vec3): Vec3 {
  const d = randomDirection(rng);
  const k = d[0] * p[0] + d[1] * p[1] + d[2] * p[2];
  const t: Vec3 = [d[0] - k * p[0], d[1] - k * p[1], d[2] - k * p[2]];
  const len = Math.sqrt(t[0] * t[0] + t[1] * t[1] + t[2] * t[2]) || 1;
  const speed = rng.range(0.3, 1);
  return [(t[0] / len) * speed, (t[1] / len) * speed, (t[2] / len) * speed];
}

/** Gładki „dzwon” 1 → 0 dla t = 0 → 1 (wielomian, poza [0, 1) zero). */
export const bump = (t: number) => {
  if (t >= 1 || t <= -1) return 0;
  const s = 1 - t * t;
  return s * s;
};

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
