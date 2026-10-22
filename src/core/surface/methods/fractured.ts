// Metoda `fractured`: skorupa bez wody i płyt, kształtowana uderzeniami i pękaniem.
// Kratery (misa z wałem, duże — z centralnym wzniesieniem), uskoki i szczeliny wzdłuż wielkich kół,
// płaskowyże ze stromymi krawędziami (tarasy z szumu) i ostre grzbiety z szumu grzbietowego.
import { createNoise3D, fbm, ridged } from '../../random/noise.ts';
import { createRng } from '../../random/rng.ts';
import type { PlanetVisual } from '../../types.ts';
import type { TerrainRecipe } from './baked.ts';
import { bump, randomDirection, smooth01, type Vec3 } from './shared.ts';

interface Crater {
  center: Vec3;
  radius: number;
  depth: number;
}

interface Fault {
  /** Normalna płaszczyzny wielkiego koła. */
  normal: Vec3;
  /** Środek odcinka uskoku (leży na wielkim kole). */
  middle: Vec3;
  /** Długość odcinka: próg iloczynu skalarnego z `middle`. */
  reach: number;
  depth: number;
  /** Szczelina (wąski rów) zamiast uskoku (stopnia). */
  fissure: boolean;
}

export function fracturedRecipe(v: PlanetVisual): TerrainRecipe {
  const rng = createRng(`fractured|${v.noiseSeed}`);
  const craters: Crater[] = [];
  const craterCount = rng.int(40, 70);
  for (let i = 0; i < craterCount; i++) {
    const u = rng.next();
    // Dużo małych, mało dużych kraterów.
    const radius = 0.05 + 0.24 * u * u * u;
    craters.push({ center: randomDirection(rng), radius, depth: radius * rng.range(0.5, 0.8) });
  }
  const faults: Fault[] = [];
  const faultCount = rng.int(3, 6);
  for (let i = 0; i < faultCount; i++) {
    const normal = randomDirection(rng);
    const d = randomDirection(rng);
    const k = d[0] * normal[0] + d[1] * normal[1] + d[2] * normal[2];
    const m: Vec3 = [d[0] - k * normal[0], d[1] - k * normal[1], d[2] - k * normal[2]];
    const len = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]) || 1;
    faults.push({
      normal,
      middle: [m[0] / len, m[1] / len, m[2] / len],
      reach: rng.range(-0.3, 0.5),
      depth: rng.range(0.04, 0.09),
      fissure: rng.next() < 0.4,
    });
  }
  const plains = createNoise3D(v.noiseSeed ^ 0x9b05688c);
  const mesa = createNoise3D(v.noiseSeed ^ 0x1f83d9ab);
  const fine = createNoise3D(v.noiseSeed ^ 0x5be0cd19);
  const scale = v.terrainScale;

  return {
    base(x, y, z) {
      let h = 0.42 + (fbm(plains, x * scale + 2, y * scale + 2, z * scale + 2, 4) - 0.5) * 0.3;
      // Płaskowyże: wysokość schodkowa z płaskimi szczytami i stromymi krawędziami.
      const m = fbm(mesa, x * 1.6 + 8, y * 1.6, z * 1.6, 3) * 4;
      const step = Math.floor(m);
      h += (step + smooth01((m - step - 0.75) / 0.25)) * 0.05;
      for (const c of craters) {
        const chord2 = (x - c.center[0]) ** 2 + (y - c.center[1]) ** 2 + (z - c.center[2]) ** 2;
        const r2 = c.radius * c.radius;
        if (chord2 >= r2 * 1.69) continue;
        const t = Math.sqrt(chord2 / r2);
        // Misa (płaskie dno w dużych kraterach) i wał wokół krawędzi.
        if (t < 1) h -= c.depth * (1 - Math.max(t * t, c.radius > 0.14 ? 0.25 : 0));
        h += c.depth * 0.45 * bump((t - 1) / 0.3);
        if (c.radius > 0.14) h += c.depth * 0.35 * bump(t / 0.22);
      }
      for (const f of faults) {
        const s = f.normal[0] * x + f.normal[1] * y + f.normal[2] * z;
        if (s > 0.3 || s < -0.3) continue;
        const along = f.middle[0] * x + f.middle[1] * y + f.middle[2] * z;
        const mask = smooth01((along - f.reach) / 0.2);
        if (mask === 0) continue;
        if (f.fissure) h -= f.depth * bump(s / 0.045) * mask;
        else h += f.depth * (smooth01((s + 0.03) / 0.06) * 2 - 1) * bump(s / 0.3) * mask;
      }
      return h;
    },
    detail(x, y, z) {
      const s = scale * 3.8;
      return (ridged(fine, x * s + 6, y * s, z * s, 3) - 0.5) * 0.08;
    },
  };
}
