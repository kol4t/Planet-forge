import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import type { BuildingId } from '../src/core/types.ts';
import { PLANET_DEFINITIONS } from '../src/data/planets.ts';
import {
  MAX_STRUCTURES,
  angleBetween,
  layoutColony,
  offsetOnSphere,
  structureScale,
  visibleStructures,
} from '../src/planet-renderer/colony.ts';
import { facingAngles } from '../src/planet-renderer/PlanetDisplay.ts';
import { createSurfaceSampler } from '../src/planet-renderer/surface.ts';

const IDS: BuildingId[] = ['metalMine', 'crystalMine', 'powerPlant'];

test('kolejny poziom = kolejna budowla, potem budowle rosną', () => {
  assert.equal(visibleStructures(0), 0);
  assert.equal(visibleStructures(1), 1);
  assert.equal(visibleStructures(4), 4);
  assert.equal(visibleStructures(40), MAX_STRUCTURES);
  assert.equal(structureScale(MAX_STRUCTURES), 1);
  assert.ok(structureScale(MAX_STRUCTURES + 5) > 1);
  assert.ok(structureScale(1000) <= 1.6);
});

test('offsetOnSphere zachowuje odległość kątową', () => {
  const c: [number, number, number] = [0, 0.6, 0.8];
  for (const d of [0.01, 0.1, 0.5]) assert.ok(Math.abs(angleBetween(c, offsetOnSphere(c, 1.3, d)) - d) < 1e-9);
});

for (const def of PLANET_DEFINITIONS) {
  test(`kolonia: ${def.id} — deterministyczna, pełna, budowle się nie nakładają`, () => {
    for (const seed of ['PF-COL-1', 'PF-COL-2', 'PF-COL-3']) {
      const planet = generatePlanet(def, seed);
      const sampler = createSurfaceSampler(planet);
      const a = layoutColony(planet, sampler, IDS);
      assert.deepEqual(a, layoutColony(planet, createSurfaceSampler(planet), IDS));
      const all = IDS.flatMap((id) => a.slots[id]);
      for (const id of IDS) assert.equal(a.slots[id].length, MAX_STRUCTURES, `${seed} ${id}`);
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) assert.ok(angleBetween(all[i]!.dir, all[j]!.dir) > 0.055);
      }
      const onLand = all.filter((s) => s.onLand).length;
      // Na planetach oceanicznych część budowli może stać na platformach na wodzie.
      const minLand = def.id === 'ocean' ? 0.4 : 0.6;
      assert.ok(onLand >= all.length * minLand, `${seed}: budowle na lądzie (${onLand}/${all.length})`);
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
