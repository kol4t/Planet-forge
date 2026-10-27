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
  /** Środki połączonych grup (do rur); w megakompleksie także konstrukcja główna drugiego kompleksu. */
  members: Vec3[];
  /** Część megakompleksu (v0.43) — większa konstrukcja główna. */
  mega: boolean;
}

/** Rodzaj przemienionego gruntu wokół kompleksu (v0.42): kryształowe wychodnie, żużel, naelektryzowane płyty. */
export type MarkKind = 'crystal' | 'slag' | 'charged';

/** Element przemienionego terenu (tylko wygląd, odtwarzany z kompleksów w zapisie). */
export interface ColonyMark {
  kind: MarkKind;
  dir: Vec3;
  surface: number;
  spin: number;
  /** Wielkość 0.6..1.4 (dalej od kompleksu — mniejsze). */
  size: number;
  /** Indeks huba kompleksu (`ColonyLayout.hubs`) — teren zmienia się po animacji łączenia. */
  hub: number;
}

export interface ColonyLayout {
  center: Vec3;
  slots: Record<BuildingId, ColonySlot[]>;
  /** Grupy budynków z większą konstrukcją po zapełnieniu pola (rysowane zamiast 3 małych budowli). */
  rigs: ColonyRig[];
  hubs: ColonyHub[];
  /** Przemieniony teren wokół kompleksów (v0.42). */
  marks: ColonyMark[];
}

export const MARK_KINDS: Partial<Record<BuildingId, MarkKind>> = { crystalMine: 'crystal', metalMine: 'slag', powerPlant: 'charged' };

/** Najwięcej elementów przemienionego terenu (pojemność siatek 3D). */
export const MAX_MARKS = 1600;
/** Udział punktów mapy powierzchni z elementem: pola kompleksu i pola sąsiednie. */
const MARK_DENSITY = { inside: 0.2, around: 0.07 };
/** Wolny krąg wokół konstrukcji (kąt) — teren zmienia się wokół, nie pod budowlą. */
const MARK_CLEAR = { rig: 0.07, hub: 0.09 };

/** Budynki, których pełne pole zmienia się w większą konstrukcję (v0.38: wiertła kryształu, v0.39: zakłady metalu). */
export const RIG_BUILDINGS: readonly BuildingId[] = ['crystalMine', 'metalMine', 'powerPlant'];

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
      const members = c.cells.map((m) => fieldPoint(grid, m));
      // Megakompleks: główny przewód od huba z numerem megakompleksu do huba drugiego kompleksu (raz na parę).
      if (c.mega === cell) {
        const partner = complexes.find((x) => x !== c && x.mega === c.mega);
        if (partner?.hubs[0] !== undefined) members.push(fieldPoint(grid, partner.hubs[0]));
      }
      return { building: c.building, dir, surface: surfaceAt(dir), spin: hash01(cell, 6) * Math.PI * 2, members, mega: c.mega !== undefined };
    }),
  );
  return { center: grid.cells[grid.colonyCenter]!.center, slots, rigs, hubs, marks: transformMarks(grid, complexes, surfaceAt) };
}

/**
 * Przemieniony teren (v0.42): punkty mapy powierzchni pól kompleksu (gęsto) i pól sąsiednich (rzadko),
 * z wolnym kręgiem wokół wierteł/zakładów/wież i huba. Deterministycznie z numerów punktów — ten sam
 * zapis daje ten sam teren.
 */
export function transformMarks(grid: FieldGrid, complexes: readonly Complex[], surfaceAt: (dir: Vec3) => number): ColonyMark[] {
  const marks: ColonyMark[] = [];
  const taken = new Set<number>();
  let hubIndex = 0;
  for (const c of complexes) {
    const hub = hubIndex;
    hubIndex += c.hubs.length;
    const kind = MARK_KINDS[c.building];
    if (!kind) continue;
    const own = new Set([...c.cells, ...c.hubs]);
    const around = new Set<number>();
    for (const cell of own) for (const n of grid.cells[cell]?.neighbors ?? []) if (!own.has(n)) around.add(n);
    const clear = [
      ...c.cells.map((cell) => ({ dir: fieldPoint(grid, cell), r: MARK_CLEAR.rig })),
      ...c.hubs.map((cell) => ({ dir: fieldPoint(grid, cell), r: MARK_CLEAR.hub })),
    ];
    for (const [cells, density, scale] of [[own, MARK_DENSITY.inside, 1], [around, MARK_DENSITY.around, 0.75]] as const) {
      for (const cell of cells) {
        for (const p of grid.cells[cell]?.members ?? []) {
          if (marks.length >= MAX_MARKS) return marks;
          if (taken.has(p) || hash01(p, 11) >= density) continue;
          const dir = grid.samples[p]!;
          if (clear.some((k) => angleBetween(dir, k.dir) < k.r)) continue;
          taken.add(p);
          marks.push({ kind, dir, surface: surfaceAt(dir), spin: hash01(p, 12) * Math.PI * 2, size: scale * (0.6 + 0.8 * hash01(p, 13)), hub });
        }
      }
    }
  }
  return marks;
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
  return ids.map((id) => (plots[id] ?? []).join(',')).join('|') + '#' + complexes.map((c) => `${c.cells.join(',')}>${c.hubs.join(',')}${c.mega !== undefined ? `^${c.mega}` : ''}`).join(';');
}

/** Klucz animacji łączenia huba: zmiana w megakompleks (v0.43) to nowe łączenie — konstrukcja wyrasta od nowa. */
export const hubKey = (hub: ColonyHub) => hub.dir.join(',') + (hub.mega ? '|mega' : '');
