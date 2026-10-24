import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { generatePlanet, SURFACE_VERSION } from '../src/core/generation/generatePlanet.ts';
import { createRng } from '../src/core/random/rng.ts';
import { buildSurface, validateSurface } from '../src/core/surface/buildSurface.ts';
import { createSurfaceField } from '../src/core/surface/field.ts';
import { createSphereGrid, sphereGrid } from '../src/core/surface/grid.ts';
import { LIQUID } from '../src/core/surface/types.ts';
import { findDefinition, PLANET_DEFINITIONS } from '../src/data/planets.ts';
import { createSurfaceSampler } from '../src/planet-renderer/surface.ts';

const randomDirs = (n: number, seed: string) => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => {
    const z = rng.range(-1, 1);
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(1 - z * z);
    return [r * Math.cos(a), z, r * Math.sin(a)] as const;
  });
};

test('siatka: liczby węzłów i trójkątów ikosfery, 12 węzłów z 5 sąsiadami, reszta z 6', () => {
  for (const detail of [0, 3, 40]) {
    const grid = sphereGrid(detail);
    assert.equal(grid.count, 10 * (detail + 1) ** 2 + 2);
    assert.equal(grid.triangles.length / 3, 20 * (detail + 1) ** 2);
    let five = 0;
    for (let i = 0; i < grid.count; i++) {
      const n = grid.neighborStart[i + 1]! - grid.neighborStart[i]!;
      assert.ok(n === 5 || n === 6, `węzeł ${i}: ${n} sąsiadów`);
      if (n === 5) five++;
      assert.ok(Math.abs(Math.hypot(grid.nodes[i * 3]!, grid.nodes[i * 3 + 1]!, grid.nodes[i * 3 + 2]!) - 1) < 1e-6);
    }
    assert.equal(five, 12);
  }
  assert.equal(sphereGrid(40), sphereGrid(40), 'siatka jest współdzielona');
  assert.throws(() => createSphereGrid(-1));
});

test('siatka: węzły pokrywają się z wierzchołkami lądu 3D (IcosahedronGeometry)', () => {
  for (const detail of [5, 40]) {
    const grid = sphereGrid(detail);
    const pos = new THREE.IcosahedronGeometry(1, detail).getAttribute('position');
    for (let i = 0; i < pos.count; i += detail === 40 ? 7 : 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const n = grid.nearest(x, y, z);
      const d = Math.hypot(grid.nodes[n * 3]! - x, grid.nodes[n * 3 + 1]! - y, grid.nodes[n * 3 + 2]! - z);
      assert.ok(d < 1e-5, `detail ${detail}, wierzchołek ${i}: odległość ${d}`);
    }
  }
});

test('siatka: najbliższy węzeł = wynik przeszukania wszystkich węzłów', () => {
  for (const detail of [2, 16, 40]) {
    const grid = sphereGrid(detail);
    for (const [x, y, z] of randomDirs(300, `nearest-${detail}`)) {
      let best = -Infinity;
      for (let i = 0; i < grid.count; i++) {
        best = Math.max(best, grid.nodes[i * 3]! * x + grid.nodes[i * 3 + 1]! * y + grid.nodes[i * 3 + 2]! * z);
      }
      const n = grid.nearest(x, y, z);
      const got = grid.nodes[n * 3]! * x + grid.nodes[n * 3 + 1]! * y + grid.nodes[n * 3 + 2]! * z;
      assert.ok(best - got < 1e-6, `detail ${detail}: nie najbliższy węzeł`);
    }
  }
});

test('regresja: metoda legacy daje teren identyczny z v0.17 (wysokość, promień, lód, kolor)', () => {
  // Wartości zmierzone na v0.17 przed przeniesieniem algorytmu do core/surface (seed PF-SNAP).
  const expected: Record<string, number[][]> = {
    'kepler-186f': [
      [0.373656197985, 1, 0, 0.0588235294118, 0.180392156863, 0.235294117647],
      [0.601344379313, 1.00858478022, 1, 0.807450980392, 0.793725490196, 0.728235294118],
      [0.540775762004, 1, 1, 0.679726985181, 0.720973616323, 0.687855893028],
      [0.629803095154, 1.01334307751, 0, 0.309803921569, 0.419607843137, 0.294117647059],
    ],
    ice: [
      [0.631404517713, 1.01465222591, 1, 0.919533510319, 0.941082623075, 0.95404331424],
      [0.442108011872, 1, 1, 0.81567739951, 0.866050459108, 0.895747475383],
      [0.573794077459, 1.00616044702, 1, 0.920392156863, 0.941960784314, 0.954901960784],
      [0.62128720042, 1.01316093334, 0, 0.661731159738, 0.736217919608, 0.795064493072],
    ],
    volcanic: [
      [0.444575465937, 1, 0, 0.846619374151, 0.337024714191, 0.109727192312],
      [0.671040401515, 1.03598088848, 0, 0.288941506017, 0.238220680566, 0.222707450528],
      [0.482070418283, 1.00563230918, 0, 0.176470588235, 0.149019607843, 0.149019607843],
      [0.568168453963, 1.01945965371, 0, 0.184546832293, 0.155424904854, 0.154310940157],
    ],
  };
  const points = [[0.6, 0.48, 0.64], [-0.3, -0.9, 0.3162278], [0, 1, 0], [0.8, 0, -0.6]] as const;
  for (const [id, rows] of Object.entries(expected)) {
    const planet = generatePlanet(findDefinition(id)!, 'PF-SNAP');
    const sampler = createSurfaceSampler({ ...planet, visual: { ...planet.visual, terrainMethod: 'legacy' } });
    points.forEach(([x, y, z], i) => {
      const h = sampler.height(x, y, z);
      const got = [h, sampler.radius(h), sampler.ice(h, x, y, z), ...sampler.color(h, x, y, z)].map((v) => +v.toPrecision(12));
      assert.deepEqual(got, rows[i], `${id}, punkt ${i}`);
    });
  }
});

test('model powierzchni: deterministyczny, poprawny i zgodny z polem dla każdego typu planety', () => {
  for (const def of PLANET_DEFINITIONS) {
    for (const seed of ['PF-SURF-1', 'PF-SURF-2']) {
      const planet = generatePlanet(def, seed);
      const model = buildSurface(planet, 16);
      assert.equal(model.version, SURFACE_VERSION);
      assert.equal(model.method, planet.visual.terrainMethod);
      assert.deepEqual(validateSurface(model), [], `${def.id} ${seed}`);
      const again = buildSurface(planet, 16);
      assert.deepEqual(again.height, model.height);
      assert.deepEqual(again.liquid, model.liquid);
      assert.deepEqual(again.material, model.material);
      const { land, ocean, frozenSea } = model.stats;
      assert.ok(Math.abs(land + ocean + frozenSea - 1) < 1e-9);
      // Węzeł siatki = to samo co próbkowanie pola w tym punkcie (3D i 2D widzą ten sam teren).
      const field = createSurfaceField(planet.visual);
      for (let i = 0; i < model.grid.count; i += 97) {
        const n = model.grid.nodes;
        assert.equal(model.height[i], Math.fround(field.height(n[i * 3]!, n[i * 3 + 1]!, n[i * 3 + 2]!)));
      }
    }
  }
  const a = buildSurface(generatePlanet(PLANET_DEFINITIONS[0]!, 'PF-A'), 16);
  const b = buildSurface(generatePlanet(PLANET_DEFINITIONS[0]!, 'PF-B'), 16);
  assert.notDeepEqual(a.height, b.height, 'różne seedy = różne planety');
});

test('model powierzchni: pełna siatka planety i czas budowy', () => {
  const model = buildSurface(generatePlanet(PLANET_DEFINITIONS[0]!, 'PF-FULL'));
  assert.equal(model.grid.detail, 40);
  assert.deepEqual(validateSurface(model), []);
  assert.ok(model.stats.buildMs < 2000, `budowa trwała ${model.stats.buildMs} ms`);
});

test('walidacja modelu wykrywa NaN i ciecz powyżej poziomu morza', () => {
  const model = buildSurface(generatePlanet(PLANET_DEFINITIONS[0]!, 'PF-BAD'), 4);
  const land = model.liquid.findIndex((l) => l === LIQUID.none);
  const broken = { ...model, height: model.height.slice(), liquid: model.liquid.slice() };
  broken.height[0] = NaN;
  broken.liquid[land] = LIQUID.ocean;
  const problems = validateSurface(broken);
  assert.ok(problems.some((p) => p.includes('wysokość NaN')), problems.join('; '));
  assert.ok(problems.some((p) => p.includes('ciecz powyżej')), problems.join('; '));
});

test('planeta jałowa: skały i pył, prawie bez wody', () => {
  const barren = findDefinition('barren')!;
  assert.equal(barren.status, 'robocza');
  for (const seed of ['PF-J1', 'PF-J2', 'PF-J3']) {
    const model = buildSurface(generatePlanet(barren, seed), 16);
    assert.ok(model.stats.ocean + model.stats.frozenSea < 0.03, `${seed}: woda ${model.stats.ocean}`);
  }
});
