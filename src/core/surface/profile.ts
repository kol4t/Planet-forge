// Profil powierzchni: wygląd typu planety (profil + nadpisania definicji), wybór metody terenu
// i walidacja danych profilu.
import { createRng } from '../random/rng.ts';
import type { PlanetDefinition, SurfaceLook, SurfaceProfile } from '../types.ts';
import { TERRAIN_METHOD_IDS } from './methods/index.ts';
import { MATERIALS, type TerrainMethodId } from './types.ts';

/** Wygląd typu planety: profil z nadpisaniami z definicji. */
export function resolveLook(def: PlanetDefinition): SurfaceLook {
  return { ...def.surface.profile.look, ...def.visual };
}

/** Metody terenu dozwolone dla typu planety (z wagami). */
export function methodsOf(def: PlanetDefinition) {
  return def.surface.methods ?? def.surface.profile.methods;
}

/**
 * Metoda terenu planety — losowana z wag profilu w osobnym strumieniu (seed + typ),
 * więc nie zmienia żadnych innych losowań planety.
 */
export function pickTerrainMethod(def: PlanetDefinition, seed: string): TerrainMethodId {
  return createRng(`${def.id}|${seed}|surface-method`).weighted(methodsOf(def)).id;
}

/** Lista problemów w danych profilu (pusta = poprawny). */
export function validateProfile(profile: SurfaceProfile): string[] {
  const problems: string[] = [];
  const name = `profil ${profile.id || '?'}`;
  if (!profile.id) problems.push(`${name}: brak id`);
  if (profile.methods.length === 0) problems.push(`${name}: brak metod terenu`);
  const seen = new Set<string>();
  for (const m of profile.methods) {
    if (!TERRAIN_METHOD_IDS.includes(m.id)) problems.push(`${name}: nieznana metoda ${m.id}`);
    if (!(m.weight > 0)) problems.push(`${name}: metoda ${m.id} — waga musi być > 0`);
    if (seen.has(m.id)) problems.push(`${name}: metoda ${m.id} powtórzona`);
    seen.add(m.id);
  }
  for (const bad of profile.incompatible ?? []) {
    if (!TERRAIN_METHOD_IDS.includes(bad.method)) problems.push(`${name}: nieznana metoda ${bad.method}`);
    if (seen.has(bad.method)) problems.push(`${name}: metoda ${bad.method} jednocześnie dozwolona i niezgodna`);
    if (!bad.reason.trim()) problems.push(`${name}: niezgodność ${bad.method} bez powodu`);
  }
  if (profile.bands.length === 0) problems.push(`${name}: brak pasm materiałów`);
  let previous = 0;
  for (const band of profile.bands) {
    if (!MATERIALS.includes(band.material)) problems.push(`${name}: nieznany materiał ${band.material}`);
    if (!(band.upTo > previous)) problems.push(`${name}: pasma muszą rosnąć (${band.material})`);
    previous = band.upTo;
  }
  if (previous < 1) problems.push(`${name}: ostatnie pasmo musi sięgać 1`);
  const [lo, hi] = profile.expect.land;
  if (!(lo >= 0 && hi <= 1 && lo <= hi)) problems.push(`${name}: zły zakres expect.land`);
  return problems;
}
