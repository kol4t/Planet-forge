// Metoda `tectonic`: płyty tektoniczne (komórki Woronoja na sferze z zawiniętymi granicami).
// Płyty kontynentalne są wyżej, oceaniczne niżej; tam, gdzie płyty się zderzają, rosną pasma górskie
// (wyższe, gdy zderzają się kontynenty), gdzie się rozchodzą — rowy i grzbiety śródoceaniczne.
import { createNoise3D, fbm, ridged } from '../../random/noise.ts';
import { createRng } from '../../random/rng.ts';
import type { PlanetVisual } from '../../types.ts';
import type { TerrainRecipe } from './baked.ts';
import { bump, randomDirection, randomTangent, type Vec3 } from './shared.ts';

interface Plate {
  center: Vec3;
  velocity: Vec3;
  continental: boolean;
  elevation: number;
}

/** Szerokość pasa gór i rowów przy granicy płyt (odległość od płaszczyzny granicy). */
const BELT = 0.2;
/** Szerokość łagodnego przejścia wysokości między płytami (różnica iloczynów skalarnych). */
const BLEND = 0.14;
/** Płyty dalej od najbliższej niż ta różnica iloczynów skalarnych nie wpływają na punkt. */
const REACH = 0.45;

export function tectonicRecipe(v: PlanetVisual): TerrainRecipe {
  const rng = createRng(`tectonic|${v.noiseSeed}`);
  const count = rng.int(9, 15);
  const plates: Plate[] = [];
  for (let i = 0; i < count; i++) {
    const center = randomDirection(rng);
    const continental = rng.next() < 0.5;
    plates.push({
      center,
      velocity: randomTangent(rng, center),
      continental,
      elevation: continental ? rng.range(0.56, 0.68) : rng.range(0.3, 0.4),
    });
  }
  const warp = createNoise3D(v.noiseSeed ^ 0x2545f491);
  const shape = createNoise3D(v.noiseSeed ^ 0x6c8e9cf5);
  const mountains = createNoise3D(v.noiseSeed ^ 0x1b873593);
  const fine = createNoise3D(v.noiseSeed ^ 0x85ebca6b);
  const scale = v.terrainScale;
  const dots = new Float64Array(count);
  const reach = new Float64Array(count);
  const nearby = new Int32Array(count);

  return {
    base(x, y, z) {
      // Zawinięcie dziedziny — granice płyt nie są prostymi łukami.
      const wx = x + (fbm(warp, x * 2 + 3, y * 2, z * 2, 2) - 0.5) * 0.5;
      const wy = y + (fbm(warp, x * 2, y * 2 + 7, z * 2, 2) - 0.5) * 0.5;
      const wz = z + (fbm(warp, x * 2, y * 2, z * 2 + 11, 2) - 0.5) * 0.5;
      let top = -2;
      for (let i = 0; i < count; i++) {
        const c = plates[i]!.center;
        dots[i] = c[0] * wx + c[1] * wy + c[2] * wz;
        if (dots[i]! > top) top = dots[i]!;
      }
      // Wszystko zależy w sposób ciągły od iloczynów skalarnych (bez „która płyta jest najbliższa”),
      // więc na stykach trzech płyt nie ma skoków wysokości.
      let height = 0;
      let weight = 0;
      let near = 0;
      for (let i = 0; i < count; i++) {
        const gap = top - dots[i]!;
        reach[i] = bump(gap / REACH);
        if (reach[i]! > 0) nearby[near++] = i;
        const w = bump(gap / BLEND);
        height += plates[i]!.elevation * w;
        weight += w;
      }
      // Granice: każda para pobliskich płyt — zderzenie wypiętrza pasmo gór, rozejście tworzy rów.
      let uplift = 0;
      for (let p = 0; p < near; p++) {
        const i = nearby[p]!;
        const pa = plates[i]!;
        for (let q = p + 1; q < near; q++) {
          const j = nearby[q]!;
          const pb = plates[j]!;
          const nx = pb.center[0] - pa.center[0];
          const ny = pb.center[1] - pa.center[1];
          const nz = pb.center[2] - pa.center[2];
          const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz);
          // Odległość od płaszczyzny granicy (dwusieczna środków płyt).
          const d = Math.abs(dots[i]! - dots[j]!) / nlen;
          if (d >= BELT) continue;
          // Zbieżność: składowa prędkości względnej wzdłuż kierunku między płytami (symetryczna).
          const converge =
            ((pa.velocity[0] - pb.velocity[0]) * nx + (pa.velocity[1] - pb.velocity[1]) * ny + (pa.velocity[2] - pb.velocity[2]) * nz) / nlen;
          const strength =
            converge < 0 ? 0.35 : pa.continental && pb.continental ? 1 : pa.continental || pb.continental ? 0.75 : 0.4;
          uplift += converge * strength * bump(d / BELT) * reach[i]! * reach[j]!;
        }
      }
      // Kontynenty z niskich częstotliwości wewnątrz płyt + pasma gór z szumu grzbietowego.
      const continents = (fbm(shape, x * scale + 5, y * scale + 5, z * scale + 5, 4) - 0.5) * 0.4;
      const ridge = 0.45 + 0.55 * ridged(mountains, x * 3.2 + 2, y * 3.2, z * 3.2, 4);
      return height / weight + continents + uplift * 0.45 * ridge;
    },
    detail(x, y, z) {
      const s = scale * 4.2;
      return (fbm(fine, x * s + 9, y * s, z * s, 3) - 0.5) * 0.12;
    },
  };
}
