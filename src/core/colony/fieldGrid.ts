// Siatka pól planety (od v0.26.4 — pomysł właściciela): NAJPIERW mapa powierzchni (gęsta chmura punktów:
// ląd, woda, lód, lawa), DOPIERO NA NIEJ pola. Pola lądu dzielą wyłącznie ląd, pola lodu — lód; granice pól
// biegną wzdłuż brzegów, więc żadne pole nie obejmuje wody. Liczba pól lądu jest narzucona seedem
// (`gameplay.fields`, 30–200 — decyzja właściciela). Lód dostaje pola tej samej wielkości (kryształy).
// Ukształtowanie (dolina, równina, wzgórze, góra) i brzeg (ląd przy wodzie, lodzie, lawie) liczone są
// z punktów pola już przy budowie siatki.
import { createRng } from '../random/rng.ts';
import { createSurfaceField } from '../surface/field.ts';
import type { SurfaceField } from '../surface/types.ts';
import type { Planet } from '../types.ts';

export type Vec3 = [number, number, number];
export type FieldKind = 'land' | 'water' | 'ice' | 'lava';

export interface FieldCell {
  /** Środek pola: punkt najdalej od granic pola (na wyspie — przy jej środku). */
  center: Vec3;
  /** Punkty mapy powierzchni należące do pola (indeksy `FieldGrid.samples`) — sam ląd albo sam lód. */
  members: number[];
  /** Promień kątowy pola (z jego powierzchni). */
  radius: number;
  /** Sąsiednie pola (indeksy). */
  neighbors: number[];
  /** Ląd albo lód (woda i lawa nie mają pól). */
  kind: FieldKind;
  /** Udział suchego lądu w polu (ląd 1, lód 0) — pola nie obejmują wody. */
  landShare: number;
  /** Średnia wysokość lądu w polu nad poziomem morza 0..1. */
  relief: number;
  /** Ukształtowanie pola lądu (względem innych pól lądu tej planety); pola lodu — `none`. */
  terrain: FieldTerrain;
  /** Brzeg: pole lądu wśród 35% najmocniej stykających się z wodą, lodem albo lawą. */
  coast: boolean;
}

/** Doliny: najniższe 30% pól lądu, równiny: do połowy, wzgórza: do 80%, góry: najwyższe 20%. */
export type FieldTerrain = 'valley' | 'plain' | 'hill' | 'mountain' | 'none';

/** Odcinek granicy między polem `a` a polem `b` (−1 = brzeg: woda, lawa, wysepka bez pola). */
export interface FieldBorder {
  a: number;
  b: number;
  from: Vec3;
  to: Vec3;
}

export interface FieldGrid {
  cells: FieldCell[];
  /** Pole, wokół którego rośnie kolonia (ląd z największą ilością lądu w okolicy). */
  colonyCenter: number;
  /** Mapa powierzchni: punkty sfery jednostkowej i rodzaj terenu w każdym z nich. */
  samples: Vec3[];
  kinds: FieldKind[];
  /** Pole, do którego należy punkt (−1 — woda, lawa albo wysepka za mała na pole). */
  owner: Int32Array;
  /** Granice pól (do rysowania siatki) — wygładzone, wzdłuż brzegów. */
  borders: FieldBorder[];
}

/** Na czym wolno budować (ląd; lód — kryształy od razu, reszta po badaniu; woda — przyszłe badanie). */
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

/**
 * Wersja siatki pól. Zmiana podziału na pola zmienia numery pól, więc zapisany przydział
 * (`SlotSave.plots`) z inną wersją jest odrzucany i budowle dostają pola od nowa.
 * 2 (v0.26.3): rodzaj pola z 13 próbek. 3 (v0.26.4): pola wyznaczane na mapie powierzchni (tylko ląd i lód).
 */
export const FIELD_GRID_VERSION = 3;

/** Punktów mapy powierzchni (ok. 1° odstępu); więcej, gdy lądu jest bardzo mało. */
const SAMPLES = 40_000;
const MAX_SAMPLES = 160_000;
/** Co najmniej tyle punktów na pole lądu (kształt pola, granice). */
const MIN_POINTS_PER_FIELD = 40;
/** Najwięcej pól lodu (planety lodowe z małą ilością lądu). */
const MAX_ICE_FIELDS = 200;
/** Jaka część pól lądu to brzeg (najbardziej przybrzeżne). */
const COAST_SHARE = 0.35;
/** Iteracje wyrównywania pól (Lloyd). */
const RELAX = 5;
/** Złoty kąt (rad) siatki Fibonacciego. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v: Vec3): Vec3 => {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
};

const cache = new Map<string, FieldGrid>();
const CACHE_SIZE = 16;
const fieldGridKey = (planet: Planet) =>
  `${planet.definitionId}|${planet.seed}|${planet.gameplay.fields}|${planet.visual.surfaceVersion}|${planet.visual.terrainMethod}`;

/** Siatka pól planety (pamięć podręczna — liczona raz na planetę). */
export function fieldGrid(planet: Planet): FieldGrid {
  const key = fieldGridKey(planet);
  let grid = cache.get(key);
  if (!grid) {
    grid = buildFieldGrid(planet);
    if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
    cache.set(key, grid);
  }
  return grid;
}

/** Czyści pamięć siatek (testy: sprawdzenie, czy coś liczy siatki bez potrzeby). */
export function clearFieldGridCache(): void {
  cache.clear();
}

/** Siatka pól, jeśli jest już policzona (bez liczenia — do szybkich zestawień). */
export function cachedFieldGrid(planet: Planet): FieldGrid | undefined {
  return cache.get(fieldGridKey(planet));
}

/** Mapa powierzchni → pola lądu (dokładnie `gameplay.fields`) i pola lodu → granice. */
export function buildFieldGrid(planet: Planet): FieldGrid {
  const want = Math.max(4, planet.gameplay.fields);
  const field = createSurfaceField(planet.visual);
  const seed = `${planet.definitionId}|${planet.seed}|field-grid`;
  let map = surfaceMap(SAMPLES, seed, field, planet);
  const landPoints = map.kinds.filter((k) => k === 'land').length;
  if (landPoints < want * MIN_POINTS_PER_FIELD) {
    map = surfaceMap(Math.min(MAX_SAMPLES, Math.ceil((SAMPLES * want * MIN_POINTS_PER_FIELD) / Math.max(1, landPoints))), seed, field, planet);
  }
  const { samples, kinds, heights, links } = map;
  const owner = new Int32Array(samples.length).fill(-1);
  const land = components(kinds, links, 'land');
  const landTotal = land.reduce((n, c) => n + c.length, 0);
  const perField = landTotal / want;
  const cells: FieldCell[] = [];
  partition(land, want, 'land', samples, links, owner, cells);
  const ice = components(kinds, links, 'ice');
  const iceTotal = ice.reduce((n, c) => n + c.length, 0);
  partition(ice, Math.min(MAX_ICE_FIELDS, Math.round(iceTotal / Math.max(1, perField))), 'ice', samples, links, owner, cells);
  describeCells(cells, samples, kinds, heights, links, owner, field.seaLevel);
  return { cells, colonyCenter: pickColonyCenter(cells), samples, kinds, owner, borders: traceBorders(samples, links, owner) };
}

interface SurfaceMap {
  samples: Vec3[];
  kinds: FieldKind[];
  heights: Float32Array;
  links: Links;
}

/** Sąsiedzi punktów (ok. 6 najbliższych, symetrycznie): `to[start[p]..start[p+1])`, `w` — odległość kątowa. */
interface Links {
  start: Int32Array;
  to: Int32Array;
  w: Float32Array;
}

function surfaceMap(n: number, seed: string, field: SurfaceField, planet: Planet): SurfaceMap {
  const samples = fibonacciPoints(n, seed);
  const heights = new Float32Array(n);
  const kinds = samples.map((p, i) => {
    heights[i] = field.height(...p);
    return sampleKind(field, planet, p);
  });
  return { samples, kinds, heights, links: fibonacciLinks(samples) };
}

/**
 * Sąsiedzi w siatce Fibonacciego: najbliższe punkty leżą o liczbę Fibonacciego indeksów dalej
 * (obrót całej siatki tego nie zmienia), więc wystarczy sprawdzić kilkadziesiąt kandydatów na punkt.
 */
function fibonacciLinks(samples: Vec3[]): Links {
  const n = samples.length;
  const offsets: number[] = [];
  for (let a = 1, b = 2; a < n; [a, b] = [b, a + b]) offsets.push(a);
  const K = 6;
  const near = new Int32Array(n * K).fill(-1);
  const bestJ = new Int32Array(K);
  const bestD = new Float64Array(K);
  // Współrzędne w jednej tablicy (szybszy dostęp niż do tablicy trójek — audyt v0.46, te same liczby).
  const xyz = new Float64Array(n * 3);
  samples.forEach((p, i) => xyz.set(p, i * 3));
  for (let i = 0; i < n; i++) {
    const px = xyz[i * 3]!;
    const py = xyz[i * 3 + 1]!;
    const pz = xyz[i * 3 + 2]!;
    bestJ.fill(-1);
    bestD.fill(-2);
    for (const off of offsets) {
      for (let side = 0; side < 2; side++) {
        const j = side === 0 ? i - off : i + off;
        if (j < 0 || j >= n) continue;
        const d = px * xyz[j * 3]! + py * xyz[j * 3 + 1]! + pz * xyz[j * 3 + 2]!;
        if (d <= bestD[K - 1]!) continue;
        let at = K - 1;
        while (at > 0 && bestD[at - 1]! < d) {
          bestD[at] = bestD[at - 1]!;
          bestJ[at] = bestJ[at - 1]!;
          at--;
        }
        bestD[at] = d;
        bestJ[at] = j;
      }
    }
    near.set(bestJ, i * K);
  }
  // Symetrycznie: j sąsiadem i ⇒ i sąsiadem j. Para {j < i} była już dodana przy j, jeśli i jest na liście j
  // (sprawdzenie 6 pozycji zamiast zbioru wszystkich par — audyt v0.46, ten sam wynik, szybciej).
  const count = new Int32Array(n);
  const pairs: number[] = [];
  const listed = (from: number, to: number) => {
    for (let k = 0; k < K; k++) if (near[from * K + k] === to) return true;
    return false;
  };
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < K; k++) {
      const j = near[i * K + k]!;
      if (j < 0) continue;
      if (j < i && listed(j, i)) continue;
      const a = Math.min(i, j);
      const b = Math.max(i, j);
      pairs.push(a, b);
      count[a]!++;
      count[b]!++;
    }
  }
  const start = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) start[i + 1] = start[i]! + count[i]!;
  const fill = start.slice(0, n);
  const to = new Int32Array(start[n]!);
  for (let k = 0; k < pairs.length; k += 2) {
    const a = pairs[k]!;
    const b = pairs[k + 1]!;
    to[fill[a]!++] = b;
    to[fill[b]!++] = a;
  }
  const w = new Float32Array(to.length);
  for (let i = 0; i < n; i++) {
    for (let k = start[i]!; k < start[i + 1]!; k++) w[k] = Math.acos(Math.min(1, dot(samples[i]!, samples[to[k]!]!)));
  }
  return { start, to, w };
}

/** Sąsiedzi punktu `p` (widok na tablicę, bez kopiowania). */
const around = (links: Links, p: number) => links.to.subarray(links.start[p]!, links.start[p + 1]!);

/** Spójne obszary punktów danego rodzaju (wyspy, kontynenty, czapy lodowe), w stałej kolejności. */
function components(kinds: FieldKind[], links: Links, kind: FieldKind): number[][] {
  const seen = new Uint8Array(kinds.length);
  const result: number[][] = [];
  for (let s = 0; s < kinds.length; s++) {
    if (seen[s] || kinds[s] !== kind) continue;
    const comp: number[] = [];
    const queue = [s];
    seen[s] = 1;
    while (queue.length > 0) {
      const p = queue.pop()!;
      comp.push(p);
      for (let k = links.start[p]!; k < links.start[p + 1]!; k++) {
        const q = links.to[k]!;
        if (!seen[q] && kinds[q] === kind) {
          seen[q] = 1;
          queue.push(q);
        }
      }
    }
    result.push(comp.sort((a, b) => a - b));
  }
  return result;
}

/**
 * Podział obszarów na `count` pól: każdy obszar dostaje pola proporcjonalnie do wielkości (największe reszty —
 * suma dokładnie `count`; wysepka mniejsza niż pół pola zostaje bez pola), potem pola się wyrównują (Lloyd):
 * punkt należy do najbliższego środka PO SWOIM TERENIE (granica nie przeskakuje przez wodę).
 */
function partition(comps: number[][], count: number, kind: FieldKind, samples: Vec3[], links: Links, owner: Int32Array, cells: FieldCell[]): void {
  if (count <= 0 || comps.length === 0) return;
  const total = comps.reduce((n, c) => n + c.length, 0);
  const quota = comps.map((c, i) => ({ i, exact: (count * c.length) / total }));
  const share = quota.map((q) => Math.floor(q.exact));
  let left = count - share.reduce((a, b) => a + b, 0);
  for (const q of [...quota].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)) || a.i - b.i)) {
    if (left <= 0) break;
    share[q.i]!++;
    left--;
  }
  const seeds: number[] = [];
  comps.forEach((comp, c) => {
    const k = Math.min(share[c]!, comp.length);
    for (let s = 0; s < k; s++) seeds.push(comp[Math.floor(((s + 0.5) * comp.length) / k)]!);
  });
  const allowed = new Uint8Array(samples.length);
  for (const comp of comps) for (const p of comp) allowed[p] = 1;
  let assign = grow(seeds, links, samples, allowed);
  for (let it = 0; it < RELAX; it++) {
    const sums = seeds.map((): Vec3 => [0, 0, 0]);
    allowed.forEach((ok, p) => {
      const o = assign[p]!;
      if (!ok || o < 0) return;
      const s = sums[o]!;
      const v = samples[p]!;
      s[0] += v[0];
      s[1] += v[1];
      s[2] += v[2];
    });
    const best = seeds.map(() => ({ p: -1, d: -Infinity }));
    allowed.forEach((ok, p) => {
      const o = assign[p]!;
      if (!ok || o < 0) return;
      const d = dot(samples[p]!, sums[o]!);
      if (d > best[o]!.d) best[o] = { p, d };
    });
    best.forEach((b, o) => {
      if (b.p >= 0) seeds[o] = b.p;
    });
    assign = grow(seeds, links, samples, allowed);
  }
  const base = cells.length;
  seeds.forEach(() =>
    cells.push({ center: [0, 0, 1], members: [], radius: 0, neighbors: [], kind, landShare: kind === 'land' ? 1 : 0, relief: 0, terrain: 'none', coast: false }),
  );
  allowed.forEach((ok, p) => {
    const o = assign[p]!;
    if (!ok || o < 0) return;
    owner[p] = base + o;
    cells[base + o]!.members.push(p);
  });
}

/** Wzrost pól od środków (Dijkstra po sąsiadach, tylko po dozwolonych punktach). */
function grow(seeds: number[], links: Links, samples: Vec3[], allowed: Uint8Array): Int32Array {
  const assign = new Int32Array(samples.length).fill(-1);
  const dist = new Float64Array(samples.length).fill(Infinity);
  const heap = new MinHeap();
  seeds.forEach((p, o) => {
    if (dist[p]! === 0) return;
    dist[p] = 0;
    assign[p] = o;
    heap.push(0, p);
  });
  while (heap.size > 0) {
    const p = heap.pop();
    const d = heap.poppedKey;
    if (d > dist[p]!) continue;
    for (let k = links.start[p]!; k < links.start[p + 1]!; k++) {
      const q = links.to[k]!;
      if (!allowed[q]) continue;
      const nd = d + links.w[k]!;
      if (nd < dist[q]!) {
        dist[q] = nd;
        assign[q] = assign[p]!;
        heap.push(nd, q);
      }
    }
  }
  return assign;
}

class MinHeap {
  // Tablice typowane rosnące w miarę potrzeby (audyt v0.46: szybciej i bez śmieci dla GC; ten sam porządek).
  private keys = new Float64Array(1024);
  private values = new Int32Array(1024);
  size = 0;
  /** Klucz ostatnio zdjętego elementu (bez tworzenia pary przy każdym `pop`). */
  poppedKey = 0;
  push(key: number, value: number): void {
    if (this.size === this.keys.length) {
      const keys = new Float64Array(this.size * 2);
      keys.set(this.keys);
      this.keys = keys;
      const values = new Int32Array(this.size * 2);
      values.set(this.values);
      this.values = values;
    }
    const k = this.keys;
    const v = this.values;
    let i = this.size++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (k[parent]! <= key) break;
      k[i] = k[parent]!;
      v[i] = v[parent]!;
      i = parent;
    }
    k[i] = key;
    v[i] = value;
  }
  /** Zdejmuje najmniejszy element: zwraca wartość, klucz w `poppedKey`. */
  pop(): number {
    const k = this.keys;
    const v = this.values;
    this.poppedKey = k[0]!;
    const top = v[0]!;
    const n = --this.size;
    const lastK = k[n]!;
    const lastV = v[n]!;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const c = l + 1 < n && k[l + 1]! < k[l]! ? l + 1 : l;
        if (k[c]! >= lastK) break;
        k[i] = k[c]!;
        v[i] = v[c]!;
        i = c;
      }
      k[i] = lastK;
      v[i] = lastV;
    }
    return top;
  }
}

/** Środek (punkt najdalej od granic), sąsiedzi, promień, wysokość, brzeg i ukształtowanie pól. */
function describeCells(cells: FieldCell[], samples: Vec3[], kinds: FieldKind[], heights: Float32Array, links: Links, owner: Int32Array, sea: number): void {
  const area = (4 * Math.PI) / samples.length;
  // Głębokość punktu = ile kroków do granicy pola (BFS od punktów granicznych).
  const depth = new Int32Array(samples.length).fill(-1);
  const queue: number[] = [];
  for (let p = 0; p < samples.length; p++) {
    if (owner[p]! < 0) continue;
    if (around(links, p).some((q) => owner[q] !== owner[p])) {
      depth[p] = 0;
      queue.push(p);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head]!;
    for (const q of around(links, p)) {
      if (owner[q] === owner[p] && depth[q]! < 0) {
        depth[q] = depth[p]! + 1;
        queue.push(q);
      }
    }
  }
  // Ile punktów pola styka się z wodą, lodem albo lawą (na pole) — do wyboru brzegów.
  const shores = new Float64Array(cells.length);
  cells.forEach((cell, i) => {
    const sum: Vec3 = [0, 0, 0];
    let relief = 0;
    let shore = 0;
    const neighbors = new Set<number>();
    for (const p of cell.members) {
      const v = samples[p]!;
      sum[0] += v[0];
      sum[1] += v[1];
      sum[2] += v[2];
      relief += Math.max(0, heights[p]! - sea) / (1 - sea);
      for (const q of around(links, p)) {
        const o = owner[q]!;
        if (o >= 0 && o !== i) neighbors.add(o);
        if (kinds[q] !== 'land' && kinds[q] !== cell.kind) shore++;
      }
    }
    const mean = normalize(sum);
    let best = -1;
    let bestScore = -Infinity;
    for (const p of cell.members) {
      const score = depth[p]! + 0.5 * dot(samples[p]!, mean);
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    if (best >= 0) cell.center = samples[best]!;
    cell.radius = Math.sqrt((cell.members.length * area) / Math.PI);
    shores[i] = shore / Math.max(1, cell.members.length);
    cell.relief = cell.members.length > 0 ? relief / cell.members.length : 0;
    cell.neighbors = [...neighbors].sort((a, b) => a - b);
  });
  const land = cells.map((c, i) => ({ c, i })).filter(({ c }) => c.kind === 'land');
  land.sort((a, b) => a.c.relief - b.c.relief || a.i - b.i);
  land.forEach(({ c }, rank) => {
    const q = land.length > 1 ? rank / (land.length - 1) : 0.5;
    c.terrain = q < 0.3 ? 'valley' : q < 0.5 ? 'plain' : q < 0.8 ? 'hill' : 'mountain';
  });
  // Brzeg: 35% pól lądu najmocniej stykających się z wodą, lodem albo lawą (jeziora i rzeki są wszędzie —
  // inaczej prawie każde pole byłoby „brzegiem”).
  const byShore = land.filter(({ i }) => shores[i]! > 0).sort((a, b) => shores[b.i]! - shores[a.i]! || a.i - b.i);
  byShore.slice(0, Math.ceil(land.length * COAST_SHARE)).forEach(({ c }) => (c.coast = true));
}

/**
 * Granice pól: dla każdej pary sąsiednich punktów z różnych pól — odcinek łączący środki dwóch trójkątów
 * nad tą parą (dualna siatka mapy), potem wygładzenie (bez ruszania węzłów, gdzie spotykają się 3 pola).
 */
function traceBorders(samples: Vec3[], links: Links, owner: Int32Array): FieldBorder[] {
  // Klucz rogu: trzy numery punktów rosnąco w jednej liczbie (n³ < 2⁵³ dla n ≤ 160 000) — bez napisów (audyt v0.46).
  const n = samples.length;
  const vertex = new Map<number, { pos: Vec3; next: Set<number> }>();
  const segments: { a: number; b: number; u: number; v: number }[] = [];
  const corner = (p: number, q: number, r: number) => {
    const lo = Math.min(p, q, r);
    const hi = Math.max(p, q, r);
    const key = (lo * n + (p + q + r - lo - hi)) * n + hi;
    if (!vertex.has(key)) {
      const [a, b, c] = [samples[p]!, samples[q]!, samples[r]!];
      vertex.set(key, { pos: normalize([a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]), next: new Set() });
    }
    return key;
  };
  for (let p = 0; p < samples.length; p++) {
    for (const q of around(links, p)) {
      if (q <= p || owner[p] === owner[q]) continue;
      const a = Math.max(owner[p]!, owner[q]!);
      if (a < 0) continue;
      const b = Math.min(owner[p]!, owner[q]!);
      // Dwaj wspólni sąsiedzi pary — po obu stronach odcinka p–q (najbliżsi jego środka).
      const P = samples[p]!;
      const Q = samples[q]!;
      const mid = normalize([P[0] + Q[0], P[1] + Q[1], P[2] + Q[2]]);
      const side: Vec3 = [P[1] * Q[2] - P[2] * Q[1], P[2] * Q[0] - P[0] * Q[2], P[0] * Q[1] - P[1] * Q[0]];
      let left = -1;
      let right = -1;
      let leftD = -Infinity;
      let rightD = -Infinity;
      for (const r of around(links, p)) {
        if (r === q || !around(links, q).includes(r)) continue;
        const d = dot(samples[r]!, mid);
        if (dot(samples[r]!, side) > 0) {
          if (d > leftD) [left, leftD] = [r, d];
        } else if (d > rightD) [right, rightD] = [r, d];
      }
      if (left < 0 || right < 0) continue;
      const u = corner(p, q, left);
      const v = corner(p, q, right);
      vertex.get(u)!.next.add(v);
      vertex.get(v)!.next.add(u);
      segments.push({ a, b, u, v });
    }
  }
  for (let it = 0; it < 3; it++) {
    const moved = new Map<number, Vec3>();
    for (const [key, node] of vertex) {
      if (node.next.size !== 2) continue;
      const [n1, n2] = [...node.next].map((k) => vertex.get(k)!.pos);
      const p = node.pos;
      moved.set(key, normalize([p[0] * 0.5 + (n1![0] + n2![0]) * 0.25, p[1] * 0.5 + (n1![1] + n2![1]) * 0.25, p[2] * 0.5 + (n1![2] + n2![2]) * 0.25]));
    }
    for (const [key, pos] of moved) vertex.get(key)!.pos = pos;
  }
  return segments.map(({ a, b, u, v }) => ({ a, b, from: vertex.get(u)!.pos, to: vertex.get(v)!.pos }));
}

/** Punkty Fibonacciego obrócone losowo (obrót z dwóch losowych kierunków — bez trygonometrii w losowaniu). */
function fibonacciPoints(count: number, seed: string): Vec3[] {
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
