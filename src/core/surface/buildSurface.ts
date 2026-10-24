// Model powierzchni na siatce: wysokość → ciecz → materiał (+ statystyki i walidacja).
// Ciężkie kroki (hydrologia, lawa, erozja — kolejne etapy) liczone raz, przy generowaniu.
import type { MaterialBand, Planet } from '../types.ts';
import { createSurfaceField } from './field.ts';
import { sphereGrid } from './grid.ts';
import { LIQUID, MATERIALS, type LiquidCode, type MaterialId, type SurfaceField, type SurfaceModel } from './types.ts';

/** Siatka modelu dla widoku planety (= siatka lądu 3D, `SURFACE_DETAIL`). */
export const MODEL_DETAIL = 40;

const MATERIAL_CODE = Object.fromEntries(MATERIALS.map((id, i) => [id, i])) as Record<MaterialId, number>;

/** Pasma lądu sprzed profili (v0.18–v0.22): brzeg → nizina → wyżyna → szczyt. */
export const DEFAULT_BANDS: readonly MaterialBand[] = [
  { upTo: 0.03, material: 'shore', color: '#b8a77e' },
  { upTo: 0.3, material: 'lowland', color: '#4f6b4b' },
  { upTo: 0.6, material: 'highland', color: '#7b6a54' },
  { upTo: 1, material: 'peak', color: '#dcd5c6' },
];

/** Klasyfikacja punktu (wspólna dla siatki i próbkowania ciągłego); ląd według pasm profilu. */
export function classifyPoint(
  field: SurfaceField,
  h: number,
  x: number,
  y: number,
  z: number,
  bands: readonly MaterialBand[] = DEFAULT_BANDS,
): { liquid: LiquidCode; material: MaterialId } {
  const sea = field.seaLevel;
  const icy = field.ice(h, x, y, z) > 0.5;
  if (h < sea) {
    if (icy) return { liquid: LIQUID.frozenSea, material: 'seaIce' };
    return { liquid: LIQUID.ocean, material: h > sea - 0.07 ? 'shallowWater' : 'deepWater' };
  }
  const inland = field.inland;
  if (inland) {
    const lake = inland.lakeLevel(x, y, z) >= 0;
    if (inland.lava(x, y, z) >= 0.5 || (lake && inland.lavaLakes)) return { liquid: LIQUID.lava, material: 'lava' };
    if (lake) return { liquid: LIQUID.lake, material: icy ? 'seaIce' : 'shallowWater' };
    if (inland.river(x, y, z) >= 0.5) return { liquid: LIQUID.river, material: icy ? 'glacier' : 'shallowWater' };
  }
  if (icy) return { liquid: LIQUID.none, material: 'glacier' };
  const t = (h - sea) / (1 - sea);
  for (const band of bands) if (t < band.upTo) return { liquid: LIQUID.none, material: band.material };
  return { liquid: LIQUID.none, material: bands[bands.length - 1]!.material };
}

/** Model powierzchni planety na siatce o szczegółowości `detail`. */
export function buildSurface(planet: Planet, detail = MODEL_DETAIL): SurfaceModel {
  const started = performance.now();
  const field = createSurfaceField(planet.visual);
  const grid = sphereGrid(detail);
  const { count, nodes } = grid;
  const height = new Float32Array(count);
  const liquid = new Uint8Array(count);
  const material = new Uint8Array(count);
  let land = 0;
  let ocean = 0;
  let frozenSea = 0;
  let lake = 0;
  let river = 0;
  let lava = 0;
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  for (let i = 0; i < count; i++) {
    const x = nodes[i * 3]!;
    const y = nodes[i * 3 + 1]!;
    const z = nodes[i * 3 + 2]!;
    const h = field.height(x, y, z);
    const c = classifyPoint(field, h, x, y, z, planet.visual.bands);
    height[i] = h;
    liquid[i] = c.liquid;
    material[i] = MATERIAL_CODE[c.material];
    if (c.liquid === LIQUID.ocean) ocean++;
    else if (c.liquid === LIQUID.frozenSea) frozenSea++;
    else land++;
    if (c.liquid === LIQUID.lake) lake++;
    else if (c.liquid === LIQUID.river) river++;
    else if (c.liquid === LIQUID.lava) lava++;
    if (h < minHeight) minHeight = h;
    if (h > maxHeight) maxHeight = h;
  }
  return {
    version: planet.visual.surfaceVersion,
    method: field.method,
    grid,
    seaLevel: field.seaLevel,
    height,
    liquid,
    material,
    stats: {
      land: land / count,
      ocean: ocean / count,
      frozenSea: frozenSea / count,
      lake: lake / count,
      river: river / count,
      lava: lava / count,
      minHeight,
      maxHeight,
      buildMs: performance.now() - started,
    },
  };
}

/** Lista problemów modelu (pusta = poprawny): NaN/∞, zakresy, spójność cieczy z wysokością. */
export function validateSurface(model: SurfaceModel): string[] {
  const problems: string[] = [];
  const { count } = model.grid;
  if (!(model.seaLevel > 0 && model.seaLevel < 1)) problems.push(`poziom morza poza 0..1: ${model.seaLevel}`);
  if (model.height.length !== count || model.liquid.length !== count || model.material.length !== count) {
    problems.push('długości tablic różne od liczby węzłów');
    return problems;
  }
  const report = (message: string) => {
    if (problems.length < 20) problems.push(message);
  };
  const codes = new Set<number>(Object.values(LIQUID));
  for (let i = 0; i < count; i++) {
    const h = model.height[i]!;
    const liquid = model.liquid[i]!;
    const material = MATERIALS[model.material[i]!];
    if (!Number.isFinite(h) || h < 0 || h > 1) report(`węzeł ${i}: wysokość ${h}`);
    if (!codes.has(liquid)) report(`węzeł ${i}: nieznana ciecz ${liquid}`);
    if (!material) report(`węzeł ${i}: nieznany materiał ${model.material[i]}`);
    const below = h < model.seaLevel;
    // Morze tylko poniżej poziomu morza; ląd, jeziora, rzeki i lawa tylko powyżej (spójne granice).
    const sea = liquid === LIQUID.ocean || liquid === LIQUID.frozenSea;
    if (sea && !below) report(`węzeł ${i}: morze powyżej poziomu morza`);
    if (!sea && below) report(`węzeł ${i}: ląd lub woda śródlądowa poniżej poziomu morza`);
  }
  return problems;
}
