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
 * Kolonia z zajętych pól: każde pole mieści grupę do 3 budowli jednego budynku, ustawionych w trójkąt
 * wokół środka pola, na wysokości terenu (`sampler.radius` — 3D podaje promień z tarasami, 2D sferę).
 * Lista budowli typu = kolejne poziomy (poziom n → pole ⌊(n−1)/3⌋, miejsce (n−1) mod 3).
 */
export function layoutFromPlots(grid: FieldGrid, plots: Plots, sampler: SurfaceSampler, ids: readonly BuildingId[]): ColonyLayout {
  const slots = {} as Record<BuildingId, ColonySlot[]>;
  for (const id of ids) {
    slots[id] = (plots[id] ?? []).flatMap((cell) => {
      const field = grid.cells[cell]!;
      // Promień pola (najbliższy punkt obrysu) — budowle stoją w 40% drogi od środka do brzegu.
      const radius = Math.min(...field.outline.map((p) => angleBetween(p, field.center)));
      const turn = hash01(cell, 3) * Math.PI * 2;
      return [0, 1, 2].map((k) => offsetOnSphere(field.center, turn + (k * Math.PI * 2) / 3, radius * 0.42)).map((dir, k) => ({ cell, k, dir }));
    }).map(({ cell, k, dir }) => {
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

/** Klucz zajętych pól — renderer przebudowuje kolonię tylko, gdy się zmienił. */
export function plotsKey(plots: Plots, ids: readonly BuildingId[]): string {
  return ids.map((id) => (plots[id] ?? []).join(',')).join('|');
}
