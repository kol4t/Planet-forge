import type { BuildingId, BuildingLevels, Planet } from '../core/types.ts';
import type { Plots } from '../core/colony/plots.ts';
import type { Complex } from '../core/colony/complexes.ts';
import type { StructureHit } from './pick.ts';

export type { StructureHit };

/** JEDYNY interfejs między Phaser (UI) a rendererem planety. */
export interface PlanetDisplay {
  readonly kind: 'webgl' | 'canvas2d';
  setPlanet(planet: Planet): void;
  /**
   * Poziomy budynków → widoczna zabudowa kolonii, plus rusztowanie trwającej budowy.
   * Wywołuj śmiało co klatkę/odświeżenie (porównuje zmiany).
   */
  setStructures(levels: BuildingLevels, site?: BuildSite | null, plots?: Plots, complexes?: readonly Complex[]): void;
  /** Budowla pod punktem (x, y w pikselach CSS) albo null — wybór budynku dotknięciem (przy każdym przybliżeniu). */
  pickStructure(x: number, y: number): StructureHit | null;
  /**
   * Płynnie obróć planetę do budowli: konkretnej (`index`) albo najnowszej danego typu / placu budowy.
   * Zwraca false, gdy na planecie nie ma jeszcze takiej budowli.
   */
  showBuilding(id: BuildingId, index?: number): boolean;
  beginDrag(): void;
  drag(dx: number, dy: number): void;
  endDrag(): void;
  /** Przybliżenie (1 = cała planeta, maks. ok. 3,5). Planeta rośnie wokół swojego środka. */
  /** `instant` — bez płynnego dojścia (np. przywrócenie widoku po przełączeniu 2D ↔ 3D). */
  setZoom(zoom: number, instant?: boolean): void;
  /** Skala rozdzielczości 3D 0,6–1 (automatyczna, diagnostyka); brak = widok 2D. */
  renderScale?(): number;
  /** Docelowe przybliżenie (to, do którego widok dochodzi). */
  zoomLevel(): number;
  /** Pokaż / ukryj siatkę pól (Ustawienia → Widok). */
  setGridVisible(visible: boolean): void;
  /** Wstrzymaj autoobrót (pokazany budynek nie ucieka z kadru); dotyk albo reset go zwalnia. */
  holdSpin(hold: boolean): void;
  /** Płynny powrót do widoku startowego: przybliżenie 1×, biegun u góry. */
  resetView(): void;
  /** Bieżący obrót planety (rad) — dla paralaksy tła kosmosu. */
  orientation(): { yaw: number; pitch: number };
  /** Ustaw obrót od razu, bez animacji i bezwładności (np. po przełączeniu 2D ↔ 3D). */
  setOrientation(yaw: number, pitch: number): void;
    /** Środek i promień planety w pikselach CSS. */
  setFocus(cx: number, cy: number, r: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

/** Trwająca budowa widziana przez renderer. */
export interface BuildSite {
  building: BuildingId;
  targetLevel: number;
  /** Postęp 0..1. */
  progress: number;
}

/** Kolory budowli (wspólne dla 3D i 2D). */
export const STRUCTURE_COLORS: Record<BuildingId, { body: string; light: string }> = {
  metalMine: { body: '#b3a58b', light: '#ffd28a' },
  crystalMine: { body: '#5e8f88', light: '#8ff5e2' },
  powerPlant: { body: '#c9b27a', light: '#ffcc55' },
  storage: { body: '#8f9c98', light: '#f2e2b0' },
  antimatterCollector: { body: '#6f7d84', light: '#c9b8ff' },
  laboratory: { body: '#9fb7c4', light: '#f4f0e0' },
};

/**
 * O ile budowla ma stać nad środkiem tarczy: przy 1× wyraźnie wyżej (widać ją na tle planety),
 * przy przybliżeniu prawie w środku — inaczej ucieka z kadru.
 */
export function focusLift(zoom: number): number {
  return 0.45 / Math.max(1, zoom) ** 2;
}

/**
 * Orientacja (yaw, pitch) pokazująca punkt `dir` planety: na wprost w poziomie,
 * a w pionie o `lift` powyżej środka tarczy, by budowle było widać lekko z boku.
 */
export function facingAngles(dir: readonly [number, number, number], axialTiltRad: number, lift = 0.45): { yaw: number; pitch: number } {
  const [x, y, z] = dir;
  const zr = Math.hypot(x, z);
  // Obrót wokół osi (yaw), potem nachylenie osi (tilt, wokół Z), potem pochylenie (pitch, wokół X) —
  // jak w rendererach. Yaw dobrany tak, by po nachyleniu punkt był dokładnie na środku w poziomie:
  // x po obrocie = zr·sin(yaw − a) musi równać się y·tg(tilt).
  const a = Math.atan2(-x, z);
  const t = Math.tan(axialTiltRad);
  const shift = zr > 1e-9 ? Math.asin(Math.max(-1, Math.min(1, (y * t) / zr))) : 0;
  const yaw = a + shift;
  const x1 = zr * Math.sin(shift);
  const z1 = zr * Math.cos(shift);
  const y2 = x1 * Math.sin(axialTiltRad) + y * Math.cos(axialTiltRad);
  return { yaw, pitch: Math.atan2(y2, z1) - lift };
}
