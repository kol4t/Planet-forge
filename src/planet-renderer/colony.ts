// Kolonia na powierzchni planety. Czysta matematyka (bez three).
// Od v0.45 każdy budynek to JEDEN KOMPLEKS: spójny obszar pól (`core/colony/plots.ts`), który rośnie z poziomem
// w etapach (`core/economy/footprint.ts`). Renderery rysują kompleks jako jeden obiekt wypełniający obszar —
// grunt kompleksu w obrysie i zabudowę w środku — zamiast wielu małych budowli połączonych rurami.
import type { Complex } from '../core/colony/complexes.ts';
import type { FieldGrid } from '../core/colony/fieldGrid.ts';
import type { Plots } from '../core/colony/plots.ts';
import { stageOf } from '../core/economy/footprint.ts';
import type { BuildingId, BuildingLevels } from '../core/types.ts';
import type { SurfaceSampler } from './surface.ts';

export type Vec3 = [number, number, number];

/** Promień „powierzchni” nad wodą (zabudowa nie stoi na wodzie). */
const WATER = 1.001;

/** Miejsce zabudowy w kompleksie: punkt lądu pola obszaru (najbliżej środka pola). */
export interface ComplexSpot {
  cell: number;
  dir: Vec3;
  /** Promień powierzchni w tym miejscu (podstawa zabudowy). */
  surface: number;
  /** Obrót wokół normalnej (rad) — stały z numeru pola. */
  spin: number;
  /** Odległość od środka kompleksu: 0 — środek, 1 — skraj obszaru. */
  t: number;
  /** Promień kątowy pola (rad) — modele 3D dopasowują do niego wielkość (v0.47). */
  r: number;
  /** Wolny promień (rad): jak daleko od `dir` teren jest suchym lądem własnego obszaru bez uskoku — zabudowa nie wystaje. */
  free: number;
}

export interface ColonyComplex {
  building: BuildingId;
  level: number;
  /** Etap 0..3 (mała instalacja → zakład → wielka fabryka → megakonstrukt). */
  stage: number;
  /** Pola obszaru (spójny kawałek, w kolejności wzrostu). */
  cells: number[];
  /** Środek kompleksu (punkt lądu obszaru najbliżej środka ciężkości) i promień powierzchni w nim. */
  core: Vec3;
  surface: number;
  /** Promień kątowy obszaru (od środka do skraju najdalszego pola). */
  radius: number;
  /** Wolny promień wokół środka (jak `ComplexSpot.free`) — główna konstrukcja nie wychodzi poza obszar. */
  free: number;
  /** Miejsca zabudowy — po jednym na pole, posortowane od środka (`spots[0]` = środek). */
  spots: ComplexSpot[];
  /** Usprawnienie kompleksu i megakompleks (decyzje gracza, v0.38–v0.43) — bogatsza zabudowa. */
  upgraded: boolean;
  mega: boolean;
}

export interface ColonyLayout {
  center: Vec3;
  complexes: ColonyComplex[];
  /** Pole siatki → indeks kompleksu (−1 — wolne). */
  owner: Int32Array;
}

export const angleBetween = (a: Vec3, b: Vec3) =>
  Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));

const normalize = (v: Vec3): Vec3 => {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Punkt odsunięty od `center` o kąt `distance` w kierunku `heading` (po powierzchni sfery). */
export function offsetOnSphere(center: Vec3, heading: number, distance: number): Vec3 {
  const helper: Vec3 = Math.abs(center[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const east = normalize(cross(helper, center));
  const north = cross(center, east);
  const t: Vec3 = [
    east[0] * Math.cos(heading) + north[0] * Math.sin(heading),
    east[1] * Math.cos(heading) + north[1] * Math.sin(heading),
    east[2] * Math.cos(heading) + north[2] * Math.sin(heading),
  ];
  const c = Math.cos(distance);
  const s = Math.sin(distance);
  return normalize([center[0] * c + t[0] * s, center[1] * c + t[1] * s, center[2] * c + t[2] * s]);
}

/** Stała „losowość” z numeru (obrót, układ zabudowy) — tylko wygląd. */
export function hash01(n: number, salt: number): number {
  const v = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Punkt mapy powierzchni pola najbliżej jego środka (zawsze na lądzie albo lodzie pola). */
export function fieldPoint(grid: FieldGrid, cell: number): Vec3 {
  const field = grid.cells[cell]!;
  let best = field.center;
  let bestDot = -Infinity;
  for (const p of field.members) {
    const q = grid.samples[p]!;
    const d = q[0] * field.center[0] + q[1] * field.center[1] + q[2] * field.center[2];
    if (d > bestDot) {
      bestDot = d;
      best = q;
    }
  }
  return best;
}

/** Kierunki i kroki próbkowania wolnego promienia. */
const FREE_HEADINGS = 12;
/** Krok próbkowania (rad) — mniejszy niż rozmiar fasety terenu (~0,02). */
const FREE_STEP = 0.008;
/** Największy uskok względem podstawy, który jeszcze wyrównuje fundament (PlanetView) — dalej byłaby widoczna rampa. */
export const FREE_MAX_RISE = 0.025;
export const FREE_MAX_DROP = 0.035;

/**
 * Wolny promień wokół `dir`: największa odległość (≤ `max`), do której we wszystkich kierunkach `inside` jest prawdą.
 * Deterministyczny, tylko wygląd 3D.
 */
export function freeRadius(dir: Vec3, max: number, inside: (p: Vec3) => boolean): number {
  let ok = 0;
  for (let d = FREE_STEP; d <= max; d += FREE_STEP) {
    for (let a = 0; a < FREE_HEADINGS; a++) if (!inside(offsetOnSphere(dir, (a * Math.PI * 2) / FREE_HEADINGS, d))) return ok;
    ok = d;
  }
  return ok;
}

/** Punkt pola najbliżej jego środka, który jest suchym lądem (nie w jeziorze); brak — jak `fieldPoint`. */
function dryPoint(grid: FieldGrid, cell: number, sampler: SurfaceSampler): Vec3 {
  const field = grid.cells[cell]!;
  let best: Vec3 | null = null;
  let bestDot = -Infinity;
  for (const p of field.members) {
    const q = grid.samples[p]!;
    const d = q[0] * field.center[0] + q[1] * field.center[1] + q[2] * field.center[2];
    if (d > bestDot && sampler.isLand(sampler.height(...q), ...q)) {
      bestDot = d;
      best = q;
    }
  }
  return best ?? fieldPoint(grid, cell);
}

/**
 * Kompleksy z obszarów budynków: środek, promień, miejsca zabudowy, etap (z poziomu) i usprawnienia.
 * `sampler.radius` — 3D podaje promień z tarasami, 2D sferę.
 */
export function layoutFromPlots(
  grid: FieldGrid,
  plots: Plots,
  sampler: SurfaceSampler,
  ids: readonly BuildingId[],
  levels: Partial<BuildingLevels> = {},
  upgrades: readonly Complex[] = [],
  /** Liczyć wolne miejsce (`free`) — tylko 3D; 2D rysuje grunt wzorem i oszczędza ~50 ms na zmianę układu. */
  measureFree = false,
): ColonyLayout {
  const surfaceAt = (dir: Vec3) => {
    const level = Math.max(sampler.height(...dir), sampler.lakeLevel(...dir));
    return sampler.isLand(level) ? sampler.radius(level) : WATER;
  };
  const owner = new Int32Array(grid.cells.length).fill(-1);
  const lookup = cellLookup(grid);
  /** Punkt w obszarze `cells`, na suchym lądzie i (gdy `base` podane) bez uskoku względem niego. */
  const fits = (cells: Set<number>, base?: number) => (p: Vec3) => {
    if (!cells.has(lookup(...p))) return false;
    const s = surfaceAt(p);
    return s !== WATER && (base === undefined || (s - base < FREE_MAX_RISE && base - s < FREE_MAX_DROP));
  };
  const complexes: ColonyComplex[] = [];
  for (const id of ids) {
    const cells = (plots[id] ?? []).filter((c) => grid.cells[c]);
    if (cells.length === 0) continue;
    // Środek: pole najbliżej środka ciężkości obszaru (obszar bywa wygięty — środek zawsze w obszarze).
    const sum: Vec3 = [0, 0, 0];
    for (const c of cells) {
      const p = grid.cells[c]!.center;
      sum[0] += p[0];
      sum[1] += p[1];
      sum[2] += p[2];
    }
    const mid = normalize(sum);
    let coreCell = cells[0]!;
    let bestDot = -Infinity;
    for (const c of cells) {
      const p = grid.cells[c]!.center;
      const d = p[0] * mid[0] + p[1] * mid[1] + p[2] * mid[2];
      if (d > bestDot) {
        bestDot = d;
        coreCell = c;
      }
    }
    const core = dryPoint(grid, coreCell, sampler);
    let radius = 0;
    for (const c of cells) radius = Math.max(radius, angleBetween(core, grid.cells[c]!.center) + grid.cells[c]!.radius * 0.8);
    const cellSet = new Set(cells);
    const spots = cells
      .map((cell) => {
        const dir = dryPoint(grid, cell, sampler);
        const surface = surfaceAt(dir);
        return {
          cell,
          dir,
          surface,
          free: measureFree ? freeRadius(dir, grid.cells[cell]!.radius * 1.2, fits(cellSet, surface)) : 0,
          spin: hash01(cell, 5) * Math.PI * 2,
          t: radius > 0 ? Math.min(1, angleBetween(core, dir) / radius) : 0,
          r: grid.cells[cell]!.radius,
        };
      })
      .sort((a, b) => a.t - b.t || a.cell - b.cell);
    const index = complexes.length;
    for (const c of cells) owner[c] = index;
    const upgrade = upgrades.find((u) => u.building === id);
    complexes.push({
      building: id,
      level: Math.floor(levels[id] ?? 0),
      stage: Math.max(0, stageOf(id, levels[id] ?? 1)),
      cells,
      core,
      surface: surfaceAt(core),
      radius: Math.max(radius, 0.02),
      // Główna konstrukcja: tylko obszar i woda — szeroki fundament wyrównuje pod nią teren (PlanetView).
      free: measureFree ? freeRadius(core, Math.max(radius, 0.02), fits(cellSet)) : 0,
      spots,
      upgraded: !!upgrade,
      mega: !!upgrade?.mega,
    });
  }
  return { center: grid.cells[grid.colonyCenter]!.center, complexes, owner };
}

/** Klucz kolonii — renderer przebudowuje kompleksy tylko, gdy zmieniły się obszary, etapy albo usprawnienia. */
export function plotsKey(plots: Plots, ids: readonly BuildingId[], levels: Partial<BuildingLevels> = {}, upgrades: readonly Complex[] = []): string {
  return (
    ids.map((id) => `${(plots[id] ?? []).join(',')}@${stageOf(id, levels[id] ?? 0)}`).join('|') +
    '#' +
    upgrades.map((u) => `${u.building}${u.mega ? '+' : ''}`).join(',')
  );
}

/** Szybkie „które pole pod tym punktem sfery” (mapa sześcienna z punktów mapy powierzchni siatki). */
export type CellLookup = (x: number, y: number, z: number) => number;

const LOOKUP_RES = 96;
const lookups = new WeakMap<FieldGrid, CellLookup>();

function cubeTexel(x: number, y: number, z: number, res: number): number {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);
  let face: number;
  let u: number;
  let v: number;
  if (ax >= ay && ax >= az) {
    face = x > 0 ? 0 : 1;
    u = z / ax;
    v = y / ax;
  } else if (ay >= az) {
    face = y > 0 ? 2 : 3;
    u = x / ay;
    v = z / ay;
  } else {
    face = z > 0 ? 4 : 5;
    u = x / az;
    v = y / az;
  }
  const iu = Math.min(res - 1, Math.max(0, Math.floor(((u + 1) / 2) * res)));
  const iv = Math.min(res - 1, Math.max(0, Math.floor(((v + 1) / 2) * res)));
  return face * res * res + iv * res + iu;
}

/** Mapa „punkt → pole” liczona raz na siatkę (puste komórki mapy wypełniane od sąsiadów). */
export function cellLookup(grid: FieldGrid): CellLookup {
  const cached = lookups.get(grid);
  if (cached) return cached;
  const res = LOOKUP_RES;
  const map = new Int32Array(6 * res * res).fill(-2);
  grid.samples.forEach((p, i) => {
    map[cubeTexel(p[0], p[1], p[2], res)] = grid.owner[i]!;
  });
  // Wypełnienie dziur: kilka przejść, każda pusta komórka bierze wartość sąsiada z tej samej ściany.
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (let face = 0; face < 6; face++) {
      for (let iv = 0; iv < res; iv++) {
        for (let iu = 0; iu < res; iu++) {
          const k = face * res * res + iv * res + iu;
          if (map[k] !== -2) continue;
          const n = [iu > 0 ? k - 1 : -1, iu < res - 1 ? k + 1 : -1, iv > 0 ? k - res : -1, iv < res - 1 ? k + res : -1].find((j) => j >= 0 && map[j]! !== -2);
          if (n !== undefined) {
            map[k] = map[n]!;
            changed = true;
          }
        }
      }
    }
    if (!changed) break;
  }
  const lookup: CellLookup = (x, y, z) => {
    const v = map[cubeTexel(x, y, z, res)]!;
    return v < 0 ? -1 : v;
  };
  lookups.set(grid, lookup);
  return lookup;
}

/** Orbita kolektora energii gwiazdy (v0.44): promień względem planety, nachylenie i okres obiegu (s). */
export const COLLECTOR_ORBIT = { radius: 1.42, tilt: 0.3, period: 48 };

/**
 * Położenie kolektora na orbicie w chwili `seconds` (układ kamery: x w prawo, y w górę, z do widza;
 * z > 0 — przed planetą). `still` („Ogranicz ruch”) — stałe miejsce z przodu po prawej.
 */
export function collectorOrbit(seconds: number, still = false): Vec3 {
  const a = still ? 0.6 : (seconds / COLLECTOR_ORBIT.period) * Math.PI * 2;
  const R = COLLECTOR_ORBIT.radius;
  return [R * Math.cos(a), R * COLLECTOR_ORBIT.tilt * Math.sin(a), R * Math.sin(a)];
}
