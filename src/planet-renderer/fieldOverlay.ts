// Wygląd siatki pól (wspólny dla 2D i 3D): kolor obrysu z rodzaju pola i zajętości.
import type { FieldGrid } from '../core/colony/fieldGrid.ts';
import type { Plots } from '../core/colony/plots.ts';

/** Wolne pole lądu (do zabudowy), zajęte pole, pole bez możliwości budowy (woda, lód, lawa — nie rysowane). */
export const FIELD_COLORS = { free: '#5fd3c4', taken: '#d8b463', blocked: '#6f8796' } as const;

export type FieldState = keyof typeof FIELD_COLORS;

/** Stan każdego pola: zajęte (przez budowlę), wolne (ląd) albo zablokowane. */
export function fieldStates(grid: FieldGrid, plots: Plots | null): FieldState[] {
  const taken = new Set<number>();
  for (const list of Object.values(plots ?? {})) for (const cell of list ?? []) taken.add(cell);
  return grid.cells.map((cell, i) => (taken.has(i) ? 'taken' : cell.kind === 'land' ? 'free' : 'blocked'));
}
