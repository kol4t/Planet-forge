// Rozmieszczenie budowli kolonii na powierzchni planety. Czysta matematyka (bez three).
// Od v0.26 każda budowla stoi na swoim polu siatki (`core/colony`): pola przydziela gra i zapisuje,
// więc kolonia wygląda tak samo po każdym uruchomieniu i nic nie przeskakuje przy rozbudowie.
import type { FieldGrid } from '../core/colony/fieldGrid.ts';
import { LEVELS_PER_FIELD, type Plots } from '../core/colony/plots.ts';
import type { Complex } from '../core/colony/complexes.ts';
import type { BuildingId } from '../core/types.ts';
import type { SurfaceSampler } from './surface.ts';

export type Vec3 = [number, number, number];

/** Najwięcej budowli jednego typu = najwięcej pól planety (pojemność siatek 3D). */
export const MAX_STRUCTURES = 200;

export interface ColonySlot {
  /** Kierunek od środka planety (wektor jednostkowy). */
  dir: Vec3;
  /** Promień powierzchni w tym miejscu (podstawa budowli). */
  surface: number;
  /** Obrót wokół normalnej (rad) — żeby budowle nie stały jak od linijki. */
  spin: number;
  /** Indywidualny mnożnik wielkości 0.85..1.15. */
  size: number;
  onLand: boolean;
}

/** Pełne pole (grupa 3 poziomów) budynku z większą konstrukcją — np. wiertło z szybem (v0.38). */
export interface ColonyRig {
  building: BuildingId;
  /** Numer grupy budynku (poziomy 3g+1..3g+3). */
  group: number;
  cell: number;
  dir: Vec3;
  surface: number;
  spin: number;
}

/** Kompleks: wspólna konstrukcja na polu huba i połączenia do jego grup (v0.38). */
export interface ColonyHub {
  building: BuildingId;
  dir: Vec3;
  surface: number;
  spin: number;
  /** Środki połączonych grup (do rur). */
  members: Vec3[];
}

export interface ColonyLayout {
  center: Vec3;
  slots: Record<BuildingId, ColonySlot[]>;
  /** Grupy budynków z większą konstrukcją po zapełnieniu pola (rysowane zamiast 3 małych budowli). */
  rigs: ColonyRig[];
  hubs: ColonyHub[];
}

/** Budynki, których pełne pole zmienia się w większą konstrukcję (v0.38: wiertła kryształu). */
export const RIG_BUILDINGS: readonly BuildingId[] = ['crystalMine'];

/** Czy grupa `group` jest pełna przy danym poziomie (wtedy rysujemy konstrukcję zamiast 3 budowli). */
export const groupFull = (level: number, group: number) => Math.floor(level) >= (group + 1) * LEVELS_PER_FIELD;

/** Ile budowli danego typu widać na danym poziomie (każdy poziom = jedna budowla na swoim polu). */
export function visibleStructures(level: number): number {
  return Math.max(0, Math.min(MAX_STRUCTURES, Math.floor(level)));
}

const normalize = (v: Vec3): Vec3 => {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const angleBetween = (a: Vec3, b: Vec3) =>
  Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));

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

/** Stała „losowość” budowli z numeru pola (obrót i wielkość) — tylko wygląd. */
function hash01(n: number, salt: number): number {
  const v = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Kolonia z zajętych pól: każde pole mieści grupę do 3 budowli jednego budynku, ustawionych ciasno w trójkąt
 * na wysokości terenu (`sampler.radius` — 3D podaje promień z tarasami, 2D sferę).
 * Od v0.26.4 grupa stoi w środku pola (punkt najdalej od jego granic — na wyspie przy jej środku),
 * a każda budowla na punkcie mapy powierzchni należącym do pola — zawsze na lądzie (lub lodzie) pola,
 * z dala od grup z pól sąsiednich.
 * Lista budowli typu = kolejne poziomy (poziom n → pole ⌊(n−1)/3⌋, miejsce (n−1) mod 3).
 */
export function layoutFromPlots(
  grid: FieldGrid,
  plots: Plots,
  sampler: SurfaceSampler,
  ids: readonly BuildingId[],
  complexes: readonly Complex[] = [],
): ColonyLayout {
  const slots = {} as Record<BuildingId, ColonySlot[]>;
  const surfaceAt = (dir: Vec3) => {
    const level = Math.max(sampler.height(...dir), sampler.lakeLevel(...dir));
    return sampler.isLand(level) ? sampler.radius(level) : 1.001;
  };
  for (const id of ids) {
    slots[id] = (plots[id] ?? []).flatMap((cell) => groupDirs(grid, cell).map((dir, k) => ({ cell, k, dir }))).map(({ cell, k, dir }) => {
      const h = sampler.height(...dir);
      const level = Math.max(h, sampler.lakeLevel(...dir));
      return {
        dir,
        surface: sampler.isLand(level) ? sampler.radius(level) : 1.001,
        spin: hash01(cell * 3 + k, 1) * Math.PI * 2,
        size: 0.85 + 0.3 * hash01(cell * 3 + k, 2),
        onLand: sampler.isLand(h, ...dir),
      };
    });
  }
  // Konstrukcja pełnego pola stoi w jego środku (na lądzie pola), huby kompleksów — w środku swojego pola.
  const rigs: ColonyRig[] = [];
  for (const id of RIG_BUILDINGS) {
    (plots[id] ?? []).forEach((cell, group) => {
      const dir = fieldPoint(grid, cell);
      rigs.push({ building: id, group, cell, dir, surface: surfaceAt(dir), spin: hash01(cell, 5) * Math.PI * 2 });
    });
  }
  const hubs: ColonyHub[] = complexes.flatMap((c) =>
    c.hubs.map((cell) => {
      const dir = fieldPoint(grid, cell);
      return { building: c.building, dir, surface: surfaceAt(dir), spin: hash01(cell, 6) * Math.PI * 2, members: c.cells.map((m) => fieldPoint(grid, m)) };
    }),
  );
  return { center: grid.cells[grid.colonyCenter]!.center, slots, rigs, hubs };
}

/** Punkt mapy powierzchni pola najbliżej jego środka (zawsze na lądzie albo lodzie pola). */
function fieldPoint(grid: FieldGrid, cell: number): Vec3 {
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

/** Odstęp budowli w grupie (kąt) — jak dotąd, ale nie dalej niż w obrębie pola. */
const GROUP_SPREAD = 0.028;

/** Trzy miejsca grupy na polu `cell`: wokół środka pola, każde na najbliższym punkcie pola. */
function groupDirs(grid: FieldGrid, cell: number): Vec3[] {
  const field = grid.cells[cell]!;
  const hub = field.center;
  const turn = hash01(cell, 3) * Math.PI * 2;
  const spread = Math.min(GROUP_SPREAD, field.radius * 0.45);
  const used = new Set<number>();
  return [0, 1, 2].map((k) => {
    const want = offsetOnSphere(hub, turn + (k * Math.PI * 2) / 3, spread);
    let best = -1;
    let bestDot = -Infinity;
    for (const p of field.members) {
      if (used.has(p)) continue;
      const q = grid.samples[p]!;
      const d = q[0] * want[0] + q[1] * want[1] + q[2] * want[2];
      if (d > bestDot) {
        bestDot = d;
        best = p;
      }
    }
    if (best < 0) return want;
    used.add(best);
    return grid.samples[best]!;
  });
}

/** Klucz zajętych pól — renderer przebudowuje kolonię tylko, gdy się zmienił. */
export function plotsKey(plots: Plots, ids: readonly BuildingId[], complexes: readonly Complex[] = []): string {
  return ids.map((id) => (plots[id] ?? []).join(',')).join('|') + '#' + complexes.map((c) => `${c.cells.join(',')}>${c.hubs.join(',')}`).join(';');
}
