// Przydział pól budowlom (automatyczny — decyzja właściciela). Od v0.45 budynek zajmuje JEDEN SPÓJNY
// obszar sąsiednich pól, który rośnie z poziomem w etapach (`core/economy/footprint.ts`): obszar zaczyna się
// w punkcie zakotwiczenia i dokłada pola obok siebie — obszar poziomu n+1 zawiera obszar poziomu n.
// Zajęte pola zapisujemy w stanie planety i nigdy ich nie przestawiamy; wzrost jest deterministyczny
// (siatka z seeda planety + kolejność budynków).
import { fieldsFor } from '../economy/footprint.ts';
import type { BuildingId, BuildingLevels } from '../types.ts';
import { buildableCount, isBuildable, type BuildRules, type FieldCell, type FieldGrid, type Vec3 } from './fieldGrid.ts';

/** Pola zajęte przez grupy budowli danego typu (indeksy pól siatki, w kolejności budowy). */
export type Plots = Partial<Record<BuildingId, number[]>>;

/**
 * Wersja układu pól (v0.45): 2 = jeden spójny obszar na budynek, liczba pól z etapów (`fieldsFor`).
 * Zapis ze starszym układem (pole na każde 3 poziomy) dostaje obszar od nowa, od pierwszego pola budynku.
 */
export const PLOTS_LAYOUT = 2;

/** Grupa na niepasującym terenie produkuje słabiej (decyzja właściciela: „dowolny ląd, słabiej”). */
export const OFF_SITE_FACTOR = 0.75;

/**
 * Dedykowany teren budynku (decyzja właściciela 2026-10-27, v0.38.2): kryształy — lód, metal — wzgórza
 * i góry, elektrownie — równiny; reszta — dowolny ląd. Poza nim budynek stoi, ale pracuje słabiej
 * (`OFF_SITE_FACTOR`); wybór pola przez gracza i łączenie w kompleks — tylko na dedykowanym terenie.
 */
export function suits(id: BuildingId, cell: FieldCell): boolean {
  if (id === 'metalMine') return cell.kind === 'land' && (cell.terrain === 'hill' || cell.terrain === 'mountain');
  if (id === 'crystalMine') return cell.kind === 'ice';
  if (id === 'powerPlant') return cell.kind === 'land' && cell.terrain === 'plain';
  return cell.kind === 'land';
}

/** Nazwa dedykowanego terenu (do komunikatów). */
export const TERRAIN_NAMES: Partial<Record<BuildingId, string>> = {
  metalMine: 'wzgórza i góry',
  crystalMine: 'lód',
  powerPlant: 'równiny',
};

/**
 * Wolne pola dedykowanego terenu, w które gracz może poprowadzić obszar budynku (v0.38.2, od v0.45 tylko
 * pola stykające się z obszarem; budynek bez pól — dowolne): obszar zostaje spójny.
 */
export function choiceCells(grid: FieldGrid, plots: Plots, id: BuildingId, rules: BuildRules = {}): number[] {
  const taken = new Set<number>(Object.values(plots).flatMap((l) => l ?? []));
  const own = new Set(plots[id] ?? []);
  const out: number[] = [];
  grid.cells.forEach((cell, i) => {
    if (taken.has(i) || !canStand(id, cell, rules) || !suits(id, cell)) return;
    if (own.size === 0 || cell.neighbors.some((n) => own.has(n))) out.push(i);
  });
  return out;
}

/**
 * Czy budynek może stanąć na polu: ląd (zgodnie z `BuildRules`), a kryształy także na lodzie; megakonstrukt
 * po transferze (`rules.anywhere`) — na każdym polu, także na oceanie i lawie (decyzja właściciela, v0.56).
 */
export function canStand(id: BuildingId, cell: FieldCell, rules: BuildRules = {}): boolean {
  return isBuildable(cell.kind, rules) || (id === 'crystalMine' && cell.kind === 'ice') || !!rules.anywhere?.includes(id);
}

/** Zajęte pola planety — prawdziwa suma obszarów wszystkich budynków (ląd i lód). */
export function usedLandFields(grid: FieldGrid, plots: Plots): number {
  let used = 0;
  for (const list of Object.values(plots)) for (const cell of list ?? []) if (grid.cells[cell]) used++;
  return used;
}

/**
 * Pola, na których można budować: ląd (po „Budowie na lodzie” także lód) i pola spoza niego zajęte już przez
 * budynki, które na nich stoją (kryształy na lodzie, megakonstrukt na wodzie i lawie) — licznik „zajęte / wszystkie” uczciwy.
 */
export function fieldCapacity(grid: FieldGrid, plots: Plots, rules: BuildRules = {}): number {
  let extra = 0;
  for (const [id, list] of Object.entries(plots) as [BuildingId, number[]][]) {
    for (const cell of list ?? []) {
      const field = grid.cells[cell];
      if (field && !isBuildable(field.kind, rules) && canStand(id, field, rules)) extra++;
    }
  }
  return buildableCount(grid, rules) + extra;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Najdłuższy początek listy, w którym każde pole styka się z wcześniejszymi (obszar spójny). */
function contiguousPrefix(grid: FieldGrid, list: readonly number[]): number[] {
  const out: number[] = [];
  const inside = new Set<number>();
  for (const cell of list) {
    if (out.length > 0 && !grid.cells[cell]!.neighbors.some((n) => inside.has(n))) break;
    out.push(cell);
    inside.add(cell);
  }
  return out;
}

/**
 * Dopasowanie obszarów do poziomów: każdy budynek zatrzymuje swoje pola (spójny początek listy, w granicach
 * `fieldsFor`), potem — w stałej kolejności budynków — dokłada wolne pola obok swojego obszaru.
 * Gdy obok nie ma wolnych pól (np. stary zapis z wysokim poziomem), obszar zostaje mniejszy.
 */
export function reconcilePlots(
  grid: FieldGrid,
  plots: Plots,
  levels: BuildingLevels,
  order: readonly BuildingId[],
  rules: BuildRules = {},
  /** Pole wybrane przez gracza dla następnego pola budynku (v0.38.2) — używane, gdy wolne i styka się z obszarem. */
  preferred: Partial<Record<BuildingId, number>> = {},
): Plots {
  const result: Plots = {};
  const taken = new Set<number>();
  for (const id of order) {
    // Pola spoza siatki, podwójne albo niedozwolone (np. po zmianie terenu) odrzucamy.
    const valid = (plots[id] ?? []).filter((cell) => cell >= 0 && cell < grid.cells.length && !taken.has(cell) && canStand(id, grid.cells[cell]!, rules));
    const keep = contiguousPrefix(grid, valid).slice(0, fieldsFor(id, levels[id] ?? 0));
    for (const cell of keep) taken.add(cell);
    result[id] = keep;
  }
  order.forEach((id, index) => {
    const list = result[id]!;
    const want = fieldsFor(id, levels[id] ?? 0);
    while (list.length < want) {
      const wish = preferred[id];
      const ok =
        wish !== undefined &&
        wish >= 0 &&
        wish < grid.cells.length &&
        !taken.has(wish) &&
        canStand(id, grid.cells[wish]!, rules) &&
        (list.length === 0 || grid.cells[wish]!.neighbors.some((n) => list.includes(n)));
      const cell = ok ? wish : list.length === 0 ? anchorCell(grid, id, taken, index, order.length, rules) : growCell(grid, id, list, taken, index, rules);
      if (cell < 0) break;
      list.push(cell);
      taken.add(cell);
    }
  });
  return result;
}

/** Czy następny poziom budynku zmieści się na planecie (tyle wolnych pól obok obszaru, ile wymaga etap). */
export function hasRoomFor(
  grid: FieldGrid,
  plots: Plots,
  levels: BuildingLevels,
  id: BuildingId,
  order: readonly BuildingId[],
  rules: BuildRules = {},
): boolean {
  const next = { ...levels, [id]: (levels[id] ?? 0) + 1 };
  const placed = reconcilePlots(grid, plots, next, order, rules);
  return (placed[id]?.length ?? 0) >= fieldsFor(id, next[id]);
}

/**
 * Dopasowanie budynku do terenu: udział pól obszaru na pasującym terenie (100%) i poza nim
 * (`OFF_SITE_FACTOR`), razem z premią budynku (ulepszenie kompleksu). Budynek bez pól — 100%.
 */
export function siteFactors(
  grid: FieldGrid,
  plots: Plots,
  levels: BuildingLevels,
  /** Mnożnik całego budynku (premia kompleksu i tryb pracy, v0.38–v0.45). */
  bonus: (id: BuildingId) => number = () => 1,
): Partial<Record<BuildingId, number>> {
  const out: Partial<Record<BuildingId, number>> = {};
  for (const [id, raw] of Object.entries(levels) as [BuildingId, number][]) {
    if (Math.floor(raw ?? 0) <= 0) continue;
    const cells = plots[id] ?? [];
    const fit = cells.length === 0 ? 1 : cells.reduce((sum, c) => sum + (suits(id, grid.cells[c]!) ? 1 : OFF_SITE_FACTOR), 0) / cells.length;
    out[id] = Math.round(fit * bonus(id) * 1000) / 1000;
  }
  return out;
}

/** Stała „losowość” rozstrzygająca remisy (tylko z numeru pola i budynku — deterministyczna). */
function tie(cell: number, building: number): number {
  const v = Math.sin(cell * 12.9898 + building * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Pierwsze pole budynku (zakotwiczenie): najpierw pasujący teren najbliżej „dzielnicy” budynku — dzielnice
 * rozchodzą się promieniście wokół środka kolonii; pola z miejscem obok (wolni sąsiedzi) mają pierwszeństwo.
 */
function anchorCell(grid: FieldGrid, id: BuildingId, taken: Set<number>, index: number, total: number, rules: BuildRules): number {
  const target = districtTarget(grid, index, total, taken);
  let best = -1;
  let bestScore = -Infinity;
  grid.cells.forEach((cell, i) => {
    if (taken.has(i) || !canStand(id, cell, rules)) return;
    const room = cell.neighbors.filter((n) => !taken.has(n) && canStand(id, grid.cells[n]!, rules)).length;
    const score =
      dot(cell.center, target) / Math.max(1e-9, Math.hypot(...target)) +
      (suits(id, cell) ? 2 : 0) +
      0.6 * cell.landShare +
      0.15 * Math.min(room, 4) +
      0.01 * tie(i, index);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/**
 * Następne pole obszaru: wolne pole stykające się z obszarem. Wygrywa pasujący teren, potem zwartość
 * (więcej wspólnych granic z obszarem) i bliskość zakotwiczenia — obszar rośnie jak plama, nie jak wąż.
 */
function growCell(grid: FieldGrid, id: BuildingId, own: number[], taken: Set<number>, index: number, rules: BuildRules): number {
  const inside = new Set(own);
  const anchor = grid.cells[own[0]!]!.center;
  let best = -1;
  let bestScore = -Infinity;
  for (const c of own) {
    for (const n of grid.cells[c]!.neighbors) {
      if (taken.has(n) || inside.has(n)) continue;
      const cell = grid.cells[n]!;
      if (!canStand(id, cell, rules)) continue;
      const touching = cell.neighbors.filter((x) => inside.has(x)).length;
      const score = (suits(id, cell) ? 2 : 0) + 0.9 * touching + 3 * dot(cell.center, anchor) + 0.3 * cell.landShare + 0.01 * tie(n, index);
      if (score > bestScore) {
        bestScore = score;
        best = n;
      }
    }
  }
  return best;
}

/** Kierunek dzielnicy: środek kolonii przesunięty o dwa pola w stronę zależną od numeru budynku. */
function districtTarget(grid: FieldGrid, index: number, total: number, taken: Set<number>): Vec3 {
  const center = grid.cells[grid.colonyCenter]!;
  if (!taken.has(grid.colonyCenter) && index === 0) return center.center;
  const ring = center.neighbors.length > 0 ? center.neighbors : [grid.colonyCenter];
  const toward = grid.cells[ring[Math.floor((index * ring.length) / Math.max(1, total)) % ring.length]!]!.center;
  return [2 * toward[0] - center.center[0], 2 * toward[1] - center.center[1], 2 * toward[2] - center.center[2]];
}
