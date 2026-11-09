// Ekran stacji (etap 1 planu stacji): wspólna matematyka wyglądu 2D i 3D — położenie modułów w gniazdach, obrót
// palcem (yaw wokół osi stacji, pitch — pochylenie ku widzowi) i rzut na ekran (do wyboru modułu dotykiem).
// Czysta matematyka, testowalna bez renderowania. Układ stacji: oś pionowa Y, pierścień w płaszczyźnie XZ,
// promień całości ok. 1 (jak promień planety).
import type { StationModuleId } from '../data/stationModules.ts';
import { socketAngle, type StationModuleView } from '../core/station/stationScreen.ts';

export type Vec3 = [number, number, number];

/** Wymiary (ułamki promienia ekranu) i kolory stacji — robocze; kolory jak interfejs (decyzja właściciela). */
export const STATION_SCREEN = {
  ring: 0.66,
  tube: 0.045,
  hub: 0.15,
  hubHeight: 0.34,
  mast: 0.82,
  /** Odległość środka modułu od osi (moduły przyczepione na zewnątrz pierścienia). */
  moduleOut: 0.8,
  /** Stałe pochylenie stacji ku widzowi (rad) — pierścień widać jako elipsę. */
  tilt: 0.5,
  stone: '#2b3735',
  steel: '#62716e',
  light: '#5ff2e0',
  gold: '#d6b25e',
  container: '#8c7b58',
} as const;

/** Punkt zaczepienia modułu (środek stacji dla rdzenia). */
export function moduleAnchor(m: Pick<StationModuleView, 'socket'>): Vec3 {
  if (m.socket === null) return [0, 0, 0];
  const a = socketAngle(m.socket);
  return [Math.cos(a) * STATION_SCREEN.moduleOut, 0, -Math.sin(a) * STATION_SCREEN.moduleOut];
}

/** Obrót jak w scenie 3D: najpierw wokół osi stacji (yaw), potem pochylenie (stałe + pitch palca). */
export function rotateStation(p: Vec3, yaw: number, pitch: number): Vec3 {
  const [x, y, z] = p;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const t = STATION_SCREEN.tilt + pitch;
  const ct = Math.cos(t);
  const st = Math.sin(t);
  return [x1, y * ct - z1 * st, y * st + z1 * ct];
}

/** Rzut na ekran (px CSS): `r` — promień 1 w pikselach (2D), albo perspektywa kamery 3D (`f`, odległość `d`). */
export interface StationProjection {
  cx: number;
  cy: number;
  r: number;
  perspective?: { f: number; d: number };
}

export function projectStation(p: Vec3, view: StationProjection): { x: number; y: number; depth: number } {
  const [x, y, z] = p;
  const k = view.perspective ? view.perspective.f / Math.max(0.05, view.perspective.d - z) : view.r;
  return { x: view.cx + x * k, y: view.cy - y * k, depth: z };
}

/**
 * Moduł pod palcem (x, y w px CSS) albo null. Najbliższy punkt zaczepienia w promieniu `radius` px; przy remisie
 * wygrywa bliższy widzowi. Rdzeń ma większe pole trafienia (cały środek stacji).
 */
export function pickStationModule(
  modules: readonly Pick<StationModuleView, 'id' | 'socket'>[],
  yaw: number,
  pitch: number,
  view: StationProjection,
  x: number,
  y: number,
  radius: number,
): StationModuleId | null {
  let best: StationModuleId | null = null;
  let bestScore = Infinity;
  for (const m of modules) {
    const s = projectStation(rotateStation(moduleAnchor(m), yaw, pitch), view);
    const reach = m.socket === null ? radius * 1.5 : radius;
    const d = Math.hypot(s.x - x, s.y - y);
    if (d > reach) continue;
    const score = d / reach - s.depth * 0.1;
    if (score < bestScore) {
      bestScore = score;
      best = m.id;
    }
  }
  return best;
}
