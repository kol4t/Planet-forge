// Rejestr metod terenu (nowa metoda = nowy wpis).
import type { PlanetVisual } from '../../types.ts';
import type { SurfaceField, TerrainMethodId } from '../types.ts';
import { bakedField } from './baked.ts';
import { erosionRecipe } from './erosion.ts';
import { fracturedRecipe } from './fractured.ts';
import { legacyField } from './legacy.ts';
import { tectonicRecipe } from './tectonic.ts';

export const TERRAIN_METHODS: Record<TerrainMethodId, (visual: PlanetVisual) => SurfaceField> = {
  legacy: legacyField,
  tectonic: (v) => bakedField(v, 'tectonic', tectonicRecipe(v)),
  erosion: (v) => bakedField(v, 'erosion', erosionRecipe(v)),
  fractured: (v) => bakedField(v, 'fractured', fracturedRecipe(v)),
};

export const TERRAIN_METHOD_IDS = Object.keys(TERRAIN_METHODS) as TerrainMethodId[];
