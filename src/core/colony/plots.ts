// Przydział pól budowlom (automatyczny — decyzja właściciela). Jedno pole mieści GRUPĘ do 3 poziomów
// tego samego budynku (od v0.26.1): poziomy 1–3 stoją na pierwszym polu, 4–6 na drugim itd.
// Zajęte pola zapisujemy w stanie planety i nigdy ich nie przestawiamy — nowa grupa dostaje wolne pole
// obok reszty swojego budynku, najlepiej na pasującym terenie (`siteRules`).
import type { BuildingId, BuildingLevels } from '../types.ts';
import { isBuildable, type BuildRules, type FieldCell, type FieldGrid, type Vec3 } from './fieldGrid.ts';

/** Pola zajęte przez grupy budowli danego typu (indeksy pól siatki, w kolejności budowy). */
export type Plots = Partial<Record<BuildingId, number[]>>;

/** Ile poziomów budynku mieści jedno pole. */
export const LEVELS_PER_FIELD = 3;

/** Ile pól potrzeba na dany poziom budynku. */
export const groupsFor = (level: number) => Math.ceil(Math.max(0, Math.floor(level)) / LEVELS_PER_FIELD);

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

/** Wolne pola dedykowanego terenu, na których gracz może postawić następną grupę budynku (v0.38.2). */
export function choiceCells(grid: FieldGrid, plots: Plots, id: BuildingId, rules: BuildRules = {}, reserved: ReadonlySet<number> = new Set()): number[] {
  const taken = new Set<number>([...reserved, ...Object.values(plots).flatMap((l) => l ?? [])]);
  const out: number[] = [];
  grid.cells.forEach((cell, i) => {
    if (!taken.has(i) && canStand(id, cell, rules) && suits(id, cell)) out.push(i);
  });
  return out;
}

/** Czy budynek może stanąć na polu: ląd (zgodnie z `BuildRules`), a kryształy także na lodzie. */
export function canStand(id: BuildingId, cell: FieldCell, rules: BuildRules = {}): boolean {
  return isBuildable(cell.kind, rules) || (id === 'crystalMine' && cell.kind === 'ice');
}

/**
 * Zajęte pola, które liczą się do limitu: ląd, a po „Budowie na lodzie” także lód
 * (bez niej kryształy na lodzie stoją poza limitem).
 */
export function usedLandFields(grid: FieldGrid, plots: Plots, rules: BuildRules = {}, reserved: Iterable<number> = []): number {
  let used = 0;
  // Pola wspólnych konstrukcji kompleksów (v0.38) liczą się jak zabudowane.
  for (const list of [...Object.values(plots), [...reserved]]) {
    for (const cell of list ?? []) {
      const kind = grid.cells[cell]?.kind;
      if (kind && isBuildable(kind, rules)) used++;
    }
  }
  return used;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Dopasowanie pól do poziomów: brakującym grupom przydziela wolne pola (w stałej kolejności budynków),
 * nadmiar (np. anulowana budowa) zdejmuje od końca. Istniejące przydziały zostają bez zmian.
 * Gdy wolnych pól brak (stary zapis z większą liczbą poziomów), część grup po prostu nie stoi.
 */
export function reconcilePlots(
  grid: FieldGrid,
  plots: Plots,
  levels: BuildingLevels,
  order: readonly BuildingId[],
  rules: BuildRules = {},
  reserved: ReadonlySet<number> = new Set(),
  /** Pole wybrane przez gracza dla następnej grupy budynku (v0.38.2) — używane, gdy wolne i dozwolone. */
  preferred: Partial<Record<BuildingId, number>> = {},
): Plots {
  const result: Plots = {};
  // Pola zarezerwowane przez kompleksy (v0.38) nie trafiają do żadnej grupy.
  const taken = new Set<number>(reserved);
  for (const id of order) {
    // Pola spoza siatki, podwójne albo niedozwolone (np. po zmianie terenu) odrzucamy.
    const list = (plots[id] ?? []).filter((cell) => cell >= 0 && cell < grid.cells.length && !taken.has(cell) && canStand(id, grid.cells[cell]!, rules));
    const keep = list.slice(0, groupsFor(levels[id] ?? 0));
    for (const cell of keep) taken.add(cell);
    result[id] = keep;
  }
  order.forEach((id, index) => {
    const list = result[id]!;
    const want = groupsFor(levels[id] ?? 0);
    while (list.length < want) {
      const wish = preferred[id];
      const ok = wish !== undefined && wish >= 0 && wish < grid.cells.length && !taken.has(wish) && canStand(id, grid.cells[wish]!, rules);
      const cell = ok ? wish : nextCell(grid, id, list, taken, index, order.length, rules);
      if (cell < 0) break;
      list.push(cell);
      taken.add(cell);
    }
  });
  return result;
}

/** Czy następny poziom budynku zmieści się na planecie (wolne miejsce w grupie albo wolne pole). */
export function hasRoomFor(
  grid: FieldGrid,
  plots: Plots,
  levels: BuildingLevels,
  id: BuildingId,
  order: readonly BuildingId[],
  rules: BuildRules = {},
  reserved: ReadonlySet<number> = new Set(),
): boolean {
  const next = { ...levels, [id]: (levels[id] ?? 0) + 1 };
  const placed = reconcilePlots(grid, plots, next, order, rules, reserved);
  return (placed[id]?.length ?? 0) >= groupsFor(next[id]);
}

/**
 * Dopasowanie budynku do terenu 0..1: poziomy w grupach na pasującym terenie liczą się w 100%,
 * na innym — `OFF_SITE_FACTOR`. Poziomy bez pola (stary zapis) — jak na pasującym terenie.
 */
export function siteFactors(
  grid: FieldGrid,
  plots: Plots,
  levels: BuildingLevels,
  /** Dodatkowy mnożnik poziomów na polu (premia kompleksu, v0.38). */
  cellBonus: (id: BuildingId, cell: number) => number = () => 1,
): Partial<Record<BuildingId, number>> {
  const out: Partial<Record<BuildingId, number>> = {};
  for (const [id, raw] of Object.entries(levels) as [BuildingId, number][]) {
    const level = Math.max(0, Math.floor(raw ?? 0));
    if (level === 0) continue;
    let sum = 0;
    for (let l = 0; l < level; l++) {
      const cell = plots[id]?.[Math.floor(l / LEVELS_PER_FIELD)];
      sum += (cell === undefined || suits(id, grid.cells[cell]!) ? 1 : OFF_SITE_FACTOR) * (cell === undefined ? 1 : cellBonus(id, cell));
    }
    out[id] = Math.round((sum / level) * 1000) / 1000;
  }
  return out;
}

/**
 * Wolne pole dla nowej grupy: najpierw pasujący teren najbliżej „dzielnicy” budynku, gdy go brak —
 * dowolne dozwolone pole najbliżej. Pierwsza grupa staje w kierunku przypisanym budynkowi wokół
 * środka kolonii (dzielnice rozchodzą się promieniście).
 */
function nextCell(grid: FieldGrid, id: BuildingId, own: number[], taken: Set<number>, index: number, total: number, rules: BuildRules): number {
  const target = own.length > 0 ? centroid(grid, own) : districtTarget(grid, index, total, taken);
  let best = -1;
  let bestScore = -Infinity;
  grid.cells.forEach((cell, i) => {
    if (taken.has(i) || !canStand(id, cell, rules)) return;
    // Pasujący teren wygrywa z każdą odległością (+2 > największa różnica iloczynów skalarnych);
    // pola z większą ilością lądu mają pierwszeństwo przed przybrzeżnymi skrawkami (v0.26.2).
    // Kryształy najpierw zajmują lód (decyzja właściciela, v0.26.3) — ląd dopiero, gdy wolnego lodu brak.
    const score =
      dot(cell.center, target) / Math.max(1e-9, Math.hypot(...target)) +
      (suits(id, cell) ? 2 : 0) +
      0.6 * cell.landShare +
      (id === 'crystalMine' && cell.kind === 'ice' ? 4 : 0);
    if (score > bestScore) {
      bestScore = score;
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
  return [2 * toward[0] - center.center[0], 2 * toward[1] - center.center[1], 2 * toward[2] - center.center[2]];
}
