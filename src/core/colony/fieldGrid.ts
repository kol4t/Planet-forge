// Siatka pól planety. Liczba pól DO ZABUDOWY (ląd) jest narzucona seedem (`gameplay.fields`, 30–200 —
// decyzja właściciela); siatka gęstnieje tak, żeby na lądzie wypadło dokładnie tyle pól, a woda, lód
// i lawa leżą między nimi. Pola to komórki Woronoja wokół siatki Fibonacciego (obróconej z seeda) —
// na kuli głównie sześcio- i pięciokąty. Budować można tylko na lądzie (woda i lód — `BuildRules`).
import { createRng } from '../random/rng.ts';
import { createSurfaceField } from '../surface/field.ts';
import type { SurfaceField } from '../surface/types.ts';
import type { Planet } from '../types.ts';

export type Vec3 = [number, number, number];
export type FieldKind = 'land' | 'water' | 'ice' | 'lava';

export interface FieldCell {
  /** Środek pola (wektor jednostkowy). */
  center: Vec3;
  /** Obrys pola: punkty na granicy z sąsiadami, po kolei dookoła środka (sfera jednostkowa). */
  outline: Vec3[];
  /** Sąsiednie pola (indeksy). */
  neighbors: number[];
  kind: FieldKind;
  /** Udział lądu w próbkach pola 0..1 (pola przybrzeżne mają mniej). */
  landShare: number;
}

export interface FieldGrid {
  cells: FieldCell[];
  /** Pole, wokół którego rośnie kolonia (ląd z największą ilością lądu w okolicy). */
  colonyCenter: number;
}

/** Na czym wolno budować (na razie tylko ląd; woda i lód — do odblokowania badaniem). */
export interface BuildRules {
  water?: boolean;
  ice?: boolean;
}

export function isBuildable(kind: FieldKind, rules: BuildRules = {}): boolean {
  return kind === 'land' || (kind === 'water' && !!rules.water) || (kind === 'ice' && !!rules.ice);
}

/** Liczba pól, na których wolno budować. */
export function buildableCount(grid: FieldGrid, rules: BuildRules = {}): number {
  return grid.cells.reduce((n, cell) => n + (isBuildable(cell.kind, rules) ? 1 : 0), 0);
}

/** Punkty obrysu na pole (gładkie krawędzie, ~2 tys. punktów na całą planetę). */
const OUTLINE_POINTS = 18;
/** Złoty kąt (rad) siatki Fibonacciego. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v: Vec3): Vec3 => {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
};

const cache = new Map<string, FieldGrid>();
const CACHE_SIZE = 16;

/** Siatka pól planety (pamięć podręczna — liczona raz na planetę). */
export function fieldGrid(planet: Planet): FieldGrid {
  const key = `${planet.definitionId}|${planet.seed}|${planet.gameplay.fields}|${planet.visual.surfaceVersion}|${planet.visual.terrainMethod}`;
  let grid = cache.get(key);
  if (!grid) {
    grid = buildFieldGrid(planet);
    if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
    cache.set(key, grid);
  }
  return grid;
}

/** Największa siatka (planeta prawie cała pod wodą przy 200 polach lądu). */
const MAX_CELLS = 2400;

/**
 * Siatka z dokładnie `gameplay.fields` polami lądu: liczba wszystkich pól dobierana do udziału lądu,
 * a nadmiarowe pola lądu — te z najmniejszą ilością lądu, czyli przybrzeżne — zostają polami wody.
 */
export function buildFieldGrid(planet: Planet): FieldGrid {
  const want = Math.max(4, planet.gameplay.fields);
  const field = createSurfaceField(planet.visual);
  const seed = `${planet.definitionId}|${planet.seed}|field-grid`;
  // Liczbę wszystkich pól dobieramy tanio (rodzaj terenu tylko w środkach pól), z zapasem 4%;
  // pełną siatkę (obrysy, głosowanie próbek) liczymy raz, a w razie niedoboru lądu — nieco gęstszą.
  const share = Math.max(0.05, landShareEstimate(field, planet));
  let count = Math.min(MAX_CELLS, Math.max(want, Math.round((want * 1.04) / share)));
  for (let attempt = 0; attempt < 6; attempt++) {
    const land = fibonacciCenters(count, seed).filter((c) => sampleKind(field, planet, c) === 'land').length;
    const ratio = (want * 1.04) / Math.max(1, land);
    if (Math.abs(ratio - 1) < 0.02 || count >= MAX_CELLS) break;
    count = Math.min(MAX_CELLS, Math.max(want, Math.round(count * ratio)));
  }
  let cells = buildCells(count, seed, field, planet);
  for (let attempt = 0; attempt < 4 && count < MAX_CELLS; attempt++) {
    const land = cells.filter((c) => c.kind === 'land').length;
    if (land >= want) break;
    count = Math.min(MAX_CELLS, Math.ceil((count * want * 1.03) / Math.max(1, land)));
    cells = buildCells(count, seed, field, planet);
  }
  trimLand(cells, want);
  return { cells, colonyCenter: pickColonyCenter(cells) };
}

/** Nadmiar pól lądu → woda (najpierw najbardziej przybrzeżne; remis — wyższy indeks). */
function trimLand(cells: FieldCell[], want: number): void {
  const land = cells.map((c, i) => ({ c, i })).filter(({ c }) => c.kind === 'land');
  land.sort((a, b) => a.c.landShare - b.c.landShare || b.i - a.i);
  for (let k = 0; k < land.length - want; k++) land[k]!.c.kind = 'water';
}

/** Udział lądu na planecie (szybkie próbkowanie środkami gęstej siatki Fibonacciego). */
function landShareEstimate(field: SurfaceField, planet: Planet): number {
  const n = 1500;
  let land = 0;
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const a = i * GOLDEN;
    if (sampleKind(field, planet, [r * Math.cos(a), y, r * Math.sin(a)]) === 'land') land++;
  }
  return land / n;
}

function buildCells(count: number, seed: string, field: SurfaceField, planet: Planet): FieldCell[] {
  const centers = fibonacciCenters(count, seed);
  const candidates = centers.map((c, i) => nearestCenters(centers, c, i, 12));
  const spacing = Math.sqrt(4 / count); // ≈ promień kątowy pola
  return centers.map((center, i) => {
    const { outline, neighbors } = traceOutline(i, centers, candidates[i]!, spacing);
    const { kind, landShare } = classify(field, planet, center, outline);
    return { center, outline, neighbors, kind, landShare };
  });
}

/** `k` najbliższych środków (bez pełnego sortowania — siatka może mieć ponad tysiąc pól). */
function nearestCenters(centers: Vec3[], c: Vec3, self: number, k: number): number[] {
  const best: { j: number; d: number }[] = [];
  centers.forEach((o, j) => {
    if (j === self) return;
    const d = dot(c, o);
    if (best.length === k && d <= best[k - 1]!.d) return;
    let at = best.length;
    while (at > 0 && best[at - 1]!.d < d) at--;
    best.splice(at, 0, { j, d });
    if (best.length > k) best.pop();
  });
  return best.map((b) => b.j);
}

/** Siatka Fibonacciego obrócona losowo (obrót z dwóch losowych kierunków — bez trygonometrii w losowaniu). */
function fibonacciCenters(count: number, seed: string): Vec3[] {
  const rng = createRng(seed);
  const random = (): Vec3 => {
    for (;;) {
      const v: Vec3 = [rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)];
      const l2 = dot(v, v);
      if (l2 > 0.01 && l2 <= 1) return normalize(v);
    }
  };
  const ax = random();
  let ay = random();
  const k = dot(ax, ay);
  ay = normalize([ay[0] - k * ax[0], ay[1] - k * ax[1], ay[2] - k * ax[2]]);
  const az: Vec3 = [ax[1] * ay[2] - ax[2] * ay[1], ax[2] * ay[0] - ax[0] * ay[2], ax[0] * ay[1] - ax[1] * ay[0]];
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    const a = i * GOLDEN;
    const p: Vec3 = [r * Math.cos(a), y, r * Math.sin(a)];
    return normalize([
      p[0] * ax[0] + p[1] * ay[0] + p[2] * az[0],
      p[0] * ax[1] + p[1] * ay[1] + p[2] * az[1],
      p[0] * ax[2] + p[1] * ay[2] + p[2] * az[2],
    ]);
  });
}

/** Obrys pola: w kilkunastu kierunkach szukamy granicy, za którą bliżej jest środek innego pola. */
function traceOutline(i: number, centers: Vec3[], candidates: number[], spacing: number): { outline: Vec3[]; neighbors: number[] } {
  const c = centers[i]!;
  const helper: Vec3 = Math.abs(c[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const east = normalize([helper[1] * c[2] - helper[2] * c[1], helper[2] * c[0] - helper[0] * c[2], helper[0] * c[1] - helper[1] * c[0]]);
  const north: Vec3 = [c[1] * east[2] - c[2] * east[1], c[2] * east[0] - c[0] * east[2], c[0] * east[1] - c[1] * east[0]];
  const owner = (p: Vec3) => {
    let best = i;
    let bestDot = dot(p, c);
    for (const j of candidates) {
      const d = dot(p, centers[j]!);
      if (d > bestDot) {
        bestDot = d;
        best = j;
      }
    }
    return best;
  };
  const at = (heading: number, distance: number): Vec3 => {
    const t: Vec3 = [
      east[0] * Math.cos(heading) + north[0] * Math.sin(heading),
      east[1] * Math.cos(heading) + north[1] * Math.sin(heading),
      east[2] * Math.cos(heading) + north[2] * Math.sin(heading),
    ];
    const cs = Math.cos(distance);
    const sn = Math.sin(distance);
    return normalize([c[0] * cs + t[0] * sn, c[1] * cs + t[1] * sn, c[2] * cs + t[2] * sn]);
  };
  const outline: Vec3[] = [];
  const neighbors = new Set<number>();
  for (let k = 0; k < OUTLINE_POINTS; k++) {
    const heading = (k / OUTLINE_POINTS) * Math.PI * 2;
    let lo = 0;
    let hi = spacing * 2.2;
    let other = owner(at(heading, hi));
    for (let step = 0; step < 18; step++) {
      const mid = (lo + hi) / 2;
      const o = owner(at(heading, mid));
      if (o === i) lo = mid;
      else {
        hi = mid;
        other = o;
      }
    }
    outline.push(at(heading, (lo + hi) / 2));
    if (other !== i) neighbors.add(other);
  }
  return { outline, neighbors: [...neighbors].sort((a, b) => a - b) };
}

/** Rodzaj terenu w punkcie. */
function sampleKind(field: SurfaceField, planet: Planet, [x, y, z]: Vec3): FieldKind {
  const h = field.height(x, y, z);
  const inland = field.inland;
  if (field.ice(h, x, y, z) > 0.5) return 'ice';
  if (h < field.seaLevel) return planet.visual.hydrology.liquid === 'lava' ? 'lava' : 'water';
  if (inland && (inland.lava(x, y, z) >= 0.5 || (inland.lavaLakes && inland.lakeLevel(x, y, z) >= 0))) return 'lava';
  if (inland && inland.lakeLevel(x, y, z) >= 0) return 'water';
  return 'land';
}

/** Rodzaj pola: większość próbek (środek + punkty w połowie drogi do granicy). */
function classify(field: SurfaceField, planet: Planet, center: Vec3, outline: Vec3[]): { kind: FieldKind; landShare: number } {
  const samples: Vec3[] = [center, ...outline.filter((_, k) => k % 3 === 0).map((p) => normalize([(p[0] + center[0]) / 2, (p[1] + center[1]) / 2, (p[2] + center[2]) / 2]))];
  const votes: Record<FieldKind, number> = { land: 0, water: 0, ice: 0, lava: 0 };
  for (const p of samples) votes[sampleKind(field, planet, p)]++;
  const landShare = votes.land / samples.length;
  // Ląd, gdy przeważa (połowa próbek wystarczy — pola na wybrzeżu są do zabudowy).
  if (votes.land * 2 >= samples.length) return { kind: 'land', landShare };
  return { kind: (['water', 'ice', 'lava'] as const).reduce((a, b) => (votes[b] > votes[a] ? b : a)), landShare };
}

/** Środek kolonii: pole lądu z największą liczbą lądowych pól w promieniu dwóch sąsiedztw, nie przy biegunach. */
function pickColonyCenter(cells: FieldCell[]): number {
  let best = 0;
  let bestScore = -Infinity;
  cells.forEach((cell, i) => {
    if (cell.kind !== 'land') return;
    const ring = new Set<number>(cell.neighbors);
    for (const n of cell.neighbors) for (const m of cells[n]!.neighbors) ring.add(m);
    ring.delete(i);
    let land = 0;
    for (const j of ring) if (cells[j]!.kind === 'land') land++;
    const score = land - Math.abs(cell.center[1]) * 4;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}
