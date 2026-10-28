// Wygląd siatki pól (wspólny dla 2D i 3D): kolor granicy z rodzaju pól i zajętości.
import { ensureSeaBorders, touchesSea, type FieldGrid } from '../core/colony/fieldGrid.ts';
import type { Plots } from '../core/colony/plots.ts';

/** Wolne pole lądu, zajęte pole, pole lodu (kryształy). Wolne pola morza (woda, lawa — v0.57) są niewidoczne. */
export const FIELD_COLORS = { free: '#5fd3c4', taken: '#d8b463', ice: '#b9d4e6' } as const;

/** `hidden` — wolne pole morza i jego granice (nie rysowane). */
export type FieldState = keyof typeof FIELD_COLORS | 'hidden';

/**
 * Grubość linii siatki (pt ekranu) i ciemna obwódka pod nią — linia jest widoczna na każdym tle:
 * jasnym lodzie, piasku, zieleni i nocnej stronie (od v0.30.1; v0.31.1 — łagodniej, na prośbę właściciela).
 */
export const FIELD_LINE = { width: 1.2, halo: 2.8, haloColor: '#041012', haloAlpha: 0.32, alpha: 0.7 } as const;

/** Stan każdego pola: zajęte (przez budowlę), wolne (ląd), lód albo ukryte (wolne pole morza). */
export function fieldStates(grid: FieldGrid, plots: Plots | null): FieldState[] {
  const taken = new Set<number>();
  for (const list of Object.values(plots ?? {})) for (const cell of list ?? []) taken.add(cell);
  return grid.cells.map((cell, i) => (taken.has(i) ? 'taken' : i >= grid.seaCellStart ? 'hidden' : cell.kind === 'land' ? 'free' : 'ice'));
}

/**
 * Kolor każdego odcinka granicy (`grid.borders`): złoty, gdy którekolwiek z dwóch pól jest zajęte —
 * wspólna krawędź nie zasłania zajętego pola kolorem sąsiada; turkus przy lądzie, jasny błękit przy lodzie.
 */
export function borderStates(grid: FieldGrid, plots: Plots | null): FieldState[] {
  if (touchesSea(grid, Object.values(plots ?? {}).flatMap((l) => l ?? []))) ensureSeaBorders(grid);
  const cells = fieldStates(grid, plots);
  const rank: Record<FieldState, number> = { taken: 2, free: 1, ice: 0, hidden: -1 };
  return grid.borders.map(({ a, b }, i) => {
    const sa = cells[a]!;
    // Granice pól morza: tylko wokół zajętego pola morza (brzeg lądu rysują granice lądu).
    if (i >= grid.seaBorderStart) return sa === 'taken' || (b >= grid.seaCellStart && cells[b] === 'taken') ? 'taken' : 'hidden';
    if (b < 0) return sa;
    const sb = cells[b]!;
    return rank[sa] >= rank[sb] ? sa : sb;
  });
}

type Point3 = readonly [number, number, number];

/** Ciągła linia granicy w jednym kolorze (kolejne punkty na sferze). */
export interface BorderChain {
  state: FieldState;
  points: Point3[];
}

/**
 * Łączy odcinki granic (`grid.borders`) o tym samym kolorze w ciągłe linie — zamiast ~10 tys. osobnych
 * odcinków kilkaset linii, które rysuje się dużo szybciej (grubsze linie z obwódką w 2D).
 * Każdy odcinek trafia do dokładnie jednej linii.
 */
export function borderChains(grid: FieldGrid, states: readonly FieldState[]): BorderChain[] {
  const key = (p: Point3) => `${p[0].toFixed(6)},${p[1].toFixed(6)},${p[2].toFixed(6)}`;
  const chains: BorderChain[] = [];
  for (const state of ['ice', 'free', 'taken'] as const) {
    const ends = new Map<string, number[]>();
    const segments: number[] = [];
    grid.borders.forEach((border, i) => {
      if (states[i] !== state) return;
      segments.push(i);
      for (const p of [border.from, border.to]) {
        const k = key(p);
        const list = ends.get(k);
        if (list) list.push(i);
        else ends.set(k, [i]);
      }
    });
    const used = new Set<number>();
    const next = (at: Point3): { seg: number; to: Point3 } | null => {
      for (const seg of ends.get(key(at)) ?? []) {
        if (used.has(seg)) continue;
        const b = grid.borders[seg]!;
        return { seg, to: key(b.from) === key(at) ? b.to : b.from };
      }
      return null;
    };
    for (const start of segments) {
      if (used.has(start)) continue;
      used.add(start);
      const b = grid.borders[start]!;
      const points: Point3[] = [b.from, b.to];
      for (let step = next(b.to); step; step = next(points[points.length - 1]!)) {
        used.add(step.seg);
        points.push(step.to);
      }
      for (let step = next(b.from); step; step = next(points[0]!)) {
        used.add(step.seg);
        points.unshift(step.to);
      }
      chains.push({ state, points });
    }
  }
  return chains;
}

/**
 * Obrys zajętości wybranej budowli (v0.38.1): odcinki granic, po których jednej stronie jest pole z `cells`,
 * a po drugiej inne pole albo brzeg — wspólne krawędzie pól budowli nie są rysowane (jeden kontur).
 */
export function outlineBorders(grid: FieldGrid, cells: Iterable<number>): number[] {
  const set = new Set(cells);
  if (touchesSea(grid, set)) ensureSeaBorders(grid);
  const out: number[] = [];
  grid.borders.forEach(({ a, b }, i) => {
    if (set.has(a) !== (b >= 0 && set.has(b))) out.push(i);
  });
  return out;
}

/** Kolor obrysu zajętości (turkusowy, jak w szkicach właściciela). */
export const HIGHLIGHT = { color: '#5ff2e0', width: 2.6, halo: 6, haloColor: '#041012', haloAlpha: 0.45 } as const;

/** Wszystkie granice pól z `cells` (każde pole z osobnym obrysem — pola do wyboru, v0.38.2). */
export function cellBorders(grid: FieldGrid, cells: Iterable<number>): number[] {
  const set = new Set(cells);
  if (touchesSea(grid, set)) ensureSeaBorders(grid);
  const out: number[] = [];
  grid.borders.forEach(({ a, b }, i) => {
    if (set.has(a) || (b >= 0 && set.has(b))) out.push(i);
  });
  return out;
}

/** Obrys pól do wyboru (złoty — „tu możesz budować”). */
export const CHOICE = { color: '#e6c77a', width: 2.2 } as const;

export type HighlightMode = 'footprint' | 'choice';
