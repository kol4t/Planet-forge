// Wybór budowli dotknięciem: rzut budowli kolonii na ekran (ten sam obrót co renderery)
// i najbliższa widoczna budowla pod palcem. Czysta matematyka (bez three/DOM) — testowalna.
import type { BuildingId, BuildingLevels } from '../core/types.ts';
import { visibleStructures, type ColonyLayout, type Vec3 } from './colony.ts';

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

/**
 * Najbliższa widoczna budowla w promieniu `radius` od punktu (x, y) albo null.
 * `surface(slot)` — promień podstawy budowli (3D stoi na tarasach; 2D na sferze = 1).
 */
export function pickStructure(
  colony: ColonyLayout,
  levels: BuildingLevels,
  view: PickView,
  x: number,
  y: number,
  radius = PICK_RADIUS,
  useSurface = false,
): BuildingId | null {
  let best: BuildingId | null = null;
  let bestDistance = radius;
  for (const id of Object.keys(colony.slots) as BuildingId[]) {
    const slots = colony.slots[id] ?? [];
    const count = Math.min(visibleStructures(levels[id] ?? 0), slots.length);
    for (let i = 0; i < count; i++) {
      const slot = slots[i]!;
      const s = useSurface ? slot.surface : 1;
      const p = projectPoint([slot.dir[0] * s, slot.dir[1] * s, slot.dir[2] * s], view);
      if (!p.visible) continue;
      const distance = Math.hypot(p.x - x, p.y - y);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = id;
      }
    }
  }
  return best;
}
