// Ikona aplikacji renderowana z planety startowej (ta sama matematyka powierzchni co gra).
// Pełne tło (iOS nie lubi przezroczystości), planeta mieści się w „bezpiecznym kole”
// ikon maskowalnych (promień 40%), więc ten sam obraz służy jako `any` i `maskable`.
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { createRng } from '../src/core/random/rng.ts';
import { STARTER } from '../src/data/planets.ts';
import { createSurfaceSampler, hexToRgb, type RGB } from '../src/planet-renderer/surface.ts';

const PLANET_R = 0.33; // promień planety (ułamek boku)
const GLOW = 0.1; // grubość poświaty (ułamek promienia)
const YAW = 2.35; // obrót pokazujący ładny kawałek lądu
const PITCH = 0.32;
const LIGHT = norm([-0.62, 0.5, 0.6]);
const BG_CENTER: RGB = hexToRgb('#10282c');
const BG_EDGE: RGB = hexToRgb('#05090b');
const GOLD: RGB = hexToRgb('#d8b463');
const ORBIT = { rx: 0.41, ry: 0.11, tilt: -0.3, width: 0.0075 };

function norm(v: RGB): RGB {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
}
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Zwraca RGBA (size × size × 4). */
export function renderIcon(size: number, samples = 2): Uint8Array {
  const planet = generatePlanet(STARTER.definition, STARTER.seed);
  const sampler = createSurfaceSampler(planet);
  const sea = planet.visual.seaLevel;
  const atmo = hexToRgb(planet.visual.atmosphereColor);
  const cy = Math.cos(YAW), sy = Math.sin(YAW), cp = Math.cos(PITCH), sp = Math.sin(PITCH);

  // Gwiazdy: kilka deterministycznych punktów poza planetą.
  const rng = createRng('planet-forge-icon-stars');
  const stars = Array.from({ length: 26 }, () => ({ x: rng.next(), y: rng.next(), r: 0.002 + rng.next() * 0.004, a: 0.35 + rng.next() * 0.5 }));

  const orbitAt = (x: number, y: number): { d: number; front: boolean } => {
    // Odległość od elipsy orbity (przybliżona, w jednostkach boku) i czy punkt jest „przed” planetą.
    const ct = Math.cos(-ORBIT.tilt), st = Math.sin(-ORBIT.tilt);
    const ex = (x * ct - y * st) / ORBIT.rx;
    const ey = (x * st + y * ct) / ORBIT.ry;
    const k = Math.hypot(ex, ey);
    const grad = Math.hypot(ex / ORBIT.rx, ey / ORBIT.ry) / Math.max(k, 1e-6);
    return { d: Math.abs(k - 1) / Math.max(grad, 1e-6), front: ey > 0 };
  };

  const shade = (u: number, v: number): RGB => {
    // u, v: współrzędne -0.5..0.5 względem środka, v w dół.
    const x = u / PLANET_R;
    const y = -v / PLANET_R;
    const d2 = x * x + y * y;
    let color = mix(BG_CENTER, BG_EDGE, Math.min(1, Math.hypot(u, v) / 0.7));
    for (const s of stars) {
      const dist = Math.hypot(u + 0.5 - s.x, v + 0.5 - s.y);
      if (dist < s.r) color = mix(color, [1, 1, 1], s.a * (1 - dist / s.r));
    }
    const orbit = orbitAt(u, v);
    const orbitAlpha = Math.max(0, 1 - orbit.d / ORBIT.width) * 0.85;
    if (!orbit.front && d2 > 1) color = mix(color, GOLD, orbitAlpha);
    if (d2 <= 1) {
      const z = Math.sqrt(1 - d2);
      // Ekran → planeta (jak w widoku 2D gry).
      const py = y * cp + z * sp;
      const hz = -y * sp + z * cp;
      const px = x * cy - hz * sy;
      const pz = x * sy + hz * cy;
      const h = sampler.height(px, py, pz);
      const base = sampler.color(h, px, py, pz);
      const light = Math.max(0, x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]);
      const spec = h < sea ? 0.35 * light ** 30 : 0;
      const lum = 0.1 + 1.0 * light;
      const haze = (1 - z) ** 2.5 * 0.55 * (0.25 + 0.75 * light);
      color = [
        Math.min(1, base[0] * lum + spec + atmo[0] * haze),
        Math.min(1, base[1] * lum + spec + atmo[1] * haze),
        Math.min(1, base[2] * lum + spec + atmo[2] * haze),
      ];
    } else {
      const r = Math.sqrt(d2);
      const t = (r - 1) / GLOW;
      if (t < 1) {
        const lit = Math.max(0, (x / r) * LIGHT[0] + (y / r) * LIGHT[1]) * 0.8 + 0.2;
        color = mix(color, atmo, (1 - t) ** 2.6 * 0.6 * lit);
      }
    }
    if (orbit.front) color = mix(color, GOLD, orbitAlpha);
    return color;
  };

  const out = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let acc: RGB = [0, 0, 0];
      for (let j = 0; j < samples; j++) {
        for (let i = 0; i < samples; i++) {
          const c = shade((px + (i + 0.5) / samples) / size - 0.5, (py + (j + 0.5) / samples) / size - 0.5);
          acc = [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]];
        }
      }
      const n = samples * samples;
      const o = (py * size + px) * 4;
      out[o] = Math.round((acc[0] / n) * 255);
      out[o + 1] = Math.round((acc[1] / n) * 255);
      out[o + 2] = Math.round((acc[2] / n) * 255);
      out[o + 3] = 255;
    }
  }
  return out;
}
