// Przydział pól budowlom (automatyczny — decyzja właściciela): każdy poziom budynku zajmuje jedno pole.
// Zajęte pola zapisujemy w stanie planety i nigdy ich nie przestawiamy — nowa budowla dostaje
// wolne pole obok reszty swojego budynku, więc kolonia rośnie dzielnicami, a nic nie „przeskakuje”.
import type { BuildingId, BuildingLevels } from '../types.ts';
import { isBuildable, type BuildRules, type FieldGrid, type Vec3 } from './fieldGrid.ts';

/** Pola zajęte przez budowle danego typu (indeksy pól siatki, w kolejności budowy). */
export type Plots = Partial<Record<BuildingId, number[]>>;

/** Zajęte pola = suma poziomów budynków. */
export function usedFields(levels: BuildingLevels): number {
  let used = 0;
  for (const level of Object.values(levels)) used += Math.max(0, Math.floor(level ?? 0));
  return used;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Dopasowanie pól do poziomów: brakującym budowlom przydziela wolne pola (w stałej kolejności budynków),
 * nadmiar (np. anulowana budowa) zdejmuje od końca. Istniejące przydziały zostają bez zmian.
 * Gdy wolnych pól brak (stary zapis z większą liczbą poziomów), część budowli po prostu nie stoi.
 */
export function reconcilePlots(grid: FieldGrid, plots: Plots, levels: BuildingLevels, order: readonly BuildingId[], rules: BuildRules = {}): Plots {
  const result: Plots = {};
  const taken = new Set<number>();
  for (const id of order) {
    // Pola spoza siatki albo podwójne (np. po zmianie wyglądu terenu) odrzucamy.
    const list = (plots[id] ?? []).filter((cell) => cell >= 0 && cell < grid.cells.length && !taken.has(cell));
    const keep = list.slice(0, Math.max(0, Math.floor(levels[id] ?? 0)));
    for (const cell of keep) taken.add(cell);
    result[id] = keep;
  }
  order.forEach((id, index) => {
    const list = result[id]!;
    const want = Math.max(0, Math.floor(levels[id] ?? 0));
    while (list.length < want) {
      const cell = nextCell(grid, list, taken, index, order.length, rules);
      if (cell < 0) break;
      list.push(cell);
      taken.add(cell);
    }
  });
  return result;
}

/**
 * Wolne pole dla kolejnej budowli: najbliżej środka „dzielnicy” budynku. Pierwsza budowla danego typu
 * staje w kierunku przypisanym budynkowi wokół środka kolonii (dzielnice rozchodzą się promieniście).
 */
function nextCell(grid: FieldGrid, own: number[], taken: Set<number>, index: number, total: number, rules: BuildRules): number {
  const target = own.length > 0 ? centroid(grid, own) : districtTarget(grid, index, total, taken);
  let best = -1;
  let bestDot = -Infinity;
  grid.cells.forEach((cell, i) => {
    if (taken.has(i) || !isBuildable(cell.kind, rules)) return;
    const d = dot(cell.center, target);
    if (d > bestDot) {
      bestDot = d;
      best = i;
    }
  });
  return best;
}

function centroid(grid: FieldGrid, cells: number[]): Vec3 {
  const sum: Vec3 = [0, 0, 0];
  for (const i of cells) {
    const c = grid.cells[i]!.center;
    sum[0] += c[0];
    sum[1] += c[1];
    sum[2] += c[2];
  }
  return sum;
}

/** Kierunek dzielnicy: środek kolonii przesunięty o dwa pola w stronę zależną od numeru budynku. */
function districtTarget(grid: FieldGrid, index: number, total: number, taken: Set<number>): Vec3 {
  const center = grid.cells[grid.colonyCenter]!;
  if (!taken.has(grid.colonyCenter) && index === 0) return center.center;
  const ring = center.neighbors.length > 0 ? center.neighbors : [grid.colonyCenter];
  const toward = grid.cells[ring[Math.floor((index * ring.length) / Math.max(1, total)) % ring.length]!]!.center;
  // Dwa kroki od środka: środek + 2 × (sąsiad − środek).
  return [2 * toward[0] - center.center[0], 2 * toward[1] - center.center[1], 2 * toward[2] - center.center[2]];
}
