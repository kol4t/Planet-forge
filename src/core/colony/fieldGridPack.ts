// Siatka pól w postaci do przechowania (v0.69.2, audyt 2026-11 punkt 1): pierwsze liczenie siatki trwa 0,3–0,6 s na
// komputerze (na iPadzie dłużej) i dawało przycięcie przy zmianie planety i przy przejściu 2D↔3D. Gotowa siatka trafia
// do pamięci przeglądarki (IndexedDB, `app/gridStore.ts`) jako tablice liczb, a przy starcie wraca bez liczenia.
// Czysta logika: pakowanie bez strat (Float64 — numery pól i kształty dokładnie te same) i odczyt z pełną walidacją.
import { FIELD_GRID_VERSION, type FieldBorder, type FieldCell, type FieldGrid, type FieldKind, type FieldTerrain, type Vec3 } from './fieldGrid.ts';

const KINDS: readonly FieldKind[] = ['land', 'water', 'ice', 'lava'];
const TERRAINS: readonly FieldTerrain[] = ['valley', 'plain', 'hill', 'mountain', 'none'];

export interface PackedFieldGrid {
  version: number;
  colonyCenter: number;
  seaCellStart: number;
  samples: Float64Array;
  kinds: Uint8Array;
  owner: Int32Array;
  /** Pola: środek (3), promień, udział lądu, wysokość — po 6 liczb; rodzaj, ukształtowanie, brzeg — po 1 bajcie. */
  cellNumbers: Float64Array;
  cellKinds: Uint8Array;
  cellTerrain: Uint8Array;
  cellCoast: Uint8Array;
  /** Punkty i sąsiedzi pól jako jedna lista z początkami (`*Start[i]..*Start[i+1]`). */
  members: Int32Array;
  membersStart: Int32Array;
  neighbors: Int32Array;
  neighborsStart: Int32Array;
  /** Granice lądu i lodu (bez granic pól morza — te dopisuje `ensureSeaBorders`): a, b, od (3), do (3). */
  borders: Float64Array;
}

const flat = (lists: readonly (readonly number[])[]) => {
  const start = new Int32Array(lists.length + 1);
  lists.forEach((l, i) => (start[i + 1] = start[i]! + l.length));
  const out = new Int32Array(start[lists.length]!);
  lists.forEach((l, i) => out.set(l, start[i]!));
  return { out, start };
};

/** Siatka → tablice liczb (do IndexedDB). Granice pól morza pomijane (liczone na żądanie). */
export function packFieldGrid(grid: FieldGrid): PackedFieldGrid {
  const n = grid.cells.length;
  const cellNumbers = new Float64Array(n * 6);
  grid.cells.forEach((c, i) => cellNumbers.set([c.center[0], c.center[1], c.center[2], c.radius, c.landShare, c.relief], i * 6));
  const members = flat(grid.cells.map((c) => c.members));
  const neighbors = flat(grid.cells.map((c) => c.neighbors));
  const land = grid.borders.slice(0, grid.seaBorderStart);
  const borders = new Float64Array(land.length * 8);
  land.forEach((b, i) => borders.set([b.a, b.b, ...b.from, ...b.to], i * 8));
  return {
    version: FIELD_GRID_VERSION,
    colonyCenter: grid.colonyCenter,
    seaCellStart: grid.seaCellStart,
    samples: Float64Array.from(grid.samples.flat()),
    kinds: Uint8Array.from(grid.kinds.map((k) => KINDS.indexOf(k))),
    owner: Int32Array.from(grid.owner),
    cellNumbers,
    cellKinds: Uint8Array.from(grid.cells.map((c) => KINDS.indexOf(c.kind))),
    cellTerrain: Uint8Array.from(grid.cells.map((c) => TERRAINS.indexOf(c.terrain))),
    cellCoast: Uint8Array.from(grid.cells.map((c) => (c.coast ? 1 : 0))),
    members: members.out,
    membersStart: members.start,
    neighbors: neighbors.out,
    neighborsStart: neighbors.start,
    borders,
  };
}

const isArr = (v: unknown, type: { new (...a: never[]): unknown }) => v instanceof type;

/** Tablice → siatka; cokolwiek się nie zgadza (inna wersja, długości, zakresy) — null (gra policzy siatkę od nowa). */
export function unpackFieldGrid(raw: unknown): FieldGrid | null {
  const p = raw as Partial<PackedFieldGrid> | null;
  if (!p || typeof p !== 'object' || p.version !== FIELD_GRID_VERSION) return null;
  if (!isArr(p.samples, Float64Array) || !isArr(p.kinds, Uint8Array) || !isArr(p.owner, Int32Array) || !isArr(p.cellNumbers, Float64Array)) return null;
  if (!isArr(p.cellKinds, Uint8Array) || !isArr(p.cellTerrain, Uint8Array) || !isArr(p.cellCoast, Uint8Array) || !isArr(p.borders, Float64Array)) return null;
  if (!isArr(p.members, Int32Array) || !isArr(p.membersStart, Int32Array) || !isArr(p.neighbors, Int32Array) || !isArr(p.neighborsStart, Int32Array)) return null;
  const points = p.kinds!.length;
  const n = p.cellKinds!.length;
  if (points === 0 || p.samples!.length !== points * 3 || p.owner!.length !== points || p.cellNumbers!.length !== n * 6) return null;
  if (p.cellTerrain!.length !== n || p.cellCoast!.length !== n || p.membersStart!.length !== n + 1 || p.neighborsStart!.length !== n + 1) return null;
  if (p.membersStart![n] !== p.members!.length || p.neighborsStart![n] !== p.neighbors!.length || p.borders!.length % 8 !== 0) return null;
  if (!Number.isInteger(p.colonyCenter) || p.colonyCenter! < 0 || p.colonyCenter! >= n) return null;
  if (!Number.isInteger(p.seaCellStart) || p.seaCellStart! < 0 || p.seaCellStart! > n) return null;
  if (p.kinds!.some((k) => k >= KINDS.length) || p.cellKinds!.some((k) => k >= KINDS.length) || p.cellTerrain!.some((t) => t >= TERRAINS.length)) return null;
  if (p.owner!.some((o) => o < -1 || o >= n) || p.members!.some((m) => m < 0 || m >= points) || p.neighbors!.some((c) => c < 0 || c >= n)) return null;
  const s = p.samples!;
  const samples: Vec3[] = Array.from({ length: points }, (_, i) => [s[i * 3]!, s[i * 3 + 1]!, s[i * 3 + 2]!]);
  const num = p.cellNumbers!;
  const cells: FieldCell[] = Array.from({ length: n }, (_, i) => ({
    center: [num[i * 6]!, num[i * 6 + 1]!, num[i * 6 + 2]!],
    members: Array.from(p.members!.subarray(p.membersStart![i]!, p.membersStart![i + 1]!)),
    radius: num[i * 6 + 3]!,
    neighbors: Array.from(p.neighbors!.subarray(p.neighborsStart![i]!, p.neighborsStart![i + 1]!)),
    kind: KINDS[p.cellKinds![i]!]!,
    landShare: num[i * 6 + 4]!,
    relief: num[i * 6 + 5]!,
    terrain: TERRAINS[p.cellTerrain![i]!]!,
    coast: p.cellCoast![i] === 1,
  }));
  const b = p.borders!;
  const borders: FieldBorder[] = Array.from({ length: b.length / 8 }, (_, i) => ({
    a: b[i * 8]!,
    b: b[i * 8 + 1]!,
    from: [b[i * 8 + 2]!, b[i * 8 + 3]!, b[i * 8 + 4]!],
    to: [b[i * 8 + 5]!, b[i * 8 + 6]!, b[i * 8 + 7]!],
  }));
  return {
    cells,
    colonyCenter: p.colonyCenter!,
    samples,
    kinds: Array.from(p.kinds!, (k) => KINDS[k]!),
    owner: Int32Array.from(p.owner!),
    borders,
    seaCellStart: p.seaCellStart!,
    seaBorderStart: borders.length,
  };
}
