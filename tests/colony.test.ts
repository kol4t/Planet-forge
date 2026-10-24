import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import type { BuildingId } from '../src/core/types.ts';
import { PLANET_DEFINITIONS } from '../src/data/planets.ts';
import { fieldGrid } from '../src/core/colony/fieldGrid.ts';
import { reconcilePlots } from '../src/core/colony/plots.ts';
import { angleBetween, layoutFromPlots, offsetOnSphere, visibleStructures } from '../src/planet-renderer/colony.ts';
import { facingAngles } from '../src/planet-renderer/PlanetDisplay.ts';
import { createSurfaceSampler } from '../src/planet-renderer/surface.ts';

const IDS: BuildingId[] = ['metalMine', 'crystalMine', 'powerPlant', 'storage', 'antimatterCollector'];

test('kolejny poziom = kolejna budowla (każda na swoim polu)', () => {
  assert.equal(visibleStructures(0), 0);
  assert.equal(visibleStructures(1), 1);
  assert.equal(visibleStructures(40), 40);
});

test('offsetOnSphere zachowuje odległość kątową', () => {
  const c: [number, number, number] = [0, 0.6, 0.8];
  for (const d of [0.01, 0.1, 0.5]) assert.ok(Math.abs(angleBetween(c, offsetOnSphere(c, 1.3, d)) - d) < 1e-9);
});

for (const def of PLANET_DEFINITIONS) {
  test(`kolonia: ${def.id} — grupy do 3 budowli na swoich polach, deterministyczne, bez nakładania`, () => {
    for (const seed of ['PF-COL-1', 'PF-COL-2']) {
      const planet = generatePlanet(def, seed);
      const grid = fieldGrid(planet);
      const levels = { metalMine: 4, crystalMine: 3, powerPlant: 3, storage: 2, antimatterCollector: 1, laboratory: 0 };
      const plots = reconcilePlots(grid, {}, levels, IDS);
      const sampler = createSurfaceSampler(planet);
      const a = layoutFromPlots(grid, plots, sampler, IDS);
      assert.deepEqual(a, layoutFromPlots(grid, plots, createSurfaceSampler(planet), IDS));
      const all = IDS.flatMap((id) => a.slots[id]);
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) assert.ok(angleBetween(all[i]!.dir, all[j]!.dir) > 0.01, 'budowle się nie nakładają');
      }
      for (const id of IDS) {
        // Każda budowla ma swoje miejsce: 3 na pole (ostatnie pole może być niepełne).
        assert.equal(a.slots[id].length, (plots[id] ?? []).length * 3);
        for (const cell of plots[id] ?? []) {
          const kind = grid.cells[cell]!.kind;
          assert.ok(kind === 'land' || (id === 'crystalMine' && kind === 'ice'), `${seed} ${id}: budowla na ${kind}`);
        }
      }
      for (const s of all) assert.ok(s.surface >= 1 && s.surface < 1.1);
    }
  });
}

test('facingAngles kieruje punkt do kamery (+z)', () => {
  const dir: [number, number, number] = [0.6, 0, -0.8];
  const { yaw } = facingAngles(dir, 0);
  // Obrót wokół Y o yaw: x' = x cos + z sin, z' = -x sin + z cos.
  const x = dir[0] * Math.cos(yaw) + dir[2] * Math.sin(yaw);
  const z = -dir[0] * Math.sin(yaw) + dir[2] * Math.cos(yaw);
  assert.ok(Math.abs(x) < 1e-9 && z > 0.99);
});
