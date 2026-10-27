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

/**
 * Linia połączenia jako łuk „po spirali” (v0.36.1): kąt i odległość od jądra zmieniają się płynnie,
 * więc połączenie biegnie wzdłuż pierścieni zamiast przecinać galaktykę na skos przez jądro.
 */
export function linkCurve(from: Point, to: Point, segments = 14): Point[] {
  const r1 = Math.hypot(from.x, from.y);
  const r2 = Math.hypot(to.x, to.y);
  const a2 = Math.atan2(to.y, to.x);
  // Z jądra (0, 0) — prosto na zewnątrz.
  const a1 = r1 < 1e-6 ? a2 : Math.atan2(from.y, from.x);
  let d = a2 - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = a1 + d * t;
    const r = r1 + (r2 - r1) * t;
    points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return points;
}

/** Początek łamanej o długości `length` (krótki „zaczep” mostu przy badaniu). */
export function polylinePrefix(points: readonly Point[], length: number): Point[] {
  const out: Point[] = points.length > 0 ? [points[0]!] : [];
  let left = length;
  for (let i = 1; i < points.length && left > 0; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg >= left) {
      const t = left / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      return out;
    }
    out.push(b);
    left -= seg;
  }
  return out;
}

/** Most = wymaganie z innego ramienia (rysowany inaczej niż połączenia w ramieniu). */
export function isBridge(node: ResearchNodeDef, required: ResearchNodeDef | undefined): boolean {
  return !!required && required.arm !== node.arm;
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
    case 'deposits':
      return 'mining';
    case 'asteroidOutput':
      return 'station';
    case 'transportCapacity':
    case 'travelTime':
      return 'fleet';
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
    case 'expedition':
      return 'ship';
    case 'unlock':
      return first.feature === 'colony-ship' ? 'ship' : first.feature === 'transport' ? 'fleet' : first.feature === 'asteroid-mining' || first.feature === 'comet-capture' ? 'station' : first.feature === 'crystal-complex' ? 'crystal' : first.feature === 'metal-factory' ? 'metal' : first.feature === 'specialization-change' || first.feature === 'build-ice' || first.feature === 'build-water' ? 'planet' : 'ai';
    default:
      return 'none';
  }
}
