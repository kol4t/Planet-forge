import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { buildSurface, validateSurface } from '../src/core/surface/buildSurface.ts';
import { sphereGrid } from '../src/core/surface/grid.ts';
import { computeHydrology, DEFAULT_HYDROLOGY, type HydrologyParams } from '../src/core/surface/hydrology.ts';
import { HYDROLOGY_DETAIL } from '../src/core/surface/methods/baked.ts';
import { TERRAIN_METHODS } from '../src/core/surface/methods/index.ts';
import { LIQUID } from '../src/core/surface/types.ts';
import { findDefinition } from '../src/data/planets.ts';
import { createSurfaceSampler } from '../src/planet-renderer/surface.ts';

const grid = sphereGrid(12);
const water: HydrologyParams = { ...DEFAULT_HYDROLOGY, liquid: 'water', riverFlow: 20 };

/** Teren testowy: morze na półkuli „dolnej”, na górnej dwie misy rozdzielone grzbietem. */
function bowls(): Float32Array {
  const h = new Float32Array(grid.count);
  for (let i = 0; i < grid.count; i++) {
    const x = grid.nodes[i * 3]!;
    const y = grid.nodes[i * 3 + 1]!;
    const z = grid.nodes[i * 3 + 2]!;
    // Grzbiet wzdłuż x = 0, misy przy (±0,5, 0,7, 0), łagodny spadek ku morzu (y < 0).
    const bowlA = Math.max(0, 0.25 - ((x - 0.5) ** 2 + (y - 0.75) ** 2 + z * z)) * 1.2;
    const bowlB = Math.max(0, 0.25 - ((x + 0.5) ** 2 + (y - 0.75) ** 2 + z * z)) * 0.8;
    const ridge = Math.max(0, 0.08 - x * x) * 2;
    h[i] = 0.5 + 0.25 * y + ridge - bowlA - bowlB;
  }
  return h;
}

test('hydrologia: jezioro ma płaskie lustro, a woda nie przelewa się przez grzbiet', () => {
  const h = bowls();
  const hydro = computeHydrology(grid, h, 0.4, water);
  assert.ok(hydro.lakes >= 1, 'brak jezior');
  for (let i = 0; i < grid.count; i++) {
    const level = hydro.lakeLevel[i]!;
    if (level < 0) continue;
    assert.ok(level > h[i]!, 'lustro nad dnem');
    // Sąsiad w tym samym jeziorze ma to samo lustro; sąsiad poza jeziorem leży nie niżej niż lustro.
    for (let k = grid.neighborStart[i]!; k < grid.neighborStart[i + 1]!; k++) {
      const n = grid.neighbors[k]!;
      if (hydro.lakeLevel[n]! >= 0) assert.equal(hydro.lakeLevel[n], level);
      else assert.ok(h[n]! >= level - 1e-6 || h[n]! < 0.4, `woda przecieka do węzła ${n}`);
    }
  }
  // Dwie misy za grzbietem mają różne lustra (każda przelewa się własną przełęczą).
  const levels = new Set([...hydro.lakeLevel].filter((l) => l >= 0));
  assert.ok(levels.size >= 2, `lustra: ${[...levels].join(', ')}`);
});

test('hydrologia: rzeki płyną w dół i kończą się w morzu albo jeziorze', () => {
  const planet = generatePlanet(findDefinition('kepler-186f')!, 'PF-RIVER');
  const field = TERRAIN_METHODS.erosion(planet.visual);
  const g = sphereGrid(HYDROLOGY_DETAIL);
  const h = new Float32Array(g.count);
  for (let i = 0; i < g.count; i++) h[i] = field.height(g.nodes[i * 3]!, g.nodes[i * 3 + 1]!, g.nodes[i * 3 + 2]!);
  const sea = planet.visual.seaLevel;
  const hydro = computeHydrology(g, h, sea, { ...planet.visual.hydrology, liquid: 'water' });
  assert.ok(hydro.riverNodes > 20, `rzek: ${hydro.riverNodes}`);
  for (let i = 0; i < g.count; i++) {
    if (hydro.river[i]! < 0.5) continue;
    let cur = i;
    // Woda płynie po powierzchni po zalaniu zagłębień (lustro jeziora, kałuży albo grunt).
    let lastLevel = hydro.filled[i]!;
    for (let steps = 0; ; steps++) {
      assert.ok(steps < g.count, 'pętla w sieci spływu');
      const next = hydro.down[cur]!;
      if (next < 0 || h[next]! < sea || hydro.lakeLevel[next]! >= 0) break;
      const level = hydro.filled[next]!;
      assert.ok(level <= lastLevel + 1e-6, 'rzeka płynie pod górę');
      lastLevel = level;
      cur = next;
    }
    const end = hydro.down[cur]!;
    assert.ok(end < 0 ? h[cur]! < sea || hydro.lakeLevel[cur]! >= 0 : h[end]! < sea || hydro.lakeLevel[end]! >= 0, 'rzeka nie dochodzi do wody');
  }
});

test('hydrologia: lawa tylko przy źródłach, nigdy wyżej niż źródło; brak cieczy na planecie jałowej', () => {
  const h = bowls();
  const hydro = computeHydrology(grid, h, 0.4, { ...water, liquid: 'lava', lavaSources: 3 });
  let streams = 0;
  let top = -Infinity;
  for (let i = 0; i < grid.count; i++) {
    if (hydro.lava[i]! >= 0.99) {
      streams++;
      top = Math.max(top, h[i]!);
    }
  }
  assert.ok(streams >= 1 && streams <= 3, `źródeł: ${streams}`);
  for (let i = 0; i < grid.count; i++) if (hydro.lava[i]! > 0) assert.ok(h[i]! <= top + 1e-6 || hydro.lakeLevel[i]! >= 0);
  assert.equal([...hydro.river].filter((r) => r > 0).length, 0, 'na planecie z lawą nie ma rzek wody');

  const dry = computeHydrology(grid, h, 0.4, { ...water, liquid: 'none' });
  assert.equal(dry.lakes, 0);
  assert.equal([...dry.river, ...dry.lava].filter((v) => v > 0).length, 0);
  const barren = generatePlanet(findDefinition('barren')!, 'PF-DRY');
  assert.equal(TERRAIN_METHODS[barren.visual.terrainMethod](barren.visual).inland, undefined);
});

test('hydrologia w modelu powierzchni: jeziora i rzeki na lądzie, lawa na planecie wulkanicznej', () => {
  const terrestrial = generatePlanet(findDefinition('kepler-186f')!, 'PF-HYDRO');
  const wet = buildSurface({ ...terrestrial, visual: { ...terrestrial.visual, terrainMethod: 'erosion' } });
  assert.deepEqual(validateSurface(wet), []);
  assert.ok(wet.stats.river > 0, 'brak rzek');
  assert.ok(!wet.liquid.includes(LIQUID.lava));
  const volcanic = buildSurface(generatePlanet(findDefinition('volcanic')!, 'PF-HYDRO'));
  assert.deepEqual(validateSurface(volcanic), []);
  assert.ok(volcanic.stats.lava > 0, 'brak lawy');
  assert.equal(volcanic.stats.river, 0);
  // Budowle nie stają w jeziorach, rzekach ani w lawie.
  const sampler = createSurfaceSampler({ ...terrestrial, visual: { ...terrestrial.visual, terrainMethod: 'erosion' } });
  const n = wet.grid.nodes;
  let checked = 0;
  for (let i = 0; i < wet.grid.count; i++) {
    if (wet.liquid[i] !== LIQUID.lake && wet.liquid[i] !== LIQUID.river) continue;
    const x = n[i * 3]!;
    const y = n[i * 3 + 1]!;
    const z = n[i * 3 + 2]!;
    assert.equal(sampler.isLand(sampler.height(x, y, z), x, y, z), false);
    checked++;
  }
  assert.ok(checked > 0);
});
