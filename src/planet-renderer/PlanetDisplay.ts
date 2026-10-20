import type { BuildingId, BuildingLevels, Planet } from '../core/types.ts';

/** JEDYNY interfejs między Phaser (UI) a rendererem planety. */
export interface PlanetDisplay {
  readonly kind: 'webgl' | 'canvas2d';
  setPlanet(planet: Planet): void;
  /**
   * Poziomy budynków → widoczna zabudowa kolonii, plus rusztowanie trwającej budowy.
   * Wywołuj śmiało co klatkę/odświeżenie (porównuje zmiany).
   */
  setStructures(levels: BuildingLevels, site?: BuildSite | null): void;
  /** Obróć planetę tak, by pokazać budowle danego typu (np. po ulepszeniu). */
  showBuilding(id: BuildingId): void;
  beginDrag(): void;
  drag(dx: number, dy: number): void;
  endDrag(): void;
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
};

/**
 * Orientacja (yaw, pitch) pokazująca punkt `dir` planety: na wprost w poziomie,
 * a w pionie nieco powyżej środka tarczy, by budowle było widać lekko z boku.
 */
export function facingAngles(dir: readonly [number, number, number], axialTiltRad: number): { yaw: number; pitch: number } {
  const [x, y, z] = dir;
  const yaw = Math.atan2(-x, z);
  const zr = Math.hypot(x, z);
  // Po obrocie yaw punkt leży w płaszczyźnie YZ; nachylenie osi lekko go przesuwa.
  const yTilted = y * Math.cos(axialTiltRad);
  return { yaw, pitch: Math.atan2(yTilted, zr) - 0.45 };
}
