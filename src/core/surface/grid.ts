// Siatka geodezyjna sfery — ten sam podział ikosaedru co `THREE.IcosahedronGeometry(1, detail)`,
// więc węzły modelu powierzchni pokrywają się z wierzchołkami lądu 3D (bez interpolacji).
import type { SphereGrid } from './types.ts';

const T = (1 + Math.sqrt(5)) / 2;
// Wierzchołki i ściany ikosaedru w kolejności z three.js (IcosahedronGeometry).
const BASE = [-1, T, 0, 1, T, 0, -1, -T, 0, 1, -T, 0, 0, -1, T, 0, 1, T, 0, -1, -T, 0, 1, -T, T, 0, -1, T, 0, 1, -T, 0, -1, -T, 0, 1];
const FACES = [
  0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6,
  3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
];

/** Kubełki „kostki” do szybkiego startu szukania najbliższego węzła. */
function bucketOf(x: number, y: number, z: number, res: number): number {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);
  let face: number;
  let u: number;
  let v: number;
  if (ax >= ay && ax >= az) {
    face = x > 0 ? 0 : 1;
    u = y / ax;
    v = z / ax;
  } else if (ay >= az) {
    face = y > 0 ? 2 : 3;
    u = x / ay;
    v = z / ay;
  } else {
    face = z > 0 ? 4 : 5;
    u = x / az;
    v = y / az;
  }
  const i = Math.min(res - 1, Math.floor(((u + 1) / 2) * res));
  const j = Math.min(res - 1, Math.floor(((v + 1) / 2) * res));
  return (face * res + i) * res + j;
}

/** Siatka o szczegółowości `detail` (0 = sam ikosaedr, 40 = siatka lądu 3D). */
export function createSphereGrid(detail: number): SphereGrid {
  if (!Number.isInteger(detail) || detail < 0 || detail > 120) throw new Error(`Zła szczegółowość siatki: ${detail}`);
  const coords: number[] = [];
  const index = new Map<string, number>();
  const node = (x: number, y: number, z: number): number => {
    const len = Math.hypot(x, y, z);
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;
    // Te same punkty z sąsiednich ścian różnią się tylko błędem zaokrąglenia.
    const key = `${Math.round(nx * 1e6)},${Math.round(ny * 1e6)},${Math.round(nz * 1e6)}`;
    let i = index.get(key);
    if (i === undefined) {
      i = coords.length / 3;
      coords.push(nx, ny, nz);
      index.set(key, i);
    }
    return i;
  };
  const tris: number[] = [];
  const cols = detail + 1;
  const lerp = (a: number[], b: number[], t: number) => [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t, a[2]! + (b[2]! - a[2]!) * t];
  for (let f = 0; f < FACES.length; f += 3) {
    const corner = (k: number) => BASE.slice(FACES[f + k]! * 3, FACES[f + k]! * 3 + 3);
    const a = corner(0);
    const b = corner(1);
    const c = corner(2);
    // Podział jak w PolyhedronGeometry.subdivideFace: wiersze od krawędzi a–b do wierzchołka c.
    const v: number[][] = [];
    for (let i = 0; i <= cols; i++) {
      const aj = lerp(a, c, i / cols);
      const bj = lerp(b, c, i / cols);
      const rows = cols - i;
      const row: number[] = [];
      for (let j = 0; j <= rows; j++) {
        const p = j === 0 && i === cols ? aj : lerp(aj, bj, j / rows);
        row.push(node(p[0]!, p[1]!, p[2]!));
      }
      v.push(row);
    }
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < 2 * (cols - i) - 1; j++) {
        const k = Math.floor(j / 2);
        if (j % 2 === 0) tris.push(v[i]![k + 1]!, v[i + 1]![k]!, v[i]![k]!);
        else tris.push(v[i]![k + 1]!, v[i + 1]![k + 1]!, v[i + 1]![k]!);
      }
    }
  }

  const count = coords.length / 3;
  const nodes = new Float32Array(coords);
  const triangles = new Uint32Array(tris);

  // Sąsiedzi z krawędzi trójkątów (posortowani — kolejność deterministyczna).
  const sets: Set<number>[] = Array.from({ length: count }, () => new Set<number>());
  for (let t = 0; t < triangles.length; t += 3) {
    const a = triangles[t]!;
    const b = triangles[t + 1]!;
    const c = triangles[t + 2]!;
    sets[a]!.add(b).add(c);
    sets[b]!.add(a).add(c);
    sets[c]!.add(a).add(b);
  }
  const neighborStart = new Uint32Array(count + 1);
  for (let i = 0; i < count; i++) neighborStart[i + 1] = neighborStart[i]! + sets[i]!.size;
  const neighbors = new Uint32Array(neighborStart[count]!);
  for (let i = 0; i < count; i++) neighbors.set([...sets[i]!].sort((p, q) => p - q), neighborStart[i]!);

  // Kubełki: dowolny węzeł w kubełku to dobry punkt startu; puste kubełki dziedziczą po sąsiedzie.
  const res = Math.max(1, Math.round(Math.sqrt(count / 6)));
  const start = new Int32Array(6 * res * res).fill(-1);
  for (let i = 0; i < count; i++) {
    const b = bucketOf(nodes[i * 3]!, nodes[i * 3 + 1]!, nodes[i * 3 + 2]!, res);
    if (start[b] === -1) start[b] = i;
  }
  for (let b = 0; b < start.length; b++) if (start[b] === -1) start[b] = b > 0 ? start[b - 1]! : 0;
  if (start[0] === -1) start[0] = 0;

  const dot = (i: number, x: number, y: number, z: number) => nodes[i * 3]! * x + nodes[i * 3 + 1]! * y + nodes[i * 3 + 2]! * z;

  return {
    detail,
    count,
    nodes,
    triangles,
    neighborStart,
    neighbors,
    nearest(x, y, z) {
      // Zachłanny marsz po sąsiadach od węzła z kubełka (siatka ikosfery jest prawie Delaunaya).
      let best = start[bucketOf(x, y, z, res)]!;
      let bestDot = dot(best, x, y, z);
      for (;;) {
        let next = best;
        for (let k = neighborStart[best]!; k < neighborStart[best + 1]!; k++) {
          const n = neighbors[k]!;
          const d = dot(n, x, y, z);
          if (d > bestDot) {
            bestDot = d;
            next = n;
          }
        }
        if (next === best) return best;
        best = next;
      }
    },
  };
}

const cache = new Map<number, SphereGrid>();

/** Siatka współdzielona przez wszystkie planety (geometria nie zależy od seeda). */
export function sphereGrid(detail: number): SphereGrid {
  let grid = cache.get(detail);
  if (!grid) {
    grid = createSphereGrid(detail);
    cache.set(detail, grid);
  }
  return grid;
}
