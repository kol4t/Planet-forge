// Kompleksy przemysłowe (v0.38): kilka PEŁNYCH grup budowli jednego typu (pole z 3 poziomami) na sąsiednich
// polach, połączonych decyzją gracza we wspólną konstrukcję na dodatkowym wolnym polu (hub, np. szyb główny).
// Kompleks zajmuje więcej pól (grupy + hub) i daje premię wydobycia poziomom w nim. Czysta logika.
import type { ComplexFamily } from '../../data/complexes.ts';
import type { BuildingId, BuildingLevels } from '../types.ts';
import { canStand, LEVELS_PER_FIELD, suits, TERRAIN_NAMES, type Plots } from './plots.ts';
import type { BuildRules, FieldGrid } from './fieldGrid.ts';

export interface Complex {
  /** Rodzina (`COMPLEX_FAMILIES`). */
  family: string;
  building: BuildingId;
  /** Pola połączonych grup. */
  cells: number[];
  /** Dodatkowe pola wspólnej konstrukcji. */
  hubs: number[];
  /** Tryb pracy (v0.39, rodziny z trybami; brak = domyślny). */
  mode?: string;
  /** Megakompleks (v0.43): wspólny numer dwóch stykających się kompleksów tej samej rodziny. */
  mega?: number;
}

/** Czy dwa kompleksy stykają się (któreś ich pole — grupa albo hub — sąsiaduje z polem drugiego). */
export function touching(grid: FieldGrid, a: Complex, b: Complex): boolean {
  const other = new Set([...b.cells, ...b.hubs]);
  return [...a.cells, ...a.hubs].some((cell) => grid.cells[cell]?.neighbors.some((n) => other.has(n)));
}

/**
 * Megakompleksy, które nadal są ważne: dokładnie dwa kompleksy tej samej rodziny z tym samym numerem
 * i stykające się. Inaczej znacznik znika (np. po rozpadzie jednego z kompleksów) — kompleksy zostają.
 */
export function validMegas(grid: FieldGrid, complexes: readonly Complex[]): Complex[] {
  return complexes.map((c) => {
    if (c.mega === undefined) return c;
    const pair = complexes.filter((x) => x.mega === c.mega);
    if (pair.length === 2 && pair[0]!.family === pair[1]!.family && touching(grid, pair[0]!, pair[1]!)) return c;
    const { mega: _gone, ...rest } = c;
    return rest;
  });
}

export type MegaCandidate = { ok: true; pair: [number, number] } | { ok: false; reason: string };

/** Następne możliwe połączenie w megakompleks: pierwsza para stykających się kompleksów rodziny spoza megakompleksów. */
export function megaCandidate(grid: FieldGrid, complexes: readonly Complex[], family: string): MegaCandidate {
  const free = complexes.map((c, i) => ({ c, i })).filter(({ c }) => c.family === family && c.mega === undefined);
  if (free.length < 2) return { ok: false, reason: `Potrzeba 2 kompleksów poza megakompleksem — masz ${free.length}.` };
  for (let a = 0; a < free.length; a++) {
    for (let b = a + 1; b < free.length; b++) {
      if (touching(grid, free[a]!.c, free[b]!.c)) return { ok: true, pair: [free[a]!.i, free[b]!.i] };
    }
  }
  return { ok: false, reason: 'Kompleksy nie stykają się — megakompleks łączy dwa kompleksy, których pola leżą obok siebie.' };
}

/** Numer nowego megakompleksu: najmniejsze pole huba z pary (stały dla tej samej pary). */
export const megaId = (a: Complex, b: Complex) => Math.min(...a.hubs, ...b.hubs);

/** Pola z pełną grupą (3 poziomy) budynku `id`, w kolejności budowy. */
export function fullGroupCells(plots: Plots, levels: BuildingLevels, id: BuildingId): number[] {
  const level = Math.max(0, Math.floor(levels[id] ?? 0));
  return (plots[id] ?? []).filter((_, g) => level >= (g + 1) * LEVELS_PER_FIELD);
}

/** Pola zarezerwowane przez kompleksy (huby) — nie dostaje ich żadna grupa budowli. */
export function reservedCells(complexes: readonly Complex[]): Set<number> {
  return new Set(complexes.flatMap((c) => c.hubs));
}

/**
 * Kompleksy, które nadal są ważne: wszystkie ich grupy wciąż pełne (np. zburzenie poziomu rozbija kompleks),
 * a huby nie są zajęte przez budowle. Kolejność zachowana.
 */
export function validComplexes(complexes: readonly Complex[], plots: Plots, levels: BuildingLevels): Complex[] {
  const occupied = new Set(Object.values(plots).flatMap((list) => list ?? []));
  const used = new Set<number>();
  return complexes.filter((c) => {
    const full = new Set(fullGroupCells(plots, levels, c.building));
    const ok = c.cells.every((cell) => full.has(cell) && !used.has(cell)) && c.hubs.every((h) => !occupied.has(h) && !used.has(h));
    if (ok) for (const cell of [...c.cells, ...c.hubs]) used.add(cell);
    return ok;
  });
}

/** Czy pola tworzą spójny kawałek (sąsiedztwo pól siatki). */
function connected(grid: FieldGrid, cells: readonly number[]): boolean {
  if (cells.length === 0) return false;
  const want = new Set(cells);
  const seen = new Set([cells[0]!]);
  const stack = [cells[0]!];
  while (stack.length > 0) {
    for (const n of grid.cells[stack.pop()!]!.neighbors) {
      if (want.has(n) && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size === want.size;
}

function combinations(items: readonly number[], k: number): number[][] {
  if (k === 0) return [[]];
  const out: number[][] = [];
  items.forEach((item, i) => {
    for (const rest of combinations(items.slice(i + 1), k - 1)) out.push([item, ...rest]);
  });
  return out;
}

export type MergeCandidate = { ok: true; cells: number[]; hubs: number[] } | { ok: false; reason: string };

/**
 * Następne możliwe połączenie: `family.groups` pełnych grup (spoza kompleksów) leżących obok siebie
 * i wolne pole (pola) dotykające ich, na które może wejść budynek. Wybór deterministyczny:
 * najwcześniej zbudowane grupy, hub stykający się z największą liczbą grup.
 */
export function mergeCandidate(
  grid: FieldGrid,
  plots: Plots,
  levels: BuildingLevels,
  complexes: readonly Complex[],
  family: ComplexFamily,
  rules: BuildRules = {},
): MergeCandidate {
  const inComplex = new Set(complexes.flatMap((c) => c.cells));
  // Łączyć można tylko pola dedykowanego terenu (decyzja właściciela, v0.38.2) — np. wiertła kryształu na lodzie.
  const terrain = TERRAIN_NAMES[family.building];
  const fullFree = fullGroupCells(plots, levels, family.building).filter((c) => !inComplex.has(c));
  const free = fullFree.filter((c) => suits(family.building, grid.cells[c]!));
  if (free.length < family.groups) {
    const offSite = fullFree.length - free.length;
    return {
      ok: false,
      reason:
        `Potrzeba ${family.groups} pełnych pól (po ${LEVELS_PER_FIELD} poziomy) na dedykowanym terenie${terrain ? ` (${terrain})` : ''} — masz ${free.length}.` +
        (offSite > 0 ? ` ${offSite} pełne pole poza nim się nie liczy.` : ''),
    };
  }
  const taken = new Set([...Object.values(plots).flatMap((l) => l ?? []), ...reservedCells(complexes)]);
  let sawConnected = false;
  for (const set of combinations(free, family.groups)) {
    if (!connected(grid, set)) continue;
    sawConnected = true;
    const counts = new Map<number, number>();
    for (const cell of set) {
      for (const n of grid.cells[cell]!.neighbors) {
        const cell = grid.cells[n]!;
        if (!taken.has(n) && canStand(family.building, cell, rules) && suits(family.building, cell)) counts.set(n, (counts.get(n) ?? 0) + 1);
      }
    }
    const hubs = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, family.extraFields)
      .map(([cell]) => cell);
    if (hubs.length === family.extraFields) return { ok: true, cells: set, hubs };
  }
  return {
    ok: false,
    reason: sawConnected
      ? `Obok tych pól nie ma wolnego pola${terrain ? ` (${terrain})` : ''} na wspólną konstrukcję.`
      : `Pełne pola nie leżą obok siebie — kompleks łączy ${family.groups} sąsiednie pola.`,
  };
}

/** Mnożnik wydobycia poziomu stojącego na polu `cell` (premia kompleksu albo 1). */
export function complexBonus(complexes: readonly Complex[], id: BuildingId, cell: number, bonusOf: (family: string) => number): number {
  const c = complexes.find((x) => x.building === id && x.cells.includes(cell));
  return c ? 1 + bonusOf(c.family) / 100 : 1;
}

/** Odczyt z zapisu (błędne pomijane; ważność względem planety sprawdza `validComplexes`). */
export function parseComplexes(raw: unknown, families: readonly ComplexFamily[]): Complex[] {
  if (!Array.isArray(raw)) return [];
  const ints = (v: unknown) => Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= 0);
  return raw.flatMap((c: any) => {
    const family = families.find((f) => f.id === c?.family);
    if (!family || !ints(c.cells) || !ints(c.hubs)) return [];
    const mode = typeof c.mode === 'string' && family.modes?.some((m) => m.id === c.mode) ? { mode: c.mode as string } : {};
    const mega = Number.isInteger(c.mega) && c.mega >= 0 ? { mega: c.mega as number } : {};
    return [{ family: family.id, building: family.building, cells: [...c.cells], hubs: [...c.hubs], ...mode, ...mega }];
  });
}
