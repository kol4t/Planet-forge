// Układ galaktyki badań: czysta matematyka (bez Phasera), w jednostkach galaktyki
// (1 ≈ odstęp między pierścieniami). Jądro w (0, 0), ramiona skręcają spiralnie.
import type { ResearchArmDef, ResearchNodeDef } from '../../core/types.ts';

export interface Point {
  x: number;
  y: number;
}

/** Promień, w którym mieści się cała galaktyka (z gwiazdami mistrzowskimi i nazwami ramion). */
export const GALAXY_RADIUS = 7.4;
/** Skręt spirali na jeden pierścień (rad). */
const TWIST = 0.3;
/** Odstęp gałęzi szerokiego ramienia (w jednostkach galaktyki, w poprzek ramienia). */
const LANE_SPACING = 0.82;
const FIRST_RING = 0.55;
const RING_STEP = 0.98;

export const ringRadius = (ring: number) => FIRST_RING + ring * RING_STEP;

/** Punkt na osi ramienia w odległości `radius` od jądra. */
export function armPoint(arm: ResearchArmDef, radius: number, lateral = 0): Point {
  const a = (arm.angleDeg * Math.PI) / 180 + (TWIST * (radius - FIRST_RING)) / RING_STEP + lateral / Math.max(radius, 0.5);
  return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
}

export function nodePosition(arm: ResearchArmDef, node: ResearchNodeDef): Point {
  return armPoint(arm, ringRadius(node.ring), node.lane * LANE_SPACING);
}

export function galaxyLayout(arms: readonly ResearchArmDef[], nodes: readonly ResearchNodeDef[]): Map<string, Point> {
  const positions = new Map<string, Point>();
  for (const node of nodes) {
    const arm = arms.find((a) => a.id === node.arm);
    if (arm) positions.set(node.id, nodePosition(arm, node));
  }
  return positions;
}

/** Najbliższy węzeł w promieniu `maxDistance` (albo null). */
export function hitTest(positions: ReadonlyMap<string, Point>, x: number, y: number, maxDistance: number): string | null {
  let best: string | null = null;
  let bestDistance = maxDistance;
  for (const [id, p] of positions) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= bestDistance) {
      best = id;
      bestDistance = d;
    }
  }
  return best;
}
