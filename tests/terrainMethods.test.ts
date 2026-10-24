import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { createRng } from '../src/core/random/rng.ts';
import { buildSurface, validateSurface } from '../src/core/surface/buildSurface.ts';
import { bakeCube, sampleCube } from '../src/core/surface/cube.ts';
import { DEFAULT_EROSION, erode, erosionRecipe, EROSION_DETAIL } from '../src/core/surface/methods/erosion.ts';
import { TERRAIN_METHOD_IDS, TERRAIN_METHODS } from '../src/core/surface/methods/index.ts';
import { surfaceMetrics, type SurfaceMetrics } from '../src/core/surface/metrics.ts';
import { sphereGrid } from '../src/core/surface/grid.ts';
import type { TerrainMethodId } from '../src/core/surface/types.ts';
import type { Planet } from '../src/core/types.ts';
import { findDefinition, PLANET_DEFINITIONS } from '../src/data/planets.ts';
import { discLook, renderDisc } from '../src/planet-renderer/discRenderer.ts';

const NEW_METHODS = ['tectonic', 'erosion', 'fractured'] as const satisfies readonly TerrainMethodId[];

const withMethod = (planet: Planet, method: TerrainMethodId): Planet => ({ ...planet, visual: { ...planet.visual, terrainMethod: method } });

const randomDirs = (n: number, seed: string) => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => {
    const z = rng.range(-1, 1);
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(1 - z * z);
    return [r * Math.cos(a), z, r * Math.sin(a)] as const;
  });
};

test('metody terenu: rejestr; planeta dostaje metodę dozwoloną przez swój profil', () => {
  assert.deepEqual([...TERRAIN_METHOD_IDS].sort(), ['erosion', 'fractured', 'legacy', 'tectonic']);
  for (const def of PLANET_DEFINITIONS) {
    const allowed = def.surface.profile.methods.map((m) => m.id);
    for (const seed of ['PF-M-1', 'PF-M-2', 'PF-M-3']) {
      const method = generatePlanet(def, seed).visual.terrainMethod;
      assert.ok(allowed.includes(method), `${def.id}: ${method}`);
    }
  }
});

test('metody terenu: deterministyczne (dwa niezależne pieczenia = te same wysokości)', () => {
  const planet = generatePlanet(findDefinition('kepler-186f')!, 'PF-DET');
  for (const method of NEW_METHODS) {
    const v = withMethod(planet, method).visual;
    const a = TERRAIN_METHODS[method](v);
    const b = TERRAIN_METHODS[method](v);
    for (const [x, y, z] of randomDirs(200, `det-${method}`)) {
      assert.equal(a.height(x, y, z), b.height(x, y, z), method);
      assert.equal(a.ice(0.6, x, y, z), b.ice(0.6, x, y, z), method);
    }
  }
});

test('metody terenu: zmieniają kształt, nie udział lądu (jak teren legacy tej planety)', () => {
  for (const def of PLANET_DEFINITIONS) {
    const planet = generatePlanet(def, 'PF-LAND');
    const legacy = buildSurface(withMethod(planet, 'legacy'), 16);
    for (const method of NEW_METHODS) {
      const model = buildSurface(withMethod(planet, method), 16);
      assert.deepEqual(validateSurface(model), [], `${def.id} ${method}`);
      assert.ok(Math.abs(model.stats.land - legacy.stats.land) < 0.04, `${def.id} ${method}: ląd ${model.stats.land} wobec ${legacy.stats.land}`);
      assert.notDeepEqual(model.height, legacy.height);
    }
  }
});

test('metody terenu: różnią się metrykami, kratery i uskoki najbardziej „poszarpane”', () => {
  const avg: Record<string, SurfaceMetrics> = {};
  const seeds = ['PF-MET-1', 'PF-MET-2', 'PF-MET-3'];
  for (const method of NEW_METHODS) {
    const sum = { land: 0, spread: 0, roughness: 0, chaos: 0, spike: 0, flat: 0 };
    for (const seed of seeds) {
      const m = surfaceMetrics(buildSurface(withMethod(generatePlanet(findDefinition('kepler-186f')!, seed), method), 24));
      for (const key of Object.keys(sum) as (keyof SurfaceMetrics)[]) sum[key] += m[key] / seeds.length;
    }
    avg[method] = sum;
  }
  const keys = ['roughness', 'chaos', 'flat'] as const;
  for (let i = 0; i < NEW_METHODS.length; i++) {
    for (let j = i + 1; j < NEW_METHODS.length; j++) {
      const a = avg[NEW_METHODS[i]!]!;
      const b = avg[NEW_METHODS[j]!]!;
      const differs = keys.some((k) => Math.max(a[k], b[k]) > 1.3 * Math.min(a[k], b[k]));
      assert.ok(differs, `${NEW_METHODS[i]} i ${NEW_METHODS[j]} mają podobne metryki: ${JSON.stringify([a, b])}`);
    }
  }
  assert.ok(avg.fractured!.chaos > 1.5 * Math.max(avg.tectonic!.chaos, avg.erosion!.chaos));
  assert.ok(avg.tectonic!.flat > 1.3 * avg.fractured!.flat, 'płyty mają rozległe równiny');
});

test('metody terenu: brak igieł na pełnej siatce planety i czas pieczenia', (t) => {
  for (const def of PLANET_DEFINITIONS) {
    const planet = generatePlanet(def, 'PF-SPIKE');
    const started = performance.now();
    TERRAIN_METHODS[planet.visual.terrainMethod](planet.visual);
    const bakeMs = performance.now() - started;
    const model = buildSurface(planet);
    const { spike } = surfaceMetrics(model);
    t.diagnostic(`${def.id} (${planet.visual.terrainMethod}): pieczenie ${bakeMs.toFixed(0)} ms, igła ${spike.toFixed(3)}`);
    assert.ok(spike < 0.2, `${def.id}: igła ${spike}`);
    assert.ok(bakeMs < 1000, `${def.id}: pieczenie ${bakeMs} ms`);
  }
});

test('erozja: wygładza stoki i wcina doliny, które płyną w dół', () => {
  const planet = generatePlanet(findDefinition('arid')!, 'PF-ERO');
  const recipe = erosionRecipe(planet.visual);
  const grid = sphereGrid(EROSION_DETAIL);
  const base = new Float32Array(grid.count);
  for (let i = 0; i < grid.count; i++) base[i] = recipe.base(grid.nodes[i * 3]!, grid.nodes[i * 3 + 1]!, grid.nodes[i * 3 + 2]!);
  const sea = base.slice().sort()[Math.floor(grid.count * 0.2)]!;
  const roughness = (h: Float32Array) => {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < grid.count; i++) {
      for (let k = grid.neighborStart[i]!; k < grid.neighborStart[i + 1]!; k++) {
        sum += Math.abs(h[i]! - h[grid.neighbors[k]!]!);
        n++;
      }
    }
    return sum / n;
  };
  const eroded = base.slice();
  erode(grid, eroded, sea, { ...DEFAULT_EROSION, valleys: 0 });
  assert.ok(roughness(eroded) < roughness(base) * 0.9, 'stoki łagodniejsze');
  const carved = eroded.slice();
  erode(grid, carved, sea, { ...DEFAULT_EROSION, iterations: 0 });
  let deepened = 0;
  for (let i = 0; i < grid.count; i++) {
    assert.ok(carved[i]! <= eroded[i]! + 1e-7, 'doliny tylko obniżają teren');
    if (eroded[i]! - carved[i]! > DEFAULT_EROSION.valleys * 0.5) deepened++;
  }
  assert.ok(deepened > 50, `za mało dolin: ${deepened}`);
});

test('mapa sześcienna: wierna i bez szwów na krawędziach ścian', () => {
  const fn = (x: number, y: number, z: number) => 0.5 + 0.2 * x - 0.3 * y + 0.1 * z * x;
  const cube = bakeCube(48, fn);
  for (const [x, y, z] of randomDirs(500, 'cube')) assert.ok(Math.abs(sampleCube(cube, x, y, z) - fn(x, y, z)) < 0.003);
  // Tuż po obu stronach krawędzi ściany +x / +z (x = z).
  for (const y of [-0.5, 0, 0.3]) {
    const e = 1e-4;
    const a = [1 / Math.SQRT2 + e, y, 1 / Math.SQRT2 - e] as const;
    const b = [1 / Math.SQRT2 - e, y, 1 / Math.SQRT2 + e] as const;
    assert.ok(Math.abs(sampleCube(cube, ...a) - sampleCube(cube, ...b)) < 0.004);
  }
});

test('widok 2D rysuje planety każdej metody (bez NaN, pełna tarcza)', () => {
  for (const method of TERRAIN_METHOD_IDS) {
    const planet = withMethod(generatePlanet(findDefinition('volcanic')!, 'PF-2D'), method);
    const data = new Uint8ClampedArray(32 * 32 * 4);
    renderDisc(data, 32, discLook(planet), 0.4, 0.2);
    const centre = (16 * 32 + 16) * 4;
    assert.equal(data[centre + 3], 255, method);
    assert.ok(data.every((v) => Number.isFinite(v)));
  }
});
