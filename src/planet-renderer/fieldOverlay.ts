// Wygląd siatki pól (wspólny dla 2D i 3D): kolor granicy z rodzaju pól i zajętości.
import type { FieldGrid } from '../core/colony/fieldGrid.ts';
import type { Plots } from '../core/colony/plots.ts';

/** Wolne pole lądu, zajęte pole, pole lodu (kryształy). Woda i lawa nie mają pól. */
export const FIELD_COLORS = { free: '#5fd3c4', taken: '#d8b463', ice: '#b9d4e6' } as const;

export type FieldState = keyof typeof FIELD_COLORS;

/** Stan każdego pola: zajęte (przez budowlę), wolne (ląd) albo lód. */
export function fieldStates(grid: FieldGrid, plots: Plots | null): FieldState[] {
  const taken = new Set<number>();
  for (const list of Object.values(plots ?? {})) for (const cell of list ?? []) taken.add(cell);
  return grid.cells.map((cell, i) => (taken.has(i) ? 'taken' : cell.kind === 'land' ? 'free' : 'ice'));
}

/**
 * Kolor każdego odcinka granicy (`grid.borders`): złoty, gdy którekolwiek z dwóch pól jest zajęte —
 * wspólna krawędź nie zasłania zajętego pola kolorem sąsiada; turkus przy lądzie, jasny błękit przy lodzie.
 */
export function borderStates(grid: FieldGrid, plots: Plots | null): FieldState[] {
  const cells = fieldStates(grid, plots);
  const rank: Record<FieldState, number> = { taken: 2, free: 1, ice: 0 };
  return grid.borders.map(({ a, b }) => {
    const sa = cells[a]!;
    if (b < 0) return sa;
    const sb = cells[b]!;
    return rank[sa] >= rank[sb] ? sa : sb;
  });
}
