// Widok układu (plan „widok układu”, etap C) — czysta matematyka, bez rysowania (testowalna w Node):
// położenia obiektów na orbitach z czasu świata (te same co na Mapie), kamera (środek + skala) z płynnym lotem,
// trafienie dotykiem z powiększoną strefą (cel ≥ 44 pt). Rysuje `systemView.ts`.
import { orbitAngle, systemPeriods } from '../core/galaxy/orbits.ts';

/** Nachylenie płaszczyzny orbit (elipsa — układ widziany pod kątem). */
export const SYSTEM_TILT = 0.42;
/** Najmniejszy promień trafienia dotykiem (pt) — małe obiekty mają większą strefę niż rysunek. */
export const MIN_HIT_PT = 22;

export interface OrbitBody {
  address: string;
  /** Orbita w j.a. (do okresu obiegu). */
  orbit: number;
  /** Faza początkowa (rad). */
  phase: number;
}

export interface PlacedBody {
  address: string;
  /** Położenie względem gwiazdy w jednostkach widoku (1 = promień najdalszej orbity). */
  x: number;
  y: number;
  /** Promień orbity (jednostki widoku). */
  r: number;
  /** −1..1: ujemne = za gwiazdą (rysowane przed nią i mniejsze). */
  depth: number;
}

/** Promienie orbit w jednostkach widoku: równe odstępy od 0,22 do 1 (czytelnie, jak na Mapie). */
export function orbitRadii(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0.6];
  return Array.from({ length: count }, (_, i) => 0.22 + (0.78 * i) / (count - 1));
}

/** Położenia obiektów w chwili `now` (ms czasu świata) — deterministycznie z adresu i czasu. */
export function placeBodies(bodies: readonly OrbitBody[], now: number): PlacedBody[] {
  const periods = systemPeriods(bodies.map((b) => b.orbit));
  const radii = orbitRadii(bodies.length);
  return bodies.map((b, i) => {
    const a = orbitAngle(b.phase, periods[i]!, now);
    const r = radii[i]!;
    return { address: b.address, x: Math.cos(a) * r, y: Math.sin(a) * r * SYSTEM_TILT, r, depth: Math.sin(a) };
  });
}

/** Kamera: środek (jednostki widoku) i skala (piksele na jednostkę). */
export interface SystemCamera {
  cx: number;
  cy: number;
  scale: number;
}

/** Kamera pokazująca cały układ w prostokącie (z marginesem na etykiety). */
export function fitCamera(width: number, height: number): SystemCamera {
  const scale = Math.max(1, Math.min(width / 2.3, height / (2 * SYSTEM_TILT + 0.7)));
  return { cx: 0, cy: 0, scale };
}

/** Punkt widoku → ekran (piksele względem środka prostokąta). */
export function toScreen(cam: SystemCamera, x: number, y: number): { x: number; y: number } {
  return { x: (x - cam.cx) * cam.scale, y: (y - cam.cy) * cam.scale };
}

/** Wygładzenie lotu (ease-in-out, 0..1). */
export function ease(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}

/** Kamera w trakcie lotu: środek liniowo, skala geometrycznie (równe tempo przybliżania). */
export function lerpCamera(a: SystemCamera, b: SystemCamera, t: number): SystemCamera {
  const k = ease(t);
  return { cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, scale: a.scale * (b.scale / a.scale) ** k };
}

/**
 * Obiekt pod palcem (`sx`, `sy` — piksele względem środka prostokąta) albo null. Strefa trafienia = większa z: promienia
 * rysunku i `MIN_HIT_PT` × `ptToPx`; przy kilku — najbliższy środkowi.
 */
export function pickBody(
  placed: readonly PlacedBody[],
  cam: SystemCamera,
  sx: number,
  sy: number,
  drawRadiusPx: number,
  ptToPx: number,
): string | null {
  const reach = Math.max(drawRadiusPx, MIN_HIT_PT * ptToPx);
  let best: { address: string; d: number } | null = null;
  for (const p of placed) {
    const s = toScreen(cam, p.x, p.y);
    const d = Math.hypot(s.x - sx, s.y - sy);
    if (d <= reach && (!best || d < best.d)) best = { address: p.address, d };
  }
  return best?.address ?? null;
}
