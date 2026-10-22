// Ciągłe pole terenu planety: wysokość i lód w dowolnym punkcie sfery.
// Algorytmy są w `methods/` (rejestr `methods/index.ts`); tu wybór metody i pamięć gotowych pól.
import type { PlanetVisual } from '../types.ts';
import { TERRAIN_METHODS } from './methods/index.ts';
import type { SurfaceField } from './types.ts';

/** Ile gotowych pól trzymać (planeta, miniatury, sąsiedzi na niebie, mapa układu). */
const CACHE_SIZE = 24;
const cache = new Map<string, SurfaceField>();

const keyOf = (v: PlanetVisual) =>
  [v.terrainMethod, v.surfaceVersion, v.noiseSeed, v.seaLevel, v.terrainScale, v.polarCap].join('|');

/** Pole terenu planety. Pola nowych metod są „pieczone” raz (kilkadziesiąt ms) — stąd pamięć podręczna. */
export function createSurfaceField(visual: PlanetVisual): SurfaceField {
  const key = keyOf(visual);
  let field = cache.get(key);
  if (field) {
    cache.delete(key);
  } else {
    field = TERRAIN_METHODS[visual.terrainMethod](visual);
    if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
  }
  cache.set(key, field);
  return field;
}
