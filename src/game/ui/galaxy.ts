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

/** Ikona gwiazdy badań — rodzaj efektu (rysowana w grze, bez plików graficznych). */
export type NodeIcon = 'metal' | 'crystal' | 'mining' | 'energy' | 'build' | 'storage' | 'antimatter' | 'planet' | 'ship' | 'ai' | 'station' | 'fleet' | 'none';

export function nodeIcon(node: ResearchNodeDef): NodeIcon {
  const outputs = node.effects.filter((e) => e.kind === 'output').map((e) => (e.kind === 'output' ? e.resource : ''));
  const first = node.effects[0];
  if (outputs.includes('metal') && outputs.includes('crystal')) return node.arm === 'planetology' ? 'planet' : 'mining';
  if (outputs.includes('metal')) return 'metal';
  if (outputs.includes('crystal')) return 'crystal';
  if (!first) return node.arm === 'station' ? 'station' : node.arm === 'fleet' ? 'fleet' : node.arm === 'exploration' ? 'ship' : 'none';
  switch (first.kind) {
    case 'output':
      return first.resource === 'energy' ? 'energy' : 'antimatter';
    case 'energyUse':
      return 'energy';
    case 'buildTime':
    case 'buildCost':
    case 'buildQueue':
      return 'build';
    case 'storage':
    case 'offlineHours':
      return 'storage';
    case 'antimatterPassive':
    case 'finishPrice':
    case 'freeFinish':
      return 'antimatter';
    case 'environment':
    case 'planetSlots':
      return 'planet';
    case 'unlock':
      return first.feature === 'colony-ship' ? 'ship' : first.feature === 'specialization-change' ? 'planet' : 'ai';
    default:
      return 'none';
  }
}
