// Wybór budowli dotknięciem: rzut budowli kolonii na ekran (ten sam obrót co renderery)
// i najbliższa widoczna budowla pod palcem. Czysta matematyka (bez three/DOM) — testowalna.
import type { BuildingId, BuildingLevels } from '../core/types.ts';
import type { FieldGrid } from '../core/colony/fieldGrid.ts';
import type { ColonyLayout, Vec3 } from './colony.ts';

/** Jak planeta jest pokazana na ekranie (piksele CSS). */
export interface PickView {
  cx: number;
  cy: number;
  yaw: number;
  pitch: number;
  /** Nachylenie osi (3D); 2D = 0. */
  tilt: number;
  /** 2D: rzut prostokątny, `r` = promień tarczy. 3D: perspektywa — ogniskowa `f` (px) i odległość kamery `d` (promienie planety). */
  projection: { kind: 'ortho'; r: number } | { kind: 'perspective'; f: number; d: number };
}

/** Poziomy z placem budowy: budowla w budowie też jest do wybrania. */
export function levelsWithSite(levels: BuildingLevels, site: { building: BuildingId; targetLevel: number } | null): BuildingLevels {
  return site ? { ...levels, [site.building]: Math.max(levels[site.building] ?? 0, site.targetLevel) } : levels;
}

/** Promień „trafienia” w budowlę (pt) — palec ma ok. 44 pt. */
export const PICK_RADIUS = 26;

/** Punkt planety → ekran; `visible` = po stronie zwróconej do widza (z małym zapasem od krawędzi). */
export function projectPoint(p: Vec3, view: PickView): { x: number; y: number; visible: boolean } {
  const [px, py, pz] = p;
  // Obrót wokół osi (yaw), potem nachylenie osi (tilt), potem pochylenie palcem (pitch) — jak w rendererach.
  const cyw = Math.cos(view.yaw);
  const syw = Math.sin(view.yaw);
  const x1 = px * cyw + pz * syw;
  const z1 = -px * syw + pz * cyw;
  const ct = Math.cos(view.tilt);
  const st = Math.sin(view.tilt);
  const x2 = x1 * ct - py * st;
  const y2 = x1 * st + py * ct;
  const cp = Math.cos(view.pitch);
  const sp = Math.sin(view.pitch);
  const y3 = y2 * cp - z1 * sp;
  const z3 = y2 * sp + z1 * cp;
  const len2 = px * px + py * py + pz * pz;
  if (view.projection.kind === 'ortho') {
    const { r } = view.projection;
    return { x: view.cx + x2 * r, y: view.cy - y3 * r, visible: z3 / Math.sqrt(len2) >= 0.08 };
  }
  const { f, d } = view.projection;
  const k = f / (d - z3);
  // Widoczny, gdy kamera jest po zewnętrznej stronie powierzchni w tym punkcie.
  return { x: view.cx + x2 * k, y: view.cy - y3 * k, visible: d * z3 - len2 > 0.05 * d };
}

/** Trafiony budynek (kompleks; `index` zostaje dla zgodności — zawsze 0). */
export interface StructureHit {
  id: BuildingId;
  index: number;
}

/**
 * Kompleks pod palcem (v0.45): budynek, którego pole obszaru leży najbliżej punktu (x, y) — w promieniu
 * wielkości pola na ekranie (nie mniej niż `PICK_RADIUS`). Działa przy każdym przybliżeniu: cały obszar jest celem.
 * `useSurface` — zabudowa stoi na powierzchni 3D (tarasy); 2D na sferze = 1.
 */
export function pickComplex(colony: ColonyLayout, grid: FieldGrid, view: PickView, x: number, y: number, useSurface = false): StructureHit | null {
  const scale = view.projection.kind === 'ortho' ? view.projection.r : view.projection.f / Math.max(0.2, view.projection.d - 1);
  let best: StructureHit | null = null;
  let bestScore = Infinity;
  for (const c of colony.complexes) {
    for (const spot of c.spots) {
      const s = useSurface ? spot.surface : 1;
      const p = projectPoint([spot.dir[0] * s, spot.dir[1] * s, spot.dir[2] * s], view);
      if (!p.visible) continue;
      const reach = Math.max(PICK_RADIUS, grid.cells[spot.cell]!.radius * scale);
      const distance = Math.hypot(p.x - x, p.y - y);
      // Względna odległość — trafienie w duże pole liczy się tak samo jak w małe.
      if (distance <= reach && distance / reach < bestScore) {
        bestScore = distance / reach;
        best = { id: c.building, index: 0 };
      }
    }
  }
  return best;
}

/**
 * Pole siatki pod palcem (v0.38.2, wybór miejsca budowy): spośród `cells` to, którego środek leży najbliżej
 * punktu (x, y) — w promieniu zależnym od wielkości pola na ekranie (`radius` px na pole).
 */
export function pickCell(centers: readonly Vec3[], cells: readonly number[], view: PickView, x: number, y: number, radius: number): number | null {
  let best: number | null = null;
  let bestDistance = radius;
  for (const cell of cells) {
    const p = projectPoint(centers[cell]!, view);
    if (!p.visible) continue;
    const distance = Math.hypot(p.x - x, p.y - y);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = cell;
    }
  }
  return best;
}
