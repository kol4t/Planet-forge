// Rozmieszczenie budowli kolonii na powierzchni planety. Czysta matematyka (bez three).
// Od v0.26 każda budowla stoi na swoim polu siatki (`core/colony`): pola przydziela gra i zapisuje,
// więc kolonia wygląda tak samo po każdym uruchomieniu i nic nie przeskakuje przy rozbudowie.
import type { FieldGrid } from '../core/colony/fieldGrid.ts';
import type { Plots } from '../core/colony/plots.ts';
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

export interface ColonyLayout {
  center: Vec3;
  slots: Record<BuildingId, ColonySlot[]>;
}

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
 * Od v0.26.2 grupa stoi na suchym lądzie pola, jak najdalej od wody (na wyspie — blisko jej środka);
 * pole bez lądu (lód dla kryształów) — wokół środka pola.
 * Lista budowli typu = kolejne poziomy (poziom n → pole ⌊(n−1)/3⌋, miejsce (n−1) mod 3).
 */
export function layoutFromPlots(grid: FieldGrid, plots: Plots, sampler: SurfaceSampler, ids: readonly BuildingId[]): ColonyLayout {
  const slots = {} as Record<BuildingId, ColonySlot[]>;
  const dry = (dir: Vec3) => sampler.isLand(sampler.height(...dir), ...dir);
  for (const id of ids) {
    slots[id] = (plots[id] ?? []).flatMap((cell) => groupDirs(grid, cell, dry).map((dir, k) => ({ cell, k, dir }))).map(({ cell, k, dir }) => {
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
  return { center: grid.cells[grid.colonyCenter]!.center, slots };
}

/** Punkt na łuku od `a` do `b` (część `t` drogi) — przybliżenie wystarczające w obrębie pola. */
const between = (a: Vec3, b: Vec3, t: number): Vec3 =>
  normalize([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);

/** Trzy miejsca grupy na polu `cell`: środek grupy w najsuchszym miejscu, budowle ciasno wokół niego. */
function groupDirs(grid: FieldGrid, cell: number, dry: (dir: Vec3) => boolean): Vec3[] {
  const field = grid.cells[cell]!;
  // Promień pola (najbliższy punkt obrysu).
  const radius = Math.min(...field.outline.map((p) => angleBetween(p, field.center)));
  const turn = hash01(cell, 3) * Math.PI * 2;
  // Próbki wnętrza pola: środek i punkty na drodze do wierzchołków i środków krawędzi obrysu.
  const edges = field.outline.flatMap((p, i) => [p, between(p, field.outline[(i + 1) % field.outline.length]!, 0.5)]);
  const samples: Vec3[] = [field.center, ...edges.flatMap((p) => [0.2, 0.4, 0.6, 0.8].map((t) => between(field.center, p, t)))];
  const land = samples.filter(dry);
  const wet = samples.filter((p) => !dry(p));
  let hub = field.center;
  if (land.length > 0 && wet.length > 0) {
    // Najdalej od wody; przy remisie bliżej środka pola.
    let best = -Infinity;
    for (const p of land) {
      const score = Math.min(...wet.map((w) => angleBetween(p, w))) - 0.25 * angleBetween(p, field.center);
      if (score > best) {
        best = score;
        hub = p;
      }
    }
  }
  const spread = land.length > 0 ? 0.26 : 0.42;
  return [0, 1, 2].map((k) => {
    const heading = turn + (k * Math.PI * 2) / 3;
    // Budowla na suchym lądzie: gdy wypada w wodzie, przysuwa się do środka grupy.
    for (const f of [1, 0.65, 0.4]) {
      const dir = offsetOnSphere(hub, heading, radius * spread * f);
      if (land.length === 0 || dry(dir)) return dir;
    }
    return offsetOnSphere(hub, heading, radius * spread * 0.4);
  });
}

/** Klucz zajętych pól — renderer przebudowuje kolonię tylko, gdy się zmienił. */
export function plotsKey(plots: Plots, ids: readonly BuildingId[]): string {
  return ids.map((id) => (plots[id] ?? []).join(',')).join('|');
}
